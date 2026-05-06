import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type HubEntry,
  installHubEntry,
  installHubManifest,
} from '../src/research/skill-hub.js';

// PR #617 review (P1/P2): the install gate must tie the bytes being written
// to the immutable commit SHA the user reviewed. A caller listing through the
// mutable branch ref must not be able to install — even when the approval
// carries a real, well-formed SHA — because the bytes in `entry.raw` are not
// anchored to that SHA. The install path also re-fetches the manifest at the
// canonical SHA and refuses to write if the bytes drift, so a forged
// `HubEntry` whose `entry.raw` differs from what the hub actually serves
// cannot persist arbitrary prompt text.

const PINNED_SHA = '0123456789abcdef0123456789abcdef01234567';
const OTHER_SHA = '89abcdef0123456789abcdef0123456789abcdef';

const SAMPLE_RAW = [
  '---',
  'name: example-skill',
  'description: An example skill used by the install-gate tests.',
  'od:',
  '  mode: utility',
  '---',
  '',
  '# Example skill',
].join('\n');

const REPO = 'pftom/open-design-hub';

function makeEntry(opts: { commitSha?: string | null; raw?: string } = {}): HubEntry {
  const source: HubEntry['source'] = {
    repo: REPO,
    branch: 'main',
    path: 'skills/example-skill/SKILL.md',
  };
  // null  → leave commitSha unset (mutable-branch listing)
  // undefined → default to PINNED_SHA
  // string → use as-is
  if (opts.commitSha === undefined) source.commitSha = PINNED_SHA;
  else if (opts.commitSha !== null) source.commitSha = opts.commitSha;
  return {
    namespace: 'skills',
    name: 'example-skill',
    description: 'An example skill used by the install-gate tests.',
    raw: opts.raw ?? SAMPLE_RAW,
    source,
  };
}

interface FetchPlan {
  // bytes the hub would return at this SHA for the manifest path
  manifestRaw?: string | null;
  // bytes returned for the commits API resolution
  commitSha?: string;
  // override repo
  repo?: string;
}

function installManifestUrl(canonicalSha: string, repo: string = REPO): string {
  return `https://api.github.com/repos/${repo}/contents/skills/example-skill/SKILL.md?ref=${canonicalSha}`;
}

