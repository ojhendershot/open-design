# Token naming for token-first Tailwind

## Decision

Open Design owns the Tailwind color vocabulary. Tailwind v4 is configured with CSS-first `@theme`, clears the default color namespace with `--color-*: initial`, and exposes only project color tokens backed by `apps/web/src/index.css` CSS variables.

The runtime source of truth stays in `:root`, `[data-theme="dark"]`, and system-mode CSS variable overrides. Tailwind utilities resolve through those variables, so light mode, dark mode, system mode, and custom accent all share one token path.

## Naming model

Token names follow the current product language in `index.css` for core surfaces and copy, then use semantic names for status colors.

- Surface tokens use nouns: `bg`, `app`, `panel`, `subtle`, `muted`, `elevated`.
- Text utilities keep the `text-*` scale: `text-text`, `text-strong`, `text-muted`, `text-soft`, `text-faint`.
- Border tokens keep the `border-*` scale: `border`, `border-strong`, `border-soft`.
- Accent tokens keep the `accent-*` scale because user custom accent writes the same CSS variables at runtime.
- Status tokens use semantic names in Tailwind: `success`, `info`, `discovery`, `danger`, `warning`.
- Tailwind utility names should read as project concepts: `bg-panel`, `text-muted`, `border-border-strong`, `text-danger`, `bg-success-surface`.
- Radius, shadow, font, spacing, and typography scale use Tailwind's native utilities such as `rounded-lg`, `shadow-sm`, `font-mono`, `gap-3`, and `text-sm`.

## Design decision: color tokens only

Project-owned tokens are limited to colors because color carries Open Design's brand, warm paper surface language, light/dark theme behavior, and runtime custom accent behavior.

Radius, shadow, font, spacing, and type scale use Tailwind's native system. These primitives are already well understood by Tailwind users, avoid extra project vocabulary, and keep TSX class names familiar during migration:

```tsx
className="rounded-lg shadow-sm font-mono bg-panel text-text border border-border"
```

Global base styles in `index.css` continue to set the app-level font family, page background, and text color. Component-level font changes can use native Tailwind utilities. If a future visual requirement needs a branded radius or elevation with stable cross-component meaning, add that token intentionally at that time.

## `@theme` block

```css
@theme {
  --color-*: initial;

  /* Surfaces */
  --color-bg: var(--bg);
  --color-app: var(--bg-app);
  --color-panel: var(--bg-panel);
  --color-subtle: var(--bg-subtle);
  --color-muted-surface: var(--bg-muted);
  --color-elevated: var(--bg-elevated);

  /* Borders */
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-border-soft: var(--border-soft);

  /* Text */
  --color-text: var(--text);
  --color-strong: var(--text-strong);
  --color-muted: var(--text-muted);
  --color-soft: var(--text-soft);
  --color-faint: var(--text-faint);

  /* Accent */
  --color-accent: var(--accent);
  --color-accent-strong: var(--accent-strong);
  --color-accent-soft: var(--accent-soft);
  --color-accent-tint: var(--accent-tint);
  --color-accent-hover: var(--accent-hover);
  --color-accent-wash: color-mix(in srgb, var(--accent) 12%, transparent);
  --color-accent-foreground: #fff;

  /* Semantic status */
  --color-success: var(--green);
  --color-success-surface: var(--green-bg);
  --color-success-border: var(--green-border);
  --color-info: var(--blue);
  --color-info-surface: var(--blue-bg);
  --color-info-border: var(--blue-border);
  --color-discovery: var(--purple);
  --color-discovery-surface: var(--purple-bg);
  --color-discovery-border: var(--purple-border);
  --color-danger: var(--red);
  --color-danger-surface: var(--red-bg);
  --color-danger-border: var(--red-border);
  --color-danger-foreground: var(--bg-panel);
  --color-warning: var(--amber);
  --color-warning-surface: var(--amber-bg);
  --color-warning-border: color-mix(in srgb, var(--amber) 35%, transparent);

  /* Interaction and overlays */
  --color-focus: var(--accent);
  --color-focus-ring: var(--accent-soft);
  --color-overlay: rgba(28, 27, 26, 0.42);
  --color-control-hover: var(--bg-subtle);
  --color-control-active: var(--bg-muted);
}
```

## Existing CSS variable mapping

### Surfaces

