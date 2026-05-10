// Catalog data layer — turns raw Markdown bundles loaded by Astro
// Content Collections (the `SKILL.md`, `DESIGN.md`, `*.md` craft files,
// and Live Artifact `README.md` bundles in the repo root) into the
// shaped records the index and detail pages render.
//
// Why this lives in `_lib/` and not in the page files: every page
// imports from one place, so the parsing rules (folder-name slug,
// description fallback, palette extraction, etc.) stay consistent.

import { getCollection, type CollectionEntry } from 'astro:content';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Preview imagery lookup
//
// Previews are produced offline by `pnpm --filter @open-design/landing-page
// previews` and saved under `public/previews/<bucket>/<slug>.png`. We read
// the directory listing once at build time so each catalog record can carry
// a `previewUrl` (or `null` when the underlying skill has no `example.html`).
// ---------------------------------------------------------------------------

const PREVIEWS_ROOT = path.resolve(
  fileURLToPath(new URL('../../public/previews', import.meta.url)),
);

function listPreviews(bucket: 'skills' | 'systems' | 'templates'): Set<string> {
  const dir = path.join(PREVIEWS_ROOT, bucket);
  if (!existsSync(dir)) return new Set();
  const slugs = new Set<string>();
  for (const file of readdirSync(dir)) {
    const m = /^(.+)\.(png|webp|jpg|jpeg)$/i.exec(file);
    if (m && m[1]) slugs.add(m[1]);
  }
  return slugs;
}

function previewUrlFor(
  bucket: 'skills' | 'systems' | 'templates',
  slug: string,
  available: Set<string>,
): string | null {
  return available.has(slug) ? `/previews/${bucket}/${slug}.png` : null;
}

const REPO_TREE = 'https://github.com/nexu-io/open-design/tree/main';
const REPO_BLOB = 'https://github.com/nexu-io/open-design/blob/main';

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export type SkillEntry = CollectionEntry<'skills'>;

export interface SkillRecord {
  slug: string;
  name: string;
  description: string;
  triggers: ReadonlyArray<string>;
  mode?: string;
  platform?: string;
  scenario?: string;
  category?: string;
  featured?: number;
  upstream?: string;
  examplePrompt?: string;
  source: string;
  body: string;
  /** `/previews/skills/<slug>.png` if a generated preview exists, else null. */
  previewUrl: string | null;
}

function deriveSkillSlug(id: string): string {
  // `id` is `[folder]/SKILL` (no extension). We want the folder name.
  const folder = id.split('/')[0] ?? id;
  return folder;
}

function firstParagraph(text: string | undefined, fallback = ''): string {
  if (!text) return fallback;
  return text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? fallback;
}

export function shapeSkill(
  entry: SkillEntry,
  previews: Set<string>,
): SkillRecord {
  const slug = deriveSkillSlug(entry.id);
  const data = entry.data as {
    name?: string;
    description?: string;
    triggers?: string[];
    od?: {
      mode?: string;
      platform?: string;
      scenario?: string;
      category?: string;
      featured?: number;
      upstream?: string;
      example_prompt?: string;
    };
  };
  const description = (data.description ?? '').trim();
  return {
    slug,
    name: data.name ?? slug,
    description,
    triggers: data.triggers ?? [],
    mode: data.od?.mode,
    platform: data.od?.platform,
    scenario: data.od?.scenario,
    category: data.od?.category,
    featured: data.od?.featured,
    upstream: data.od?.upstream,
    examplePrompt: data.od?.example_prompt,
    source: `${REPO_TREE}/skills/${slug}`,
    body: entry.body ?? '',
    previewUrl: previewUrlFor('skills', slug, previews),
  };
}

export async function getSkillRecords(): Promise<ReadonlyArray<SkillRecord>> {
  const previews = listPreviews('skills');
  const entries = await getCollection('skills');
  const shaped = entries.map((entry) => shapeSkill(entry, previews));
  return shaped.sort((a, b) => {
    // Featured (lower number = higher priority) first, then alphabetical.
    const af = a.featured ?? Number.POSITIVE_INFINITY;
    const bf = b.featured ?? Number.POSITIVE_INFINITY;
    if (af !== bf) return af - bf;
    return a.name.localeCompare(b.name);
  });
}

// ---------------------------------------------------------------------------
// Design Systems
// ---------------------------------------------------------------------------

