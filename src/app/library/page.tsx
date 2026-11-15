import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/requireUser';
import { getReadingData } from '@/lib/reading-data';
import { filterShelf, getReadingYear, getReadingNowBooks, type ShelfParams } from '@/lib/reading-room';
import { LibraryFilters } from '@/components/LibraryFilters';
import { ReadingShelf } from '@/components/ReadingShelf';
import { ReadingNow } from '@/components/ReadingNow';
import { SavedRecommendations } from '@/components/SavedRecommendations';
import { EmptyLibrary } from '@/components/EmptyLibrary';

export const dynamic = 'force-dynamic';

export default async function LibraryPage({ searchParams }: { searchParams: Promise<ShelfParams> }) {
  const { userId } = await requireUser();
  const params = await searchParams;
  if (params.shelf === 'next-read') redirect('/library#next');
  const data = await getReadingData(userId);
  const shelf = ['read', 'to-read', 'currently-reading', 'all'].includes(params.shelf ?? '') ? params.shelf! : 'read';
  const visible = filterShelf(data.books, { ...params, shelf });
  const currentYear = new Date().getUTCFullYear();
  const stats = getReadingYear(data.books, currentYear, currentYear);
  const years = [...new Set(visible.map((book) => book.dateRead?.slice(0, 4)).filter(Boolean))].sort();
  const yearLabel = years.length > 1 ? `${years[0]}–${years.at(-1)}` : years[0] ?? String(currentYear);
  const countLabel = shelf === 'read' ? 'read' : shelf === 'currently-reading' ? 'reading' : 'books';
  return (
    <div className="room-wrap pb-20">
      <ReadingNow books={getReadingNowBooks(data.books)} />
      <section id="shelf" aria-labelledby="shelf-heading" className="min-w-0 scroll-mt-6 pt-10">
        <Suspense fallback={null}><LibraryFilters labels={data.labels} heading={<h2 id="shelf-heading" className="section-title">The shelf <span className="font-body text-base text-muted">· {yearLabel} · {visible.length} {countLabel}</span></h2>} /></Suspense>
        {!data.books.length ? <EmptyLibrary /> : <ReadingShelf books={visible} />}
      </section>
      <SavedRecommendations recommendations={data.recommendations} />
      <section aria-labelledby="year-heading" className="pt-[72px]">
        <div className="mb-7 flex flex-wrap items-baseline justify-between gap-3"><h2 id="year-heading" className="section-title">This year so far</h2><Link href="/stats" className="room-link text-sm font-bold">See your reading year →</Link></div>
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: stats.totalBooks.toLocaleString('en-GB'), label: 'books read' },
            { value: stats.totalPages.toLocaleString('en-GB'), label: 'pages' },
            { value: stats.averageRating?.toFixed(1) ?? '—', label: 'average rating' },
            { value: stats.topAuthors[0]?.name ?? '—', label: 'most-read author', author: true },
          ].map(({ value, label, author }) => <div key={label} className="flex min-w-0 flex-col bg-surface p-7"><dt className="order-2 mt-2 text-muted">{label}</dt><dd className={`order-1 break-words font-display font-light leading-none ${author ? 'text-[32px] text-accent' : 'text-5xl'}`}>{value}</dd></div>)}
        </dl>
      </section>
    </div>
  );
}
