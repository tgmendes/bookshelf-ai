'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getCoverGradient } from '@/lib/coverGradients';

interface Recommendation {
  id: string;
  title: string;
  author: string;
  reason: string;
  coverUrl: string | null;
  synopsis: string | null;
}

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const gradient = getCoverGradient(rec.title);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    await fetch(`/api/recommendations/${rec.id}`, { method: 'DELETE' });
    router.refresh();
  };

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="bg-surface rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
      >
        <div
          className={`relative w-full bg-gradient-to-br ${gradient}`}
          style={{ aspectRatio: '3/2' }}
        >
          {rec.coverUrl && (
            <img src={rec.coverUrl} alt={rec.title} className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 bg-black/40 backdrop-blur-sm rounded-full text-white text-xs">
            <Sparkles className="w-3 h-3" />
            AI pick
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="absolute top-2 right-2 p-1.5 text-white/70 hover:text-white hover:bg-black/30 rounded-lg transition-colors backdrop-blur-sm disabled:opacity-50"
            title="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-foreground text-base leading-snug line-clamp-1">{rec.title}</h3>
          <p className="text-muted text-sm mt-0.5 mb-3">{rec.author}</p>
          {(rec.synopsis || rec.reason) && (
            <p className="text-muted text-sm leading-relaxed line-clamp-3">
              {rec.synopsis || rec.reason}
            </p>
          )}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`relative w-full bg-gradient-to-br ${gradient} rounded-t-2xl overflow-hidden`}
              style={{ aspectRatio: '16/9' }}
            >
              {rec.coverUrl && (
                <img src={rec.coverUrl} alt={rec.title} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs mb-2">
                  <Sparkles className="w-3 h-3" />
                  AI recommended
                </div>
                <h2 className="text-2xl font-bold text-white leading-snug">{rec.title}</h2>
                <p className="text-white/80 mt-1">{rec.author}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white hover:bg-black/30 rounded-lg transition-colors backdrop-blur-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {rec.synopsis && (
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1.5">Synopsis</p>
                  <p className="text-sm text-muted leading-relaxed">{rec.synopsis}</p>
                </div>
              )}

              {rec.reason && (
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1.5">Why it was recommended</p>
                  <p className="text-sm text-muted leading-relaxed italic">&ldquo;{rec.reason}&rdquo;</p>
                </div>
              )}

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors disabled:opacity-50 mt-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove from Next Read
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
