# Dependency security update

- [x] Reproduce the audit and trace vulnerable dependency paths.
- [x] Update Next.js, Drizzle ORM, Resend, Zod, and affected transitive packages.
- [x] Verify the scoped esbuild override in Drizzle's legacy loader.
- [x] Verify a clean install and zero audit findings, including development dependencies.
- [x] Run tests, typecheck, build, database commands, and HTTP smoke checks.
- [x] Refresh setup documentation with verified results.

The starting audit reported 15 affected packages: 1 critical, 6 high, and
8 moderate. Next.js stays on major version 16. No application behavior changes
or schema migration are intended.

Drizzle Kit's legacy `@esbuild-kit/core-utils` dependency pins esbuild 0.18,
which has the development-server origin vulnerability GHSA-67mh-4wv8-2f99.
The scoped override uses esbuild 0.25.12, already used by Drizzle Kit itself,
instead of accepting npm's proposed breaking downgrade of Drizzle Kit.

Updated direct dependencies: Next.js 16.4.6, Drizzle ORM 0.45.4,
Drizzle Kit 0.31.11, Resend 6.38.1, and Zod 4.6.7. Affected transitive
dependencies were updated in the lockfile. The legacy loader's dependency
subtree was re-resolved so the override is actually installed, not just declared.

Verification on 2026-11-15:

- `npm ci`: successful clean installation.
- `npm audit` and `npm audit --omit=dev`: zero known vulnerabilities.
- All seven tests passed with a disposable Postgres database, including actual
  resolution and sync/async TypeScript transformation through the legacy loader.
- `npm run typecheck` and `npm run build`: passed with Next.js 16.4.6.
- `npm run db:push`: schema/config loading and database operations succeeded
  against the disposable database; repeated successfully after initialization.
- HTTP smoke: real MCP writes, token lifecycle/isolation, and rendered library,
  detail, recommendation, and connection pages passed on the production server.

Only the disposable database was used. No application database migration,
commit, or deployment was performed. The existing middleware deprecation warning
remains; it is unrelated to these vulnerability fixes.
