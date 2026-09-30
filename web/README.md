# web/: React + TypeScript port

The static site (repo root) rebuilt with Vite + React + TypeScript, following `../HANDOVER.md`.
Each page is its own entry with the same filename as the static page (`index.html`,
`reference-table.html`, `builder.html`, ...), so every URL, hash and deep link in HANDOVER.md
section 8 keeps working.

```
npm install
npm test            # domain rules + dataset invariants (Vitest)
npm run typecheck
npm run dev         # Vite dev server; /api is served from ../api with a local folder store
npm run build
npm run test:e2e    # Playwright, desktop + phone, against the production build (vite preview)
```

`npm run dev` and `vite preview` run the Vercel Functions in `../api` in-process with
`STORE_DIR` (a local folder instead of Vercel Blob) and a throwaway `SESSION_SECRET`, so demo
accounts, saved builds, community builds and progress sync all work locally. That bridge is
dev/preview only and is not part of the build. If Playwright's bundled browser isn't installed,
point it at one with `CHROMIUM_PATH=/path/to/chrome`.

## Layout

- `src/domain/`: every rule from HANDOVER.md section 5 (height gate, badge tiers, animation
  unlocks and co-unlocks, takeovers, specializations, presets, share links, Cap Breakers).
  Pages import these; none re-implement them. `domain.test.ts` holds the section 6 reference values.
- `src/data/`: typed imports of `../data/*.json`, one module per dataset so each page bundles only
  what it uses (shared datasets become shared, cacheable chunks). `data.test.ts` checks the
  dataset invariants the rules depend on.
- `src/shell/`: header, mobile drawer, footer, demo sign-in and the account context.
- `src/lib/`: API client, URL helpers (hash tabs that also react to `hashchange`), and the
  rewards progress store.
- `src/components/`: shared UI (tabs with roving tabindex, compare tray/side panel, ...).
- `src/pages/<page>/`: one folder per page, with its own stylesheet.
- `e2e/`: Playwright tests per page, including the reference values, each deep link, the
  saved-build and community flows, and the shared-device progress case.

## Status

All seven pages are ported. Not deployed: the root `vercel.json` still serves the static site,
and switching the deployment to `web/dist` is a separate step.
