# legacy/: the static build this repo started from

Kept as the **behavioral reference** for the React/TypeScript rebuild. Nothing here is served.

- `src/`: page sources (HTML with inline CSS/JS, plus `*-app.js`). The deployed pages at the repo
  root were generated from these by `build/wire.py`.
- `build/`: `wire.py` (build: injects the shared header/footer/link map from `shell.py`, inlines
  `site-shell.css/js`, guards against page CSS landing in the shell block), `shell.py`
  (nav, footer, verified link map).
- `tests/`: the verification suites used during the static build. Python + Playwright, plus
  `api_test.py` / `e2e.py` against a local server (`dev.mjs`, `run.sh`).
  **Paths are hardcoded to the original workspace** (`/home/claude/...`), so they don't run
  as-is. Treat them as executable specifications: the assertions and expected values
  (see HANDOVER.md, "Reference values") are what the rebuild must reproduce.
