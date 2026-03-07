'use client';

import { useState, useCallback } from 'react';
import { Star, Plus, Check, Sparkles, BookOpen, Heart, Compass, UserPlus, Flame, Loader2 } from 'lucide-react';

interface RecommendedBook {
  title: string;
  author: string;
  reason: string;
  pages?: number;
  rating?: number;
  coverUrl?: string | null;
}

const PROMPTS = [
  { label: 'Based on my favourites', shortLabel: 'My favourites', icon: Star, prompt: 'Recommend 5 books based on my highest-rated books and favourites.' },
  { label: 'A classic I haven\'t read', shortLabel: 'A classic', icon: BookOpen, prompt: 'Recommend 5 classic literary works I haven\'t read yet that match my taste.' },
  { label: 'A real page-turner', shortLabel: 'Page-turner', icon: Flame, prompt: 'Recommend 5 gripping, fast-paced page-turners I\'d enjoy based on my reading history.' },
  { label: 'Something comforting', shortLabel: 'Comforting', icon: Heart, prompt: 'Recommend 5 comforting, feel-good books that match my reading preferences.' },
  { label: 'Broaden my horizons', shortLabel: 'New horizons', icon: Compass, prompt: 'Recommend 5 books from genres or styles I haven\'t explored much but might enjoy.' },
  { label: 'A new author for me', shortLabel: 'New author', icon: UserPlus, prompt: 'Recommend 5 books by authors I haven\'t read before who I\'d likely enjoy.' },
];

export function DiscoverInterface() {
  const [results, setResults] = useState<RecommendedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [addedBooks, setAddedBooks] = useState<Set<string>>(new Set());
  const [addingBooks, setAddingBooks] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleDiscover = useCallback(async (prompt: string, label: string) => {
    setLoading(true);
    setActivePrompt(label);
    setError(null);
    setResults([]);
    setAddedBooks(new Set());

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to get recommendations');
      }

      const data = await res.json();
      const books: RecommendedBook[] = data.books ?? [];
      setResults(books);

      // Fetch covers in parallel
      const enriched = await Promise.all(
        books.map(async (book) => {
          try {
            const params = new URLSearchParams({ title: book.title, author: book.author });
            const lookupRes = await fetch(`/api/books/lookup?${params.toString()}`);
            if (lookupRes.ok) {
              const lookupData = await lookupRes.json();
              return { ...book, coverUrl: lookupData.coverUrl ?? null };
            }
          } catch { /* ignore */ }
          return { ...book, coverUrl: null };
        })
      );
      setResults(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddBook = useCallback(async (book: RecommendedBook) => {
    const key = `${book.title}::${book.author}`;
    setAddingBooks((prev) => new Set(prev).add(key));

    try {
      await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          reason: book.reason,
          coverUrl: book.coverUrl ?? null,
          synopsis: null,
        }),
      });
      setAddedBooks((prev) => new Set(prev).add(key));
    } catch { /* ignore */ }
    finally {
      setAddingBooks((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero */}
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-2">
          Discover your next read
        </h1>
        <p className="text-muted text-sm sm:text-base">
          Pick a mood and we&rsquo;ll recommend books
        </p>
      </div>

      {/* Prompt buttons */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mb-10 animate-fade-in stagger-1">
        {PROMPTS.map(({ label, shortLabel, icon: Icon, prompt }) => {
          const isActive = activePrompt === label;
          return (
            <button
              key={label}
              onClick={() => handleDiscover(prompt, label)}
              disabled={loading}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm transition-all disabled:opacity-60 ${
                isActive
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface border-border text-foreground hover:border-primary hover:bg-primary-light'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 animate-fade-in">
          <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Finding books for you</p>
            <p className="text-xs text-muted mt-1">This may take a few seconds…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-8 animate-fade-in">
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-4 py-2 inline-block">
            {error}
          </p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !loading && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-2.5 mb-4">
            <h2 className="font-display text-xl sm:text-2xl text-foreground">Recommended for you</h2>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-semibold">
              {results.length}
            </span>
          </div>
          {activePrompt && (
            <p className="text-muted text-xs sm:text-sm mb-5">Based on: {activePrompt}</p>
          )}

          <div className="space-y-3">
            {results.map((book, i) => {
              const key = `${book.title}::${book.author}`;
              const isAdded = addedBooks.has(key);
              const isAdding = addingBooks.has(key);

              return (
                <div
                  key={key}
                  className={`bg-surface border border-border rounded-xl p-4 flex gap-4 animate-fade-in-up`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Cover */}
                  <div className="flex-shrink-0 w-16 h-24 sm:w-20 sm:h-[120px] rounded-lg bg-border overflow-hidden">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-light">
                        <BookOpen className="w-5 h-5 text-primary opacity-40" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{book.title}</h3>
                        <p className="text-muted text-xs sm:text-sm">{book.author}</p>
                      </div>
                      {book.rating && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-xs text-muted font-medium">{book.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-muted text-xs sm:text-sm mt-2 line-clamp-2">{book.reason}</p>

                    <div className="flex items-center gap-3 mt-3">
                      {isAdded ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary text-primary text-xs font-medium">
                          <Check className="w-3.5 h-3.5" />
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddBook(book)}
                          disabled={isAdding}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          {isAdding ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          Add
                        </button>
                      )}
                      {book.pages && (
                        <span className="text-xs text-muted">{book.pages} pages</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && results.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-12 animate-fade-in">
          <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm text-muted text-center max-w-xs">
            Choose a mood above to get personalised book recommendations
          </p>
        </div>
      )}
    </div>
  );
}