| Existing CSS variable | Tailwind theme token | Utility examples | Intended use |
| --- | --- | --- | --- |
| `--bg` | `--color-bg` | `bg-bg`, `text-bg` | Main warm paper canvas and inverse text on dark controls. |
| `--bg-app` | `--color-app` | `bg-app` | App shell background and loading shell background. Keep as compatibility alias while it equals `--bg`. |
| `--bg-panel` | `--color-panel` | `bg-panel`, `text-panel` | Cards, panes, inputs, popovers, modal foreground surfaces. |
| `--bg-subtle` | `--color-subtle` | `bg-subtle` | Quiet hover fills, sidebars, secondary control fills, code backgrounds. |
| `--bg-muted` | `--color-muted-surface` | `bg-muted-surface` | Stronger quiet fill, pressed control states, denser neutral chips. |
| `--bg-elevated` | `--color-elevated` | `bg-elevated` | Modals and elevated overlays. |

### Borders

| Existing CSS variable | Tailwind theme token | Utility examples | Intended use |
| --- | --- | --- | --- |
| `--border` | `--color-border` | `border-border`, `divide-border` | Default hairline borders. |
| `--border-strong` | `--color-border-strong` | `border-border-strong`, `divide-border-strong` | Hover, active, selected, and focus-adjacent borders. |
| `--border-soft` | `--color-border-soft` | `border-border-soft`, `divide-border-soft` | Internal dividers and low-contrast separators. |

### Text

| Existing CSS variable | Tailwind theme token | Utility examples | Intended use |
| --- | --- | --- | --- |
| `--text` | `--color-text` | `text-text`, `border-text`, `bg-text` | Default readable UI copy; `bg-text` for stop/destructive-neutral buttons. |
| `--text-strong` | `--color-strong` | `text-strong`, `bg-strong` | Headings, project names, high-emphasis labels. |
| `--text-muted` | `--color-muted` | `text-muted`, `border-muted` | Secondary copy, labels, icons, inactive controls. |
| `--text-soft` | `--color-soft` | `text-soft` | Lower-emphasis disabled-adjacent text. |
| `--text-faint` | `--color-faint` | `text-faint`, `placeholder:text-faint` | Placeholders, timestamps, dividers labels, low-emphasis metadata. |

### Accent

| Existing CSS variable | Tailwind theme token | Utility examples | Intended use |
| --- | --- | --- | --- |
| `--accent` | `--color-accent` | `bg-accent`, `text-accent`, `border-accent`, `ring-accent` | Primary actions, selected indicators, brand-rust emphasis, active focus edge. |
| `--accent-strong` | `--color-accent-strong` | `bg-accent-strong`, `text-accent-strong` | Pressed accent, stronger labels on tinted accent surfaces. |
| `--accent-soft` | `--color-accent-soft` | `bg-accent-soft`, `ring-accent-soft`, `shadow-[0_0_0_3px_var(--color-accent-soft)]` | Soft halo, input focus ring, active outline glow. |
| `--accent-tint` | `--color-accent-tint` | `bg-accent-tint` | Warm selected fills, gradient stops, subtle primary surfaces. |
| `--accent-hover` | `--color-accent-hover` | `bg-accent-hover`, `border-accent-hover` | Primary button hover state. |
| Derived from `--accent` | `--color-accent-wash` | `bg-accent-wash` | Very quiet active fills using `color-mix(in srgb, var(--accent) 12%, transparent)`. |
| Literal `#fff` used on accent buttons | `--color-accent-foreground` | `text-accent-foreground` | Text and icons on solid accent surfaces. |

### Semantic status

| Existing CSS variable | Tailwind theme token | Utility examples | Intended use |
| --- | --- | --- | --- |
| `--green` | `--color-success` | `text-success`, `bg-success` | Successful status, saved state, positive confirmations. |
| `--green-bg` | `--color-success-surface` | `bg-success-surface` | Success notification and pill surfaces. |
| `--green-border` | `--color-success-border` | `border-success-border` | Success notification and pill borders. |
| `--blue` | `--color-info` | `text-info`, `bg-info` | Informational status and non-primary active state. |
| `--blue-bg` | `--color-info-surface` | `bg-info-surface` | Informational status surfaces. |
| `--blue-border` | `--color-info-border` | `border-info-border` | Informational status borders. |
| `--purple` | `--color-discovery` | `text-discovery`, `bg-discovery` | Tool, agent, discovery, or creative status emphasis. |
| `--purple-bg` | `--color-discovery-surface` | `bg-discovery-surface` | Discovery/tool status surfaces. |
| `--purple-border` | `--color-discovery-border` | `border-discovery-border` | Discovery/tool status borders. |
| `--red` | `--color-danger` | `text-danger`, `bg-danger`, `border-danger` | Errors, failed states, destructive actions. |
| `--red-bg` | `--color-danger-surface` | `bg-danger-surface` | Error and destructive confirmation surfaces. |
| `--red-border` | `--color-danger-border` | `border-danger-border` | Error and destructive confirmation borders. |
| `--bg-panel` on solid danger | `--color-danger-foreground` | `text-danger-foreground` | Text/icons on solid danger surfaces. |
| `--amber` | `--color-warning` | `text-warning`, `bg-warning` | Warning and caution status. |
| `--amber-bg` | `--color-warning-surface` | `bg-warning-surface` | Warning status surface. |
| Derived from `--amber` | `--color-warning-border` | `border-warning-border` | Warning status border. Add a real `--amber-border` later if warnings need hand-tuned contrast. |

