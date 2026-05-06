import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type HubEntry,
  installHubEntry,
} from '../src/research/skill-hub.js';

// PR #617 review (P1/P2): the install gate must tie the bytes being written
// to the immutable commit SHA the user reviewed. A caller listing through the
// mutable branch ref must not be able to install — even when the approval
// carries a real, well-formed SHA — because the bytes in `entry.raw` are not
// anchored to that SHA. These tests pin both halves of that contract.

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

function makeEntry(opts: { commitSha?: string | null } = {}): HubEntry {
  const source: HubEntry['source'] = {
    repo: 'pftom/open-design-hub',
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
    raw: SAMPLE_RAW,
    source,
  };
}

describe('research/skill-hub installHubEntry provenance gate', () => {
  let targetRoot: string;

  beforeEach(async () => {
    targetRoot = await mkdtemp(path.join(tmpdir(), 'od-hub-install-'));
  });

  afterEach(async () => {
    await rm(targetRoot, { force: true, recursive: true });
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

  it('writes the manifest when the entry SHA matches the approval SHA', async () => {
    const entry = makeEntry();
    const result = await installHubEntry(entry, {
      targetRoot,
      approval: { pinnedSha: PINNED_SHA, userApproved: true },
    });
    expect(result.path).toBe(path.join(targetRoot, 'example-skill', 'SKILL.md'));
    const written = await readFile(result.path, 'utf8');
    expect(written).toBe(SAMPLE_RAW);
  });

  it('matches case-insensitively but not by short-prefix', async () => {
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
});
