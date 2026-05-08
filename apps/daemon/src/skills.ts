// @ts-nocheck
// Skill registry. Scans one or more on-disk roots for SKILL.md files, parses
// front-matter, returns listing. No watching in this MVP — re-scans on every
// GET /api/skills, which is fine for dozens of skills.
//
// Roots are passed in priority order: the first one wins on `id` collisions
// so user-imported skills under USER_SKILLS_DIR can shadow a built-in skill
// of the same name without erasing the built-in copy.

import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import { SKILLS_CWD_ALIAS } from "./cwd-aliases.js";

// Persisted skill ids on existing projects can outlive a folder rename.
// listSkills() derives the id from the SKILL.md frontmatter `name`, so once
// a skill is renamed the old id stops resolving and composeSystemPrompt
// silently drops the skill body for projects saved against the old id.
// This map forwards deprecated ids to their current canonical id; callers
// resolve through findSkillById() before scanning the listing. Leave entries
// here for at least one stable release after a rename so on-disk projects
// keep composing with the intended skill prompt.
export const SKILL_ID_ALIASES = Object.freeze({
  "editorial-collage": "open-design-landing",
  "editorial-collage-deck": "open-design-landing-deck",
});

export function resolveSkillId(id) {
  if (typeof id !== "string" || id.length === 0) return id;
  return SKILL_ID_ALIASES[id] ?? id;
}

// Lookup helper that mirrors `skills.find((s) => s.id === id)` but first
// rewrites any deprecated id to its current canonical form. Use this at
// every site that resolves a stored or external skill id; calling
// `.find()` directly will silently miss aliased ids.
export function findSkillById(skills, id) {
  if (!Array.isArray(skills) || typeof id !== "string" || id.length === 0) {
    return undefined;
  }
  const canonical = resolveSkillId(id);
  return skills.find((s) => s.id === canonical);
}

