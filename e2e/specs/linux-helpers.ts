import { homedir } from 'node:os';
import { resolve, sep } from 'node:path';

import { expect } from 'vitest';

export function linuxUserHome(): string {
  return homedir();
}

export function expectPathInside(filePath: string, expectedRoot: string): void {
  const normalizedPath = resolve(filePath);
  const normalizedRoot = resolve(expectedRoot);
  expect(
    normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}${sep}`),
    `${normalizedPath} should be inside ${normalizedRoot}`,
  ).toBe(true);
}

export function linuxRemovalStatusMessage(label: string, status: string): string {
  return `${label} removal status was ${status}; skipped-process-running means the process remained running before removal. Inspect packaged logs and stop lifecycle output before retrying.`;
}

export function expectLinuxRemovedStatus(label: string, status: string): void {
  expect(status, linuxRemovalStatusMessage(label, status)).toMatch(/^(ok|already-removed)$/);
}
