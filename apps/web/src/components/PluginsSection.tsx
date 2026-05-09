// Plan §3.F5 / spec §8 — composable Plugins section.
//
// Bundles the four Phase 2A primitives (InlinePluginsRail,
// ContextChipStrip, PluginInputsForm, the renderPluginBriefTemplate
// helper) into one reusable widget. NewProjectPanel and ChatComposer
// can drop this in with one line and treat the rest of the composer
// state as untouched.
//
// API contract:
//   - `onApplied(brief, applied)` fires every time the section's brief
//     output changes (plugin applied OR inputs edited). Hosts wire this
//     to whichever input they own (the project name field on Home, the
//     conversation input inside ChatComposer).
//   - `onCleared()` fires when the user removes a context chip,
//     clearing the active plugin.
//   - `onValidityChange(valid)` mirrors the inputs-form validity so the
//     host can disable Send while required inputs are missing.
//
// The section is purely additive: it never reaches into the host's
// state. Hosts may choose to ignore the callbacks entirely; the
// section will still render and apply plugins. This minimises the
// intrusion into the existing 2000-line composer files.

import { useCallback, useState } from 'react';
import type {
  ApplyResult,
  ContextItem,
  InstalledPluginRecord,
} from '@open-design/contracts';
import { renderPluginBriefTemplate } from '../state/projects';
import { ContextChipStrip } from './ContextChipStrip';
import { InlinePluginsRail } from './InlinePluginsRail';
import { PluginInputsForm } from './PluginInputsForm';

interface Props {
  // Active project the apply will be scoped to. Omit on Home.
  projectId?: string | null;
  // Inline rail layout: 'wide' on Home, 'strip' inside ChatComposer.
  variant?: 'wide' | 'strip';
  // Filter the rail (Phase 2B). When unspecified the daemon-wide list
  // is shown.
  filter?: { taskKind?: string; mode?: string };
  // Optional hooks — see file header.
  onApplied?: (brief: string, applied: ApplyResult) => void;
  onCleared?: () => void;
  onValidityChange?: (valid: boolean) => void;
}

export function PluginsSection(props: Props) {
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const [activeRecord, setActiveRecord] = useState<InstalledPluginRecord | null>(null);
  const [pluginInputs, setPluginInputs] = useState<Record<string, unknown>>({});

  const onApplied = useCallback(
    (record: InstalledPluginRecord, result: ApplyResult) => {
      setActiveRecord(record);
      setApplied(result);
      const initialInputs: Record<string, unknown> = {};
      for (const field of result.inputs ?? []) {
        if (field.default !== undefined) initialInputs[field.name] = field.default;
      }
      setPluginInputs(initialInputs);
      const brief = renderPluginBriefTemplate(result.query ?? '', initialInputs);
      props.onApplied?.(brief, result);
    },
    [props],
  );

  const onInputsChange = useCallback(
    (next: Record<string, unknown>) => {
      setPluginInputs(next);
      if (applied) {
        const brief = renderPluginBriefTemplate(applied.query ?? '', next);
        props.onApplied?.(brief, applied);
      }
    },
    [applied, props],
  );

  const onChipRemove = useCallback(
    (_item: ContextItem) => {
      setApplied(null);
      setActiveRecord(null);
      setPluginInputs({});
      props.onCleared?.();
    },
    [props],
  );

  return (
    <div className="plugins-section" data-testid="plugins-section">
      {applied ? (
        <div className="plugins-section__active" data-active-plugin-id={activeRecord?.id}>
          <ContextChipStrip
            items={applied.contextItems ?? []}
            onRemove={onChipRemove}
          />
          {applied.inputs && applied.inputs.length > 0 ? (
            <PluginInputsForm
              fields={applied.inputs}
              values={pluginInputs}
              onChange={onInputsChange}
              onValidityChange={props.onValidityChange ?? (() => undefined)}
            />
          ) : null}
        </div>
      ) : null}
      <InlinePluginsRail
        {...(props.projectId !== undefined ? { projectId: props.projectId } : {})}
        variant={props.variant ?? 'wide'}
        {...(props.filter ? { filter: props.filter } : {})}
        onApplied={onApplied}
      />
    </div>
  );
}
