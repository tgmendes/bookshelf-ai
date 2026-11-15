# Paused, abandoned, and shelf detail covers

- [x] Accept paused/abandoned in dashboard and MCP validation and filters.
- [x] Preserve dates, ratings, and notes; do not count either status as finished.
- [x] Show the selected shelf book's cover or existing designed fallback.
- [x] Verify database, HTTP/MCP, browser accessibility, layout, and production build.

Verification: 19 unit/database/protocol tests and 20 browser tests passed.
HTTP smoke exercised both new statuses through dashboard writes and actual MCP
save/filter calls. Typecheck, production build, diff checks, and audit passed
(zero vulnerabilities). Desktop and phone cover screenshots were inspected.
The build retains the existing middleware-to-proxy deprecation warning.

Delivery: commit and deploy after verification, then confirm production is ready.

Paused means the reader intends to return; abandoned means stopped without
finishing. Resuming uses Reading and retains the original start date. Neither
new status invents a start/finish date. The existing text shelf column supports
both without a migration. Full book pages retain their existing single cover.
