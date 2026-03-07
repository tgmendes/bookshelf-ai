'use client';

import { useState, useCallback, useEffect } from 'react';
import { Sparkles, Check, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SuggestedLabel {
  name: string;
  color: string;
  bookIds: string[];
  count: number;
}

interface LabelSuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LabelSuggestModal({ isOpen, onClose }: LabelSuggestModalProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<SuggestedLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptedNames, setAcceptedNames] = useState<Set<string>>(new Set());
  const [acceptingName, setAcceptingName] = useState<string | null>(null);
  const [dismissedNames, setDismissedNames] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/labels/suggest', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to get suggestions');
      }
      const data = await res.json();
      setSuggestions(data.labels ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setFetched(true);
      setLoading(false);
    }
  }, []);

  // Trigger fetch once when modal first opens — never auto-retries
  useEffect(() => {
    if (isOpen && !fetched && !loading) {
      fetchSuggestions();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const acceptLabel = useCallback(async (label: SuggestedLabel) => {
    setAcceptingName(label.name);
    try {
      // Create the label
      const createRes = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label.name, color: label.color }),
      });
      if (!createRes.ok) return;
      const created = await createRes.json();

      // Assign books to the label (append-only, doesn't remove existing labels)
      if (label.bookIds.length > 0) {
        await fetch(`/api/labels/${created.id}/assign-books`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookIds: label.bookIds }),
        });
      }

      setAcceptedNames((prev) => new Set(prev).add(label.name));
    } finally {
      setAcceptingName(null);
    }
  }, []);

  const acceptAll = useCallback(async () => {
    const remaining = suggestions.filter(
      (s) => !acceptedNames.has(s.name) && !dismissedNames.has(s.name)
    );
    for (const label of remaining) {
      await acceptLabel(label);
    }
  }, [suggestions, acceptedNames, dismissedNames, acceptLabel]);

  const handleClose = useCallback(() => {
    if (acceptedNames.size > 0) router.refresh();
    onClose();
  }, [acceptedNames, router, onClose]);

  if (!isOpen) return null;

  const visibleSuggestions = suggestions.filter((s) => !dismissedNames.has(s.name));
  const allHandled = visibleSuggestions.every((s) => acceptedNames.has(s.name));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-foreground/40" />
      <div
        className="relative bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-sm:max-h-[90vh] max-sm:flex max-sm:flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-xl text-foreground">Suggested labels</h2>
              <p className="text-xs text-muted">Based on your reading history</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-full text-muted hover:text-foreground hover:bg-primary-light transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-1.5 max-sm:overflow-y-auto max-sm:flex-1">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-sm text-muted">Analysing your library…</p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-6">
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={() => { setFetched(false); fetchSuggestions(); }} className="mt-2 text-sm text-primary hover:underline">
                Try again
              </button>
            </div>
          )}

          {!loading && !error && visibleSuggestions.map((label) => {
            const isAccepted = acceptedNames.has(label.name);
            const isAccepting = acceptingName === label.name;

            return (
              <div
                key={label.name}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                  isAccepted
                    ? 'bg-primary-light border-primary/20'
                    : 'bg-surface border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <div>
                    <span className="text-sm font-medium text-foreground">{label.name}</span>
                    <p className="text-xs text-muted">
                      {isAccepted ? (
                        <span className="text-primary">{label.count} books labelled</span>
                      ) : (
                        `${label.count} books would match`
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isAccepted ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      <Check className="w-3.5 h-3.5" />
                      Added
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => acceptLabel(label)}
                        disabled={isAccepting || acceptingName !== null}
                        className="px-3 py-1 rounded-full bg-primary text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                      >
                        {isAccepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Accept'}
                      </button>
                      <button
                        onClick={() => setDismissedNames((prev) => new Set(prev).add(label.name))}
                        className="p-1 text-muted hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {!loading && !error && visibleSuggestions.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-xs text-muted">You can always edit labels later</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-primary-light transition-colors"
              >
                {allHandled ? 'Done' : 'Skip'}
              </button>
              {!allHandled && (
                <button
                  onClick={acceptAll}
                  disabled={acceptingName !== null}
                  className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  Accept All
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
