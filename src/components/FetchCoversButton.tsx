'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

type Status = 'idle' | 'fetching' | 'done';

export function FetchCoversButton() {
  const [status, setStatus] = useState<Status>('idle');
  const [fetched, setFetched] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/books/fetch-covers')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.remaining === 'number') {
          setRemaining(data.remaining);
        }
      })
      .catch(() => {});
  }, []);

  const handleFetch = async () => {
    if (status === 'fetching') return;
    setStatus('fetching');
    setFetched(0);

    let currentRemaining = remaining ?? 1;

    while (currentRemaining > 0) {
      try {
        const res = await fetch('/api/books/fetch-covers', { method: 'POST' });
        if (!res.ok) break;
        const data = await res.json();
        const batchFetched: number = data.fetched ?? 0;
        currentRemaining = data.remaining ?? 0;
        setFetched((prev) => prev + batchFetched);
        setRemaining(currentRemaining);
        if (batchFetched === 0) break;
      } catch {
        break;
      }
    }

    setStatus('done');
  };

  const isDisabled = status === 'fetching' || remaining === 0;

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleFetch}
        disabled={isDisabled}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:bg-border disabled:text-muted disabled:cursor-default transition-colors"
      >
        {status === 'fetching' && <Loader2 className="w-4 h-4 animate-spin" />}
        {status === 'fetching'
          ? `Fetching… (${remaining ?? '?'} remaining)`
          : status === 'done'
          ? 'Done!'
          : 'Fetch missing covers'}
      </button>

      {status === 'done' && fetched > 0 && (
        <p className="text-sm text-muted">
          Done! Fetched {fetched} cover{fetched !== 1 ? 's' : ''}.
          {(remaining ?? 0) > 0 ? ` ${remaining} still missing.` : ' All covers fetched.'}
        </p>
      )}
      {status === 'done' && fetched === 0 && (
        <p className="text-sm text-muted">No new covers found.</p>
      )}
      {status === 'idle' && remaining !== null && remaining > 0 && (
        <p className="text-sm text-muted">{remaining} book{remaining !== 1 ? 's' : ''} without a cover.</p>
      )}
      {status === 'idle' && remaining === 0 && (
        <p className="text-sm text-muted">All books have covers.</p>
      )}
    </div>
  );
}
