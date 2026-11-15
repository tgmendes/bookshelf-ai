# Lightweight dashboard controls

The assistant remains the primary way to manage the library, but the dashboard
now also supports rating/status corrections and recommendation actions.

- [x] Validate and scope rating/status updates to the signed-in user.
- [x] Start a recommendation transactionally, reusing an unambiguous book match.
- [x] Confirm deletion and remove only the recommendation.
- [x] Add accessible controls to shelf/details, Reading now, and Up next.
- [x] Verify refreshed UI, shared MCP data, errors, dates, ownership, concurrency.
- [x] Run database, HTTP, browser, accessibility, typecheck/build and audit checks.

Verification: 17 unit/database/protocol tests and 18 browser tests passed.
HTTP smoke confirmed dashboard changes through actual MCP calls. Typecheck and
production build passed; npm audit found zero vulnerabilities. Phone screenshots
were inspected in both themes, including editor and delete-error states.
The build still reports the existing middleware-to-proxy deprecation warning.

Starting moves a recommendation into Reading now and removes it from Up next
only once the book is saved. Preserve book metadata, notes and ratings when
reusing a book. Existing start/finish dates stay intact; missing dates use the
user's local today, explicitly submitted by the UI. MCP date semantics do not
change. No manual title/author/reason editor, CSV importer, or book deletion UI.
