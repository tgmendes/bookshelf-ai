'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, X } from 'lucide-react';

export function FetchCoverOverlay({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'fetching' | 'not-found'>('idle');

  const handleFetch = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus('fetching');
    try {
      const res = await fetch(`/api/books/${bookId}/fetch-cover`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.found) {
          router.refresh();
          return;
        }
      }
      setStatus('not-found');
    } catch {
      setStatus('not-found');
    }
  };

  return (
    <button
      onClick={handleFetch}
      disabled={status === 'fetching'}
      className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/90 text-gray-800 backdrop-blur-sm hover:bg-white transition-colors shadow-sm disabled:opacity-80"
    >
      {status === 'fetching' ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="hidden sm:inline">Searching…</span>
        </>
      ) : status === 'not-found' ? (
        <>
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Not found</span>
        </>
      ) : (
        <>
          <ImagePlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Fetch cover</span>
        </>
      )}
    </button>
  );
}
