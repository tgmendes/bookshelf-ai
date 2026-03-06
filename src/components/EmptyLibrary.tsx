'use client';

import { BookOpen } from 'lucide-react';
import { ImportZone } from './ImportZone';

export function EmptyLibrary() {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-display text-2xl text-foreground mb-2">
          Welcome to your bookshelf!
        </h2>
        <p className="text-muted">
          Import your Goodreads library to get started.
        </p>
      </div>

      <ImportZone />

      <div className="mt-8 rounded-xl bg-surface border border-border p-6 text-sm text-muted">
        <p className="font-semibold text-foreground mb-3">How to export from Goodreads</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Go to <span className="font-medium text-foreground">goodreads.com/review/import</span></li>
          <li>Click <span className="font-medium text-foreground">Export Library</span> at the top</li>
          <li>Wait for the export to finish, then download the CSV file</li>
          <li>Drop it above or click to upload</li>
        </ol>
      </div>
    </div>
  );
}
