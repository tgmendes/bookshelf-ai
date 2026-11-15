# Agent-first OpenShelf

Scope: external LLMs manage reading history and recommendations through MCP;
OpenShelf remains the database and browsing UI. No Kindle sync, embedded LLM,
or browser CSV upload. Preserve existing data and magic-link sign-in.

- [x] Add validated, user-scoped library operations and MCP tools.
- [x] Add hashed, revocable personal tokens and connection settings.
- [x] Simplify the UI and remove embedded AI/import code and dependencies.
- [x] Test protocol, validation, isolation, duplicate handling, and existing build.
- [x] Document setup, database changes, and client compatibility.

Implementation choices: existing Next.js/Postgres stack; stateless Streamable
HTTP at `/api/mcp`; bearer tokens rather than a new OAuth service. Clients must
support custom Authorization headers. Ratings remain integer 0–5 (0 means
unrated); notes and recommendation source are optional. CSV parsing belongs to
the external LLM, which writes records through the same validated tools.

Verification: six automated tests passed with a disposable Postgres database;
official MCP client tests passed over in-memory HTTP and a running production
Next.js server. HTTP smoke also checked token creation/listing/isolation/revocation
and rendered library, detail, recommendation, and connection pages. Typecheck
and production build passed. No application database was migrated or deployed.

Known boundaries: no OAuth, bulk-import transaction, automatic recommendation
cleanup, or MCP mutation of legacy color labels (personal tags are supported).
The follow-up dependency security update resolves the audit findings; see
`docs/dependency-security-checklist.md` for changes and verification.
