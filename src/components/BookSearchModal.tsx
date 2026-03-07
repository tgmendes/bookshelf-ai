'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, Check, BookOpen } from 'lucide-react';

interface SearchResult {
  title: string;
  author: string;
  coverUrl: string | null;
  synopsis: string | null;
  avgRating: number | null;
  yearPublished: number | null;
  pages: number | null;
  isbn13: string | null;
}

type Shelf = 'to-read' | 'currently-reading' | 'read';

const SHELVES: { value: Shelf; label: string }[] = [
  { value: 'to-read', label: 'Want to Read' },
  { value: 'currently-reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
];

interface BookSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookSearchModal({ isOpen, onClose }: BookSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [shelf, setShelf] = useState<Shelf>('to-read');
  const [addedTitles, setAddedTitles] = useState<Set<string>>(new Set());
  const [addingTitle, setAddingTitle] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setAddedTitles(new Set());
      setAddingTitle(null);
    }
  }, [isOpen]);

  const searchBooks = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchBooks(value), 400);
  };

  const handleAdd = async (result: SearchResult) => {
    if (addingTitle || addedTitles.has(result.title)) return;
    setAddingTitle(result.title);
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title,
          author: result.author,
          shelf,
          coverUrl: result.coverUrl,
          synopsis: result.synopsis,
          avgRating: result.avgRating,
          yearPublished: result.yearPublished,
          pages: result.pages,
          isbn13: result.isbn13,
        }),
      });
      if (res.ok) {
        setAddedTitles((prev) => new Set(prev).add(result.title));
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setAddingTitle(null);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface rounded-2xl border border-border shadow-xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search for a book…"
            className="flex-1 bg-transparent text-foreground text-sm placeholder-muted focus:outline-none"
          />
          <button onClick={onClose} className="p-1 text-muted hover:text-foreground rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shelf selector */}
        <div className="flex gap-1.5 px-4 py-2.5 border-b border-border">
          {SHELVES.map((s) => (
            <button
              key={s.value}
              onClick={() => setShelf(s.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                shelf === s.value
                  ? 'bg-primary text-white'
                  : 'bg-primary-light text-muted hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="text-center py-8 text-muted text-sm">No results found</div>
          )}

          {!loading && results.map((result) => {
            const isAdded = addedTitles.has(result.title);
            const isAdding = addingTitle === result.title;

            return (
              <div
                key={`${result.title}::${result.author}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-primary-light/50 transition-colors"
              >
                {/* Cover thumbnail */}
                <div className="w-10 h-14 rounded-lg bg-border flex-shrink-0 overflow-hidden">
                  {result.coverUrl ? (
                    <img src={result.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-muted" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                  <p className="text-xs text-muted truncate">{result.author}</p>
                  {result.yearPublished && (
                    <p className="text-xs text-muted/70">{result.yearPublished}</p>
                  )}
                </div>

                {/* Add button */}
                <button
                  onClick={() => handleAdd(result)}
                  disabled={isAdded || isAdding}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isAdded
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-primary text-white hover:opacity-90 disabled:opacity-60'
                  }`}
                >
                  {isAdding && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
                  {isAdded ? (
                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Added</span>
                  ) : isAdding ? 'Adding…' : 'Add'}
                </button>
              </div>
            );
          })}

          {!loading && !query && (
            <div className="text-center py-8 text-muted text-sm">
              Type to search for books
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
