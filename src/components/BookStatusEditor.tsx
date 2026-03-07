'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Loader2 } from 'lucide-react';

type Shelf = 'to-read' | 'currently-reading' | 'read';

const SHELVES: { value: Shelf; label: string }[] = [
  { value: 'to-read', label: 'Want to Read' },
  { value: 'currently-reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
];

interface Props {
  bookId: string;
  initialShelf: string;
  initialRating: number;
}

export function BookStatusEditor({ bookId, initialShelf, initialRating }: Props) {
  const router = useRouter();
  const [shelf, setShelf] = useState<Shelf>(initialShelf as Shelf);
  const [rating, setRating] = useState(initialRating);
  const [hovered, setHovered] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDirty = shelf !== initialShelf || rating !== initialRating;

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shelf,
          myRating: rating > 0 ? rating : null,
          ...(shelf === 'read' ? {} : { dateRead: null }),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Shelf selector */}
      <div>
        <p className="text-xs text-muted mb-2">Shelf</p>
        <div className="flex gap-1.5 flex-wrap">
          {SHELVES.map((s) => (
            <button
              key={s.value}
              onClick={() => setShelf(s.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                shelf === s.value
                  ? 'bg-primary text-white'
                  : 'bg-primary-light text-muted hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Star rating */}
      <div>
        <p className="text-xs text-muted mb-2">My rating</p>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(rating === star ? 0 : star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  star <= (hovered || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-border'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-1.5 text-xs text-muted">{rating}/5</span>
          )}
        </div>
      </div>

      {/* Save button */}
      {isDirty && (
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center gap-1.5"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
        </button>
      )}
    </div>
  );
}
