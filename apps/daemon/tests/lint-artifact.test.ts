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

  // Regression: the AI_DEFAULT_INDIGO list used to omit `#3730a3` and
  // `#a855f7` even though `craft/anti-ai-slop.md` documents both as
  // P0-blocked solid accents. An artifact could hard-code one of these
  // as a button fill and slip past the lint. The list now matches the
  // craft doc exactly; these regression tests pin the contract.
  it.each([
    ['#3730a3', 'tailwind indigo-800'],
    ['#a855f7', 'tailwind purple-500'],
    ['#7c3aed', 'tailwind violet-600'],
  ])('flags solid %s (%s) as a documented cardinal-sin accent', (hex) => {
    const html = `<div style="background: ${hex}">Hi</div>`;
    const findings = lintArtifact(html);
    const hit = findings.find((f) => f.id === 'ai-default-indigo');
    expect(hit).toBeDefined();
    expect(hit.severity).toBe('P0');
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

  it('does not flag a :root token block that also declares non-custom properties like color-scheme', () => {
    // Regression: the strip pass used to run its rule-shaped regex
    // against the full HTML string, so the first selector capture
    // included the leading `<style>` text and the `:root` test
    // failed. A common token block such as
    // `:root { color-scheme: light; --accent: #6366f1; }` should be
    // recognized as a token definition even when the body mixes
    // CSS variables with non-custom declarations.
    const html = `<style>:root { color-scheme: light; --accent: #6366f1; }</style>
      <button class="cta" style="background: var(--accent)">Get started</button>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('still flags indigo laundered through a component-local custom property', () => {
    // Regression: the custom-property-only exemption used to apply
    // to *any* selector, so an agent could hide #6366f1 in a local
    // var (e.g. `.cta { --cta-bg: #6366f1 }`) and the linter would
    // strip the rule and miss the P0. The exemption is now scoped
    // to global theme selectors (:root, html, [data-theme=...], …).
    const html = `
      <style>
        .cta { --cta-bg: #6366f1; }
        .cta { background: var(--cta-bg); color: white; }
      </style>
      <button class="cta">Get started</button>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeDefined();
  });

  it('still flags a non-token :root declaration containing #6366f1', () => {
    // Regression: the `:root` exemption used to be unconditional, so
    // a rule whose body wasn't actually a token definition (e.g.
    // `:root { background: #6366f1 }`) was stripped before the indigo
    // scan and the P0 silently disappeared. The exemption now requires
    // a token-shaped body, so a non-token `:root` declaration keeps
    // its hex in scope and the lint still fires.
    const html = `
      <style>
        :root { background: #6366f1; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeDefined();
  });

  it('still flags indigo when :root sits in a list with a component selector', () => {
    // Regression: `:root, .cta { --cta-bg: #6366f1 }` used to be
    // exempted because the selector list contained `:root`, even
    // though `.cta` is a component selector. The exemption now
    // requires every selector in the list to be a global theme
    // scope, so this mixed list is preserved and the P0 still fires.
    const html = `
      <style>
        :root, .cta { --cta-bg: #6366f1; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeDefined();
  });

  it('still flags indigo on a bare component-attribute selector', () => {
    // Regression: the bare-attribute branch of the global-theme-scope
    // test used to accept ANY attribute selector (e.g.
    // `[data-variant="primary"]`), so a custom-property-only rule on
    // a component/state attribute was treated as a global token block
    // and the indigo lint silently disappeared. The exemption now
    // requires the attribute name to be one of the known global-theme
    // switches (`data-theme`, `data-color-scheme`, `data-mode`).
    const html = `
      <style>
        [data-variant="primary"] { --button-bg: #6366f1; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeDefined();
  });

  it('still flags indigo on a bare aria-state attribute selector', () => {
    const html = `
      <style>
        [aria-current="page"] { --nav-accent: #6366f1; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeDefined();
  });

  it('still flags indigo on a :root prefixed with a component-attribute selector', () => {
    // Regression: `:root[data-variant="primary"]` used to be exempted
    // because the regex only checked the tag prefix and not the
    // attribute name. A component/state attribute attached to `:root`
    // is exactly the laundering pattern this lint must catch — the
    // exemption now requires the attribute (when present) to name a
    // known global-theme switch.
    const html = `
      <style>
        :root[data-variant="primary"] { --button-bg: #6366f1; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeDefined();
  });

  it('still flags indigo on an html prefixed with an aria-state attribute selector', () => {
    const html = `
      <style>
        html[aria-current="page"] { --nav-accent: #6366f1; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeDefined();
  });

  it('still flags indigo on a body prefixed with a component-attribute selector', () => {
    const html = `
      <style>
        body[data-variant="primary"] { --button-bg: #6366f1; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeDefined();
  });

  it('still exempts indigo on :root prefixed with the canonical data-theme switch', () => {
    // Sanity check: the prefixed-attribute change must keep exempting
    // legitimate theme-switch selectors (`:root[data-theme="dark"]`),
    // even though the prefixed-form regex changed shape.
    const html = `
      <style>
        :root[data-theme="dark"] { --accent: #6366f1; --bg: #0b0b10; }
        .cta { background: var(--accent); color: white; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('still exempts indigo on html and body prefixed with data-theme', () => {
    const html = `
      <style>
        html[data-theme="dark"] { --accent: #6366f1; }
        body[data-mode="compact"] { --bg: #0b0b10; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('still exempts indigo on a bare data-color-scheme theme block', () => {
    // The bare-attribute exemption still covers the canonical
    // global-theme switches; a token block keyed off
    // `[data-color-scheme="dark"]` is a theme variant, not a
    // component-local rule, and must not fire.
    const html = `
      <style>
        [data-color-scheme="dark"] { --accent: #6366f1; --bg: #0b0b10; }
        .cta { background: var(--accent); color: white; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('does not flag a :root token block whose body contains CSS comments', () => {
    // Regression: `stripTokenBlocksFromCss` used to split the body on
    // `;` and run `isTokenShapedDeclaration` from the start of each
    // fragment. A common token block such as
    // `:root { /* brand accent */ --accent: #6366f1; }` produced a
    // declaration fragment beginning with the comment, failed the
    // token-shape test, and the rule was left in scope of the
    // indigo scan — a false P0 on a legitimate token definition.
    const html = `
      <style>
        :root { /* brand accent */ --accent: #6366f1; --bg: #ffffff; }
        .cta { background: var(--accent); color: white; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('does not flag a :root token block with a trailing CSS comment', () => {
    const html = `
      <style>
        :root { --accent: #6366f1; /* brand accent */ }
      </style>
      <button style="background: var(--accent)">Get started</button>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('does not flag a :root token block with a comment between declarations', () => {
    const html = `
      <style>
        :root {
          --bg: #ffffff;
          /* brand accent — keep in sync with DESIGN.md */
          --accent: #6366f1;
        }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('does not flag indigo declared in a :root token block nested inside @media', () => {
    // Regression: `stripTokenBlocksFromCss` only matched flat
    // `selector { body }` rules, so a media-query-wrapped token block
    // like `@media (prefers-color-scheme: dark) { :root { --accent: #6366f1 } }`
    // had its outer `@media` rule treated as the selector/body pair and
    // the inner `:root` token block was never stripped — producing a
    // P0 false positive on legitimate responsive theme CSS.
    const html = `
      <style>
        @media (prefers-color-scheme: dark) {
          :root { --accent: #6366f1; --bg: #0b0b10; }
        }
        .cta { background: var(--accent); color: white; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('does not flag indigo declared in a :root token block nested inside @supports', () => {
    const html = `
      <style>
        @supports (color: oklch(0 0 0)) {
          :root { --accent: #6366f1; }
        }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeUndefined();
  });

  it('still flags indigo on a component rule nested inside @media', () => {
    // The exemption only applies to global token blocks. A component
    // rule that hard-codes the indigo hex inside an at-rule wrapper
    // is still raw indigo and must fire.
    const html = `
      <style>
        @media (prefers-color-scheme: dark) {
          .cta { background: #6366f1; }
        }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'ai-default-indigo')).toBeDefined();
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

  it('flags an uppercase rule in a SECOND <style> block', () => {
    // Regression: the scan used to call `exec` once on a non-global
    // regex, so only the first <style> block was inspected. Artifacts
    // commonly emit a reset/normalize block before the components
    // block; the offending uppercase rule sat in block #2 and slipped
    // past. The scan now iterates every <style> block.
    const html = `
      <style>.reset { box-sizing: border-box; }</style>
      <style>.eyebrow { text-transform: uppercase; font-size: 12px; }</style>
      <span class="eyebrow">New</span>
    `;
    const findings = lintArtifact(html);
    const hit = findings.find((f) => f.id === 'all-caps-no-tracking');
    expect(hit).toBeDefined();
    expect(hit.severity).toBe('P1');
  });

  it('does not flag an uppercase rule that is entirely inside a CSS comment', () => {
    // Regression: the scan ran against the raw <style> body, so a
    // commented-out rule like `/* .eyebrow { text-transform: uppercase; } */`
    // matched `upperRe` and fired a P1 even though the browser ignores it.
    // CSS comments are stripped before structural matching now.
    const html = `
      <style>
        /* .eyebrow { text-transform: uppercase; } */
        .eyebrow { font-size: 12px; }
      </style>
      <span class="eyebrow">New</span>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('still flags an active uppercase rule when surrounded by comments', () => {
    // Comments are stripped only for structural matching; the live rule
    // outside the comment must still fire.
    const html = `
      <style>
        /* historical: removed in 2024 */
        .eyebrow { text-transform: uppercase; font-size: 12px; }
        /* trailing note */
      </style>
      <span class="eyebrow">New</span>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeDefined();
  });

  it('flags inline style with text-transform: uppercase and no letter-spacing', () => {
    // Regression: the rule used to scan only <style> blocks, so an
    // artifact emitting `<span style="text-transform: uppercase">NEW</span>`
    // produced no finding even though the rendered output is the same
    // ALL CAPS the typography rule prohibits without tracking.
    const html = `<span style="text-transform: uppercase">NEW</span>`;
    const findings = lintArtifact(html);
    const hit = findings.find((f) => f.id === 'all-caps-no-tracking');
    expect(hit).toBeDefined();
    expect(hit.severity).toBe('P1');
  });

  it('flags inline style with text-transform: uppercase and too-small letter-spacing', () => {
    const html = `<span style="text-transform: uppercase; letter-spacing: 0.02em">NEW</span>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeDefined();
  });

  it('passes inline style with text-transform: uppercase and adequate letter-spacing in em', () => {
    const html = `<span style="text-transform: uppercase; letter-spacing: 0.08em">NEW</span>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('passes inline style with text-transform: uppercase and adequate letter-spacing in px', () => {
    const html = `<span style="text-transform: uppercase; letter-spacing: 2px">NEW</span>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('flags inline style on a tag that already carries other attributes', () => {
    // Make sure the inline-style scan handles tags whose `style` is not
    // the first attribute. The leading-boundary anchor must not anchor
    // to start-of-string only.
    const html = `<span class="x" style="text-transform: uppercase">NEW</span>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeDefined();
  });

  it('does not double-fire when both <style> block and inline style are offending', () => {
    // The inline-style scan should be skipped when the <style>-block
    // scan already produced this finding — single corrective signal.
    const html = `
      <style>.eyebrow { text-transform: uppercase; font-size: 12px; }</style>
      <span style="text-transform: uppercase">NEW</span>
    `;
    const findings = lintArtifact(html);
    const hits = findings.filter((f) => f.id === 'all-caps-no-tracking');
    expect(hits.length).toBe(1);
  });

  it('passes a 12px label with 1px tracking (resolves 0.06em via same-rule font-size)', () => {
    // Regression: the previous absolute-fallback floor of >=1.5px was
    // stricter than the craft rule. `font-size: 12px; letter-spacing: 1px`
    // is `1 / 12 = 0.083em` — well above the 0.06em rule — and must pass.
    const html = `
      <style>
        .eyebrow { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('passes a 14px label with 1px tracking (resolves 0.06em via same-rule font-size)', () => {
    // 14px * 0.06 = 0.84px floor, so 1px tracking satisfies the rule.
    const html = `
      <style>
        .badge { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('flags a 14px label with 0.5px tracking (below same-rule 0.06em floor)', () => {
    // 14px * 0.06 = 0.84px floor; 0.5px is below the rule and must flag.
    const html = `
      <style>
        .badge { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeDefined();
  });

  it('passes inline 12px label with 1px tracking', () => {
    // Same regression as the <style>-block case but in the inline branch.
    const html = `<span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px">NEW</span>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('passes inline 14px label with 1px tracking', () => {
    const html = `<span style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px">NEW</span>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('flags inline 14px label with 0.5px tracking', () => {
    const html = `<span style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px">NEW</span>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeDefined();
  });

  it('passes inline 1px tracking even without a font-size (16px default fallback)', () => {
    // When the same rule does not declare font-size, the conservative
    // absolute fallback of >=1px keeps default-16px-body labels passing
    // (1 / 16 ≈ 0.0625em, just over the 0.06em rule).
    const html = `<span style="text-transform: uppercase; letter-spacing: 1px">NEW</span>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('flags a 48px heading with 0.06rem tracking (rem ignores element font-size)', () => {
    // Regression: `rem` was previously folded into the same branch as
    // `em` and accepted at the 0.06 threshold. But `rem` is relative
    // to the root font-size (16px default), not the element's own
    // font-size, so on a 48px heading `0.06rem` resolves to 0.96px —
    // about 0.02em of the element, well below the 0.06em rule.
    const html = `
      <style>
        .display { font-size: 48px; text-transform: uppercase; letter-spacing: 0.06rem; }
      </style>
      <h1 class="display">Headline</h1>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeDefined();
  });

  it('passes a 16px label with 0.06rem tracking (rem ≈ 1px ≈ 0.06em on 16px)', () => {
    // 0.06rem * 16px/rem = 0.96px; on a 16px element that is 0.06em —
    // exactly at the floor. The rem branch must accept it.
    const html = `
      <style>
        .eyebrow { font-size: 16px; text-transform: uppercase; letter-spacing: 0.06rem; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('passes a 48px heading with 0.18rem tracking (rem converted, meets element 0.06em)', () => {
    // 0.18rem * 16px/rem = 2.88px; 48px * 0.06 = 2.88px floor — the
    // converted rem matches the per-element em floor exactly.
    const html = `
      <style>
        .display { font-size: 48px; text-transform: uppercase; letter-spacing: 0.18rem; }
      </style>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('flags inline 48px heading with 0.06rem tracking', () => {
    const html = `<h1 style="font-size: 48px; text-transform: uppercase; letter-spacing: 0.06rem">Headline</h1>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeDefined();
  });

  it('passes inline 16px label with 0.06rem tracking (rem ≈ 0.06em on 16px)', () => {
    const html = `<span style="font-size: 16px; text-transform: uppercase; letter-spacing: 0.06rem">NEW</span>`;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('passes uppercase rule whose letter-spacing dereferences a compliant :root token', () => {
    // Regression: the tracking helper used to recognise only literal
    // numeric values, so a tokenized rule — exactly the pattern the
    // craft prompt steers artifacts toward — was wrongly reported as
    // `all-caps-no-tracking`. The helper now resolves `var(--name)` to
    // its `:root` definition and judges the literal value against the
    // 0.06em floor.
    const html = `
      <style>
        :root { --caps-tracking: 0.08em; }
        .eyebrow { text-transform: uppercase; letter-spacing: var(--caps-tracking); }
      </style>
      <span class="eyebrow">New</span>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('flags uppercase rule whose letter-spacing dereferences a noncompliant :root token', () => {
    // The token-resolution path must not blanket-pass `var()` refs:
    // a token defined below the 0.06em floor still trips the lint.
    const html = `
      <style>
        :root { --caps-tracking: 0.02em; }
        .eyebrow { text-transform: uppercase; letter-spacing: var(--caps-tracking); }
      </style>
      <span class="eyebrow">New</span>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeDefined();
  });

  it('flags uppercase rule whose letter-spacing var() has no matching :root definition', () => {
    // Unresolved references stay in place; the existing "no numeric
    // letter-spacing" path then reports the rule as missing tracking.
    const html = `
      <style>
        .eyebrow { text-transform: uppercase; letter-spacing: var(--caps-tracking); }
      </style>
      <span class="eyebrow">New</span>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeDefined();
  });

  it('passes uppercase rule whose letter-spacing var() has a compliant fallback', () => {
    const html = `
      <style>
        .eyebrow { text-transform: uppercase; letter-spacing: var(--caps-tracking, 0.08em); }
      </style>
      <span class="eyebrow">New</span>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });

  it('passes inline uppercase whose letter-spacing dereferences a compliant :root token', () => {
    const html = `
      <style>:root { --caps-tracking: 0.08em; }</style>
      <span style="text-transform: uppercase; letter-spacing: var(--caps-tracking)">NEW</span>
    `;
    const findings = lintArtifact(html);
    expect(findings.find((f) => f.id === 'all-caps-no-tracking')).toBeUndefined();
  });
});
