'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Tag, Sparkles } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { Label } from '@/lib/types';
import { ManageLabelsModal } from './ManageLabelsModal';
import { LabelSuggestModal } from './LabelSuggestModal';

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

interface LibraryFiltersProps {
  labels?: Label[];
  hasBooks?: boolean;
}

export function LibraryFilters({ labels = [], hasBooks = false }: LibraryFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [manageOpen, setManageOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

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

  const showAiBanner = hasBooks && labels.length === 0 && !bannerDismissed;

  return (
    <>
      <div className="space-y-4 mb-6">
        {/* Shelf + label filters in one row */}
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

          {/* Divider + label filters */}
          {labels.length > 0 && (
            <>
              <div className="w-px h-5 bg-border" />
              {labels.map((label) => {
                const isActive = currentLabel === label.id;
                return (
                  <button
                    key={label.id}
                    onClick={() => update('label', isActive ? '' : label.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer border"
                    style={
                      isActive
                        ? { backgroundColor: label.color, color: '#fff', borderColor: label.color }
                        : { borderColor: `${label.color}40`, color: label.color }
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </button>
                );
              })}
              <button
                onClick={() => setManageOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted border border-dashed border-border hover:text-foreground hover:border-border transition-colors cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                Manage
              </button>
            </>
          )}
        </div>

        {/* AI suggest banner — only for cold start */}
        {showAiBanner && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-light border border-primary/15 animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Organise your library with AI</p>
              <p className="text-xs text-muted">Let AI analyse your books and suggest labels automatically</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setSuggestOpen(true)}
                className="px-4 py-1.5 rounded-full bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Suggest Labels
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            </div>
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

      <ManageLabelsModal isOpen={manageOpen} onClose={() => setManageOpen(false)} />
      <LabelSuggestModal isOpen={suggestOpen} onClose={() => setSuggestOpen(false)} />
    </>
  );
}
