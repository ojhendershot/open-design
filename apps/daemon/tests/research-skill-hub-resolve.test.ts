import { afterEach, describe, expect, it, vi } from 'vitest';

import { listHubEntries } from '../src/research/skill-hub.js';

// PR #617 review (P1): `?ref=` accepts branches and tags, so a hex-shaped
// regex check on `pinnedSha` is not enough. `resolveHubRef` must call the
// commits API and reject the input if the canonical SHA does not share its
// hex prefix (which is what would happen if the input is actually a branch
// or tag name that happens to match `[0-9a-f]{7,40}`).

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('research/skill-hub resolveHubRef provenance gate', () => {
  it('rejects a hex-shaped pinnedSha that GitHub resolved through a branch/tag', async () => {
    // The hub has created a branch named like a short SHA. The input passes
    // the COMMIT_SHA_PATTERN regex, but GitHub resolves the ref through the
    // branch and returns the tip commit's SHA — which does NOT share the
    // input's hex prefix. resolveHubRef must refuse to treat that as
    // immutable provenance.
    const hexLikeBranch = 'abcdef0';
    const branchTipSha = '1234567890abcdef1234567890abcdef12345678';
    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url === `https://api.github.com/repos/test-org/non-commit-ref/commits/${hexLikeBranch}`) {
        return jsonResponse({ sha: branchTipSha });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      listHubEntries('skills', {
        repo: 'test-org/non-commit-ref',
        pinnedSha: hexLikeBranch,
      }),
    ).rejects.toThrow(/does not share its hex prefix/i);

    // We must not have made any Contents API call — the gate fires before
    // any bytes are fetched from the resolved ref.
    expect(
      fetchMock.mock.calls.some(([u]) => String(u).includes('/contents/')),
    ).toBe(false);
  });

  it('accepts a hex prefix that resolves to a commit sharing that prefix and stamps the canonical 40-char SHA', async () => {
    // Real commit-SHA prefix expansion: input "deadbee" expands to a full
    // 40-char SHA that starts with "deadbee". The Contents API must be
    // queried through `?ref=<canonicalSha>` (not the input prefix), and
    // every returned HubEntry.source.commitSha must carry the canonical
    // 40-char form — never the caller's raw input echoed back.
    const inputPrefix = 'deadbee';
    const canonicalSha = 'deadbeefcafef00ddeadbeefcafef00ddeadbeef';
    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url === `https://api.github.com/repos/test-org/canonical-prefix/commits/${inputPrefix}`) {
        return jsonResponse({ sha: canonicalSha });
      }
      if (
        url === `https://api.github.com/repos/test-org/canonical-prefix/contents/skills?ref=${canonicalSha}`
      ) {
        return jsonResponse([]);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const entries = await listHubEntries('skills', {
      repo: 'test-org/canonical-prefix',
      pinnedSha: inputPrefix,
    });
    expect(entries).toEqual([]);

    const contentsCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes('/contents/'),
    );
    expect(contentsCall).toBeDefined();
    // Critically: the listing fetch must use the *canonical* full 40-char
    // SHA, not the caller's 7-char prefix. We assert with an end-anchored
    // regex so a `?ref=deadbee...` that was just the input prefix would
    // not satisfy it.
    expect(String(contentsCall![0])).toMatch(
      new RegExp(`\\?ref=${canonicalSha}$`),
    );
  });

  it('uses the canonical SHA when stamping HubEntry.source.commitSha (full 40-char, not the caller input)', async () => {
    const inputPrefix = 'cafe123';
    const canonicalSha = 'cafe1234567890abcdef1234567890abcdef1234';
    const skillRaw = [
      '---',
      'name: example-skill',
      'description: Stamping fixture for the resolve gate.',
      'od:',
      '  mode: utility',
      '---',
      '',
      '# Example skill',
      '',
    ].join('\n');
    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url === `https://api.github.com/repos/test-org/stamp-canonical/commits/${inputPrefix}`) {
        return jsonResponse({ sha: canonicalSha });
      }
      if (
        url === `https://api.github.com/repos/test-org/stamp-canonical/contents/skills?ref=${canonicalSha}`
      ) {
        return jsonResponse([
          {
            name: 'example-skill',
            type: 'dir',
            path: 'skills/example-skill',
            download_url: null,
          },
        ]);
      }
      if (
        url
          === `https://api.github.com/repos/test-org/stamp-canonical/contents/skills/example-skill/SKILL.md?ref=${canonicalSha}`
      ) {
        return jsonResponse({
          name: 'SKILL.md',
          type: 'file',
          path: 'skills/example-skill/SKILL.md',
          download_url: 'https://raw.example.invalid/skill.md',
        });
      }
      if (url === 'https://raw.example.invalid/skill.md') {
        return new Response(skillRaw, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const entries = await listHubEntries('skills', {
      repo: 'test-org/stamp-canonical',
      pinnedSha: inputPrefix,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.source.commitSha).toBe(canonicalSha);
    // Caller input alone (7 hex chars) must never end up on an entry — the
    // install gate uses exact-match equality, so a 7-char value would never
    // satisfy a 40-char approval.
    expect(entries[0]?.source.commitSha).not.toBe(inputPrefix);
  });
});
