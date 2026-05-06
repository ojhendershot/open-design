import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  parseFrontmatter,
  resolveManifest,
  validateFrontmatter,
} from '../src/research/skill-hub.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readSkill(slug: string): string {
  return fs.readFileSync(path.join(repoRoot, 'skills', slug, 'SKILL.md'), 'utf8');
}

describe('research/skill-hub frontmatter parser', () => {
  it('reads `description: |` block scalars instead of storing the literal "|"', () => {
    const fm = parseFrontmatter(readSkill('image-poster'));
    expect(typeof fm['description']).toBe('string');
    expect(fm['description']).not.toBe('|');
    expect(fm['description']).not.toBe('');
    expect(String(fm['description'])).toContain('Single-image generation');
    expect(String(fm['description'])).toContain('PNG/JPEG');
  });

  it('reads `description: |` block scalars on the audio-jingle fixture', () => {
    const fm = parseFrontmatter(readSkill('audio-jingle'));
    expect(String(fm['description'])).toContain('Audio generation skill');
    expect(String(fm['description'])).toContain('MP3/WAV');
  });

  it('reads `description: |` block scalars on the video-shortform fixture', () => {
    const fm = parseFrontmatter(readSkill('video-shortform'));
    expect(String(fm['description'])).toContain('Short-form video generation');
  });

  it('reads `description: >` folded scalars without storing the literal ">"', () => {
    const raw = [
      '---',
      'name: demo',
      'description: >',
      '  First line.',
      '  Second line.',
      '---',
      '',
      '# body',
    ].join('\n');
    const fm = parseFrontmatter(raw);
    expect(fm['description']).not.toBe('>');
    expect(String(fm['description'])).toContain('First line.');
    expect(String(fm['description'])).toContain('Second line.');
  });

  it('reads `description: |-` chomping marker as a non-literal value', () => {
    const raw = [
      '---',
      'name: demo',
      'description: |-',
      '  First line.',
      '  Second line.',
      '---',
      '',
    ].join('\n');
    const fm = parseFrontmatter(raw);
    expect(fm['description']).not.toBe('|-');
    expect(String(fm['description'])).toBe('First line.\nSecond line.');
  });

  it('parses `od.mode` from the nested `od:` block', () => {
    const fm = parseFrontmatter(readSkill('image-poster'));
    expect(fm['od']).toBeTypeOf('object');
    expect((fm['od'] as Record<string, unknown>)['mode']).toBe('image');
  });
});

describe('research/skill-hub validateFrontmatter mode coverage', () => {
  // Canonical modes plus media/utility modes already in `skills/*/SKILL.md`.
  const cases: Array<{ slug: string; mode: string }> = [
    { slug: 'image-poster', mode: 'image' },
    { slug: 'video-shortform', mode: 'video' },
    { slug: 'audio-jingle', mode: 'audio' },
    { slug: 'pptx-html-fidelity-audit', mode: 'utility' },
    { slug: 'live-artifact', mode: 'prototype' },
    { slug: 'simple-deck', mode: 'deck' },
    { slug: 'design-brief', mode: 'design-system' },
  ];

  for (const { slug, mode } of cases) {
    it(`accepts od.mode=${mode} from skills/${slug}`, () => {
      const fm = parseFrontmatter(readSkill(slug));
      expect((fm['od'] as Record<string, unknown> | undefined)?.['mode']).toBe(mode);
      expect(validateFrontmatter('skills', fm, slug)).toBe(true);
      expect(resolveManifest('skills', readSkill(slug), slug)).toBeTruthy();
    });
  }

  it('still rejects an unknown od.mode value', () => {
    const fm = parseFrontmatter(
      [
        '---',
        'name: bogus-skill',
        'description: A skill with a made-up mode.',
        'od:',
        '  mode: not-a-real-mode',
        '---',
      ].join('\n'),
    );
    expect(validateFrontmatter('skills', fm, 'bogus-skill')).toBe(false);
  });
});