export type SystemEntry = CollectionEntry<'systems'>;

export interface SystemRecord {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  atmosphere: string;
  palette: ReadonlyArray<string>;
  source: string;
  body: string;
}

function extractH1(body: string): string | undefined {
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) return trimmed.slice(2).trim();
  }
  return undefined;
}

function extractCategoryBlock(body: string): { category: string; tagline: string } {
  // Convention: a `> Category:` blockquote, optionally followed by extra
  // tagline lines also prefixed with `>`.
  const lines = body.split('\n');
  let category = '';
  const taglineLines: string[] = [];
  let inBlock = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!inBlock) {
      const m = /^>\s*Category:\s*(.+)$/i.exec(line);
      if (m && m[1]) {
        category = m[1].trim();
        inBlock = true;
        continue;
      }
    } else {
      if (line.startsWith('>')) {
        const text = line.replace(/^>\s?/, '').trim();
        if (text.length > 0) taglineLines.push(text);
      } else if (line.length === 0 && taglineLines.length === 0) {
        // tolerate a single blank line between Category and tagline
      } else {
        break;
      }
    }
  }
  return { category, tagline: taglineLines.join(' ').trim() };
}

function extractAtmosphere(body: string): string {
  // Take the first paragraph of the first H2 section that looks like
  // "Visual Theme & Atmosphere" (or any first paragraph after `## 1.`).
  const lines = body.split('\n');
  let inSection = false;
  const buf: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!inSection) {
      if (/^##\s+1\./.test(raw) || /^##\s+.*Atmosphere/i.test(raw)) {
        inSection = true;
      }
      continue;
    }
    if (line.startsWith('##')) break;
    if (line.length === 0 && buf.length > 0) break;
    if (line.length === 0) continue;
    buf.push(line);
  }
  return buf.join(' ').trim();
}

const HEX_RE = /#[0-9a-fA-F]{6}\b/g;

function extractPalette(body: string, limit = 5): ReadonlyArray<string> {
  const seen = new Set<string>();
  const matches = body.match(HEX_RE) ?? [];
  for (const hex of matches) {
    seen.add(hex.toLowerCase());
    if (seen.size >= limit) break;
  }
  return Array.from(seen);
}

export function shapeSystem(entry: SystemEntry): SystemRecord {
  const slug = entry.id.split('/')[0] ?? entry.id;
  const body = entry.body ?? '';
  const h1 = extractH1(body) ?? slug;
  const { category, tagline } = extractCategoryBlock(body);
  const atmosphere = extractAtmosphere(body);
  const palette = extractPalette(body);
  return {
    slug,
    name: h1.replace(/^Design System Inspired by\s+/i, '').trim() || slug,
    category: category || 'Uncategorized',
    tagline,
    atmosphere,
    palette,
    source: `${REPO_TREE}/design-systems/${slug}`,
    body,
  };
}

export async function getSystemRecords(): Promise<ReadonlyArray<SystemRecord>> {
  const entries = await getCollection('systems');
  return entries
    .map(shapeSystem)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Craft
// ---------------------------------------------------------------------------

export type CraftEntry = CollectionEntry<'craft'>;

export interface CraftRecord {
  slug: string;
  name: string;
  summary: string;
  source: string;
  body: string;
}

const CRAFT_NAME_OVERRIDES: Record<string, string> = {
  'rtl-and-bidi': 'RTL & Bidi',
};

function titleizeSlug(slug: string): string {
  const override = CRAFT_NAME_OVERRIDES[slug];
  if (override) return override;
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function shapeCraft(entry: CraftEntry): CraftRecord {
  const slug = entry.id;
  const body = entry.body ?? '';
  const h1 = extractH1(body);
  // First non-heading paragraph after the H1.
  const lines = body.split('\n');
  const buf: string[] = [];
  let pastH1 = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!pastH1) {
      if (line.startsWith('# ')) pastH1 = true;
      continue;
    }
    if (line.startsWith('#')) break;
    if (line.length === 0 && buf.length > 0) break;
    if (line.length === 0) continue;
    buf.push(line);
  }
  return {
    slug,
    name: h1 ? h1.replace(/\s+craft rules?$/i, '').trim() : titleizeSlug(slug),
    summary: buf.join(' ').trim(),
    source: `${REPO_BLOB}/craft/${slug}.md`,
    body,
  };
}

