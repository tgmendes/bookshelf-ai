# OpenShelf redesign: "Reading Room"

This is a brief for the agent implementing the redesign. The visual reference is in two mockups next to this file. Open them in a browser; the moon button switches between light and dark:

- `shelf.html`: home / library (`/library`)
- `reading-year.html`: replaces `/stats`

The mockups use static sample data. Match their layout, tokens and type exactly, but build the pages from real data, as described below. Don't copy their markup wholesale: rebuild them as server components using Tailwind, following the existing patterns.

## Ground rules

- OpenShelf stays a **read-only viewer**. External assistants write all data through MCP, so the UI has no add, edit or delete controls. Filters, sorting, search and links are the only interactions.
- This redesign **replaces the current theme and fonts**. Update the line in `CLAUDE.md` that says "Keep the existing theme and fonts" to point to this document.
- **Dark is the default theme**, and light stays available. Keep `ThemeProvider` / `ThemeToggle` and the `.dark` class variant in `globals.css`. Change the default to dark when nothing is stored.
- Keep accessibility as drawn: real `<button>`/`<a>` elements, `aria-pressed` on filter chips and spines, `aria-current="page"` on the active nav link, touch targets of at least 44px, and text contrast of at least 4.5:1 in both themes.

## Design tokens

Replace the `@theme`, `:root` and `.dark` blocks in `src/app/globals.css` with these values, keeping the CSS variable names below. Tailwind names follow the `--color-*` convention.

| Token | Light | Dark (default) | Use |
| --- | --- | --- | --- |
| `bg` | `#F3EDE2` | `#121110` | page background (warm off-black in dark) |
| `surface` | `#FBF8F2` | `#1B1A18` | cards, panels |
| `surface-2` | `#EDE4D3` | `#26231F` | tags, bar tracks, nav hover |
| `border` | `#DDD3C2` | `#2E2B27` | header rule, grid gaps |
| `border-strong` | `#CFC4B1` | `#3D3832` | outline chips, icon buttons |
| `fg` | `#2E2A25` | `#EEE8DD` | text |
| `muted` | `#6B6459` | `#A39B8E` | secondary text, eyebrows |
| `accent` | `#1F6F66` | `#5DBFB0` | teal: links, stars, highlights |
| `accent-hover` | `#16524B` | `#7FD0C4` | link hover |
| `accent-soft` | `#E3EFEC` | `rgba(93,191,176,.13)` | "updated" pill, summary panel |
| `accent-on-soft` | `#16524B` | `#8ED6CB` | text on `accent-soft` |
| `accent-faint` | `#A9C9C3` | `#2F5B55` | low-rating bars |
| `invert-bg` / `invert-fg` | `#2E2A25` / `#F3EDE2` | `#EEE8DD` / `#121110` | active nav link and active chip |
| `ledge` / `ledge-shadow` | `#D8C7A8` / `#C4B08D` | `#3A322A` / `#241F1A` | the wooden shelf under the spines |
| `spine-ink` | `#2E2A25` | `#1A1816` | text on pastel spines and covers (always dark) |

The pastels used for spines, cover tiles, recommendation top borders and author dots:

| Name | Light | Dark |
| --- | --- | --- |
| sage | `#C9DCC8` | `#A9C2A8` |
| blush | `#EBC9C3` | `#D3ACA5` |
| butter | `#EFDDA8` | `#D9C68E` |
| lavender | `#D4CCE6` | `#B6ADCF` |
| sky | `#C4D9E6` | `#A6BFD0` |
| peach | `#F0CFAE` | `#D8B492` |

Pick a book's pastel deterministically: hash the book ID, take it modulo 6 (put the helper in `src/lib/coverGradients.ts` or a replacement), and use the same colour everywhere that book appears.

## Typography

Use `next/font/google` in `src/app/layout.tsx` and replace Instrument Serif and DM Sans with:

- **Raleway** (200, 300, 400, 500, 600, plus italic 300) as `--font-display`, for headings, the wordmark, numbers and spine titles. Keep display text light (200–400). No heavy, bulky weights.
- **Lato** (400, 700, plus italic 400) as `--font-body`, for everything else.

Scale used in the mockups:

- Reading-year hero: 88px / weight 200
- Page titles: 44px / 300
- Section headings: 30px / 400
- Card headings: 21–22px
- Body: 15px
- Eyebrows: 12px / 700, letter-spacing 0.16em, uppercase

## Layout and shell

- Content sits in a 1160px max-width container with 32px side padding (16px on phones).
- **Nav** (`src/components/Nav.tsx`): the wordmark `OPEN` in Raleway 300 and `SHELF` in 600 accent, uppercase with letter-spacing 0.18em; pill links *Shelf · Up next · Reading year · Connections*; on the right, an "Updated · {relative time}" pill and the theme toggle. Keep the existing mobile menu and the admin link. Drop the current filled logo square.
- The updated time is the latest `updatedAt` across the user's books and recommendations, and `createdAt` for recommendations. The UI is read-only, so every update comes from an assistant. Use the copy "Updated by your assistant" or "Updated by Claude" only if a token name is available; otherwise use just "Updated".

