# OpenShelf

A reading database with an MCP interface and a browsing UI. Your external
assistant manages books, ratings, reading dates, personal notes, and saved
recommendations. OpenShelf does not run an LLM or upload CSV files.

## Run locally

Use Node 22. Copy `.env.local.example` to `.env.local` and configure email
sign-in. With mise installed:

```sh
npm ci
mise run docker:up
mise run db:push
mise run dev
```

Without mise, set `DATABASE_URL` yourself and use the corresponding npm scripts.
The local Docker database uses port 5433. `NEXT_PUBLIC_APP_URL` must be your
application's canonical URL; use HTTPS for remote deployments.

### Upgrading an existing installation

Back up the database, then apply the standalone additive upgrade with the
intended `DATABASE_URL` **before deploying** this code:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/agent-first-upgrade.sql
```

The migration is transactional and safe to repeat. It leaves existing
constraints and records untouched rather than asking Drizzle to reconcile
historical schema differences. Use `npm run db:push` to initialize a new local
database. The additive schema changes are:

- `books.notes`: optional personal reading notes.
- `recommendations.source`: optional attribution for a recommendation.
- `api_tokens`: per-user connection names, public prefixes, SHA-256 token hashes,
  and creation dates. Plaintext tokens are never stored.

Existing books, recommendations, labels, and sign-ins are preserved. Legacy AI
tables and account columns remain in the schema to avoid deleting historical
data; they are unused. The chat, discovery, similar-book, label-suggestion, and
CSV import endpoints and their UI have been removed. `/discover` now redirects
to saved recommendations.

## Connect an assistant

1. Sign in to OpenShelf and open **Connections**.
2. Create a named access token. Save it immediately; it is shown only once.
3. In your MCP client's secure connection settings, add:
   - Transport: **Streamable HTTP**
   - URL: `https://YOUR_HOST/api/mcp`
   - Header: `Authorization: Bearer YOUR_TOKEN`

The client must support custom Authorization headers. This release does not
provide OAuth discovery/authorization, so OAuth-only connectors cannot connect.
It uses stateless JSON responses and requires no sticky sessions or persistent
server process. GET event streams and DELETE sessions are not supported.

Keep tokens out of chat transcripts, source control, and URLs. Each token grants
read/write access to **only its owner's** books and recommendations, not admin
access. Tokens do not expire automatically. Create one per client and revoke
unused tokens in Connections. Revocation blocks subsequent requests; it cannot
cancel a request already authenticated and in progress. Admin **Revoke** also
removes that user's assistant tokens, in addition to browser sessions.

### MCP tools

| Tool | Purpose |
| --- | --- |
| `list_books` | Paginated search by title/author and shelf; includes ratings, dates, notes, and tags |
| `get_book` | One book and its assigned labels |
| `lookup_book_metadata` | Look up a cover, synopsis, and community rating without changing stored data |
| `save_book` | Add a book or update supplied fields by ID |
| `list_recommendations` | Paginated saved recommendations, reasons, and sources |
| `save_recommendation` | Save or revise a recommendation with its reason |
| `remove_recommendation` | Delete a saved recommendation when requested |

Read tools use `limit` (1–100) and `offset`; follow `nextOffset` until it is null
to read the whole collection. Metadata lookup sends the supplied title/author to
Google Books and Open Library, may return incomplete or incorrect edition data,
and never invents a rating or personal opinion.

`save_book` requires title and author for a new book. Use the returned ID for
later updates. Without an ID it matches ISBN, Goodreads ID, or exact
case-insensitive title + author within the current account. Ambiguous matches
require an explicit ID. Concurrent saves for an account are serialized to avoid
duplicate inserts. Existing duplicate records are not merged automatically.

Omitted fields stay unchanged; `null` clears an optional field. Ratings are
integers from 0–5, where 0 is unrated. Shelves are `read`, `currently-reading`,
and `to-read`. Dates use `YYYY-MM-DD`. Finishing a book does not guess its rating
or date. Personal tags use `bookshelves`; existing color labels remain visible
and readable, but are not managed through these MCP tools.

