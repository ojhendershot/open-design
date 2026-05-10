# Linux Client Issue 709 Publication Packet

## Stop Rule

Do not push this branch or open a pull request unless the user explicitly authorizes publication after this packet.

Local branch: `codex/linux-client-issue-709`
Issue: https://github.com/nexu-io/open-design/issues/709
Base: `main` / `origin/main` at `32fa0c23bb5f0708c43fc891ff29a3dcb8b78713`
Implementation head before this packet: `ccec96a1f88afcc857777ec17b5bc5447ed0ca6b`
Status as prepared: local-only, not pushed. Recheck `git rev-parse HEAD` after any local documentation commits.

## PR Draft

Title:

```text
Add Linux packaged client parity smoke coverage
```

Body:

```markdown
## Summary

- Add Linux packaged client parity for headless lifecycle operations, including headless uninstall and cleanup routing.
- Add Linux `inspect` support, with AppImage desktop inspection and explicit status-only behavior for headless mode.
- Add Linux packaged e2e coverage: PR-side headless smoke, release-side AppImage smoke, release evidence upload/download, and workflow guard tests.
- Refresh Linux packaged client documentation and issue 709 implementation status.

## Test Plan

- [x] `corepack pnpm --filter @open-design/e2e test -- tests/packaged-smoke-workflow.test.ts`
- [x] `corepack pnpm --filter @open-design/tools-pack test -- linux.test.ts`
- [x] `corepack pnpm --filter @open-design/tools-pack typecheck`
- [x] `corepack pnpm --filter @open-design/e2e typecheck`
- [x] `corepack pnpm guard`
- [x] `ASTRO_TELEMETRY_DISABLED=1 corepack pnpm -r --workspace-concurrency=1 --if-present run typecheck && ASTRO_TELEMETRY_DISABLED=1 corepack pnpm exec tsc -p scripts/tsconfig.json --noEmit`
- [x] Workflow YAML parse for `.github/workflows/release-beta.yml`, `.github/workflows/release-stable.yml`, and `.github/workflows/ci.yml`
- [x] `git diff --check`

## Notes

- Linux beta release remains opt-in through the existing `enable_linux` input.
- Linux stable release remains gated by `vars.ENABLE_STABLE_LINUX == 'true'`.
- PR validation uses the display-independent headless Linux smoke; AppImage smoke runs in release lanes where artifact correctness is required.
- Release Linux build evidence now validates `linux-tools-pack-build.json` after capture so non-JSON stdout fails before evidence upload.

Closes #709.
```

## Issue 709 Progress Reply Draft

```markdown
Status update: local implementation is complete on `codex/linux-client-issue-709`; it has not been pushed yet.

Scope covered:
- Linux headless lifecycle parity for uninstall/cleanup.
- Linux inspect support with status-only headless behavior and AppImage desktop inspection.
- Linux packaged e2e spec coverage.
- PR-side Linux headless smoke.
- Release-side Linux AppImage smoke with preserved release evidence.
- Workflow guard tests and docs/status refresh.

Verification completed locally:
- `corepack pnpm --filter @open-design/e2e test -- tests/packaged-smoke-workflow.test.ts`
- `corepack pnpm --filter @open-design/tools-pack test -- linux.test.ts`
- `corepack pnpm --filter @open-design/tools-pack typecheck`
- `corepack pnpm --filter @open-design/e2e typecheck`
- `corepack pnpm guard`
- recursive workspace typecheck plus scripts typecheck
- workflow YAML parse
- `git diff --check`

ETA/check-in bucket: a few hours / today once publication is authorized. Current blocker is only publication permission/auth, not local implementation.
```

## Publication Steps When Authorized

1. Refresh live state:

```bash
git status --short --branch
git rev-parse HEAD main origin/main
git log --oneline --decorate -8
```

2. Re-run final focused verification:

```bash
corepack pnpm --filter @open-design/e2e test -- tests/packaged-smoke-workflow.test.ts
corepack pnpm --filter @open-design/tools-pack test -- linux.test.ts
corepack pnpm --filter @open-design/tools-pack typecheck
corepack pnpm --filter @open-design/e2e typecheck
git diff --check
```

3. Publish only after explicit approval:

```bash
git push -u origin codex/linux-client-issue-709
```

4. Open a draft PR with the PR draft above and link issue 709.

If GitHub authentication still rejects access, re-authenticate with an account that has write access to `nexu-io/open-design` or publish to an authorized fork remote.

## Optional Follow-Up Hardening

These are not required for the current issue 709 parity branch, but they are reasonable follow-ups if the branch needs more defensive polish before review:

- Make Linux e2e path expectations avoid `process.env.HOME ?? ''` so an unset `HOME` cannot anchor expectations to the current working directory.
- Improve failure diagnostics when uninstall returns `skipped-process-running`.
- Preserve PR-side Linux headless smoke artifacts if maintainers want parity with release evidence artifacts.
- Add a focused unit test proving non-headless Linux inspect still permits eval/path options.