// Accept either a single root or an array. The first root wins on id
// collisions so user-imported skills can shadow a built-in by the same name.
// Each surfaced summary carries a `source` ("built-in" | "user") so the UI
// can render an origin pill and gate the delete control.
export async function listSkills(skillsRoots: any): Promise<any[]> {
  const roots = Array.isArray(skillsRoots) ? skillsRoots : [skillsRoots];
  const out: any[] = [];
  const seen: Set<string> = new Set();
  for (let i = 0; i < roots.length; i += 1) {
    const skillsRoot = roots[i];
    if (!skillsRoot) continue;
    const source = i === 0 ? "user" : "built-in";
    let entries = [];
    try {
      entries = await readdir(skillsRoot, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(skillsRoot, entry.name);
      const skillPath = path.join(dir, "SKILL.md");
      try {
        const stats = await stat(skillPath);
        if (!stats.isFile()) continue;
        const raw = await readFile(skillPath, "utf8");
        const { data, body } = parseFrontmatter(raw);
        const parentId = data.name || entry.name;
        if (seen.has(parentId)) continue;
        seen.add(parentId);
        const hasAttachments = await dirHasAttachments(dir);
        const mode = data.od?.mode || inferMode(body, data.description);
        const surface = normalizeSurface(data.od?.surface, mode);
        const platform = normalizePlatform(
          data.od?.platform,
          mode,
          body,
          data.description
        );
        const scenario = normalizeScenario(
          data.od?.scenario,
          body,
          data.description
        );
        const designSystemRequired = data.od?.design_system?.requires ?? true;
        const upstream =
          typeof data.od?.upstream === "string" ? data.od.upstream : null;
        const previewType = data.od?.preview?.type || "html";
        const parentBody = hasAttachments ? withSkillRootPreamble(body, dir) : body;
        // Pre-compute derived examples so the parent entry can advertise
        // `aggregatesExamples` in the same push. The frontend uses that
        // flag to hide the parent card from the gallery (its preview
        // would duplicate one of the derived cards), while the daemon
        // keeps the parent in the listing so `findSkillById` still
        // resolves it for system-prompt composition and id alias lookups.
        const derivedExamples = await collectDerivedExamples(dir);
        const aggregatesExamples = derivedExamples.length > 0;
        out.push({
          id: parentId,
          name: parentId,
          description: data.description || "",
          triggers: Array.isArray(data.triggers) ? data.triggers : [],
          mode,
          surface,
          source,
          craftRequires: normalizeCraftRequires(data.od?.craft?.requires),
          platform,
          scenario,
          previewType,
          designSystemRequired,
          defaultFor: normalizeDefaultFor(data.od?.default_for),
          upstream,
          featured: normalizeFeatured(data.od?.featured),
          // Optional metadata hints used by 'Use this prompt' fast-create
          // so the resulting project mirrors the shipped example.html.
          // Each hint is only consumed when its kind matches the skill
          // mode; missing hints fall back to the new-project defaults.
          fidelity: normalizeFidelity(data.od?.fidelity),
          speakerNotes: normalizeBoolHint(data.od?.speaker_notes),
          animations: normalizeBoolHint(data.od?.animations),
          examplePrompt: derivePrompt(data),
          aggregatesExamples,
          body: parentBody,
          dir,
        });

        // Surface every example sitting next to a SKILL.md as its own card
        // so a single skill (e.g. live-artifact) can ship a small gallery
        // of hand-crafted samples without needing one SKILL.md per sample.
        // Each derived card inherits the parent's mode/platform/surface/
        // scenario so existing TYPE/SURFACE filters keep working; the
        // synthetic id `<parent>:<child>` lets `/api/skills/:id/example`
        // resolve straight to the matching HTML on disk. We deliberately
        // do not inherit `featured` so derived cards never crowd the
        // magazine row.
        for (const example of derivedExamples) {
          const derivedId = `${parentId}:${example.key}`;
          if (seen.has(derivedId)) continue;
          seen.add(derivedId);
          out.push({
            id: derivedId,
            name: humanizeExampleName(example.key),
            description: data.description || "",
            triggers: Array.isArray(data.triggers) ? data.triggers : [],
            mode,
            surface,
            source,
            craftRequires: [],
            platform,
            scenario,
            previewType,
            designSystemRequired,
            defaultFor: [],
            upstream,
            featured: null,
            fidelity: normalizeFidelity(data.od?.fidelity),
            speakerNotes: normalizeBoolHint(data.od?.speaker_notes),
            animations: normalizeBoolHint(data.od?.animations),
            examplePrompt: derivePrompt(data),
            aggregatesExamples: false,
            // Inherit the parent's full SKILL.md body so 'Use this prompt'
            // on a derived card seeds the agent with the same workflow
            // the parent describes. Without this, picking a derived card
            // would compose an empty system prompt.
            body: parentBody,
            dir,
          });
        }
      } catch {
        // Skip unreadable entries — this is discovery, not validation.
      }
    }
  }
  return out;
}

// Discover example artifacts that live alongside SKILL.md under
// `<dir>/examples/`. Only the single-file layout is surfaced:
//
//   `examples/<name>.html` — pre-baked, self-contained sample.
//
// We deliberately do not surface the subfolder layout (e.g. live-artifact's
// `examples/<name>/template.html` + `data.json`) because those templates
// still hold `{{data.x}}` placeholders that only the daemon-side renderer
// fills in. Showing the raw template would render visible placeholder
// braces in the gallery — worse than not surfacing the example at all.
// To ship a subfolder-style example, place the baked output beside the
// folder as `examples/<name>.html` (the canonical render) and keep the
// subfolder around as agent-readable source.
async function collectDerivedExamples(dir) {
  const examplesDir = path.join(dir, "examples");
  let entries = [];
  try {
    entries = await readdir(examplesDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".html")) continue;
    const key = entry.name.replace(/\.html$/i, "");
    if (!isSafeExampleKey(key)) continue;
    out.push({ key });
  }
  // Stable order so the gallery renders the same sequence on every reload.
  out.sort((a, b) => a.key.localeCompare(b.key));
  return out;
}

// Reject keys that could escape the examples folder or break the
// `<parent>:<child>` id format. Letters/digits/dash/dot/underscore only,
// and never the dotfile path-traversal patterns.
function isSafeExampleKey(key) {
  if (!key || key.startsWith(".")) return false;
  if (key.includes(":")) return false;
  return /^[A-Za-z0-9._-]+$/.test(key);
}

// Turn a basename like `stock-portfolio-live` into a title-cased label
// (`Stock Portfolio Live`) so the gallery card has a readable heading
// without forcing every example to ship its own frontmatter.
function humanizeExampleName(key) {
  return key
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) =>
      word.length === 0
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

// Used by `/api/skills/:id/example` to resolve a derived id back to its
// on-disk file. Returns null when the key is unsafe; the route checks
// `fs.existsSync` against the returned path before reading.
export function resolveDerivedExamplePath(parentDir, childKey) {
  if (!isSafeExampleKey(childKey)) return null;
  return path.join(parentDir, "examples", `${childKey}.html`);
}

