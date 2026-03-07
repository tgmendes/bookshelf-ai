'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { BookSearchModal } from './BookSearchModal';

export function AddBookButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:opacity-90 text-white text-sm font-medium rounded-xl transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Book
      </button>
      <BookSearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
