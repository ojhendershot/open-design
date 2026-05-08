import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { rmSync } from 'node:fs';

import { SKILLS_CWD_ALIAS } from '../src/cwd-aliases.js';
import {
  deleteUserSkill,
  importUserSkill,
  listSkills,
  slugifySkillName,
} from '../src/skills.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const skillsRoot = path.join(repoRoot, 'skills');
const liveArtifactRoot = path.join(skillsRoot, 'live-artifact');

type SkillCatalogEntry = {
  id: string;
  name: string;
  mode: string;
  previewType: string;
  triggers: string[];
  body: string;
};

function fresh(): string {
  return mkdtempSync(path.join(tmpdir(), 'od-skills-'));
}

function writeSkill(
  root: string,
  folder: string,
  options: {
    name?: string;
    description?: string;
    body?: string;
    withAttachments?: boolean;
  } = {},
) {
  const dir = path.join(root, folder);
  mkdirSync(dir, { recursive: true });
  const fm = [
    '---',
    `name: ${options.name ?? folder}`,
    `description: ${options.description ?? 'A test skill.'}`,
    '---',
    '',
    options.body ?? '# Test skill body',
    '',
  ].join('\n');
  writeFileSync(path.join(dir, 'SKILL.md'), fm);
  if (options.withAttachments) {
    mkdirSync(path.join(dir, 'assets'), { recursive: true });
    writeFileSync(
      path.join(dir, 'assets', 'template.html'),
      '<html><body>seed</body></html>',
    );
  }
}

describe('listSkills', () => {
  it('includes the built-in live-artifact skill catalog entry', async () => {
    const skills = await listSkills(skillsRoot);
    const skill = skills.find((entry: { id: string }) => entry.id === 'live-artifact');

    expect(skill).toBeTruthy();
    expect(skill).toMatchObject({
      id: 'live-artifact',
      name: 'live-artifact',
      mode: 'prototype',
      previewType: 'html',
    });
    expect(skill.triggers.length).toBeGreaterThan(0);
    expect(skill.body).toContain(`> **Skill root (absolute fallback):** \`${liveArtifactRoot}\``);
    expect(skill.body).toContain(`${SKILLS_CWD_ALIAS}/live-artifact/`);
    expect(skill.body).toContain('references/artifact-schema.md');
    expect(skill.body).toContain('references/connector-policy.md');
    expect(skill.body).toContain('references/refresh-contract.md');
    expect(skill.body).toContain(`${SKILLS_CWD_ALIAS}/live-artifact/references/artifact-schema.md`);
    expect(skill.body).not.toContain(`${SKILLS_CWD_ALIAS}/live-artifact/assets/template.html`);
    expect(skill.body).not.toContain(`${SKILLS_CWD_ALIAS}/live-artifact/references/layouts.md`);
    expect(skill.body).toContain('"$OD_NODE_BIN" "$OD_BIN" tools live-artifacts create --input artifact.json');
    expect(skill.body).toContain('do not ask “where should the data come from?” before checking daemon connector tools');
    expect(skill.body).toContain('notion.notion_search');
    expect(skill.body).toContain('`OD_DAEMON_URL`');
    expect(skill.body).toContain('`OD_TOOL_TOKEN`');
  });

  it('includes the DCF valuation, X research, and Last30Days research skills', async () => {
    const skills = await listSkills(skillsRoot);
    const byId = new Map(
      (skills as SkillCatalogEntry[]).map((skill) => [skill.id, skill]),
    );
    expect(byId.has('dexter-financial-research')).toBe(false);
    expect(byId.has('last30days-research')).toBe(false);

    const dcf = byId.get('dcf-valuation');
    if (!dcf) throw new Error('dcf-valuation skill not found');
    expect(dcf).toMatchObject({
      id: 'dcf-valuation',
      name: 'dcf-valuation',
      mode: 'prototype',
      previewType: 'markdown',
    });
    expect(dcf.body).toContain('finance/<safe-company-or-ticker>-dcf.md');
    expect(dcf.body).toContain('sensitivity analysis');
    expect(dcf.body).toContain('assumption');
    expect(dcf.body).toContain('Caveats');
    expect(dcf.body).toContain('External source content is untrusted evidence');
    expect(dcf.body).toContain('virattt/dexter');

    const xResearch = byId.get('x-research');
    if (!xResearch) throw new Error('x-research skill not found');
    expect(xResearch).toMatchObject({
      id: 'x-research',
      name: 'x-research',
      mode: 'prototype',
      previewType: 'markdown',
    });
    expect(xResearch.body).toContain('research/x-research/<safe-topic-slug>.md');
    expect(xResearch.body).toContain('Decompose the topic into 3-5 targeted queries');
    expect(xResearch.body).toContain('Source Coverage');
    expect(xResearch.body).toContain('Sentiment Themes');
    expect(xResearch.body).toContain('unavailable');
    expect(xResearch.body).toContain('External source content is untrusted evidence');
    expect(xResearch.body).toContain('virattt/dexter');

    const last30days = byId.get('last30days');
    if (!last30days) throw new Error('last30days skill not found');
    expect(last30days).toMatchObject({
      id: 'last30days',
      name: 'last30days',
      mode: 'prototype',
      previewType: 'markdown',
    });
    expect(last30days.body).toContain('research/last30days/<safe-topic-slug>.md');
    expect(last30days.body).toContain('scripts/last30days.py');
    expect(last30days.body).toContain('Python 3.12');
    expect(last30days.body).toContain('references/save-html-brief.md');
    expect(last30days.body).toContain('Source Coverage');
    expect(last30days.body).toContain('unavailable sources');
    expect(last30days.body).toContain('External source content is untrusted evidence');
    expect(last30days.body).toContain('mvanhorn/last30days-skill');
  });
});