function commitResolveUrl(input: string, repo: string = REPO): string {
  return `https://api.github.com/repos/${repo}/commits/${input}`;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function rawResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

function setupHubFetch(plan: FetchPlan): ReturnType<typeof vi.fn> {
  const repo = plan.repo ?? REPO;
  const canonical = plan.commitSha ?? PINNED_SHA;
  const manifestRaw = plan.manifestRaw ?? SAMPLE_RAW;
  const downloadUrl = `https://raw.example.invalid/${canonical}/skill.md`;
  const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    if (url.startsWith(`https://api.github.com/repos/${repo}/commits/`)) {
      return jsonResponse({ sha: canonical });
    }
    if (url === installManifestUrl(canonical, repo)) {
      return jsonResponse({
        name: 'SKILL.md',
        type: 'file',
        path: 'skills/example-skill/SKILL.md',
        download_url: downloadUrl,
      });
    }
    if (url === downloadUrl) {
      if (manifestRaw === null) {
        return new Response('', { status: 404 });
      }
      return rawResponse(manifestRaw);
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('research/skill-hub installHubEntry provenance gate', () => {
  let targetRoot: string;

  beforeEach(async () => {
    targetRoot = await mkdtemp(path.join(tmpdir(), 'od-hub-install-'));
  });

  afterEach(async () => {
    await rm(targetRoot, { force: true, recursive: true });
    vi.unstubAllGlobals();
  });

  it('rejects an entry listed from a mutable branch (no commitSha)', async () => {
    // Caller listed via `?ref=main` so HubEntry.source.commitSha is unset.
    // Even with a syntactically valid approval SHA, install must refuse —
    // otherwise a hub mutation between approval and install could swap bytes.
    const entry = makeEntry({ commitSha: null });
    await expect(
      installHubEntry(entry, {
        targetRoot,
        approval: { pinnedSha: PINNED_SHA, userApproved: true },
      }),
    ).rejects.toThrow(/no source\.commitSha/i);
  });

  it('rejects when entry.source.commitSha does not match approval.pinnedSha', async () => {
    // Listed at one immutable SHA, approved at a different one — provenance
    // mismatch must block the write.
    const entry = makeEntry({ commitSha: OTHER_SHA });
    await expect(
      installHubEntry(entry, {
        targetRoot,
        approval: { pinnedSha: PINNED_SHA, userApproved: true },
      }),
    ).rejects.toThrow(/provenance mismatch/i);
  });

  it('writes the manifest after re-fetching bytes at the approved SHA', async () => {
    setupHubFetch({});
    const entry = makeEntry();
    const result = await installHubEntry(entry, {
      targetRoot,
      approval: { pinnedSha: PINNED_SHA, userApproved: true },
    });
    expect(result.path).toBe(path.join(targetRoot, 'example-skill', 'SKILL.md'));
    const written = await readFile(result.path, 'utf8');
    expect(written).toBe(SAMPLE_RAW);
  });

  it('refuses to write when entry.raw drifts from what the hub serves at the SHA', async () => {
    // A forged `HubEntry` carries a matching SHA but a different raw body
    // (the attacker's prompt text). The install path re-fetches the manifest
    // at the approved SHA and writes only what it just pulled — and refuses
    // when the bytes do not match the listing-cache copy. (PR #617 review,
    // P1.)
    setupHubFetch({ manifestRaw: SAMPLE_RAW });
    const tampered = makeEntry({
      raw: SAMPLE_RAW + '\n<!-- attacker-injected payload -->',
    });
    await expect(
      installHubEntry(tampered, {
        targetRoot,
        approval: { pinnedSha: PINNED_SHA, userApproved: true },
      }),
    ).rejects.toThrow(/manifest bytes drifted/i);
  });

  it('matches case-insensitively but not by short-prefix', async () => {
    setupHubFetch({});
    const entry = makeEntry({ commitSha: PINNED_SHA.toUpperCase() });
    // Same SHA, different case — accepted.
    await expect(
      installHubEntry(entry, {
        targetRoot,
        approval: { pinnedSha: PINNED_SHA, userApproved: true },
      }),
    ).resolves.toMatchObject({ path: expect.any(String) });

    // A 7-char prefix is a syntactically valid SHA but is NOT equal to the
    // entry's full SHA — must still be rejected.
    const entry2 = makeEntry({ commitSha: PINNED_SHA });
    const shortSha = PINNED_SHA.slice(0, 7);
    await expect(
      installHubEntry(entry2, {
        targetRoot,
        overwrite: true,
        approval: { pinnedSha: shortSha, userApproved: true },
      }),
    ).rejects.toThrow(/provenance mismatch/i);
  });

  it('still requires explicit userApproved: true', async () => {
    const entry = makeEntry();
    await expect(
      installHubEntry(entry, {
        targetRoot,
        // @ts-expect-error — exercising a defaulted/untrusted options object.
        approval: { pinnedSha: PINNED_SHA, userApproved: false },
      }),
    ).rejects.toThrow(/explicit user approval/i);
  });

  it('still rejects an approval SHA that is not a commit-SHA shape', async () => {
    const entry = makeEntry();
    await expect(
      installHubEntry(entry, {
        targetRoot,
        approval: { pinnedSha: 'not-a-sha', userApproved: true },
      }),
    ).rejects.toThrow(/must be a commit SHA/i);
  });

  it('threads opts.token through the re-fetch so private-hub entries install', async () => {
    // Regression for PR #617 review (P1): for a private hub the listing
    // went through `HubConfig.token`, but the install path used to call
    // `fetchManifestRawAtSha()` without any token — so the re-fetch hit
    // the GitHub API anonymously and the install would always 404 even
    // though the entry was reachable. The fix routes a server-owned
    // token from `opts.token` to the re-fetch.
    const PRIVATE_TOKEN = 'ghs_private_test_token_value';
    let sawAuthOnManifestMeta = false;
    let sawAuthOnDownload = false;
    const downloadUrl = `https://raw.example.invalid/${PINNED_SHA}/skill.md`;
    const fetchMock = vi.fn(async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const url = String(input);
      const auth = (init?.headers as Record<string, string> | undefined)?.['Authorization']
        ?? (init?.headers as Record<string, string> | undefined)?.['authorization'];
      if (url === installManifestUrl(PINNED_SHA)) {
        // Anonymous request to a private repo would get 404 here. We
        // assert that the install path actually presents the bearer
        // token; without it we'd return 404 to mimic GitHub's behavior.
        if (auth !== `Bearer ${PRIVATE_TOKEN}`) {
          return new Response(JSON.stringify({ message: 'Not Found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        sawAuthOnManifestMeta = true;
        return jsonResponse({
          name: 'SKILL.md',
          type: 'file',
          path: 'skills/example-skill/SKILL.md',
          download_url: downloadUrl,
        });
      }
      if (url === downloadUrl) {
        if (auth !== `Bearer ${PRIVATE_TOKEN}`) {
          return new Response('', { status: 404 });
        }
        sawAuthOnDownload = true;
        return rawResponse(SAMPLE_RAW);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const entry = makeEntry();
    const result = await installHubEntry(entry, {
      targetRoot,
      approval: { pinnedSha: PINNED_SHA, userApproved: true },
      token: PRIVATE_TOKEN,
    });
    expect(sawAuthOnManifestMeta).toBe(true);
    expect(sawAuthOnDownload).toBe(true);
    expect(result.path).toBe(path.join(targetRoot, 'example-skill', 'SKILL.md'));
    const written = await readFile(result.path, 'utf8');
    expect(written).toBe(SAMPLE_RAW);
  });

  it('falls back to OD_HUB_TOKEN when opts.token is not supplied', async () => {
    // The same env var that `listHubEntries` honors as the token source
    // also applies to the in-process install gate — otherwise a process
    // configured with `OD_HUB_TOKEN` would list a private hub fine but
    // fail to install. (PR #617 review, P1.)
    const ENV_TOKEN = 'ghs_env_token_for_private_hub_install';
    const downloadUrl = `https://raw.example.invalid/${PINNED_SHA}/skill.md`;
    const fetchMock = vi.fn(async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const url = String(input);
      const auth = (init?.headers as Record<string, string> | undefined)?.['Authorization']
        ?? (init?.headers as Record<string, string> | undefined)?.['authorization'];
      if (auth !== `Bearer ${ENV_TOKEN}`) {
        return new Response('', { status: 404 });
      }
      if (url === installManifestUrl(PINNED_SHA)) {
        return jsonResponse({
          name: 'SKILL.md',
          type: 'file',
          path: 'skills/example-skill/SKILL.md',
          download_url: downloadUrl,
        });
      }
      if (url === downloadUrl) {
        return rawResponse(SAMPLE_RAW);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const previous = process.env.OD_HUB_TOKEN;
    process.env.OD_HUB_TOKEN = ENV_TOKEN;
    try {
      const entry = makeEntry();
      const result = await installHubEntry(entry, {
        targetRoot,
        approval: { pinnedSha: PINNED_SHA, userApproved: true },
      });
      expect(result.path).toBe(path.join(targetRoot, 'example-skill', 'SKILL.md'));
    } finally {
      if (previous === undefined) delete process.env.OD_HUB_TOKEN;
      else process.env.OD_HUB_TOKEN = previous;
    }
  });
});

describe('research/skill-hub installHubManifest selector entry point', () => {
  let targetRoot: string;

  beforeEach(async () => {
    targetRoot = await mkdtemp(path.join(tmpdir(), 'od-hub-install-sel-'));
  });

  afterEach(async () => {
    await rm(targetRoot, { force: true, recursive: true });
    vi.unstubAllGlobals();
  });

  it('fetches the manifest at the canonical SHA and writes the freshly fetched bytes', async () => {
    setupHubFetch({});
    const result = await installHubManifest(
      { namespace: 'skills', name: 'example-skill', repo: REPO, pinnedSha: PINNED_SHA },
      { targetRoot, approval: { pinnedSha: PINNED_SHA, userApproved: true } },
    );
    expect(result.commitSha).toBe(PINNED_SHA);
    const written = await readFile(result.path, 'utf8');
    expect(written).toBe(SAMPLE_RAW);
  });

  it('refuses when selector.pinnedSha and approval.pinnedSha disagree', async () => {
    await expect(
      installHubManifest(
        { namespace: 'skills', name: 'example-skill', repo: REPO, pinnedSha: PINNED_SHA },
        { targetRoot, approval: { pinnedSha: OTHER_SHA, userApproved: true } },
      ),
    ).rejects.toThrow(/must match approval\.pinnedSha/i);
  });

  it('refuses an invalid repo slug', async () => {
    await expect(
      installHubManifest(
        { namespace: 'skills', name: 'example-skill', repo: 'not-a-slug', pinnedSha: PINNED_SHA },
        { targetRoot, approval: { pinnedSha: PINNED_SHA, userApproved: true } },
      ),
    ).rejects.toThrow(/selector\.repo/i);
  });

  it('refuses when the re-fetched bytes fail manifest validation', async () => {
    setupHubFetch({ manifestRaw: 'not a valid SKILL.md' });
    await expect(
      installHubManifest(
        { namespace: 'skills', name: 'example-skill', repo: REPO, pinnedSha: PINNED_SHA },
        { targetRoot, approval: { pinnedSha: PINNED_SHA, userApproved: true } },
      ),
    ).rejects.toThrow(/failed validation/i);
  });
});
