// @ts-nocheck
import { describe, expect, it } from 'vitest';

import { lintArtifact } from '../src/lint-artifact.js';

describe('ai-default-indigo', () => {
  it('flags solid #6366f1 used as accent', () => {
    const html = `
      <style>
        .cta { background: #6366f1; color: white; }
      </style>
      <button class="cta">Get started</button>
    `;
    const findings = lintArtifact(html);
    const hit = findings.find((f) => f.id === 'ai-default-indigo');
    expect(hit).toBeDefined();
    expect(hit.severity).toBe('P0');
  });

  it('flags solid #4f46e5 (indigo-600) too', () => {
    const html = `<div style="background: #4f46e5">Hi</div>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeDefined();
  });

  it('does not double-fire when purple-gradient already caught the same color', () => {
    const html = `<div style="background: linear-gradient(90deg, #6366f1, #ec4899)">Hi</div>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'purple-gradient')).toBeDefined();
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('does not flag artifacts that use var(--accent) only', () => {
    const html = `
      <style>
        :root { --accent: #2f6feb; }
        .cta { background: var(--accent); color: white; }
      </style>
      <button class="cta">Get started</button>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('does not flag indigo declared as a token in :root and consumed via var(--accent)', () => {
    // Brand whose accent is intentionally indigo: defines #6366f1 once
    // in :root and uses var(--accent) downstream. This is the design
    // system speaking, not the model defaulting — must not fire P0.
    const html = `
      <style>
        :root { --accent: #6366f1; --bg: #ffffff; }
        .cta { background: var(--accent); color: white; }
      </style>
      <button class="cta">Get started</button>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('still flags indigo when it appears outside :root even if also defined as a token', () => {
    // If the artifact both defines the accent AND hard-codes the same
    // hex in a component rule, the component rule is still raw indigo
    // — fire as before.
    const html = `
      <style>
        :root { --accent: #6366f1; }
        .cta { background: #6366f1; color: white; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeDefined();
  });

  it('does not flag indigo in :root with attribute selector (theme variants)', () => {
    const html = `
      <style>
        :root[data-theme="dark"] { --accent: #6366f1; }
        .cta { background: var(--accent); color: white; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('does not flag indigo declared in a selector list containing :root', () => {
    // Theme CSS often pairs `:root` with an attribute selector via a
    // selector list so the same tokens apply to both default and
    // light-themed roots. Whichever side comes first, the block is a
    // token definition and must not fire P0.
    const html = `
      <style>
        :root, [data-theme="light"] { --accent: #6366f1; --bg: #ffffff; }
        .cta { background: var(--accent); color: white; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('does not flag indigo declared in a selector list with :root second', () => {
    const html = `
      <style>
        [data-theme="light"], :root { --accent: #6366f1; }
        .cta { background: var(--accent); color: white; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('does not flag indigo declared in a custom-property-only theme block without :root', () => {
    // Theme-variant blocks that omit `:root` entirely (e.g. only
    // `[data-theme="dark"]`) are still token definitions when their
    // body is custom-property-only; treat them the same way.
    const html = `
      <style>
        [data-theme="dark"] { --accent: #6366f1; --bg: #0b0b10; }
        .cta { background: var(--accent); color: white; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

});

describe('all-caps-no-tracking', () => {
  it('flags uppercase rule with no letter-spacing at all', () => {
    const html = `
      <style>
        .eyebrow { text-transform: uppercase; font-size: 12px; }
      </style>
      <span class="eyebrow">New</span>
    `;
    const findings = lintArtifact(html);
    const hit = findings.find((f) => f.id === 'all-caps-no-tracking');
    expect(hit).toBeDefined();
    expect(hit.severity).toBe('P1');
  });

  it('flags uppercase rule with too-small letter-spacing', () => {
    const html = `
      <style>
        .eyebrow { text-transform: uppercase; letter-spacing: 0.02em; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeDefined();
  });

  it('passes uppercase rule with adequate letter-spacing in em', () => {
    const html = `
      <style>
        .eyebrow { text-transform: uppercase; letter-spacing: 0.08em; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('passes uppercase rule with adequate letter-spacing in px', () => {
    const html = `
      <style>
        .eyebrow { text-transform: uppercase; letter-spacing: 2px; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('does not flag a style block with no uppercase rule', () => {
    const html = `<style>.x { color: red; }</style>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });
});