Recommendations are separate from reading history. Saving or finishing a book
does not automatically delete its recommendation. The assistant can remove it
if asked.

## Reading Room redesign

The read-only shelf and Reading year pages follow `docs/redesign/README.md`.
Dark is the default; the theme toggle preserves an explicit light preference.
Book colours are derived from their IDs. Charts use CSS, not a chart library.
The optional assistant-written year summary is not included.

Reading now is a manual cover carousel, ordered by `dateAdded` newest first
(stable book-ID order for ties). Its selected cover is centred, with tilted
neighbours. Click a neighbouring cover, use previous/next or arrow keys, or
swipe horizontally to select another book. Home/End jump to the newest/oldest;
the title, note and start date follow the selection. It never auto-rotates and
respects reduced-motion preferences. Start dates and note edits do not reorder it.

For an existing database, apply `drizzle/reading-room-upgrade.sql` after the
agent-first upgrade and before running this code. Alternatively, use `db:push`
against a database whose schema is already managed by Drizzle:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/reading-room-upgrade.sql
```

This only adds nullable `books.date_started` and
`recommendations.updated_at`. The MCP field is `dateStarted` (`YYYY-MM-DD`):
omission preserves it, `null` clears it, and the assistant must never infer it.
Older recommendations use their creation time for the updated indicator until
they are edited. Reading totals use finished dates, not import/start dates.
Shelf headings display the actual year range represented by the filtered books.

### Typical conversations

- “I finished Dune.” The assistant finds the book, asks for missing rating/date
  and optional thoughts, then updates the record.
- “Read my library and suggest three books.” The assistant reads your history,
  generates recommendations itself, and saves the ones you want to keep.
- “Here is my Goodreads CSV; add it to OpenShelf.” The assistant parses the file
  and saves each row through `save_book`, preserving identifiers and supplied
  dates. There is no CSV-specific tool, atomic bulk import, or Kindle sync.

## Verify

```sh
npm test
npm run typecheck
npm run build
```

Database integration tests are skipped unless `TEST_DATABASE_URL` is set. Point
it at a disposable database whose name ends in `_test`, initialize that database
with `DATABASE_URL=... npm run db:push`, then run:

```sh
TEST_DATABASE_URL=postgresql://.../openshelf_test npm test
```

For a running app backed by that same disposable database, the HTTP smoke check
also exercises real MCP calls, token creation/revocation, and rendered library
and recommendation pages:

```sh
TEST_DATABASE_URL=postgresql://.../openshelf_test TEST_APP_URL=http://localhost:3105 npx tsx tests/app-smoke.ts
```

For Chromium interaction, responsive, touch-target and automated WCAG/contrast
checks against that same running disposable app:

```sh
npx playwright install chromium
TEST_DATABASE_URL=postgresql://.../openshelf_test TEST_APP_URL=http://localhost:3105 npm run test:browser
```

The browser suite opens the supplied mockups and saves reference and real-page
screenshots in `test-results/reading-room/`, at 1280px and 390px in both themes.
It does not write to a production database.

### Dependency security

Next.js is pinned to 16.4.6; Drizzle ORM, Resend, and Zod use patched releases.
The lockfile also updates affected transitive dependencies. Both `npm audit`
and `npm audit --omit=dev` report zero known vulnerabilities at verification.

An override pins esbuild to 0.25.12 only inside `@esbuild-kit/core-utils`, a
legacy loader still pulled in by Drizzle Kit. It fixes GHSA-67mh-4wv8-2f99
without npm's proposed breaking Drizzle Kit downgrade. A regression test checks
the actual resolved version and both TypeScript transformation paths. Remove
the override once Drizzle Kit no longer needs the vulnerable dependency.

Run `npm audit` regularly: a clean audit covers known package advisories, not a
complete security assessment of the application.
