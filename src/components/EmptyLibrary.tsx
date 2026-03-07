'use client';

import { useState } from 'react';
import { BookOpen, Search, Upload } from 'lucide-react';
import { ImportZone } from './ImportZone';
import { BookSearchModal } from './BookSearchModal';

export function EmptyLibrary() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="max-w-3xl mx-auto py-12 animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-primary-light rounded-3xl flex items-center justify-center mx-auto mb-5 animate-scale-in">
          <BookOpen className="w-10 h-10 text-primary" />
        </div>
        <h2 className="font-display text-3xl text-foreground mb-2">
          Welcome to your bookshelf!
        </h2>
        <p className="text-muted text-lg">
          Your reading journey starts here. Add books to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Card 1: Import from Goodreads */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Import from Goodreads</h3>
              <p className="text-xs text-muted">Upload your CSV export</p>
            </div>
          </div>
          <ImportZone />
        </div>

        {/* Card 2: Search for books */}
        <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Search for books</h3>
              <p className="text-xs text-muted">Find and add books manually</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <p className="text-sm text-muted mb-4">
              Search by title or author and add books to your shelves one at a time.
            </p>
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:opacity-90 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Search className="w-4 h-4" />
              Search Books
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-surface border border-border p-6 text-sm text-muted">
        <p className="font-semibold text-foreground mb-3">How to export from Goodreads</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Go to <span className="font-medium text-foreground">goodreads.com/review/import</span></li>
          <li>Click <span className="font-medium text-foreground">Export Library</span> at the top</li>
          <li>Wait for the export to finish, then download the CSV file</li>
          <li>Drop it above or click to upload</li>
        </ol>
      </div>

      <BookSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
