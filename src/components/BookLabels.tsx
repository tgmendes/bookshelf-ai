'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import type { Label } from '@/lib/types';

interface Props {
  bookId: string;
  initialLabels: Label[];
}

export function BookLabels({ bookId, initialLabels }: Props) {
  const [assigned, setAssigned] = useState<Label[]>(initialLabels);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/labels').then((r) => r.ok ? r.json() : []).then(setAllLabels);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unassigned = allLabels.filter((l) => !assigned.some((a) => a.id === l.id));

  const update = async (newIds: string[]) => {
    const res = await fetch(`/api/books/${bookId}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labelIds: newIds }),
    });
    if (res.ok) {
      const updated: Label[] = await res.json();
      setAssigned(updated);
    }
  };

  const addLabel = (label: Label) => {
    const newIds = [...assigned.map((l) => l.id), label.id];
    update(newIds);
    setOpen(false);
  };

  const removeLabel = (labelId: string) => {
    const newIds = assigned.filter((l) => l.id !== labelId).map((l) => l.id);
    update(newIds);
  };

  return (
    <div>
      <h2 className="font-display text-xl text-foreground mb-2">Labels</h2>
      <div className="flex flex-wrap gap-1.5 items-center">
        {assigned.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full text-white"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
            <button
              onClick={() => removeLabel(label.id)}
              className="hover:opacity-70 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Add label dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted hover:text-primary hover:border-primary/40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {open && unassigned.length > 0 && (
            <div className="absolute top-8 left-0 z-10 bg-surface border border-border rounded-lg p-1 shadow-lg min-w-36">
              {unassigned.map((label) => (
                <button
                  key={label.id}
                  onClick={() => addLabel(label)}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-sm text-foreground hover:bg-primary-light rounded cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  {label.name}
                </button>
              ))}
            </div>
          )}
          {open && unassigned.length === 0 && (
            <div className="absolute top-8 left-0 z-10 bg-surface border border-border rounded-lg p-2 shadow-lg min-w-36">
              <p className="text-xs text-muted">
                {allLabels.length === 0 ? 'No labels yet — create them in Settings' : 'All labels assigned'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