### Interaction and overlay

| Source in `index.css` | Tailwind theme token | Utility examples | Intended use |
| --- | --- | --- | --- |
| `--accent` | `--color-focus` | `outline-focus`, `ring-focus` | Focus-visible outlines and direct focus borders. |
| `--accent-soft` | `--color-focus-ring` | `ring-focus-ring` | Input and composer halo states. |
| `rgba(28, 27, 26, 0.42)` from `.modal-backdrop` | `--color-overlay` | `bg-overlay` | Modal scrim/backdrop. |
| `--bg-subtle` | `--color-control-hover` | `bg-control-hover` | Default neutral hover fill for controls. |
| `--bg-muted` | `--color-control-active` | `bg-control-active` | Neutral pressed/active fill for controls. |

### Native Tailwind primitives

| Existing CSS variable | Tailwind behavior | Utility examples | Intended use |
| --- | --- | --- | --- |
| `--radius-sm`, `--radius`, `--radius-lg`, `--radius-pill` | Keep as CSS variables for retained global CSS. Use Tailwind native radius utilities in migrated TSX. | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full` | Buttons, inputs, cards, modals, pills, avatars. |
| `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg` | Keep as CSS variables for retained global CSS. Use Tailwind native shadow utilities in migrated TSX. | `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg` | Subtle controls, selected cards, popovers, modals. |
| `--sans`, `--serif`, `--mono` | Keep as CSS variables for base/global CSS. Use Tailwind native font utilities in migrated TSX. | `font-sans`, `font-serif`, `font-mono` | UI text, editorial moments, code/file paths. |

## Utility vocabulary

Use this vocabulary for TSX migrations.

### Color utilities

- Surfaces: `bg-bg`, `bg-app`, `bg-panel`, `bg-subtle`, `bg-muted-surface`, `bg-elevated`.
- Borders: `border-border`, `border-border-strong`, `border-border-soft`, `divide-border`, `divide-border-soft`.
- Text: `text-text`, `text-strong`, `text-muted`, `text-soft`, `text-faint`, `placeholder:text-faint`.
- Accent: `bg-accent`, `text-accent`, `border-accent`, `bg-accent-hover`, `text-accent-strong`, `bg-accent-tint`, `bg-accent-soft`, `text-accent-foreground`.
- Status: `text-success`, `bg-success-surface`, `border-success-border`, `text-info`, `bg-info-surface`, `border-info-border`, `text-discovery`, `bg-discovery-surface`, `border-discovery-border`, `text-danger`, `bg-danger-surface`, `border-danger-border`, `text-warning`, `bg-warning-surface`, `border-warning-border`.
- Interaction: `outline-focus`, `ring-focus`, `ring-focus-ring`, `bg-overlay`, `bg-control-hover`, `bg-control-active`.

### Native utility examples

- Radius: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full`.
- Shadows: `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg`.
- Fonts: `font-sans`, `font-serif`, `font-mono`.

## Migration rules

1. Use Open Design color token utilities for app UI chrome and component styling.
2. Keep raw CSS variables as the visual source in `index.css`; Tailwind `@theme` tokens should reference `var(--*)` for theme-sensitive values.
3. Use status names in TSX. Examples: `text-danger`, `bg-success-surface`, `border-info-border`.
4. Keep brand assets, SVG illustration colors, sketch/canvas user colors, and file color conversion helpers as documented exceptions.
5. Add one color token before repeating the same arbitrary color value in multiple components.
6. Keep complex one-off gradients and `color-mix()` expressions local during migration only when they encode component-specific art direction; promote repeated patterns into the interaction/status tokens above.

## Guardrail target

The style guard should reject default Tailwind palette utilities in app UI files after this token set lands. Examples to reject include `text-red-500`, `bg-white`, `border-zinc-200`, `from-orange-500`, `ring-blue-400`, and similar default palette classes.

Allowed color sources are:

- Tailwind utilities generated by the `@theme` tokens in this file.
- Existing CSS variables in `index.css` and runtime appearance code.
- Explicitly documented exceptions for brand assets, SVG illustrations, canvas/sketch user colors, and color conversion helpers.