## Pages

### `/library`: the shelf (`shelf.html`)

1. **Reading now** hero, shown only when a book has `shelf = 'currently-reading'`; if there are several, show the most recent first and the rest as a small list.
   - A large cover tile in the book's pastel; use `coverUrl` instead when present.
   - Title, author, year and pages.
   - "Reading since {date_started}". Omit the line when `date_started` is null.
   - On the right, a "Your note" card with `books.notes`, plus "Updated {updatedAt}" when the note is present. Omit the card when there is no note.
   - There is **no progress bar**: progress isn't tracked.
2. **The shelf**: books as vertical spines standing on a ledge.
   - Spine height is 210–280px, scaled by `pages`; width is 42–70px, also scaled by `pages`; the background is the book's pastel; the title reads bottom-to-top (`writing-mode: vertical-rl; transform: rotate(180deg)`).
   - The shelf scrolls horizontally on small screens.
   - The filter chips map to the existing shelf, sort and search query params (Read / Want to read / sort by rating, etc.). Keep the existing label filter and search, styled as chips plus a search field. The heading shows the year and count, e.g. "The shelf · 2026 · 42 read".
   - Clicking a spine selects it (a client component; `aria-pressed`, the spine lifts 14px and gets an accent outline) and fills the **detail panel** below: "Read {dateRead}", title, author · year · pages, `synopsis`, label tags, *You* (`myRating` as stars) vs *Community* (`avgRating` / 5), the "Your notes" box, and "Open book page →" linking to `/library/[id]`. The most recently read book is selected by default.
3. **Up next**: the `recommendations` cards. Each has a 6px pastel top border, title, author, the `reason` beside a 2px accent rule, and footer text "Saved by {source ?? 'your assistant'} · {createdAt}". This replaces `/next-read`; keep the existing redirect.
4. **This year so far**: a four-cell stat strip (books read, pages, average rating, most-read author) and "See your reading year →".

`/library/[id]` should reuse the detail panel's styling as a full page.

### `/stats` → "Reading year" (`reading-year.html`)

Rename the nav item. The year comes from `?year=`; the default is the current year. The chips list only years that have read books. The heading reads "{year}, *in pages.*" with the second line italic and in the accent colour.

- **Totals**: count of books with `shelf = 'read'` and `dateRead` in that year; the sum of their `pages`; the average of `myRating > 0`; the number of distinct authors.
- **Month by month**: 12 columns, each a mini shelf of spines (14px wide; height `50 + pages/620*90` px, clamped) in the book's pastel, with the month name and count below. Currently-reading books appear as a dashed accent outline in the month they were started, and only when viewing the current year. Wrap the 12 columns in an `overflow-x: auto` box on narrow screens.
- **How you rated them**: horizontal bars for 5 down to 1 stars. Fill with `accent` for 4–5 stars and `accent-faint` for 1–3.
- **Authors you kept coming back to**: the top 5 by book count that year, each with a numbered pastel dot.
- **Book of the year, so far**: the highest `myRating`, with the latest `dateRead` breaking ties. Show its cover tile and its `notes` as a quote. Drop the "so far" once the year has ended.
- **Facts** grid: the longest and shortest book (by `pages`, ignoring 0), the busiest month, and the top label (the label with the most read books that year).
- **Your year, in a sentence**: optional, see the schema changes below. Hide the panel when no summary exists.

Draw the charts with plain divs/CSS as in the mockup. No chart library is needed; `StatsCharts.tsx` can be removed if nothing else uses it.

## Schema and MCP changes

Additive only, applied with `db:push` like the earlier upgrades. Add a short section to the README's upgrade notes.

1. **`books.date_started`** (`date`, nullable): powers "Reading since" and the dashed spine for the month a book was started. Add it to the Zod schemas in `src/lib/library/validation.ts`, to `save_book` (optional; omitted keeps the stored value, `null` clears it) and to `list_books`/`get_book` output. Update the tool descriptions in `src/lib/mcp/server.ts`: set it only when the user states when they started; never infer it.
2. **Optional: a year summary.** Add a `year_summaries` table (`id`, `user_id`, `year` int, `text`, `updated_at`; unique on `user_id`+`year`) and an MCP tool `save_year_summary { year, text }` so the assistant can write the one-line summary. Also expose it as a read tool. Skip this if out of scope; the page hides the panel when there's no row.

As usual, scope every query to the authenticated user, and add tests next to the existing validation and MCP tests in `tests/`.

## Done when

- `/library` and `/stats` match the mockups in both themes at 1280px wide, and the 390px phone layout works without horizontal page scrolling (the shelf and month chart scroll inside their own boxes).
- Dark is the default theme.
- `npm run typecheck`, `npm test` and `npm run build` pass.
