'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import type { Label } from '@/lib/types';

const sorts = [
  { value: 'dateAdded', label: 'Date added' },
  { value: 'dateRead', label: 'Date read' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'myRating', label: 'My rating' },
];

const shelves = [
  { value: '', label: 'All books' },
  { value: 'read', label: 'Read' },
  { value: 'currently-reading', label: 'Reading' },
  { value: 'to-read', label: 'Want to Read' },
  { value: 'next-read', label: 'Recommendations' },
];

export function LibraryFilters({ labels = [] }: { labels?: Label[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const currentShelf = params.get('shelf') ?? '';
  const currentLabel = params.get('label') ?? '';

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'shelf' && value === 'next-read') next.delete('label');
    router.push(`/library?${next.toString()}`);
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        {shelves.map(({ value, label }) => (
          <button key={value} onClick={() => update('shelf', value)} aria-pressed={currentShelf === value}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${currentShelf === value ? 'bg-primary text-white' : 'bg-surface text-muted border border-border hover:text-primary hover:border-primary/40'}`}>
            {label}
          </button>
        ))}
        {currentShelf !== 'next-read' && labels.map((label) => (
          <button key={label.id} onClick={() => update('label', currentLabel === label.id ? '' : label.id)}
            aria-pressed={currentLabel === label.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border"
            style={currentLabel === label.id ? { backgroundColor: label.color, color: '#fff', borderColor: label.color } : { borderColor: `${label.color}40`, color: label.color }}>
            {label.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="search" aria-label="Search books" defaultValue={params.get('search') ?? ''}
            onChange={(event) => update('search', event.target.value)} placeholder="Search title or author…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-surface text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        {currentShelf !== 'next-read' && (
          <select aria-label="Sort books" value={params.get('sort') ?? 'dateAdded'} onChange={(event) => update('sort', event.target.value)}
            className="text-sm border border-border rounded-xl px-3 py-2 bg-surface text-foreground">
            {sorts.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}