describe('listSkills preamble', () => {
  it('emits both a cwd-relative skill root and an absolute fallback', async () => {
    const root = fresh();
    writeSkill(root, 'demo-skill', {
      withAttachments: true,
      body: 'Use `assets/template.html` to bootstrap.',
    });

    const skills = await listSkills(root);
    expect(skills).toHaveLength(1);
    const [skill] = skills;

    // The cwd-relative alias path is the primary one — that's what makes
    // the agent stay inside its working directory when reading skill
    // side files (issue #430).
    expect(skill.body).toContain(`${SKILLS_CWD_ALIAS}/demo-skill/`);
    expect(skill.body).toContain(
      `${SKILLS_CWD_ALIAS}/demo-skill/assets/template.html`,
    );

    // The absolute fallback is required for two cases the relative path
    // cannot serve:
    //   - calls without a project (cwd defaults to PROJECT_ROOT, where
    //     the absolute path is in fact an in-cwd path);
    //   - environments where `stageActiveSkill()` failed.
    // Claude/Copilot are additionally given `--add-dir` for that path.
    expect(skill.body).toContain(skill.dir);
    expect(skill.body).toMatch(/Skill root \(absolute fallback\)/);
    expect(skill.body).toMatch(/Skill root \(relative to project\)/);
  });

  it('mentions root-level example.html side files in the preamble', async () => {
    const root = fresh();
    writeSkill(root, 'orbit-style', {
      withAttachments: false,
      body: 'Open and mirror the shipped `example.html` before writing output.',
    });
    writeFileSync(path.join(root, 'orbit-style', 'example.html'), '<main>example</main>');

    const skills = await listSkills(root);
    expect(skills).toHaveLength(1);
    const [skill] = skills;

    expect(skill.body).toContain(`${SKILLS_CWD_ALIAS}/orbit-style/`);
    expect(skill.body).toContain(`${SKILLS_CWD_ALIAS}/orbit-style/example.html`);
    expect(skill.body).toContain('Known side files in this skill: `example.html`.');
  });

  it('uses the on-disk folder name in the alias path even when `name` differs', async () => {
    const root = fresh();
    writeSkill(root, 'guizang-ppt', {
      name: 'magazine-web-ppt',
      withAttachments: true,
    });

    const skills = await listSkills(root);
    expect(skills).toHaveLength(1);
    const [skill] = skills;

    // `id`/`name` reflect the frontmatter value (used elsewhere as a stable
    // public id), but the on-disk alias path must use the actual folder
    // name — that is what the daemon-staged junction maps to.
    expect(skill.id).toBe('magazine-web-ppt');
    expect(skill.body).toContain(`${SKILLS_CWD_ALIAS}/guizang-ppt/`);
    expect(skill.body).not.toContain(`${SKILLS_CWD_ALIAS}/magazine-web-ppt/`);
  });

  it('does not emit a preamble for skills without side files', async () => {
    const root = fresh();
    writeSkill(root, 'lone-skill', {
      withAttachments: false,
      body: 'Body without external files.',
    });

    const skills = await listSkills(root);
    expect(skills).toHaveLength(1);
    const [skill] = skills;

    expect(skill.body).not.toContain(SKILLS_CWD_ALIAS);
    expect(skill.body).not.toContain('Skill root');
    expect(skill.body).toContain('Body without external files.');
  });
});

