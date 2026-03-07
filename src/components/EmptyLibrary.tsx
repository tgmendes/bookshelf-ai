'use client';

import { BookOpen } from 'lucide-react';
import { ImportZone } from './ImportZone';

export function EmptyLibrary() {
  return (
    <div className="max-w-2xl mx-auto py-12 animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-primary-light rounded-3xl flex items-center justify-center mx-auto mb-5 animate-scale-in">
          <BookOpen className="w-10 h-10 text-primary" />
        </div>
        <h2 className="font-display text-3xl text-foreground mb-2">
          Welcome to your bookshelf!
        </h2>
        <p className="text-muted text-lg">
          Your reading journey starts here. Import your Goodreads library to explore your collection.
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
