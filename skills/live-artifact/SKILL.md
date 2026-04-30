---
name: live-artifact
description: |
  Create refreshable, auditable Open Design artifacts backed by connector or local data.
  Trigger when the user asks for live dashboards, refreshable reports, synced views, or reusable data-backed artifacts.
triggers:
  - "live artifact"
  - "live dashboard"
  - "refreshable dashboard"
  - "live report"
  - "refreshable report"
  - "synced view"
  - "可刷新"
  - "实时看板"
od:
  mode: prototype
  preview:
    type: html
    entry: index.html
    reload: debounce-100
  design_system:
    requires: true
  outputs:
    primary: index.html
    secondary:
      - template.html
      - artifact.json
      - data.json
      - provenance.json
  capabilities_required:
    - shell
    - file_write
---

# Live Artifact Skill

Create an Open Design live artifact: a project-scoped, previewable HTML artifact whose data can later be refreshed without redesigning the presentation.

## Resource map

```
live-artifact/
├── SKILL.md
└── references/
    ├── artifact-schema.md      ← `references/artifact-schema.md`: artifact files, DTO shape, template binding rules
    ├── connector-policy.md     ← `references/connector-policy.md`: connector safety, redaction, credential boundaries
    └── refresh-contract.md     ← `references/refresh-contract.md`: refresh permissions, source metadata, snapshots
```

## Current status

Use the references in this directory as the source of truth for the live artifact file contract. Prefer daemon wrapper commands over raw HTTP when registering or updating live artifacts.

## When to use this skill

Use this skill when the user asks for a data-backed view that should remain useful after the first render, for example a live dashboard, refreshable report, synced status page, auditable data view, or artifact that can later be refreshed from local/project data or connectors.

Before creating files, decide whether the user actually wants a live artifact or a normal static artifact:

- Use a live artifact when the user mentions refresh, sync, recurring updates, connector-backed data, source/provenance tracking, dashboards, reports, or reusable data-backed views.
- Use a normal static artifact when the user only wants a one-off HTML/mockup/image/file and does not need refresh, source metadata, or data/provenance panels.
- If the intent is ambiguous, ask one short question: “Should this be refreshable/live, or just a static artifact?”

## Workflow

1. **Confirm scope and data source**
   - Identify the preview goal, audience, data freshness expectations, and whether refresh should be possible later.
   - Prefer local/project sources or daemon connector tools when available.
   - Do not call provider APIs directly when a daemon connector/wrapper exists.
   - If connector data is needed, first list connectors with `od tools connectors list --format compact`, choose only connected read-only tools, then execute through the connector wrapper.

2. **Author the source files**
   - Write `template.html` as the human-designed HTML template.
   - Write `data.json` as the canonical preview data used by `{{data.path}}` bindings.
   - Write `artifact.json` with the live artifact metadata, preview declaration, document declaration, tiles, and safe source descriptors.
   - Write `provenance.json` with concise source notes, timestamps, non-sensitive connector references, and transformation notes.
   - Do not author `index.html` as source. The daemon derives `index.html` from `template.html` and `data.json`.

3. **Keep data compact and preview-oriented**
   - Store only normalized values needed by the preview.
   - Summarize large lists, provider responses, or logs before writing them into `data.json`.
   - Stay within the bounded JSON rules in `references/artifact-schema.md`.

4. **Apply safety rules before registration**
   - Never store credentials, OAuth tokens, API keys, cookies, auth headers, raw provider responses, HTTP envelopes, full payloads, or secret-like fields in `artifact.json`, `data.json`, `provenance.json`, tiles, or source metadata.
   - Avoid forbidden key names such as `raw`, `rawResponse`, `payload`, `body`, `headers`, `cookie`, `authorization`, `token`, `secret`, `credential`, and `password` anywhere in persisted JSON.
   - Use escaped `html_template_v1` interpolation only. Raw/unescaped HTML interpolation is not allowed.

5. **Register or update through daemon wrappers**
   - Use the `od` daemon wrapper commands instead of raw `curl`:

     ```bash
     od tools live-artifacts create --input artifact.json
     od tools live-artifacts list --format compact
     od tools live-artifacts update --artifact-id "$ARTIFACT_ID" --input artifact.json
     ```

   - The wrapper reads injected `OD_DAEMON_URL` and `OD_TOOL_TOKEN`; do not print, persist, or override them.
   - Do not include or invent `projectId`; the daemon derives project/run scope from the token.
   - Use raw HTTP only for daemon development/debugging when explicitly requested.

6. **Use connector wrappers for connector data**
   - Discover available connectors and tools:

     ```bash
     od tools connectors list --format compact
     ```

   - Execute a read-only connector tool with a JSON object input file:

     ```bash
     od tools connectors execute --connector "$CONNECTOR_ID" --tool "$TOOL_NAME" --input input.json
     ```

   - Persist only the compact normalized fields needed by the preview plus non-sensitive connector references (`connectorId`, `toolName`, `accountLabel`, approval/refresh permission). Never persist connector credentials, transport metadata, or raw provider output.
   - See `references/connector-policy.md` for listing/execution and credential boundaries, and `references/refresh-contract.md` for read-only refresh source metadata.

7. **Report concise results**
   - On success, return the artifact ID/title and note that `index.html` is daemon-derived.
   - On validation failure, fix the source files and retry through the wrapper. Do not bypass validation.

## Required files

Every live artifact creation flow must produce these source files before registration:

- `template.html` — declared skill output and source template for the preview.
- `data.json` — compact, canonical preview data.
- `artifact.json` — create/update input for daemon validation.
- `provenance.json` — safe source and transformation summary.

`index.html` is the primary preview entry declared in frontmatter, but it is derived daemon output rather than agent-authored source.
