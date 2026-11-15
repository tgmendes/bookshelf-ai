import { notFound } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/requireUser';
import { getReadingData } from '@/lib/reading-data';
import { formatBookDate } from '@/lib/reading-room';
import { BookCover } from '@/components/BookCover';
import { BookDetails } from '@/components/BookDetails';

export const dynamic = 'force-dynamic';

export default async function BookDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rec?: string }> }) {
  const { userId } = await requireUser();
  const { id } = await params;
  const { rec } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getReadingData(userId);
  const book = rec !== '1' ? data.books.find((book) => book.id === id) : null;
  const recommendation = !book ? data.recommendations.find((item) => item.id === id) : null;
  if (!book && !recommendation) notFound();
  const item = book ?? recommendation!;
  const others = book ? data.books.filter((other) => other.id !== book.id && other.author === book.author).slice(0, 6) : [];
  return (
    <div className="room-wrap pb-20 pt-8">
      <Link href={recommendation ? '/library#next' : '/library#shelf'} className="room-link mb-8 text-sm">← Back to {recommendation ? 'Up next' : 'the shelf'}</Link>
      <div className="mb-10 flex justify-center sm:justify-start"><BookCover book={item} /></div>
      {book ? <BookDetails book={book} fullPage /> : recommendation && (
        <article className="grid min-w-0 grid-cols-1 gap-8 rounded-[20px] bg-surface p-6 sm:p-9 lg:grid-cols-2 lg:gap-10">
          <div className="min-w-0"><p className="eyebrow text-accent">Up next</p><h1 className="mt-2 break-words font-display text-[44px] font-light leading-[1.1]">{recommendation.title}</h1><p className="mt-1.5 text-muted">{recommendation.author}</p>{recommendation.synopsis && <p className="mt-5 whitespace-pre-line break-words">{recommendation.synopsis}</p>}</div>
          <div className="min-w-0"><h2 className="eyebrow">Why it was recommended</h2><p className="mt-4 whitespace-pre-wrap break-words border-l-2 border-accent pl-3.5">{recommendation.reason}</p><p className="mt-6 text-[13px] text-muted">Saved by {recommendation.source ?? 'your assistant'}{recommendation.createdAt && <> · {formatBookDate(recommendation.createdAt, true)}</>}</p></div>
        </article>
      )}
      {others.length > 0 && <section className="pt-12" aria-labelledby="same-author-heading"><h2 id="same-author-heading" className="section-title">More by {book!.author}</h2><div className="mt-7 flex flex-wrap gap-7">{others.map((other) => <Link href={`/library/${other.id}`} key={other.id} className="max-w-[140px]"><BookCover book={other} small /><p className="mt-3 text-sm">{other.title}</p></Link>)}</div></section>}
    </div>
  );
}