// Split a `<parent>:<child>` synthetic id into its two halves. Returns
// null for non-derived ids so the caller can fall through to the regular
// listing-based lookup.
export function splitDerivedSkillId(id) {
  if (typeof id !== "string") return null;
  const idx = id.indexOf(":");
  if (idx <= 0 || idx === id.length - 1) return null;
  const parentId = id.slice(0, idx);
  const childKey = id.slice(idx + 1);
  if (!isSafeExampleKey(childKey)) return null;
  return { parentId, childKey };
}

// Skills that ship side files (e.g. `assets/template.html`, `references/*.md`)
// need the agent to know where the skill lives on disk — relative paths in the
// SKILL.md body would otherwise resolve against the agent's CWD, which is the
// project folder (`.od/projects/<id>/`), not the skill folder.
//
// We prepend a short preamble that advertises two paths:
//
//   1. A CWD-relative alias path (`.od-skills/<folder>/`) — the primary one.
//      Before spawning the agent the chat handler copies the active skill
//      into `<cwd>/.od-skills/<folder>/` (see `cwd-aliases.ts`), so this
//      path is inside the agent's working directory on every CLI and is
//      not blocked by directory-access policies (issue #430).
//   2. The absolute repo path — a fallback for the cases the staged copy
//      cannot exist for: `/api/runs` calls without a project (cwd falls
//      back to the repo root, where the absolute path *is* an in-cwd
//      path), or environments where staging fails. Claude/Copilot are
//      additionally given `--add-dir` for that absolute path, so the
//      fallback round-trips even under their permission policy.
//
// Authoring guidance lives in the preamble itself so an agent can pick
// the right form on its own without daemon-side feature detection.
function withSkillRootPreamble(body, dir) {
  const referencedFiles = collectReferencedSideFiles(body);
  const folder = path.basename(dir);
  const skillRootRel = `${SKILLS_CWD_ALIAS}/${folder}`;
  const exampleFile = referencedFiles[0];
  const relativeGuidance = exampleFile
    ? "> below references side files such as `" + exampleFile + "`, prefer the\n" +
      "> relative form rooted at the first path above — e.g. open `" +
      skillRootRel + "/" + exampleFile + "`."
    : "> below references side files, prefer the relative form rooted at the\n" +
      "> first path above.";
  const absoluteGuidance = exampleFile
    ? "> back to the absolute path: `" + path.join(dir, exampleFile) + "`."
    : "> back to the absolute skill root above.";
  const preamble = [
    "> **Skill root (relative to project):** `" + skillRootRel + "/`",
    "> **Skill root (absolute fallback):** `" + dir + "`",
    ">",
    "> This skill ships side files alongside `SKILL.md`. When the workflow",
    relativeGuidance,
    "> If that path is not reachable from your working directory, fall",
    absoluteGuidance,
    "> Either form resolves to the same file; the relative form keeps you",
    "> inside the project working directory, which is preferred.",
    ...(referencedFiles.length > 0
      ? [
          ">",
          "> Known side files in this skill: " +
            referencedFiles.map((file) => "`" + file + "`").join(", ") +
            ".",
        ]
      : []),
    "",
    "",
  ].join("\n");
  return preamble + body;
}

function collectReferencedSideFiles(body) {
  const files = new Set();
  const matches = body.matchAll(/\b(?:assets|references)\/[A-Za-z0-9._-]+\b/g);
  for (const match of matches) files.add(match[0]);
  if (/\bexample\.html\b/.test(body)) files.add("example.html");
  return Array.from(files).sort();
}

async function dirHasAttachments(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.some(
      (e) =>
        e.name !== "SKILL.md" &&
        (e.isDirectory() || /\.(md|html|css|js|json|txt)$/i.test(e.name))
    );
  } catch {
    return false;
  }
}

