'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type TouchEvent } from 'react';
import type { ReadingBook } from '@/lib/types';
import { formatBookDate, getReadingNowBooks, getCarouselOffset } from '@/lib/reading-room';
import { BookCover } from './BookCover';
import { BookMetadata } from './BookDetails';
import { BookControls } from './BookControls';

export function ReadingNow({ books }: { books: ReadingBook[] }) {
  const reading = getReadingNowBooks(books);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = Math.max(0, reading.findIndex((book) => book.id === selectedId));
  const book = reading[selectedIndex];
  const covers = useRef(new Map<string, HTMLButtonElement>());
  const focusSelection = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);

  useEffect(() => {
    if (book && focusSelection.current) {
      covers.current.get(book.id)?.focus({ preventScroll: true });
      focusSelection.current = false;
    }
  }, [book]);

  function select(index: number, focus = false) {
    if (!reading.length) return;
    const next = reading[(index + reading.length) % reading.length];
    if (next.id === book?.id) {
      if (focus) covers.current.get(next.id)?.focus({ preventScroll: true });
      focusSelection.current = false;
      return;
    }
    focusSelection.current = focus;
    setSelectedId(next.id);
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (reading.length < 2 || event.altKey || event.ctrlKey || event.metaKey) return;
    const next = event.key === 'ArrowLeft' ? selectedIndex - 1 : event.key === 'ArrowRight' ? selectedIndex + 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? reading.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    select(next, true);
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    const end = event.changedTouches[0];
    if (!start || !end || reading.length < 2) return;
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    // A swipe must not also select whichever cover receives its synthetic click.
    suppressClickUntil.current = Date.now() + 400;
    select(selectedIndex + (dx < 0 ? 1 : -1));
  }

  if (!book) return <div className="pb-2 pt-14"><p className="eyebrow text-accent">Your reading room</p><h1 className="mt-2 font-display text-[44px] font-light leading-tight">A life in books.</h1></div>;

  return (
    <section aria-labelledby="reading-now-label" aria-roledescription="carousel" className="min-w-0 pb-12 pt-14" data-testid="reading-now">
      <p id="reading-now-label" className="eyebrow text-center text-accent">Reading now</p>
      {reading.length > 1 && <p id="reading-now-help" className="sr-only">Newest added first. Select a cover, use the previous and next buttons, press the left and right arrow keys, or swipe to browse. Home selects the newest book and End selects the oldest.</p>}
      <div className="coverflow-stage mx-auto max-w-[800px]" role="group" aria-label="Reading now book covers"
        aria-describedby={reading.length > 1 ? 'reading-now-help' : undefined} tabIndex={0} onKeyDown={handleKeys}
        onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null; }}
        onTouchEnd={handleTouchEnd} onTouchCancel={() => { touchStart.current = null; }}
        onClickCapture={(event) => { if (Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); } }}>
        {reading.map((item, index) => {
          const offset = getCarouselOffset(index, selectedIndex, reading.length);
          const distance = Math.abs(offset);
          return (
            <button key={item.id} type="button" className="coverflow-book" hidden={distance > 2}
              data-distance={distance} data-offset={offset} aria-label={`Show ${item.title} by ${item.author}`} aria-pressed={distance === 0}
              aria-controls="reading-now-details" tabIndex={distance === 0 ? 0 : -1}
              ref={(node) => { if (node) covers.current.set(item.id, node); else covers.current.delete(item.id); }}
              onClick={() => select(index)} style={{ '--cover-offset': offset, '--cover-angle': `${offset === 0 ? 0 : Math.sign(offset) * -1 * (distance === 1 ? 48 : 62)}deg`, '--cover-scale': distance === 0 ? 1 : distance === 1 ? .84 : .72, zIndex: 3 - distance } as CSSProperties}>
              <span aria-hidden="true"><BookCover book={item} /></span>
            </button>
          );
        })}
      </div>
      {reading.length > 1 && (
        <div className="flex items-center justify-center gap-4" onKeyDown={handleKeys} role="group" aria-label="Reading now navigation">
          <button type="button" className="icon-button" aria-label="Previous reading book" aria-controls="reading-now-details" onClick={() => select(selectedIndex - 1)}><ChevronLeft className="size-[18px]" aria-hidden="true" /></button>
          <span className="min-w-16 text-center text-sm tabular-nums text-muted" aria-hidden="true">{selectedIndex + 1} / {reading.length}</span>
          <button type="button" className="icon-button" aria-label="Next reading book" aria-controls="reading-now-details" onClick={() => select(selectedIndex + 1)}><ChevronRight className="size-[18px]" aria-hidden="true" /></button>
        </div>
      )}
      <p role="status" aria-label="Reading position" aria-atomic="true" className="sr-only">{book.title}. Book {selectedIndex + 1} of {reading.length}.</p>
      <div id="reading-now-details" className={`mx-auto mt-8 grid max-w-[960px] grid-cols-1 items-center gap-8 lg:gap-12 ${book.notes ? 'lg:grid-cols-2' : 'text-center'}`}>
        <div className="min-w-0">
          <h1 className="break-words font-display text-4xl font-light leading-[1.1] sm:text-[44px]"><Link className="block min-h-11 min-w-11" href={`/library/${book.id}`}>{book.title}</Link></h1>
          <BookMetadata book={book} />
          {book.dateStarted && <p className="mt-3.5 text-sm text-muted">Reading since <time dateTime={book.dateStarted}>{formatBookDate(book.dateStarted)}</time></p>}
          <Link href={`/library/${book.id}`} className="room-link mt-2 text-sm" aria-label={`Open ${book.title} book page`}>Open book page →</Link>
          <BookControls key={book.id} book={book} />
        </div>
        {book.notes && (
          <figure className="min-w-0 rounded-2xl bg-surface px-6 py-7 sm:px-8">
            <p className="eyebrow">Your note</p>
            <blockquote className="mt-3 whitespace-pre-wrap break-words font-display text-[22px] font-light italic leading-[1.45]">“{book.notes}”</blockquote>
            {book.updatedAt && <figcaption className="mt-4 text-[13px] text-muted">Updated <time dateTime={book.updatedAt}>{formatBookDate(book.updatedAt, true)}</time></figcaption>}
          </figure>
        )}
      </div>
    </section>
  );
}
