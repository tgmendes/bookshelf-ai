'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getCoverGradient } from '@/lib/coverGradients';

interface Recommendation {
  title: string;
  author: string;
  reason: string;
}

export function SimilarBooks({ bookId }: { bookId: string }) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [scrollIndex, setScrollIndex] = useState(0);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  const handleFetch = async () => {
    setStatus('loading');
    try {
      const res = await fetch(`/api/books/${bookId}/similar`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecs(data.recommendations ?? []);
      setStatus('done');
      setScrollIndex(0);
    } catch {
      setStatus('error');
    }
  };

  const handleSave = async (rec: Recommendation, idx: number) => {
    setSavingIdx(idx);
    try {
      // Try to fetch cover
      const params = new URLSearchParams({ title: rec.title, author: rec.author });
      const lookupRes = await fetch(`/api/books/lookup?${params.toString()}`);
      const bookData = lookupRes.ok ? await lookupRes.json() : {};

      await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rec.title,
          author: rec.author,
          reason: rec.reason,
          coverUrl: bookData.coverUrl ?? null,
          synopsis: bookData.synopsis ?? null,
        }),
      });
    } catch {}
    setSavingIdx(null);
  };

  if (status === 'idle') {
    return (
      <button
        onClick={handleFetch}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-primary text-white hover:opacity-90 transition-colors cursor-pointer"
      >
        <Sparkles className="w-4 h-4" />
        Recommend me similar books
      </button>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-muted text-sm py-3">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        Finding similar books…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-sm text-muted">
        Could not load recommendations.{' '}
        <button onClick={handleFetch} className="text-primary underline cursor-pointer">Try again</button>
      </div>
    );
  }

  const canScrollLeft = scrollIndex > 0;
  const canScrollRight = scrollIndex < recs.length - 3;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl text-foreground">Similar Books</h2>
        {recs.length > 3 && (
          <div className="flex gap-1">
            <button
              onClick={() => setScrollIndex(Math.max(0, scrollIndex - 1))}
              disabled={!canScrollLeft}
              className="p-1.5 rounded-lg border border-border text-muted hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setScrollIndex(Math.min(recs.length - 3, scrollIndex + 1))}
              disabled={!canScrollRight}
              className="p-1.5 rounded-lg border border-border text-muted hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden">
        <div
          className="flex gap-4 transition-transform duration-300"
          style={{ transform: `translateX(-${scrollIndex * (100 / 3 + 1.33)}%)` }}
        >
          {recs.map((rec, i) => {
            const gradient = getCoverGradient(rec.title);
            const isSaving = savingIdx === i;
            return (
              <div
                key={`${rec.title}-${rec.author}`}
                className="flex-shrink-0 w-[calc(33.333%-0.67rem)] bg-surface border border-border rounded-2xl overflow-hidden"
              >
                <div
                  className={`w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
                  style={{ aspectRatio: '3/2' }}
                >
                  <Sparkles className="w-8 h-8 text-white/30" />
                </div>
                <div className="p-4">
                  <p className="font-semibold text-foreground text-sm leading-snug line-clamp-1">{rec.title}</p>
                  <p className="text-muted text-xs mt-0.5">{rec.author}</p>
                  <p className="text-muted text-xs mt-2 leading-relaxed line-clamp-2">{rec.reason}</p>
                  <button
                    onClick={() => handleSave(rec, i)}
                    disabled={isSaving}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-light text-primary hover:opacity-80 disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    {isSaving ? 'Saving…' : 'Save to Next Read'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