// Craft sections live at <projectRoot>/craft/<name>.md. We accept any
// alphanumeric+dash slug here so adding a new section is as simple as
// dropping a file in craft/ and listing its name in the skill — no
// daemon-side allowlist to keep in sync. The compose path checks the
// file actually exists before injecting; missing files fall through
// silently. The frontend can render the requested list verbatim.
function normalizeCraftRequires(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const v of value) {
    if (typeof v !== "string") continue;
    const slug = v.trim().toLowerCase();
    if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

function normalizeDefaultFor(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}

// Optional `od.fidelity` hint for prototype skills. Only 'wireframe' and
// 'high-fidelity' are meaningful — anything else collapses to null so the
// caller falls back to the form default ('high-fidelity').
function normalizeFidelity(value) {
  if (value === "wireframe" || value === "high-fidelity") return value;
  return null;
}

// Coerce truthy / falsy strings ("true", "yes", "false", "no") and booleans
// to a real boolean. Returns null for anything we can't interpret so the
// caller knows to fall back to the form default.
function normalizeBoolHint(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "yes" || v === "1") return true;
    if (v === "false" || v === "no" || v === "0") return false;
  }
  return null;
}

// Coerce `od.featured` into a numeric priority. Lower numbers float to the
// top of the Examples gallery; `true` is treated as priority 1; anything
// missing/unrecognised becomes null so non-featured skills keep their
// natural alphabetical order.
function normalizeFeatured(value) {
  if (value === true) return 1;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// Prefer an explicitly authored `od.example_prompt`. Fall back to the
// skill description's first sentence — it's already written in actionable
// language ("Admin / analytics dashboard in a single HTML file…") so it
// serves as a passable starter prompt.
function derivePrompt(data) {
  const explicit = data.od?.example_prompt;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const desc =
    typeof data.description === "string" ? data.description.trim() : "";
  if (!desc) return "";
  const collapsed = desc.replace(/\s+/g, " ").trim();
  const firstSentence = collapsed.match(/^.+?[.!?。！？](?:\s|$)/)?.[0]?.trim();
  return (firstSentence || collapsed).slice(0, 320);
}

function inferMode(body, description) {
  const hay = `${description ?? ""}\n${body ?? ""}`.toLowerCase();
  if (/\bimage|poster|illustration|photography|图片|海报|插画/.test(hay)) return "image";
  if (/\bvideo|motion|shortform|animation|视频|动效|短片/.test(hay)) return "video";
  if (/\baudio|music|jingle|tts|sound|音频|音乐|配音|音效/.test(hay)) return "audio";
  if (/\bppt|deck|slide|presentation|幻灯|投影/.test(hay)) return "deck";
  if (/\bdesign[- ]system|\bdesign\.md|\bdesign tokens/.test(hay))
    return "design-system";
  if (/\btemplate\b/.test(hay)) return "template";
  return "prototype";
}

const KNOWN_SURFACES = new Set(["web", "image", "video", "audio"]);
function normalizeSurface(value, mode) {
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (KNOWN_SURFACES.has(v)) return v;
  }
  if (mode === "image" || mode === "video" || mode === "audio") return mode;
  return "web";
}

// Validate platform tag — only desktop / mobile are meaningful for the
// Examples gallery. Falls back to autodetecting "mobile" from descriptions
// so legacy skills sort under the right pill without authoring changes.
function normalizePlatform(value, mode, body, description) {
  if (value === "desktop" || value === "mobile") return value;
  if (mode !== "prototype") return null;
  const hay = `${description ?? ""}\n${body ?? ""}`.toLowerCase();
  if (/mobile|phone|ios|android|手机|移动端/.test(hay)) return "mobile";
  return "desktop";
}

// Normalise a scenario tag to a small fixed vocabulary so the filter pills
// stay tidy. Unknown values pass through verbatim so authors can experiment;
// missing values default to "general".
const KNOWN_SCENARIOS = new Set([
  "general",
  "engineering",
  "product",
  "design",
  "marketing",
  "sales",
  "finance",
  "hr",
  "operations",
  "support",
  "legal",
  "education",
  "personal",
]);
function normalizeScenario(value, body, description) {
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v) return v;
  }
  const hay = `${description ?? ""}\n${body ?? ""}`.toLowerCase();
  if (/finance|invoice|expense|budget|p&l|revenue/.test(hay)) return "finance";
  if (/\bhr\b|onboarding|payroll|employee|人事/.test(hay)) return "hr";
  if (/marketing|campaign|brand|landing/.test(hay)) return "marketing";
  if (/runbook|incident|deploy|engineering|sre|api/.test(hay))
    return "engineering";
  if (/spec|prd|roadmap|product manager|product team/.test(hay))
    return "product";
  if (/design system|moodboard|mockup|ui kit/.test(hay)) return "design";
  if (/sales|quote|proposal|lead/.test(hay)) return "sales";
  if (/operations|ops|logistics|inventory/.test(hay)) return "operations";
  return "general";
}
// Surface the vocabulary so callers (frontend filter UI) could mirror it
// later if they want to. Not exported today, kept here for documentation.
void KNOWN_SCENARIOS;

