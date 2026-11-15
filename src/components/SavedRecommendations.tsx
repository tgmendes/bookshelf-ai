import Link from 'next/link';
import type { SavedRecommendation } from '@/lib/types';
import { getBookColor } from '@/lib/coverGradients';
import { formatBookDate } from '@/lib/reading-room';

export function SavedRecommendations({ recommendations }: { recommendations: SavedRecommendation[] }) {
  return (
    <section id="next" aria-labelledby="next-heading" className="scroll-mt-6 pt-[72px]">
      <h2 id="next-heading" className="section-title">Up next</h2>
      <p className="mb-7 mt-1.5 text-muted">Recommendations your assistant saved, with its reasons.</p>
      {recommendations.length ? (
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
          {recommendations.map((rec) => (
            <article key={rec.id} className="flex min-w-0 flex-col gap-3.5 rounded-2xl border-t-[6px] bg-surface p-6" style={{ borderTopColor: getBookColor(rec.id) }}>
              <div><h3 className="font-display text-[21px] font-medium leading-[1.2]"><Link href={`/library/${rec.id}?rec=1`} className="inline-flex min-h-11 min-w-11 items-center break-words hover:text-accent">{rec.title}</Link></h3><p className="mt-1 text-sm text-muted">{rec.author}</p></div>
              <p className="border-l-2 border-accent pl-3.5 whitespace-pre-line break-words">{rec.reason}</p>
              <p className="mt-auto text-xs text-muted">Saved by {rec.source ?? 'your assistant'}{rec.createdAt && <> · <time dateTime={rec.createdAt}>{formatBookDate(rec.createdAt)}</time></>}</p>
            </article>
          ))}
        </div>
      ) : <p className="rounded-2xl bg-surface p-8 text-muted">No saved recommendations yet. Ask your connected assistant what to read next.</p>}
    </section>
  );
}
