import Link from 'next/link';
import type { ReadingBook } from '@/lib/types';
import { formatBookDate } from '@/lib/reading-room';
import { BookCover } from './BookCover';
import { BookMetadata } from './BookDetails';

export function ReadingNow({ books }: { books: ReadingBook[] }) {
  const [book, ...others] = [...books].filter((book) => book.shelf === 'currently-reading').sort((a, b) =>
    (b.dateStarted ?? b.dateAdded).localeCompare(a.dateStarted ?? a.dateAdded) || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  if (!book) return <div className="pb-2 pt-14"><p className="eyebrow text-accent">Your reading room</p><h1 className="mt-2 font-display text-[44px] font-light leading-tight">A life in books.</h1></div>;
  return (
    <section aria-labelledby="reading-now-heading" className="grid grid-cols-1 items-center gap-12 pb-12 pt-14 lg:grid-cols-2">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-col items-start gap-8 sm:flex-row sm:items-end">
          <Link href={`/library/${book.id}`} className="shrink-0"><BookCover book={book} /></Link>
          <div className="min-w-0">
            <p className="eyebrow text-accent">Reading now</p>
            <h1 id="reading-now-heading" className="mt-2.5 break-words font-display text-4xl font-light leading-[1.1] sm:text-[44px]"><Link className="block min-h-11 min-w-11" href={`/library/${book.id}`}>{book.title}</Link></h1>
            <BookMetadata book={book} />
            {book.dateStarted && <p className="mt-3.5 text-sm text-muted">Reading since <time dateTime={book.dateStarted}>{formatBookDate(book.dateStarted)}</time></p>}
          </div>
        </div>
        {others.length > 0 && <div className="mt-6"><p className="eyebrow">Also reading</p><ul className="mt-2 flex flex-wrap gap-x-5">{others.map((other) => <li key={other.id}><Link className="room-link text-sm" href={`/library/${other.id}`}>{other.title}</Link></li>)}</ul></div>}
      </div>
      {book.notes && (
        <figure className="min-w-0 rounded-2xl bg-surface px-6 py-7 sm:px-8">
          <p className="eyebrow">Your note</p>
          <blockquote className="mt-3 whitespace-pre-wrap break-words font-display text-[22px] font-light italic leading-[1.45]">“{book.notes}”</blockquote>
          {book.updatedAt && <figcaption className="mt-4 text-[13px] text-muted">Updated <time dateTime={book.updatedAt}>{formatBookDate(book.updatedAt, true)}</time></figcaption>}
        </figure>
      )}
    </section>
  );
}