// ---------------------------------------------------------------------------
// User-skill import / delete primitives
// ---------------------------------------------------------------------------
// User-imported skills live under <runtimeData>/user-skills/<slug>/SKILL.md.
// We treat that directory as fully owned by the daemon, so import/delete are
// simple: write or rm the slug folder and let listSkills() pick the change up
// on the next /api/skills request. The slug is derived from the user-supplied
// `name` (alphanumeric + dash) and prefixed with `user-` only when an existing
// built-in skill folder shares the same id, to avoid colliding with a
// repo-shipped folder.

export class SkillImportError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const RESERVED_SLUGS = new Set(["", ".", ".."]);

export function slugifySkillName(name) {
  if (typeof name !== "string") return "";
  const lowered = name.trim().toLowerCase();
  const cleaned = lowered
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  if (!cleaned || RESERVED_SLUGS.has(cleaned)) return "";
  return cleaned.slice(0, 64);
}

function escapeYamlString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildSkillMarkdown({ name, description, body, triggers }) {
  const lines = ["---", `name: ${escapeYamlString(name)}`];
  if (description && description.trim().length > 0) {
    lines.push("description: |");
    for (const ln of description.trim().split(/\r?\n/)) {
      lines.push(`  ${ln}`);
    }
  }
  if (Array.isArray(triggers) && triggers.length > 0) {
    lines.push("triggers:");
    for (const t of triggers) {
      if (typeof t !== "string") continue;
      const trimmed = t.trim();
      if (!trimmed) continue;
      lines.push(`  - "${escapeYamlString(trimmed)}"`);
    }
  }
  lines.push("---", "", body.trim(), "");
  return lines.join("\n");
}

export async function importUserSkill(userSkillsRoot, input) {
  const name =
    typeof input?.name === "string" ? input.name.trim() : "";
  const description =
    typeof input?.description === "string" ? input.description : "";
  const body = typeof input?.body === "string" ? input.body : "";
  if (!name) {
    throw new SkillImportError("BAD_REQUEST", "skill name required");
  }
  if (!body || body.trim().length === 0) {
    throw new SkillImportError("BAD_REQUEST", "skill body required");
  }
  const slug = slugifySkillName(name);
  if (!slug) {
    throw new SkillImportError(
      "BAD_REQUEST",
      "skill name must produce a valid slug (a-z, 0-9, dash)"
    );
  }
  const triggersRaw = Array.isArray(input?.triggers) ? input.triggers : [];
  const triggers = triggersRaw
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean);

  await mkdir(userSkillsRoot, { recursive: true });
  const dir = path.join(userSkillsRoot, slug);
  // Refuse to overwrite an existing folder. The caller can DELETE first
  // when intentionally replacing a skill.
  try {
    const existing = await stat(dir);
    if (existing) {
      throw new SkillImportError(
        "CONFLICT",
        `a user skill with slug "${slug}" already exists`
      );
    }
  } catch (err) {
    if (err instanceof SkillImportError) throw err;
    if (err && err.code !== "ENOENT") {
      throw new SkillImportError(
        "INTERNAL_ERROR",
        `could not check skill dir: ${err.message ?? err}`
      );
    }
  }
  await mkdir(dir, { recursive: true });
  const md = buildSkillMarkdown({ name, description, body, triggers });
  await writeFile(path.join(dir, "SKILL.md"), md, "utf8");
  return { id: name, slug, dir };
}

export async function deleteUserSkill(userSkillsRoot, id) {
  const slug = slugifySkillName(id);
  if (!slug) {
    throw new SkillImportError("BAD_REQUEST", "invalid skill id");
  }
  const dir = path.join(userSkillsRoot, slug);
  const root = path.resolve(userSkillsRoot);
  const target = path.resolve(dir);
  if (target !== dir || !target.startsWith(root + path.sep)) {
    // Defence-in-depth: refuse to delete anything outside the user-skills
    // root. The slugify above already strips traversal characters.
    throw new SkillImportError("BAD_REQUEST", "invalid skill path");
  }
  try {
    await stat(target);
  } catch (err) {
    if (err && err.code === "ENOENT") {
      throw new SkillImportError("NOT_FOUND", "user skill not found");
    }
    throw err;
  }
  await rm(target, { recursive: true, force: true });
}
