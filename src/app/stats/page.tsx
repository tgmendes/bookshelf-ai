import Link from 'next/link';
import { requireUser } from '@/lib/auth/requireUser';
import { getReadingData } from '@/lib/reading-data';
import { getReadingYear } from '@/lib/reading-room';
import { getBookColor, getMiniSpineHeight, PASTELS } from '@/lib/coverGradients';
import { BookCover } from '@/components/BookCover';
import { RatingStars } from '@/components/BookDetails';

export const dynamic = 'force-dynamic';

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { userId } = await requireUser();
  const { books } = await getReadingData(userId);
  const { year: requested } = await searchParams;
  const currentYear = new Date().getUTCFullYear();
  const year = requested && /^\d{4}$/.test(requested) && Number(requested) > 0 ? Number(requested) : currentYear;
  const stats = getReadingYear(books, year, currentYear);
  const peakRating = Math.max(1, ...stats.ratings.map((row) => row.count));
  const highlight = stats.bookOfYear;
  const facts = [
    { label: 'Longest', title: stats.longest?.title ?? '—', detail: stats.longest ? `${stats.longest.pages.toLocaleString('en-GB')} pages` : 'No page counts yet', href: stats.longest ? `/library/${stats.longest.id}` : null },
    { label: 'Shortest', title: stats.shortest?.title ?? '—', detail: stats.shortest ? `${stats.shortest.pages.toLocaleString('en-GB')} pages` : 'No page counts yet', href: stats.shortest ? `/library/${stats.shortest.id}` : null },
    { label: 'Busiest month', title: stats.busiestMonth ? new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, stats.busiestMonth.index, 1))) : '—', detail: stats.busiestMonth ? `${stats.busiestMonth.books.length} ${stats.busiestMonth.books.length === 1 ? 'book' : 'books'}` : 'No finished books yet' },
    { label: 'Top label', title: stats.topLabel?.name ?? '—', detail: stats.topLabel ? `${stats.topLabel.count} ${stats.topLabel.count === 1 ? 'book' : 'books'}` : 'No labels yet', accent: true },
  ];
  return (
    <div className="room-wrap pb-20">
      <section className="flex flex-wrap items-end justify-between gap-8 pb-12 pt-16" aria-labelledby="reading-year-heading">
        <div className="min-w-0">
          {stats.years.length > 0 && <nav aria-label="Reading years" className="flex flex-wrap gap-1.5">{stats.years.map((item) => <Link key={item} href={`/stats?year=${item}`} className="chip" aria-current={year === item ? 'page' : undefined}>{item}</Link>)}</nav>}
          <h1 id="reading-year-heading" className="mt-6 font-display text-[60px] font-extralight leading-[.95] sm:text-[88px]">{year},<br /><em className="font-light text-accent">in pages.</em></h1>
        </div>
        <dl className="grid w-full grid-cols-2 gap-6 sm:w-auto sm:grid-cols-4 sm:gap-10">
          {[{ label: 'Books', value: stats.totalBooks }, { label: 'Pages', value: stats.totalPages.toLocaleString('en-GB') }, { label: 'Avg rating', value: stats.averageRating?.toFixed(1) ?? '—' }, { label: 'Authors', value: stats.authorCount }].map(({ label, value }) => (
            <div key={label}><dt className="eyebrow">{label}</dt><dd className="mt-1 font-display text-[44px] font-light leading-tight">{value}</dd></div>
          ))}
        </dl>
      </section>
      {!stats.totalBooks && <p className="mb-8 text-muted">No finished books recorded for {year}. Your assistant can add reading dates to your books.</p>}
      <section aria-labelledby="months-heading">
        <h2 id="months-heading" className="section-title">Month by month</h2>
        <div className="mt-6 overflow-x-auto overscroll-x-contain rounded-[20px] bg-surface px-6 pb-4 pt-6" role="region" aria-label="Monthly reading chart" tabIndex={0}>
          <div className="grid min-w-[980px] items-end gap-3.5" style={{ gridTemplateColumns: stats.months.map((month) => `minmax(${Math.max(72, (month.books.length + month.reading.length) * 17 + 6)}px,1fr)`).join(' ') }}>
            {stats.months.map((month) => (
              <div key={month.name} className="flex min-w-0 flex-col">
                <div className="flex min-h-[150px] items-end justify-center gap-[3px] border-b-8 border-ledge">
                  {month.books.map((book) => <span key={book.id} title={`${book.title} · ${book.pages} pages`} role="img" aria-label={`${book.title}, ${book.pages} pages`} className="block w-3.5 shrink-0 rounded-t-[2px] shadow-[inset_-2px_0_0_rgba(0,0,0,.08)]" style={{ height: getMiniSpineHeight(book.pages), backgroundColor: getBookColor(book.id) }} />)}
                  {month.reading.map((book) => <span key={book.id} title={`Reading ${book.title}`} role="img" aria-label={`Reading ${book.title}, started ${book.dateStarted}`} className="block w-3.5 shrink-0 rounded-t-[2px] border-[1.5px] border-b-0 border-dashed border-accent" style={{ height: getMiniSpineHeight(book.pages) }} />)}
                </div>
                <span className="mt-2.5 text-center text-xs font-bold uppercase tracking-[.12em] text-muted">{month.name}</span>
                <span className="text-center text-xs text-muted">{month.books.length ? `${month.books.length} ${month.books.length === 1 ? 'book' : 'books'}` : month.reading.length ? 'reading' : '—'}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-muted">Each spine is a book; taller means longer.{year === currentYear && ' Dashed: reading now.'}</p>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-6 pt-12 lg:grid-cols-2" aria-label="Ratings and authors">
        <article className="min-w-0 rounded-[20px] bg-surface px-6 py-7 sm:px-8" aria-labelledby="ratings-heading">
          <h2 id="ratings-heading" className="mb-5 font-display text-[22px] font-normal">How you rated them</h2>
          <ul className="space-y-3">{stats.ratings.map(({ rating, count }) => <li key={rating} className="grid items-center gap-3 [grid-template-columns:92px_minmax(0,1fr)_28px]" aria-label={`${rating} stars: ${count} books`}>
            <span className="text-sm tracking-[1px] text-accent" aria-hidden="true">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
            <span className="h-3.5 rounded-full bg-surface-2" aria-hidden="true"><span className={`block h-3.5 rounded-full ${rating >= 4 ? 'bg-accent' : 'bg-accent-faint'}`} style={{ width: `${count / peakRating * 100}%` }} /></span>
            <span className="text-right text-sm text-muted" aria-hidden="true">{count}</span>
          </li>)}</ul>
        </article>
        <article className="min-w-0 rounded-[20px] bg-surface px-6 py-7 sm:px-8" aria-labelledby="authors-heading">
          <h2 id="authors-heading" className="mb-5 font-display text-[22px] font-normal">Authors you kept coming back to</h2>
          <ol className="space-y-3.5">{stats.topAuthors.map((author, index) => <li key={author.name} className="flex items-center gap-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full font-display font-medium text-spine-ink" style={{ backgroundColor: `var(--${PASTELS[index]})` }}>{index + 1}</span>
            <span className="min-w-0 break-words font-display text-[17px] font-medium">{author.name}</span>
            <span className="ml-auto shrink-0 text-[13px] text-muted">{author.count} {author.count === 1 ? 'book' : 'books'}</span>
          </li>)}</ol>
          {!stats.topAuthors.length && <p className="text-muted">Your authors will appear here as you finish books.</p>}
        </article>
      </section>
      <section className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-2" aria-label="Year highlights">
        <article className="flex min-w-0 flex-col items-start gap-7 rounded-[20px] bg-surface px-6 py-7 sm:flex-row sm:items-center sm:px-8">
          {highlight ? <>
            <Link className="shrink-0" href={`/library/${highlight.id}`}><BookCover book={highlight} small /></Link>
            <div className="min-w-0"><p className="eyebrow text-accent">Book of the year{year >= currentYear ? ', so far' : ''}</p>
              <h2 className="mt-1.5 break-words font-display text-[30px] font-light leading-[1.15]"><Link href={`/library/${highlight.id}`} className="inline-flex min-h-11 min-w-11 items-center hover:text-accent">{highlight.title}</Link></h2>
              <p className="mt-1 text-muted">{highlight.author}</p><RatingStars rating={highlight.myRating} />
              {highlight.notes && <blockquote className="mt-3 whitespace-pre-wrap break-words italic">“{highlight.notes}”</blockquote>}
            </div>
          </> : <div><p className="eyebrow text-accent">Book of the year{year >= currentYear ? ', so far' : ''}</p><p className="mt-3 text-muted">Rate a finished book with your assistant to find your favourite here.</p></div>}
        </article>
        <article className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-border" aria-label="Reading facts">
          {facts.map((fact) => <div key={fact.label} className="min-w-0 bg-surface px-5 py-6 sm:px-7"><p className="eyebrow">{fact.label}</p><p className={`mt-1.5 break-words font-display text-lg font-medium ${fact.accent ? 'text-accent' : ''}`}>{fact.href ? <Link href={fact.href} className="inline-flex min-h-11 min-w-11 items-center hover:text-accent">{fact.title}</Link> : fact.title}</p><p className="text-[13px] text-muted">{fact.detail}</p></div>)}
        </article>
      </section>
    </div>
  );
}
