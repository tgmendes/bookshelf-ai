import { db } from '@/lib/db';
import { books, recommendations, bookLabels, labels } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Star } from 'lucide-react';
import { getCoverGradient } from '@/lib/coverGradients';
import { FetchSingleCoverButton } from '@/components/FetchSingleCoverButton';
import { SimilarBooks } from '@/components/SimilarBooks';
import { BookLabels } from '@/components/BookLabels';
import type { Shelf, Label } from '@/lib/types';
import { requireUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';

const shelfLabel: Record<string, string> = {
  'read': 'Read',
  'currently-reading': 'Currently Reading',
  'to-read': 'Want to Read',
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rec?: string }>;
}

export default async function BookDetailPage({ params, searchParams }: Props) {
  const { userId } = await requireUser();
  const { id } = await params;
  const { rec } = await searchParams;

  let book: {
    id: string;
    title: string;
    author: string;
    myRating: number;
    avgRating: number | null;
    dateRead: string | null;
    shelf: string;
    pages: number;
    yearPublished: number | null;
    bookshelves: string[] | null;
    coverUrl: string | null;
    synopsis: string | null;
    isRecommendation?: boolean;
    reason?: string;
  } | null = null;

  // Try books table first, unless rec query param is set
  if (rec !== '1') {
    const rows = await db
      .select()
      .from(books)
      .where(and(eq(books.id, id), eq(books.userId, userId)))
      .limit(1);
    if (rows[0]) {
      const r = rows[0];
      book = {
        id: r.id,
        title: r.title,
        author: r.author,
        myRating: r.myRating ?? 0,
        avgRating: r.avgRating ?? null,
        dateRead: r.dateRead,
        shelf: r.shelf,
        pages: r.pages ?? 0,
        yearPublished: r.yearPublished,
        bookshelves: r.bookshelves,
        coverUrl: r.coverUrl ?? null,
        synopsis: r.synopsis ?? null,
      };
    }
  }

  // Fallback to recommendations table
  if (!book) {
    const recs = await db
      .select()
      .from(recommendations)
      .where(and(eq(recommendations.id, id), eq(recommendations.userId, userId)))
      .limit(1);
    if (recs[0]) {
      const r = recs[0];
      book = {
        id: r.id,
        title: r.title,
        author: r.author,
        myRating: 0,
        avgRating: null,
        dateRead: null,
        shelf: 'to-read',
        pages: 0,
        yearPublished: null,
        bookshelves: null,
        coverUrl: r.coverUrl ?? null,
        synopsis: r.synopsis ?? null,
        isRecommendation: true,
        reason: r.reason,
      };
    }
  }

  if (!book) {
    notFound();
  }

  const gradient = getCoverGradient(book.title);

  // Get other books by same author
  let otherBooks: { id: string; title: string; coverUrl: string | null }[] = [];
  if (!book.isRecommendation) {
    const others = await db
      .select({ id: books.id, title: books.title, coverUrl: books.coverUrl })
      .from(books)
      .where(and(eq(books.author, book.author), ne(books.id, book.id), eq(books.userId, userId)))
      .limit(6);
    otherBooks = others;
  }

  // Get book's labels
  let bookLabelList: Label[] = [];
  if (!book.isRecommendation) {
    bookLabelList = await db
      .select({ id: labels.id, name: labels.name, color: labels.color })
      .from(bookLabels)
      .innerJoin(labels, eq(bookLabels.labelId, labels.id))
      .where(eq(bookLabels.bookId, id));
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative">
      {/* Blurred cover backdrop */}
      {book.coverUrl && (
        <div className="absolute top-0 left-0 right-0 h-80 overflow-hidden -z-10 pointer-events-none">
          <img
            src={book.coverUrl}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover blur-3xl opacity-15 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      )}

      <Link
        href={book.isRecommendation ? '/library?shelf=next-read' : '/library'}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-8 animate-fade-in"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </Link>

      <div className="flex flex-col md:flex-row gap-8 md:gap-12">
        {/* Cover */}
        <div className="flex-shrink-0 mx-auto md:mx-0 animate-fade-in-up">
          <div
            className={`relative w-56 rounded-2xl bg-gradient-to-br ${gradient} overflow-hidden shadow-lg`}
            style={{ aspectRatio: '3/4' }}
          >
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-white/30" />
              </div>
            )}
          </div>
          {!book.isRecommendation && (
            <div className="mt-3 text-center">
              <FetchSingleCoverButton bookId={book.id} hasCover={!!book.coverUrl} />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 animate-fade-in-up stagger-2">
          <h1 className="font-display text-3xl md:text-4xl text-foreground leading-snug mb-1">
            {book.title}
          </h1>
          <p className="text-lg text-muted mb-5">{book.author}</p>

          {/* Meta badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-light text-primary">
              {book.isRecommendation ? 'AI Recommended' : shelfLabel[book.shelf] ?? book.shelf}
            </span>
            {book.pages > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-surface border border-border text-muted">
                {book.pages.toLocaleString()} pages
              </span>
            )}
            {book.yearPublished && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-surface border border-border text-muted">
                {book.yearPublished}
              </span>
            )}
          </div>

          {/* Rating */}
          {book.myRating > 0 && (
            <div className="mb-6">
              <p className="text-xs text-muted mb-1.5">My rating</p>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < book!.myRating ? 'fill-primary text-primary' : 'text-border'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {book.avgRating && (
            <div className="mb-6">
              <p className="text-xs text-muted mb-1">Community average</p>
              <p className="text-sm font-medium text-foreground">{book.avgRating.toFixed(2)} / 5</p>
            </div>
          )}

          {book.dateRead && (
            <div className="mb-6">
              <p className="text-xs text-muted mb-1">Date read</p>
              <p className="text-sm font-medium text-foreground">
                {new Date(book.dateRead).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          )}

          {/* Synopsis */}
          {book.synopsis && (
            <div className="mb-6">
              <h2 className="font-display text-xl text-foreground mb-2">Synopsis</h2>
              <p className="text-sm text-muted leading-relaxed">{book.synopsis}</p>
            </div>
          )}

          {/* Recommendation reason */}
          {book.isRecommendation && book.reason && (
            <div className="mb-6">
              <h2 className="font-display text-xl text-foreground mb-2">Why it was recommended</h2>
              <p className="text-sm text-muted leading-relaxed italic">&ldquo;{book.reason}&rdquo;</p>
            </div>
          )}

          {/* Shelves/tags */}
          {book.bookshelves && book.bookshelves.length > 0 && (
            <div className="mb-6">
              <h2 className="font-display text-xl text-foreground mb-2">Shelves</h2>
              <div className="flex flex-wrap gap-1.5">
                {book.bookshelves.map((shelf) => (
                  <span key={shelf} className="px-2.5 py-0.5 bg-surface border border-border text-muted text-xs rounded-full">
                    {shelf}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Labels */}
          {!book.isRecommendation && (
            <div className="mb-6">
              <BookLabels bookId={book.id} initialLabels={bookLabelList} />
            </div>
          )}
        </div>
      </div>

      {/* AI Similar Books */}
      <div className="mt-12 animate-fade-in-up stagger-4">
        <SimilarBooks bookId={book.id} />
      </div>

      {/* Other books by same author */}
      {otherBooks.length > 0 && (
        <div className="mt-12 animate-fade-in-up stagger-5">
          <h2 className="font-display text-2xl text-foreground mb-4">
            More by {book.author}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {otherBooks.map((other) => {
              const g = getCoverGradient(other.title);
              return (
                <Link key={other.id} href={`/library/${other.id}`} className="group">
                  <div
                    className={`relative w-full rounded-xl bg-gradient-to-br ${g} overflow-hidden`}
                    style={{ aspectRatio: '3/4' }}
                  >
                    {other.coverUrl ? (
                      <img src={other.coverUrl} alt={other.title} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                  <p className="mt-1.5 text-xs text-foreground font-medium line-clamp-1">{other.title}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
