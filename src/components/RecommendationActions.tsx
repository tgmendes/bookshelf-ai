'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getLocalDate } from '@/lib/library/dates';

export function RecommendationActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<'start' | 'delete' | null>(null);
  const [done, setDone] = useState<'start' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const confirmButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const restoreDeleteFocus = useRef(false);

  useEffect(() => {
    if (confirming) confirmButton.current?.focus();
    else if (restoreDeleteFocus.current) { deleteButton.current?.focus(); restoreDeleteFocus.current = false; }
  }, [confirming]);

  async function act(action: 'start' | 'delete') {
    if (busy) return;
    setBusy(action);
    setError('');
    try {
      const response = await fetch(`/api/recommendations/${id}${action === 'start' ? '/start-reading' : ''}`, {
        method: action === 'start' ? 'POST' : 'DELETE',
        ...(action === 'start' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: getLocalDate() }) } : {}),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || response.redirected) throw new Error(response.status === 401 || response.redirected ? 'Please sign in again to change recommendations.' : data?.error ?? 'Could not complete this action. Please try again.');
      setDone(action);
      if (action === 'start') {
        // A full navigation also clears cached copies of the old recommendation.
        window.location.assign(`/library/${data.book.id}`);
      } else if (pathname.startsWith('/library/')) {
        window.location.assign('/library#next');
      } else { router.refresh(); }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not complete this action. Please try again.');
    } finally { setBusy(null); }
  }

  if (done) return <p role="status" className="text-sm text-accent">{done === 'start' ? 'Opening your book…' : 'Recommendation removed.'}</p>;
  return (
    <div className="space-y-3" role="group" aria-label={`Actions for ${title}`}>
      {confirming ? (
        <div className="rounded-xl border border-border-strong bg-bg p-3">
          <p className="text-sm">Remove this recommendation? Your library books will not be deleted.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button ref={confirmButton} type="button" className="chip text-red-700 dark:text-red-400 disabled:opacity-50" disabled={!!busy} onClick={() => act('delete')}>{busy === 'delete' ? 'Deleting…' : 'Confirm delete'}</button>
            <button type="button" className="chip" disabled={!!busy} onClick={() => { restoreDeleteFocus.current = true; setConfirming(false); setError(''); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!!busy} className="min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-bold text-bg disabled:opacity-50" onClick={() => act('start')}>{busy === 'start' ? 'Starting…' : 'Start reading'}</button>
          <button ref={deleteButton} type="button" disabled={!!busy} className="chip" onClick={() => { setConfirming(true); setError(''); }}>Delete</button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
