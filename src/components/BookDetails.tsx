import Link from 'next/link';
import type { ReadingBook } from '@/lib/types';
import { formatBookDate } from '@/lib/reading-room';
import { BookControls } from './BookControls';

export function BookMetadata({ book }: { book: Pick<ReadingBook, 'author' | 'yearPublished' | 'pages'> }) {
  return <p className="mt-1.5 text-muted">{[book.author, book.yearPublished, book.pages > 0 ? `${book.pages.toLocaleString('en-GB')} pages` : null].filter(Boolean).join(' · ')}</p>;
}

export function RatingStars({ rating }: { rating: number }) {
  return rating > 0 ? <p className="mt-1 text-[26px] leading-tight tracking-[2px] text-accent" aria-label={`${rating} of 5 stars`}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</p> : <p className="mt-1 text-lg text-muted">Unrated</p>;
}

export function BookDetails({ book, fullPage = false }: { book: ReadingBook; fullPage?: boolean }) {
  const Heading = fullPage ? 'h1' : 'h3';
  const tags = [...new Set([...book.labels.map((label) => label.name), ...(book.bookshelves ?? [])])];
  const readDate = formatBookDate(book.dateRead, true);
  return (
    <div className="grid min-w-0 grid-cols-1 gap-8 rounded-[20px] bg-surface p-6 sm:p-9 lg:grid-cols-2 lg:gap-10" data-testid="book-details">
      <div className="min-w-0">
        <p className="eyebrow text-accent">{book.shelf === 'read' ? (readDate ? `Read ${readDate}` : 'Read') : book.shelf === 'currently-reading' ? 'Reading now' : 'Want to read'}</p>
        <Heading className={`mt-2 break-words font-display font-light leading-[1.1] ${fullPage ? 'text-[44px]' : 'text-[38px]'}`}>{book.title}</Heading>
        <BookMetadata book={book} />
        {book.synopsis && <p className="mt-5 max-w-[52ch] whitespace-pre-line break-words text-base">{book.synopsis}</p>}
        {tags.length > 0 && <ul aria-label="Labels and shelves" className="mt-5 flex flex-wrap gap-2">{tags.map((tag) => <li key={tag} className="rounded-full bg-surface-2 px-3 py-1 text-[13px]">{tag}</li>)}</ul>}
        {book.dateStarted && <p className="mt-5 text-sm text-muted">Reading since <time dateTime={book.dateStarted}>{formatBookDate(book.dateStarted, true)}</time></p>}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-10">
          <div><p className="eyebrow">You</p><RatingStars rating={book.myRating} /></div>
          <div><p className="eyebrow">Community</p><p className="mt-1 font-display text-[26px] leading-tight">{book.avgRating != null ? book.avgRating.toFixed(1) : '—'}<span className="text-sm text-muted"> / 5</span></p></div>
        </div>
        <BookControls key={book.id} book={book} />
        {book.notes && (
          <div className="mt-6 rounded-[14px] bg-bg px-6 py-5">
            <p className="eyebrow">Your notes</p>
            <p className="mt-1.5 whitespace-pre-wrap break-words italic">{book.notes}</p>
            {book.updatedAt && <p className="mt-3 text-xs text-muted">Updated <time dateTime={book.updatedAt}>{formatBookDate(book.updatedAt, true)}</time></p>}
          </div>
        )}
        {!fullPage && <Link href={`/library/${book.id}`} className="room-link mt-3 text-sm font-bold">Open book page →</Link>}
      </div>
    </div>
  );
}