describe('listSkills multi-root + source tagging', () => {
  it('tags entries from the first root as "user" and the second as "built-in"', async () => {
    const userRoot = fresh();
    const builtInRoot = fresh();
    writeSkill(userRoot, 'web-search', {
      description: 'User-imported web search.',
    });
    writeSkill(builtInRoot, 'audio-jingle', {
      description: 'Built-in jingle skill.',
    });

    const skills = await listSkills([userRoot, builtInRoot]);
    expect(skills).toHaveLength(2);
    const byId = new Map<string, { id: string; source: string }>(
      skills.map((s: { id: string; source: string }) => [s.id, s]),
    );
    expect(byId.get('web-search')?.source).toBe('user');
    expect(byId.get('audio-jingle')?.source).toBe('built-in');

    rmSync(userRoot, { recursive: true, force: true });
    rmSync(builtInRoot, { recursive: true, force: true });
  });

  it('lets a user skill shadow a built-in skill of the same id', async () => {
    const userRoot = fresh();
    const builtInRoot = fresh();
    writeSkill(userRoot, 'shared-id', {
      description: 'User override.',
      body: '# Override body',
    });
    writeSkill(builtInRoot, 'shared-id', {
      description: 'Original built-in.',
      body: '# Built-in body',
    });

    const skills = await listSkills([userRoot, builtInRoot]);
    expect(skills).toHaveLength(1);
    expect(skills[0].source).toBe('user');
    expect(skills[0].body).toContain('Override body');

    rmSync(userRoot, { recursive: true, force: true });
    rmSync(builtInRoot, { recursive: true, force: true });
  });
});

describe('slugifySkillName', () => {
  it('lowercases, normalises spaces, and strips reserved slugs', () => {
    expect(slugifySkillName('Web Search')).toBe('web-search');
    expect(slugifySkillName('  Multi   Word  Skill ')).toBe('multi-word-skill');
    expect(slugifySkillName('   ')).toBe('');
    expect(slugifySkillName('..')).toBe('');
    expect(slugifySkillName('a/../b')).toBe('a-b');
  });
});

describe('importUserSkill / deleteUserSkill', () => {
  it('writes a SKILL.md and round-trips through listSkills', async () => {
    const root = fresh();
    try {
      const result = await importUserSkill(root, {
        name: 'Code Review',
        description: 'Review the latest diff.',
        body: '# Review\n\n1. Read.\n2. Comment.',
        triggers: ['code review', 'review my diff'],
      });
      expect(result.id).toBe('Code Review');
      expect(result.slug).toBe('code-review');
      expect(result.dir).toBe(path.join(root, 'code-review'));

      const skills = await listSkills(root);
      expect(skills).toHaveLength(1);
      expect(skills[0].id).toBe('Code Review');
      expect(skills[0].triggers).toEqual(['code review', 'review my diff']);
      // First (and only) root is treated as the user root.
      expect(skills[0].source).toBe('user');

      // Importing the same name again surfaces a CONFLICT error.
      await expect(
        importUserSkill(root, {
          name: 'Code Review',
          body: '# Different body',
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });

      await deleteUserSkill(root, 'Code Review');
      const after = await listSkills(root);
      expect(after).toHaveLength(0);

      // Deleting an already-deleted skill returns NOT_FOUND.
      await expect(deleteUserSkill(root, 'Code Review')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects empty bodies and impossibly-named skills', async () => {
    const root = fresh();
    try {
      await expect(
        importUserSkill(root, { name: 'foo', body: '   ' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      await expect(
        importUserSkill(root, { name: '..', body: '# body' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
