import { z } from 'zod';

// `open-design.json` schema (v1). Mirrors docs/schemas/open-design.plugin.v1.json
// with one addition: this Zod schema is permissive on the top level so adapter
// outputs (synthesized PluginManifest from SKILL.md frontmatter or claude
// plugin.json) parse cleanly without losing forward-compatible fields.

export const ReferenceSchema = z.object({
  ref:  z.string().optional(),
  path: z.string().optional(),
}).passthrough();

export const RefPathSchema = z.object({
  path: z.string().min(1),
}).passthrough();

export const McpServerSpecSchema = z.object({
  name:    z.string().min(1),
  command: z.string().optional(),
  args:    z.array(z.string()).optional(),
  env:     z.record(z.string()).optional(),
  url:     z.string().optional(),
}).passthrough();

export type McpServerSpec = z.infer<typeof McpServerSpecSchema>;

export const InputFieldSchema = z.object({
  name:        z.string().min(1),
  label:       z.string().optional(),
  type:        z.enum(['string', 'text', 'select', 'number', 'boolean']).optional(),
  required:    z.boolean().optional(),
  options:     z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  default:     z.unknown().optional(),
}).passthrough();

export type InputField = z.infer<typeof InputFieldSchema>;

export const PipelineStageSchema = z.object({
  id:        z.string().min(1),
  atoms:     z.array(z.string()),
  repeat:    z.boolean().optional(),
  until:     z.string().optional(),
  onFailure: z.enum(['abort', 'skip', 'retry']).optional(),
}).passthrough();

export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const PluginPipelineSchema = z.object({
  stages: z.array(PipelineStageSchema),
}).passthrough();

export type PluginPipeline = z.infer<typeof PluginPipelineSchema>;

export const GenUISurfaceSpecSchema = z.object({
  id:      z.string().min(1),
  kind:    z.enum(['form', 'choice', 'confirmation', 'oauth-prompt']),
  persist: z.enum(['run', 'conversation', 'project']),
  trigger: z.object({
    stageId: z.string().optional(),
    atom:    z.string().optional(),
  }).passthrough().optional(),
  schema:               z.record(z.unknown()).optional(),
  prompt:               z.string().optional(),
  capabilitiesRequired: z.array(z.string()).optional(),
  timeout:              z.number().int().positive().optional(),
  onTimeout:            z.enum(['abort', 'default', 'skip']).optional(),
  default:              z.unknown().optional(),
  oauth: z.object({
    route:       z.enum(['connector', 'mcp', 'plugin']),
    connectorId: z.string().optional(),
    mcpServerId: z.string().optional(),
  }).passthrough().optional(),
  // Phase 4 / spec §10.3.5 alignment-roadmap row 2 — plugin-bundled
  // React component path. Capability-gated by `genui:custom-component`
  // (a future patch to the §5.3 capability vocabulary). The web
  // GenUISurfaceRenderer falls back to the built-in renderer when the
  // capability is not granted; the field stays an opaque relpath in
  // v1 contracts so the UI loader / sandbox can evolve without
  // touching the manifest schema.
  component: z.object({
    // Path to the entry module relative to the plugin folder, e.g.
    // `./surfaces/critique-panel.tsx`. The host loader is responsible
    // for compilation + sandboxing.
    path:     z.string().min(1),
    // Optional named export the host should mount; defaults to the
    // module's default export.
    export:   z.string().optional(),
    // Sandbox tier the surface needs. v1 only ships 'iframe' but the
    // contract leaves room for a Phase 4 React-component sandbox.
    sandbox:  z.enum(['iframe', 'react']).optional(),
  }).passthrough().optional(),
}).passthrough();

export type GenUISurfaceSpec = z.infer<typeof GenUISurfaceSpecSchema>;

export const PluginConnectorRefSchema = z.object({
  id:    z.string().min(1),
  tools: z.array(z.string()).default([]),
  required: z.boolean().optional(),
}).passthrough();

export type PluginConnectorRef = z.infer<typeof PluginConnectorRefSchema>;

export const PluginManifestSchema = z.object({
  $schema:     z.string().optional(),
  name:        z.string().min(1).regex(/^[a-z0-9][a-z0-9._-]*$/),
  title:       z.string().optional(),
  version:     z.string().min(1),
  description: z.string().optional(),
  author:   z.object({
    name: z.string().optional(),
    url:  z.string().optional(),
  }).passthrough().optional(),
  license:  z.string().optional(),
  homepage: z.string().optional(),
  icon:     z.string().optional(),
  tags:     z.array(z.string()).optional(),
  compat: z.object({
    agentSkills:   z.array(RefPathSchema).optional(),
    claudePlugins: z.array(RefPathSchema).optional(),
  }).passthrough().optional(),
  od: z.object({
    kind:     z.enum(['skill', 'scenario', 'atom', 'bundle']).optional(),
    taskKind: z.enum(['new-generation', 'code-migration', 'figma-migration', 'tune-collab']).optional(),
    mode:     z.string().optional(),
    platform: z.string().optional(),
    scenario: z.string().optional(),
    engineRequirements: z.object({
      od: z.string().optional(),
    }).passthrough().optional(),
    preview: z.object({
      type:   z.string().optional(),
      entry:  z.string().optional(),
      poster: z.string().optional(),
      video:  z.string().optional(),
      gif:    z.string().optional(),
    }).passthrough().optional(),
    useCase: z.object({
      query: z.string().optional(),
      exampleOutputs: z.array(z.object({
        path:  z.string(),
        title: z.string().optional(),
      }).passthrough()).optional(),
    }).passthrough().optional(),
    context: z.object({
      skills:        z.array(ReferenceSchema).optional(),
      designSystem:  z.union([
        ReferenceSchema,
        z.object({ ref: z.string().optional(), primary: z.boolean().optional() }).passthrough(),
      ]).optional(),
      craft:         z.array(z.string()).optional(),
      assets:        z.array(z.string()).optional(),
      claudePlugins: z.array(ReferenceSchema).optional(),
      mcp:           z.array(McpServerSpecSchema).optional(),
      atoms:         z.array(z.string()).optional(),
    }).passthrough().optional(),
    pipeline: PluginPipelineSchema.optional(),
    genui: z.object({
      surfaces: z.array(GenUISurfaceSpecSchema).optional(),
    }).passthrough().optional(),
    connectors: z.object({
      required: z.array(PluginConnectorRefSchema).optional(),
      optional: z.array(PluginConnectorRefSchema).optional(),
    }).passthrough().optional(),
    inputs: z.array(InputFieldSchema).optional(),
    capabilities: z.array(z.string()).optional(),
  }).passthrough().optional(),
}).passthrough();

export type PluginManifest = z.infer<typeof PluginManifestSchema>;
