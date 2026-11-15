# Reading now carousel

- [x] Sort currently-reading books by dateAdded descending, with stable ID ties.
- [x] Centre the selected cover and tilt neighbouring covers to the sides.
- [x] Keep title, metadata, start date, and note in sync with the selected book.
- [x] Support cover selection, previous/next buttons, arrow keys, and swipe.
- [x] Handle zero, one, two, and many books; respect reduced motion.
- [x] Verify ordering, accessibility, light/dark, mobile containment, tests/build.

No automatic rotation and no database changes. The newest-added book is the
initial selection; the carousel can wrap at either end. Existing start dates
remain display-only and do not affect this ordering.

Verified locally: 14 unit/protocol/database tests, 12 Chromium browser tests,
and the HTTP/MCP smoke check passed. Typecheck and production build passed;
npm audit reports zero vulnerabilities. Browser checks include both themes at
1280px and 390px, text contrast, 44px targets, selection/notes, wrapping,
keyboard focus, swipe versus vertical scrolling, reduced motion, and hidden
covers in a seven-book carousel. Screenshots were checked visually.

The verification above used only a disposable database. This UI-only change
requires no application database upgrade.
