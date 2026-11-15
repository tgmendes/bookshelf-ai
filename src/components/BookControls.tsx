'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import type { ReadingBook, Shelf } from '@/lib/types';
import { getLocalDate } from '@/lib/library/dates';

export function BookControls({ book }: { book: ReadingBook }) {
  const router = useRouter();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(book.myRating);
  const [shelf, setShelf] = useState<Shelf>(book.shelf);
  const [original, setOriginal] = useState({ rating: book.myRating, shelf: book.shelf });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const firstInput = useRef<HTMLSelectElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const dirty = rating !== original.rating || shelf !== original.shelf;

  useEffect(() => {
    if (editing) firstInput.current?.focus();
    else if (restoreFocus.current) { editButton.current?.focus(); restoreFocus.current = false; }
  }, [editing]);

  function open() {
    setRating(book.myRating);
    setShelf(book.shelf);
    setOriginal({ rating: book.myRating, shelf: book.shelf });
    setError('');
    setNotice('');
    setEditing(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !dirty) return;
    setBusy(true);
    setError('');
    // Only submit fields changed in this editor, not stale unrelated values.
    const changes: { myRating?: number; shelf?: Shelf; effectiveDate?: string } = {};
    if (rating !== original.rating) changes.myRating = rating;
    if (shelf !== original.shelf) { changes.shelf = shelf; changes.effectiveDate = getLocalDate(); }
    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || response.redirected) throw new Error(response.status === 401 || response.redirected ? 'Please sign in again to save changes.' : data?.error ?? 'Could not save changes. Please try again.');
      restoreFocus.current = true;
      setEditing(false);
      setNotice('Saved.');
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save changes. Please try again.');
    } finally { setBusy(false); }
  }

  if (!editing) return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button ref={editButton} type="button" className="chip gap-2" onClick={open}><Pencil className="size-3.5" aria-hidden="true" />Edit rating &amp; status</button>
      <p role="status" className="text-sm text-accent">{notice}</p>
    </div>
  );

  return (
    <form id={`${id}-editor`} aria-label={`Edit ${book.title}`} onSubmit={save} className="mt-4 rounded-2xl border border-border-strong bg-bg p-4 text-left">
      <fieldset disabled={busy}>
        <legend className="eyebrow mb-3">Edit book</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label htmlFor={`${id}-rating`} className="mb-1 block text-sm text-muted">Your rating</label>
            <select ref={firstInput} id={`${id}-rating`} value={rating} onChange={(event) => setRating(Number(event.target.value))} className="min-h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm">
              <option value={0}>Unrated</option>{[1, 2, 3, 4, 5].map((value) => <option value={value} key={value}>{value} {value === 1 ? 'star' : 'stars'}</option>)}
            </select>
          </div>
          <div><label htmlFor={`${id}-shelf`} className="mb-1 block text-sm text-muted">Reading status</label>
            <select id={`${id}-shelf`} value={shelf} onChange={(event) => setShelf(event.target.value as Shelf)} className="min-h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm">
              <option value="to-read">Want to read</option><option value="currently-reading">Reading</option><option value="read">Read</option>
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">Recorded dates are kept. Missing start or finish dates use today.</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" disabled={!dirty} className="min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-bold text-bg disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button>
          <button type="button" className="chip" onClick={() => { restoreFocus.current = true; setEditing(false); setError(''); }}>Cancel</button>
        </div>
      </fieldset>
    </form>
  );
}