export async function getCraftRecords(): Promise<ReadonlyArray<CraftRecord>> {
  const entries = await getCollection('craft');
  return entries
    .filter((e) => e.id !== 'README')
    .map(shapeCraft)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Templates — Live Artifacts + skills with `mode: template`
// ---------------------------------------------------------------------------

export interface TemplateRecord {
  slug: string;
  name: string;
  summary: string;
  origin: 'live-artifact' | 'skill';
  source: string;
  detailHref: string;
  /** Skill body / template README body (Markdown). */
  body: string;
  previewUrl: string | null;
}

export type TemplateEntry = CollectionEntry<'templates'>;

export function shapeLiveArtifactTemplate(
  entry: TemplateEntry,
  previews: Set<string>,
): TemplateRecord {
  const slug = entry.id.split('/')[0] ?? entry.id;
  const body = entry.body ?? '';
  const h1 = extractH1(body);
  const lines = body.split('\n');
  const buf: string[] = [];
  let pastH1 = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!pastH1) {
      if (line.startsWith('# ')) pastH1 = true;
      continue;
    }
    if (line.startsWith('#')) break;
    if (line.length === 0 && buf.length > 0) break;
    if (line.length === 0) continue;
    buf.push(line);
  }
  const liveSlug = `live-${slug}`;
  return {
    slug: liveSlug,
    name: h1 ?? titleizeSlug(slug),
    summary: buf.join(' ').trim() || 'Open Design Live Artifact template.',
    origin: 'live-artifact',
    source: `${REPO_TREE}/templates/live-artifacts/${slug}`,
    detailHref: `/templates/${liveSlug}/`,
    body,
    previewUrl: previewUrlFor('templates', liveSlug, previews),
  };
}

