# NBA2KLab redesign: functional mockup

A redesign of nba2klab.com: seven static pages plus a small API for demo accounts.

**Demo accounts only.** This mockup can't reach real 2KLab accounts, so sign-in takes a display name
with no password; the same name reaches the same account. Don't enter personal information.

## Layout
- `*.html`, `*-app.js`: the site (Builds, Builder, Requirements, MyCareer, Shooting, Game Details, home)
- `api/`: Vercel Functions (web-standard `fetch` handlers)
  - `session`: demo sign-in / sign-out
  - `progress`: rewards progress, merged per key (newer wins)
  - `builds`: saved builds (same format as Builder share links)
  - `community`: shared builds and ratings (Premium demo accounts only)
- `lib/`: storage adapter (private Vercel Blob, conditional writes with ETag retry), sessions, validation

## Environment
- `BLOB_READ_WRITE_TOKEN`: set automatically when a private Blob store is connected to the project
- `SESSION_SECRET`: random string, 32+ characters (signs session cookies)
