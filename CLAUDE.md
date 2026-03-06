# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
mise run docker:up       # Start Postgres (port 5433)
mise run dev             # Start Next.js dev server (localhost:3000)

# Database
mise run db:push         # Push Drizzle schema changes to DB
mise run db:studio       # Visual DB explorer

# Build
npm run build            # Production build

# Docker
mise run docker:down     # Stop Postgres
mise run docker:reset    # Wipe and restart database
```

Node 22 (configured in `.mise.toml`). Environment variables load from `.env.local` via mise.

## Architecture

**Next.js 16 App Router** with React 19, Drizzle ORM (Postgres), Tailwind CSS 4.

### Data flow

Server components fetch data directly with Drizzle → pass props to client components for interactivity. Pages use `<Suspense>` boundaries around async server subcomponents.

### Auth (magic link)

1. Email → `POST /api/auth/login` → checks allowlist → sends Resend magic link
2. Click link → `GET /api/auth/verify?token=` → creates session → sets httpOnly cookie (30-day)
3. `middleware.ts` protects routes, redirects unauthenticated users to `/login`

Route guards:
- **Pages**: `requireUser()` / `requireAdmin()` — redirect on failure
- **API routes**: `requireApiUser()` / `requireApiAdmin()` — return 401 JSON on failure
- **Rate limiting**: `checkAiLimit(userId)` for AI chat requests (daily count in `aiUsage` table)

### Database schema (`src/lib/db/schema.ts`)

7 tables: `users`, `sessions`, `magic_links`, `books`, `chat_messages`, `recommendations`, `aiUsage`, `siteConfig` (key-value admin settings). Books are keyed by `(goodreadsBookId, userId)` for upsert on import.

### AI chat

`POST /api/chat` streams responses from OpenRouter (Claude 3.5 Haiku) via SSE. `buildSystemPrompt()` injects the user's library stats and reading history for personalized recommendations. Client-side streaming handled by `useChat` hook.

### Key integrations

- **OpenRouter** — AI completions
- **Resend** — magic link emails (noreply@open-bookshelf.app)
- **Open Library / Google Books** — cover images

## Project layout

```
src/
├── app/                    # Pages and API routes (App Router)
│   ├── library/            # Book grid with filters and search
│   ├── chat/               # AI chat interface
│   ├── stats/              # Reading analytics (recharts)
│   ├── admin/              # User/config management (admin role only)
│   ├── settings/           # CSV re-import
│   └── api/                # REST endpoints
├── components/             # UI components (server + client)
├── hooks/                  # Client hooks (useChat)
└── lib/
    ├── auth/               # Session, allowlist, rate limiting, guards
    ├── db/                 # Drizzle client + schema
    ├── buildSystemPrompt.ts
    ├── parseCSV.ts         # Goodreads CSV parser
    └── types.ts
```

## Patterns

- Default to **server components**; add `'use client'` only for interactivity (state, effects, event handlers)
- All DB queries use **Drizzle ORM** — never raw SQL
- Import uses `onConflictDoUpdate` keyed on `(goodreadsBookId, userId)`
- Theme uses CSS custom properties in `globals.css` (cream/teal light, dark brown/bright teal dark); fonts are Instrument Serif (display) + DM Sans (body)
- Path alias: `@/*` maps to `./src/*`
