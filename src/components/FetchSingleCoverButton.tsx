'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2 } from 'lucide-react';

export function FetchSingleCoverButton({ bookId, hasCover }: { bookId: string; hasCover: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'fetching' | 'done' | 'not-found'>('idle');

  const handleFetch = async () => {
    setStatus('fetching');
    try {
      const res = await fetch(`/api/books/${bookId}/fetch-cover`, { method: 'POST' });
      if (!res.ok) {
        setStatus('not-found');
        return;
      }
      const data = await res.json();
      if (data.found) {
        setStatus('done');
        router.refresh();
      } else {
        setStatus('not-found');
      }
    } catch {
      setStatus('not-found');
    }
  };

  if (status === 'done') return null;

  return (
    <button
      onClick={handleFetch}
      disabled={status === 'fetching'}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-primary-light text-primary hover:opacity-80 disabled:opacity-60 transition-colors cursor-pointer"
    >
      {status === 'fetching' ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Searching…
        </>
      ) : status === 'not-found' ? (
        'No cover found'
      ) : (
        <>
          <ImagePlus className="w-4 h-4" />
          {hasCover ? 'Re-fetch cover' : 'Fetch cover'}
        </>
      )}
    </button>
  );
}
