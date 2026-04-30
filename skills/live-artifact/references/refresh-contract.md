# Refresh Contract Reference

Refresh updates live artifact data without redesigning the presentation. The refresh runner updates `data.json`, tile render JSON, provenance, and audit history; it does not allow arbitrary template rewrites.

## Refreshable source metadata

Refreshable tiles or documents use `sourceJson`:

```json
{
  "type": "connector_tool",
  "toolName": "list_releases",
  "input": {},
  "connector": {
    "connectorId": "github",
    "accountLabel": "example/org",
    "toolName": "list_releases",
    "approvalPolicy": "manual_refresh_granted_for_read_only"
  },
  "outputMapping": {
    "dataPaths": [{ "from": "items", "to": "releases" }],
    "transform": "compact_table"
  },
  "refreshPermission": "manual_refresh_granted_for_read_only"
}
```

Supported source types:

- `local_file`
- `daemon_tool`
- `connector_tool`

Supported output transforms:

- `identity`
- `compact_table`
- `metric_summary`

## Permission model

- New refreshable sources start with `refreshPermission: "none"` unless the user grants refresh.
- First manual refresh requires user confirmation.
- After approval, the daemon may persist `manual_refresh_granted_for_read_only` for read-only refreshable sources.
- Users must be able to revoke refresh permission from the Source tab.
- Write, destructive, unknown, or drifted connector tools are never refreshable.

## Connector-backed refresh

Connector-backed refresh sources use the same connector execution service as agent-initiated connector calls. Do not call provider APIs directly from refresh logic or from skill-authored scripts.

Before creating a connector-backed refresh source:

1. List connectors with `od tools connectors list --format compact`.
2. Select a connected connector and a tool whose safety is `read` + `auto` and whose catalog metadata marks it refresh-eligible.
3. Execute once with `od tools connectors execute --connector <id> --tool <name> --input input.json` to produce compact normalized preview data.
4. Store only non-sensitive connector references, the bounded input object, output mapping, and `refreshPermission`/approval state in `sourceJson`.

On each refresh, the daemon must re-check connector status, account label, allowlist membership, current scopes, tool safety, input schema, approval policy, and refresh eligibility. If any check fails or output protection rejects the result, refresh fails all-or-nothing and preserves the previous valid preview.

Persisted connector refresh metadata may include `connectorId`, `toolName`, non-sensitive `accountLabel`, `approvalPolicy`, bounded `input`, `outputMapping`, and `refreshPermission`. It must not include credentials, auth/session material, raw provider envelopes, or unbounded provider responses.

## Commit behavior

Refresh is all-or-nothing:

1. Acquire one active refresh lock per artifact.
2. Execute each refreshable source with timeouts and current safety checks.
3. Build candidate `data.json`, tile render JSON, provenance, and preview.
4. Validate all candidates with the same schemas used for create/update.
5. Commit only if every refreshable tile succeeds.
6. Preserve the previous valid preview if any step fails.

Refresh IDs must be monotonic so stale runs cannot overwrite newer committed data.

## Audit storage

- Append compact records to `refreshes.jsonl`.
- Successful refresh snapshots live under `snapshots/<refreshId>/` and may include `data.json`, render JSON, and provenance.
- Failed refreshes are summarized in `refreshes.jsonl` without leaking raw provider output or credentials.
- On daemon startup, stale running refreshes should be marked failed or timed out while preserving the last valid preview.
