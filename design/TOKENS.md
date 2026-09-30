# NBA2KLab — Design Token Architecture

Foundation for the 2K27 front-end redesign. Base identity is **Broadcast** (Direction A). The system is built so a **season** (e.g. the 2K27 cover palette) re-skins the entire site by overriding a handful of tokens.

## Files

| File | Role |
|---|---|
| `tokens.json` | Source of truth. DTCG format. Generates everything else via Style Dictionary. |
| `tokens.css` | Shipped implementation. Three tiers as CSS custom properties + theme blocks. |
| `theme-switcher.html` | Live proof. Direction A components bound to semantic tokens, with a base ↔ season toggle. |
| `TOKENS.md` | This document. |

## The three tiers

```
primitive  →  semantic  →  theme
(raw values)  (roles)       (a set of semantic values)
```

1. **Primitive** — raw palette and scales, named by what they *are* (`--red-500`, `--neutral-900`, `--size-lg`). Never referenced by a component.
2. **Semantic** — roles, named by what they *do* (`--surface`, `--text-muted`, `--accent`, `--tier-hof`). The base theme lives here as the default values.
3. **Theme** — a `[data-theme]` block that overrides a subset of semantic tokens. The base needs no block (it is `:root`); a season overrides only what makes it seasonal.

### The one rule

> **Components reference only semantic (Tier 2) tokens.** Never a primitive, never a raw hex/oklch value, in a component stylesheet.

This is the whole mechanism. Because every component binds to `--surface` / `--accent` / `--tier-hof` and never to a literal, changing what those roles point to re-skins the site with zero component edits. Break this rule once and that component stops following the season.

## Contrast — verified, not eyeballed

Every semantic text/surface pair, both themes, against WCAG AA (4.5:1 body text, 3:1 large text and UI). Computed by converting each token's OKLCH to linear sRGB and applying the WCAG formula.

| Pair | Broadcast | Arena Night | Floor |
|---|---|---|---|
| body text / surface | 16.6 | 16.4 | 4.5 |
| muted text / surface | 7.5 | 7.4 | 4.5 |
| subtle text / surface | 5.1 | — | 4.5 |
| accent-as-text / surface | 5.1 | 5.1 | 4.5 |
| on-accent / accent (button) | 5.0 | 5.0 | 3.0 |
| table header fg / bg | 12.7 | — | 4.5 |
| bronze / silver / gold / hof number / surface | 6.3 / 10.0 / 10.7 / 6.2 | — | 4.5 |
| cyan stat + HOF / navy surface | — | 10.3 | 4.5 |
| dark text / cyan pill | — | 10.3 | 4.5 |

Two values were tuned during this pass to clear AA: `--text-subtle` was lifted one step, and the accent split into a fill color (`--accent`, red-500) and an on-surface text color (`--accent-text`, red-400). Re-run the check whenever a color token changes.

## How to add a season

A season is a diff, not a design. Target ~10 token overrides; if you pass ~15 you are building a new direction, not a season.

1. **Sample the source** (cover art, event key art) into ~5 hexes: a ground/surface, a primary, a highlight, a neutral, an accent.
2. **Add primitives** for any new hues in `tokens.json` → `primitive` and in `tokens.css` Tier 1 (e.g. the `navy-*` ramp and `cyan-500` for Arena Night). Reduce chroma as lightness approaches white/black.
3. **Add the theme block.** In `tokens.json` → `$themes`, add an entry whose `overrides` map semantic roles to the new primitives. In `tokens.css`, add the matching `[data-theme="…"]` block.
4. **Override only seasonal roles.** Typically: `--surface`, `--surface-raised`, `--surface-sunken`, `--surface-hover`, `--border`, `--accent-live`, `--on-accent-live`, `--focus-ring`, `--tier-hof`, `--table-header-bg`. Leave `--accent` (brand), all type, spacing, radius, and motion inheriting from base.
5. **Run the contrast check** over the overridden pairs. Fix any that miss AA before shipping.
6. **Activate** by setting `data-theme="…"` on `<html>` (server-rendered per active season, or a user toggle).

### What a season may and may not touch

| May change | Must not change |
|---|---|
| Surfaces, borders | The brand accent (`--accent`) — brand recognition |
| The "live/top" spotlight (`--accent-live`), focus ring | Type (`--font-*`, the size scale) |
| Tier accents (`--tier-hof`) | Spacing, radius, z-index, motion |
| Table header, brand glow | Component CSS (never) |

Seasons change the arena lighting, not the team. Keeping type and layout constant is what lets you re-skin every September without a redesign — and makes the swap feel like a fresh coat, not a different product.

## Standing decisions carried from the audit

These are baked into the tokens so the original site's failure modes can't recur:

- **Breakpoints:** five, fixed — 576 / 768 / 992 / 1200 / 1400. (The audited site had 29.)
- **Z-index:** one ladder, `--z-dropdown … --z-toast` (1000–1400). (The audited site laddered up to 9999.)
- **Type:** fixed `rem` scale for app UI, `clamp()` only on the hero display size. Meaningful-text floor is `--size-xs` = 12px. (The audited site rendered decision-critical text at 9px.)
- **Focus:** a visible `:focus-visible` ring is defined once in the token layer and is never removed per-component. (The audited site had no visible focus on 24 of the first 28 tab stops.)
- **Color:** OKLCH throughout; neutrals tinted toward the brand hue; no raw literals in components.

## Generating from source

`tokens.json` is DTCG-compliant, so a Style Dictionary config can emit `tokens.css`, a JS/TS object, and Figma variables from the single source. Keep `tokens.json` authoritative and treat `tokens.css` as generated once the build is wired; until then they are maintained together.
