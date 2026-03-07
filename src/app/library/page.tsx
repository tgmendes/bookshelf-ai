import { db } from '@/lib/db';
import { books, recommendations, bookLabels, labels } from '@/lib/db/schema';
import { BookCard } from '@/components/BookCard';
import { LibraryFilters } from '@/components/LibraryFilters';
import { EmptyLibrary } from '@/components/EmptyLibrary';
import { Suspense } from 'react';
import { asc, desc, ilike, eq, or, and, count, inArray } from 'drizzle-orm';
import type { Book, Shelf, Label } from '@/lib/types';
import { requireUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';

interface SearchParams {
  shelf?: string;
  sort?: string;
  search?: string;
  label?: string;
}

async function getBooks(params: SearchParams, userId: string): Promise<Book[]> {
  // Next Read shelf — query recommendations table
  if (params.shelf === 'next-read') {
    const recs = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.userId, userId))
      .orderBy(desc(recommendations.createdAt));

    return recs
      .filter((r) => {
        if (!params.search) return true;
        const term = params.search.toLowerCase();
        return r.title.toLowerCase().includes(term) || r.author.toLowerCase().includes(term);
      })
      .map((r) => ({
        id: r.id,
        goodreadsBookId: null,
        title: r.title,
        author: r.author,
        myRating: 0,
        avgRating: null,
        dateRead: null,
        dateAdded: r.createdAt?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
        shelf: 'to-read' as Shelf,
        pages: 0,
        yearPublished: null,
        bookshelves: null,
        coverUrl: r.coverUrl ?? null,
        synopsis: r.synopsis ?? null,
        isRecommendation: true,
        reason: r.reason,
      }));
  }

  const sortMap: Record<string, Parameters<typeof asc>[0]> = {
    title: books.title,
    author: books.author,
    myRating: books.myRating,
    dateRead: books.dateRead,
    dateAdded: books.dateAdded,
  };

  const sortCol = sortMap[params.sort ?? 'dateAdded'] ?? books.dateAdded;
  const isDescSort = !['title', 'author'].includes(params.sort ?? 'dateAdded');

  let query = db.select().from(books).$dynamic();

  const conditions = [eq(books.userId, userId)];
  if (params.shelf && ['read', 'currently-reading', 'to-read'].includes(params.shelf)) {
    conditions.push(eq(books.shelf, params.shelf));
  }
  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(
      or(
        ilike(books.title, term),
        ilike(books.author, term)
      )!
    );
  }

  if (params.label) {
    const labelBookIds = db
      .select({ bookId: bookLabels.bookId })
      .from(bookLabels)
      .where(eq(bookLabels.labelId, params.label));
    conditions.push(inArray(books.id, labelBookIds));
  }

  query = query.where(and(...conditions));

  query = isDescSort ? query.orderBy(desc(sortCol)) : query.orderBy(asc(sortCol));

  const rows = await query;
  return rows.map((r) => ({
    ...r,
    myRating: r.myRating ?? 0,
    pages: r.pages ?? 0,
    shelf: r.shelf as Shelf,
    coverUrl: r.coverUrl ?? null,
    synopsis: r.synopsis ?? null,
  }));
}

async function LibraryGrid({ searchParams, userId, hasBooks }: { searchParams: SearchParams; userId: string; hasBooks: boolean }) {
  const allBooks = await getBooks(searchParams, userId);
  const isNextRead = searchParams.shelf === 'next-read';

  if (allBooks.length === 0 && !hasBooks && !isNextRead) {
    return <EmptyLibrary />;
  }

  return (
    <>
      {!isNextRead && (
        <div className="flex items-center gap-6 mb-6 text-sm text-muted">
          <span><strong className="text-foreground">{allBooks.length}</strong> books</span>
        </div>
      )}

      {allBooks.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p>{isNextRead ? 'No saved recommendations yet. Chat with the AI to get book suggestions.' : 'No books found. Try adjusting your filters.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </>
  );
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { userId } = await requireUser();
  const params = await searchParams;

  const [{ total }] = await db
    .select({ total: count() })
    .from(books)
    .where(eq(books.userId, userId));
  const hasBooks = total > 0;

  const userLabels: Label[] = await db
    .select({ id: labels.id, name: labels.name, color: labels.color })
    .from(labels)
    .where(eq(labels.userId, userId))
    .orderBy(asc(labels.name));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl text-foreground mb-2">My Library</h1>
      {hasBooks && <p className="text-muted mb-6">Browse and manage your book collection</p>}
      {hasBooks && (
        <Suspense fallback={<div />}>
          <LibraryFilters labels={userLabels} />
        </Suspense>
      )}
      <Suspense fallback={<div className="text-muted py-8 text-center">Loading…</div>}>
        <LibraryGrid searchParams={params} userId={userId} hasBooks={hasBooks} />
      </Suspense>
    </div>
  );
}
