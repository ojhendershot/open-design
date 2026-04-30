import type { BoundedJsonObject } from './schema.js';

export const LIVE_ARTIFACT_RENDER_FORMAT = 'html_template_v1' as const;
export const LIVE_ARTIFACT_TEMPLATE_ENTRY = 'template.html' as const;
export const LIVE_ARTIFACT_DATA_ENTRY = 'data.json' as const;
export const LIVE_ARTIFACT_GENERATED_PREVIEW_ENTRY = 'index.html' as const;

export interface LiveArtifactRenderInput {
  templateHtml: string;
  dataJson: BoundedJsonObject;
}

export interface LiveArtifactRenderOutput {
  html: string;
}

const TEMPLATE_INTERPOLATION = /{{\s*([^{}]+?)\s*}}/g;
const RAW_TEMPLATE_INTERPOLATION = /{{{[^{}]*}}}|{{\s*&[^{}]*}}/;
const TEMPLATE_PATH = /^(?:data|[A-Za-z_][A-Za-z0-9_]*)(?:\.(?:[A-Za-z_][A-Za-z0-9_-]*|\d+))*$/;

export function escapeHtmlTemplateValue(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function readTemplatePath(dataJson: BoundedJsonObject, rawPath: string): unknown {
  const segments = rawPath.split('.');
  if (segments.shift() !== 'data') throw new Error(`unsupported template binding path: ${rawPath}`);

  let current: unknown = dataJson;
  for (const segment of segments) {
    if (current === null || current === undefined) return '';
    if (Array.isArray(current)) {
      if (!/^\d+$/.test(segment)) throw new Error(`invalid array segment in template binding path: ${rawPath}`);
      current = current[Number(segment)];
      continue;
    }
    if (typeof current !== 'object') return '';
    current = (current as Record<string, unknown>)[segment];
  }

  return current ?? '';
}

export function renderHtmlTemplateV1(input: LiveArtifactRenderInput): LiveArtifactRenderOutput {
  if (RAW_TEMPLATE_INTERPOLATION.test(input.templateHtml)) {
    throw new Error('raw template interpolation is not supported');
  }

  const html = input.templateHtml.replace(TEMPLATE_INTERPOLATION, (_match, rawBinding: string) => {
    const binding = rawBinding.trim();
    if (!TEMPLATE_PATH.test(binding) || !binding.startsWith('data')) {
      throw new Error(`invalid template binding path: ${binding}`);
    }

    const value = readTemplatePath(input.dataJson, binding);
    if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
      throw new Error(`template binding must resolve to a scalar: ${binding}`);
    }
    return escapeHtmlTemplateValue(value);
  });

  return { html };
}
