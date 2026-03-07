'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useCallback } from 'react';
import type { Label } from '@/lib/types';

const sorts = [
  { value: 'dateAdded', label: 'Date added' },
  { value: 'dateRead', label: 'Date read' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'myRating', label: 'My rating' },
];

const shelves = [
  { value: '', label: 'All' },
  { value: 'read', label: 'Read' },
  { value: 'currently-reading', label: 'Reading' },
  { value: 'to-read', label: 'Want to Read' },
  { value: 'next-read', label: 'Next Read' },
];

export function LibraryFilters({ labels = [] }: { labels?: Label[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      router.push(`/library?${next.toString()}`);
    },
    [router, params]
  );

  const currentShelf = params.get('shelf') ?? '';
  const currentLabel = params.get('label') ?? '';

  return (
    <div className="space-y-4 mb-6">
      {/* Pill tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {shelves.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => update('shelf', value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              currentShelf === value
                ? 'bg-primary text-white'
                : 'bg-surface text-muted border border-border hover:text-primary hover:border-primary/40 hover:bg-primary-light'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Label filter pills */}
      {labels.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted mr-1">Labels:</span>
          {labels.map((label) => {
            const isActive = currentLabel === label.id;
            return (
              <button
                key={label.id}
                onClick={() => update('label', isActive ? '' : label.id)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border"
                style={
                  isActive
                    ? { backgroundColor: label.color, color: '#fff', borderColor: label.color }
                    : { borderColor: label.color, color: label.color }
                }
              >
                {label.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Search + sort row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="search"
            defaultValue={params.get('search') ?? ''}
            onChange={(e) => update('search', e.target.value)}
            placeholder="Search title or author…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-surface text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
          />
        </div>

        <select
          value={params.get('sort') ?? 'dateAdded'}
          onChange={(e) => update('sort', e.target.value)}
          className="text-sm border border-border rounded-xl px-3 py-2 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {sorts.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
