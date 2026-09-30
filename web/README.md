# web/: React + TypeScript port

The port of the static site (repo root) to Vite + React + TypeScript, following `../HANDOVER.md`.

```
npm install
npm test          # domain rules + dataset invariants (Vitest)
npm run typecheck
npm run dev       # Vite dev server; /api is proxied to localhost:3000 (vercel dev)
npm run build
```

- `src/domain/`: every rule from HANDOVER.md section 5 (attributes, height gate, badge tiers,
  animation unlocks and co-unlocks, takeovers, specializations, presets, share links, Cap Breakers).
  Pages import these; none re-implement them.
- `src/domain/domain.test.ts`: the reference values from HANDOVER.md section 6.
- `src/data/`: typed imports of `../data/*.json` (via the `@data` alias; no copies).
  `data.test.ts` checks the dataset invariants the rules depend on.

Status: foundation only. No pages are ported yet, and nothing here is deployed.