export async function getTemplateRecords(): Promise<ReadonlyArray<TemplateRecord>> {
  const previews = listPreviews('templates');
  const liveEntries = await getCollection('templates');
  const liveRecords = liveEntries.map((entry) => shapeLiveArtifactTemplate(entry, previews));

  const skillRecords = await getSkillRecords();
  const skillTemplates: TemplateRecord[] = skillRecords
    .filter((s) => s.mode === 'template')
    .map((s) => ({
      slug: `skill-${s.slug}`,
      name: s.name,
      summary: firstParagraph(s.description),
      origin: 'skill' as const,
      source: s.source,
      detailHref: `/skills/${s.slug}/`,
      body: s.body,
      // Templates render skill-mode skill thumbnails reusing the
      // /previews/skills/ tree (no separate render).
      previewUrl: s.previewUrl,
    }));

  return [...liveRecords, ...skillTemplates].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

// ---------------------------------------------------------------------------
// Counts (used for nav badges)
// ---------------------------------------------------------------------------

export async function getCatalogCounts(): Promise<{
  skills: number;
  systems: number;
  templates: number;
  craft: number;
}> {
  const [skills, systems, templates, craft] = await Promise.all([
    getSkillRecords(),
    getSystemRecords(),
    getTemplateRecords(),
    getCraftRecords(),
  ]);
  return {
    skills: skills.length,
    systems: systems.length,
    templates: templates.length,
    craft: craft.length,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function uniq<T>(values: ReadonlyArray<T>): ReadonlyArray<T> {
  return Array.from(new Set(values));
}

export function tally<T extends string | number>(values: ReadonlyArray<T>): ReadonlyArray<readonly [T, number]> {
  const map = new Map<T, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

// ---------------------------------------------------------------------------
// Tag slugification (used for `/skills/mode/<slug>/`,
// `/skills/scenario/<slug>/`, `/systems/category/<slug>/` routes).
//
// Stable, lossless rules:
//   "AI & LLM"               → "ai-llm"
//   "Productivity & SaaS"    → "productivity-saas"
//   "Editorial · Studio"     → "editorial-studio"
//   "Editorial / Print"      → "editorial-print"
//   "live-artifacts"         → "live-artifacts"  (already a slug)
// ---------------------------------------------------------------------------

export function slugifyTag(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Tag canonicalization — collapse near-duplicate authoring spellings into
// one route per concept. Without this, `od.scenario: operation` and
// `od.scenario: operations` would generate two separate `/skills/scenario/...`
// pages for what is plainly the same facet.
//
// Keep aliases conservative — only collapse values that mean exactly the
// same thing (singular/plural, hyphen/space variants). Add more entries as
// inconsistencies appear; the alias key is matched case-insensitively
// against the raw frontmatter value before slugification.
// ---------------------------------------------------------------------------

const SCENARIO_ALIASES: Readonly<Record<string, string>> = {
  operation: 'operations',
  live: 'live-artifacts',
};

const MODE_ALIASES: Readonly<Record<string, string>> = {
  // No aliases needed today — modes are an enum maintained centrally.
};

const CATEGORY_ALIASES: Readonly<Record<string, string>> = {
  // No aliases needed today — categories come from DESIGN.md headers
  // and are reasonably consistent across the corpus.
};

function canonicalize(
  raw: string | undefined,
  aliases: Readonly<Record<string, string>>,
): string | undefined {
  if (!raw) return raw;
  const key = raw.trim().toLowerCase();
  return aliases[key] ?? raw;
}

export function canonicalScenario(raw: string | undefined): string | undefined {
  return canonicalize(raw, SCENARIO_ALIASES);
}

export function canonicalMode(raw: string | undefined): string | undefined {
  return canonicalize(raw, MODE_ALIASES);
}

export function canonicalCategory(raw: string | undefined): string | undefined {
  return canonicalize(raw, CATEGORY_ALIASES);
}

export interface TagDescriptor {
  slug: string;
  label: string;
  count: number;
}

/** Build [slug, label, count] index over a list of (possibly undefined) values. */
export function tagIndex(values: ReadonlyArray<string | undefined>): ReadonlyArray<TagDescriptor> {
  const counts = new Map<string, { label: string; count: number }>();
  for (const v of values) {
    if (!v) continue;
    const slug = slugifyTag(v);
    const existing = counts.get(slug);
    if (existing) {
      existing.count++;
    } else {
      counts.set(slug, { label: v, count: 1 });
    }
  }
  return Array.from(counts.entries())
    .map(([slug, { label, count }]) => ({ slug, label, count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

// ---------------------------------------------------------------------------
// Tag-page selectors (used by the `/skills/mode/<slug>/` etc. routes via
// getStaticPaths). Each returns the matching records plus the canonical
// human label (preserving the original `od.mode` casing for the heading).
// ---------------------------------------------------------------------------

export async function getSkillsForMode(slug: string): Promise<{
  label: string | null;
  records: ReadonlyArray<SkillRecord>;
}> {
  const all = await getSkillRecords();
  const matches = all.filter((s) => {
    const canonical = canonicalMode(s.mode);
    return canonical && slugifyTag(canonical) === slug;
  });
  return {
    label: canonicalMode(matches[0]?.mode) ?? null,
    records: matches,
  };
}

export async function getSkillsForScenario(slug: string): Promise<{
  label: string | null;
  records: ReadonlyArray<SkillRecord>;
}> {
  const all = await getSkillRecords();
  const matches = all.filter((s) => {
    const canonical = canonicalScenario(s.scenario);
    return canonical && slugifyTag(canonical) === slug;
  });
  return {
    label: canonicalScenario(matches[0]?.scenario) ?? null,
    records: matches,
  };
}

export async function getSystemsForCategory(slug: string): Promise<{
  label: string | null;
  records: ReadonlyArray<SystemRecord>;
}> {
  const all = await getSystemRecords();
  const matches = all.filter((s) => {
    const canonical = canonicalCategory(s.category);
    return canonical !== undefined && slugifyTag(canonical) === slug;
  });
  return {
    label: canonicalCategory(matches[0]?.category) ?? null,
    records: matches,
  };
}

export async function getSkillModeIndex(): Promise<ReadonlyArray<TagDescriptor>> {
  const all = await getSkillRecords();
  return tagIndex(all.map((s) => canonicalMode(s.mode)));
}

export async function getSkillScenarioIndex(): Promise<ReadonlyArray<TagDescriptor>> {
  const all = await getSkillRecords();
  return tagIndex(all.map((s) => canonicalScenario(s.scenario)));
}

export async function getSystemCategoryIndex(): Promise<ReadonlyArray<TagDescriptor>> {
  const all = await getSystemRecords();
  return tagIndex(all.map((s) => canonicalCategory(s.category)));
}
