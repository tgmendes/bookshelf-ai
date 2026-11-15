'use client';

import { useState } from 'react';
import type { ReadingBook } from '@/lib/types';
import { getBookColor, getSpineSize } from '@/lib/coverGradients';
import { selectDefaultBook } from '@/lib/reading-room';
import { BookDetails } from './BookDetails';

export function ReadingShelf({ books }: { books: ReadingBook[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(() => selectDefaultBook(books)?.id ?? null);
  const selected = books.find((book) => book.id === selectedId) ?? selectDefaultBook(books);
  if (!selected) return <p className="rounded-2xl bg-surface p-8 text-muted">No books on this shelf. Try another filter, or ask your assistant to add your reading history.</p>;
  return (
    <>
      <div className="overflow-x-auto overscroll-x-contain pb-3 pt-6" role="region" aria-label="Book shelf" tabIndex={0}>
        <div className="flex w-max min-w-full items-end gap-1.5 border-b-[14px] border-ledge px-3 shadow-[0_10px_0_-4px_var(--ledge-shadow)]">
          {books.map((book) => (
            <button key={book.id} type="button" className="book-spine" aria-pressed={selected.id === book.id}
              aria-label={`${book.title} by ${book.author}`} aria-controls="selected-book" onClick={() => setSelectedId(book.id)}
              style={{ ...getSpineSize(book.pages), backgroundColor: getBookColor(book.id) }}>
              <span className="spine-title" aria-hidden="true">{book.title}</span>
            </button>
          ))}
        </div>
      </div>
      <article id="selected-book" className="mt-10" aria-live="polite" aria-atomic="true"><BookDetails book={selected} /></article>
    </>
  );
}
