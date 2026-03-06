# BookShelf AI — Design Brief

> Share this with Figma AI. Make all visual design decisions — colours, typography, spacing, component style — unless noted below. The brief describes what we're building and what each page needs to do; the aesthetic is yours to own.

---

## What we're building

A personal reading dashboard web app. Users import their Goodreads library (CSV) and get:
- A browsable book library with filters
- Reading stats and charts
- An AI chat that knows their reading history and gives recommendations
- A curated "next reads" page built from AI-flagged recommendations
- A settings page for re-importing data

**Tone**: Calm, editorial, bookish. Think independent bookshop, not flashy tech product.
**Users**: Adult readers. People who care about their reading life.

---

## Navigation

Top fixed navigation bar with a logo and links to all six pages:

1. Library
2. Stats
3. Chat
4. Your Next Read
5. Settings

---

## Pages

### 1. Landing / Import (`/`)

First-time onboarding screen. Shown only when no books are in the database yet; redirects to Library once data exists.

**Needs to convey:**
- What the app does (one headline + short description)
- A clear call to action: upload a Goodreads CSV export
- The upload area should support drag & drop

---

### 2. Library (`/library`)

A searchable, filterable grid of all the user's books.

**Functionality:**
- Filter by shelf: All / Read / Currently Reading / Want to Read
- Sort by: date added, date read, title, author, rating
- Text search by title or author
- Each book shows: title, author, shelf badge, star rating (if rated), page count, year

---

### 3. Stats (`/stats`)

Reading analytics dashboard.

**Needs to show:**
- Summary numbers: total books read, total pages, average rating, currently reading count
- Books read per year (bar chart)
- Rating distribution (bar chart, 1–5 stars)
- Most-read authors (horizontal bar chart)

---

### 4. Chat (`/chat`)

Full-page AI chat interface. The AI has read the user's entire library and can recommend books, discuss reads, and answer questions about their history.

**Needs:**
- Message thread (user + AI bubbles)
- Text input with send button
- Starter prompt suggestions when the conversation is empty
- A way to flag an AI recommendation for the "Your Next Read" page (e.g. a bookmark or save icon on AI messages)
- Streaming response support (text appears token by token)

---

### 5. Your Next Read (`/next-read`)

A curated page of books the AI has recommended and the user has flagged from the Chat page.

**Needs to show:**
- A grid or list of flagged book recommendations
- Each item: book title, author, a short reason/blurb from the AI (the context in which it was recommended)
- A way to remove a recommendation from the list
- Empty state when no recommendations have been saved yet

---

### 6. Settings (`/settings`)

Simple utility page.

**Needs:**
- A file upload zone to re-import a Goodreads CSV (same as landing, but inline)
- Brief instructions on how to export from Goodreads

---

## Technical notes for Figma

- Web app, desktop-first but should work on mobile
- Font: Geist Sans (Vercel's open-source variable font — use it or suggest an alternative with the same feel)
- Icons: Lucide React icon set
- The app is built with Next.js + Tailwind CSS — keep the design implementable without exotic layout techniques
