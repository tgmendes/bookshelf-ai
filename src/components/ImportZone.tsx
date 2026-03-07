'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseGoodreadsCSV } from '@/lib/parseCSV';
import { Upload, CheckCircle, AlertCircle, Loader2, ImageDown } from 'lucide-react';

type Status = 'idle' | 'parsing' | 'uploading' | 'success' | 'fetching-covers' | 'error';

export function ImportZone() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fetchCoversInBatches = useCallback(async () => {
    setStatus('fetching-covers');

    // Get initial count
    const countRes = await fetch('/api/books/fetch-covers');
    if (!countRes.ok) return;
    let { remaining } = await countRes.json();

    while (remaining > 0) {
      setMessage(`Fetching covers… (${remaining} remaining)`);
      const res = await fetch('/api/books/fetch-covers', { method: 'POST' });
      if (!res.ok) break;
      const data = await res.json();
      remaining = data.remaining;
    }

    setStatus('success');
    setMessage('All done! Library imported with covers.');
    router.refresh();
  }, [router]);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.csv')) {
        setStatus('error');
        setMessage('Please upload a CSV file exported from Goodreads.');
        return;
      }

      setStatus('parsing');
      setMessage('Parsing CSV…');

      const text = await file.text();
      const books = parseGoodreadsCSV(text);

      if (books.length === 0) {
        setStatus('error');
        setMessage('No valid books found. Make sure it is a Goodreads export CSV.');
        return;
      }

      setStatus('uploading');
      setMessage(`Importing ${books.length} books…`);

      const res = await fetch('/api/books/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(books),
      });

      if (!res.ok) {
        setStatus('error');
        setMessage('Import failed. Check your database connection.');
        return;
      }

      const { imported } = await res.json();
      setMessage(`Imported ${imported} books! Fetching covers…`);

      // Auto-fetch covers
      await fetchCoversInBatches();
    },
    [fetchCoversInBatches]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const isLoading = status === 'parsing' || status === 'uploading' || status === 'fetching-covers';

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed transition-all p-12 text-center bg-surface ${
        isDragging
          ? 'border-primary bg-primary-light'
          : isLoading
          ? 'border-border bg-surface cursor-not-allowed'
          : 'border-border hover:border-primary hover:bg-primary-light'
      }`}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center">
          {status === 'success' ? (
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          ) : status === 'error' ? (
            <AlertCircle className="w-7 h-7 text-red-500" />
          ) : status === 'fetching-covers' ? (
            <ImageDown className="w-7 h-7 text-primary animate-pulse" />
          ) : isLoading ? (
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          ) : (
            <Upload className="w-7 h-7 text-primary" />
          )}
        </div>

        <div>
          <p className="font-semibold text-foreground text-base">
            {status === 'idle'
              ? 'Drop your Goodreads CSV here'
              : message}
          </p>
          {status === 'idle' && (
            <p className="text-sm text-muted mt-1">
              or click to browse your files
            </p>
          )}
          {status === 'error' && (
            <button
              onClick={(e) => { e.stopPropagation(); setStatus('idle'); }}
              className="mt-3 text-sm text-primary underline"
            >
              Try again
            </button>
          )}
        </div>

        {status === 'idle' && (
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Upload className="w-4 h-4" />
            Select File
          </button>
        )}
      </div>
    </div>
  );
}
