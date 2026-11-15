# OpenShelf development

## Commands

Node 22. Environment variables load from `.env.local` with mise; the local
Postgres database is on port 5433.

- `mise run docker:up`: start local Postgres.
- `mise run dev`: Next.js development server.
- `mise run db:push`: apply the Drizzle schema.
- `npm test`: validation and MCP tests; optional isolated database integration.
- `npm run typecheck`: regenerate route types and check TypeScript.
- `npm run build`: production build.

## Architecture

Next.js 16 App Router, React 19, Drizzle ORM/Postgres, Tailwind CSS 4.
OpenShelf stores reading data and displays it. External LLMs own conversations,
CSV parsing, and recommendation generation. Do not reintroduce embedded AI.

Server components query Drizzle directly. `/library` provides search, shelves,
labels, and recommendations; `/library/[id]` displays book details and personal
notes. `/stats` provides reading analytics. `/settings` manages MCP connections.
The library UI is for browsing, not editing. Follow `docs/redesign/README.md`
for the Reading Room theme, typography, and layouts (dark by default).

Magic-link auth uses Resend and an email allowlist. Page guards are
`requireUser`/`requireAdmin`; session-authenticated API guards are
`requireApiUser`/`requireApiAdmin`.

`/api/mcp` is deliberately outside cookie middleware. It accepts only bearer
tokens from `api_tokens`, validates Origin if supplied, and serves stateless
Streamable HTTP using the official MCP SDK. It never accepts a userId argument
from the LLM. Tools receive a user-scoped library service created by the route.

## Key files and patterns

- `src/lib/db/schema.ts`: current schema. Keep unused legacy AI tables/columns
  until a separately authorized data migration removes them.
- `src/lib/library/validation.ts`: strict Zod tool/record input schemas.
- `src/lib/library/service.ts`: user-scoped book/recommendation operations.
  Saves lock the owning user row within a transaction before identity matching.
- `src/lib/mcp/server.ts`: tool descriptions, schemas, annotations, instructions.
- `src/lib/mcp/transport.ts`: HTTP/auth/origin handling and transport lifecycle.
- `src/lib/auth/apiToken.ts`: random token generation and SHA-256 authentication.
- `src/app/api/tokens`: cookie-authenticated token creation/listing/revocation.
- `src/components/McpConnections.tsx`: one-time token display and setup help.
- `tests`: validation, actual SDK protocol, database, and HTTP smoke checks.

Always scope queries by authenticated user. Use Drizzle for database operations.
Do not log plaintext tokens or return token hashes. Use IDs for explicit updates;
missing fields preserve stored data and null explicitly clears optional fields.
Do not infer a user's rating, reading date, or opinions.

Open Library and Google Books provide optional cover/synopsis lookup. The MCP
metadata tool is marked open-world; stored text is untrusted data. Existing
REST endpoints remain session-authenticated for compatibility, except removed
AI and CSV endpoints. See README.md for setup and client compatibility.
