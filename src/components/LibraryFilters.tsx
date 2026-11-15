'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Label } from '@/lib/types';
import { shelfLabels } from '@/lib/types';

const shelves = [
  { value: 'read', label: 'Read' }, { value: 'to-read', label: 'Want to read' },
  { value: 'currently-reading', label: 'Reading' },
  { value: 'paused', label: shelfLabels.paused }, { value: 'abandoned', label: shelfLabels.abandoned },
  { value: 'all', label: 'All' },
];

export function LibraryFilters({ labels = [], heading }: { labels?: Label[]; heading?: ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const requestedShelf = params.get('shelf') ?? 'read';
  const shelf = shelves.some((item) => item.value === requestedShelf) ? requestedShelf : 'read';
  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`/library?${next.toString()}#shelf`, { scroll: false });
  }
  return (
    <div className="mb-5 space-y-4">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      {heading}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Shelf filters">
        {shelves.map(({ value, label }) => <button key={value} type="button" className="chip" aria-pressed={shelf === value} onClick={() => update('shelf', value)}>{label}</button>)}
        <button type="button" className="chip" aria-pressed={params.get('sort') === 'myRating'} onClick={() => update('sort', params.get('sort') === 'myRating' ? 'dateRead' : 'myRating')}>By rating</button>
      </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <form action="/library#shelf" className="flex min-w-0 flex-1 items-center rounded-full border border-border-strong bg-surface pl-4">
          <input type="hidden" name="shelf" value={shelf} />
          {params.get('sort') && <input type="hidden" name="sort" value={params.get('sort')!} />}
          {params.get('label') && <input type="hidden" name="label" value={params.get('label')!} />}
          <input type="search" name="search" aria-label="Search books" defaultValue={params.get('search') ?? ''} placeholder="Search title or author…" className="h-11 min-w-0 flex-1 rounded-full bg-transparent text-sm outline-none" />
          <button type="submit" aria-label="Search" className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-accent"><Search className="size-4" aria-hidden="true" /></button>
        </form>
        <select aria-label="Sort books" value={params.get('sort') ?? 'dateRead'} onChange={(event) => update('sort', event.target.value)} className="chip max-w-full">
          <option value="dateRead">Date read</option><option value="dateAdded">Date added</option><option value="title">Title</option><option value="author">Author</option><option value="myRating">My rating</option>
        </select>
      </div>
      {labels.length > 0 && <div className="flex flex-wrap gap-2" role="group" aria-label="Label filters">{labels.map((label) => (
        <button key={label.id} type="button" className="chip gap-2" aria-pressed={params.get('label') === label.id} onClick={() => update('label', params.get('label') === label.id ? '' : label.id)}>
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: label.color }} aria-hidden="true" />{label.name}
        </button>
      ))}</div>}
    </div>
  );
}
