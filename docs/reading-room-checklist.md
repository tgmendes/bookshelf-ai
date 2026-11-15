# Reading Room implementation

Follow `docs/redesign/README.md` and its two mockups. The supplied brief is the
design; no additional design checkpoint or Plannotator is needed.

- [x] Add and test date-started validation, storage, and MCP semantics.
- [x] Add pure, tested reading-year/shelf calculations and ID-based pastels.
- [x] Replace tokens, typography, default theme, and navigation.
- [x] Build the shelf, shared detail panel, reading-now hero, recommendations.
- [x] Build the reading-year page with CSS charts and real scoped data.
- [x] Verify browser interactions, accessibility, light/dark, 1280px/390px layouts.
- [x] Run integration tests, typecheck, audit, production build; update upgrade docs.

Scope choices: skip the optional year summary; use UTC date-only formatting;
never infer reading start dates. Preserve account/admin/connection controls.
Add recommendation update timestamps so the updated indicator reflects edits,
falling back to creation time for older records. Shelf dates show the actual
year or year range represented, not a misleading current-year label.

Verification: 12 unit/protocol/database tests, seven Chromium browser tests,
and the full HTTP/MCP smoke check passed against a disposable database.
Typecheck and production build passed; npm audit reports zero vulnerabilities.
The additive SQL upgrade was also checked for repeatability locally.

The browser tests opened both reference HTML files and captured the real pages
at 1280px and 390px in both themes. Screenshots were visually checked against
the references. Automated WCAG checks (including text contrast), 44px touch
targets, keyboard-capable controls, and page-width containment passed. A
separate regression covers long unbroken assistant-written metadata, which
otherwise overflowed the mobile page.

Screenshots: `test-results/reading-room/` (ignored generated artifacts).
The verification above used a disposable database. During the subsequently
authorized production deployment, a fresh backup was taken and the standalone
additive upgrade was applied. Schema checks confirmed all 656 existing books
and four recommendations were preserved. No reading start dates were backfilled
or inferred.
