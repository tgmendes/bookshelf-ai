import Link from 'next/link';
import type { Book } from '@/lib/types';
import { BookOpen } from 'lucide-react';
import { getCoverGradient } from '@/lib/coverGradients';
import { FetchCoverOverlay } from './FetchCoverOverlay';

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  const gradient = getCoverGradient(book.title);

  return (
    <div className="group flex flex-col">
      <div
        className={`relative w-full rounded-2xl bg-gradient-to-br ${gradient} overflow-hidden`}
        style={{ aspectRatio: '3/4' }}
      >
        <Link
          href={book.isRecommendation ? `/library/${book.id}?rec=1` : `/library/${book.id}`}
          className="absolute inset-0 z-0"
        >
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        </Link>

        {/* Fetch cover button for books without a cover */}
        {!book.coverUrl && !book.isRecommendation && (
          <FetchCoverOverlay bookId={book.id} />
        )}
      </div>
      <Link
        href={book.isRecommendation ? `/library/${book.id}?rec=1` : `/library/${book.id}`}
        className="mt-2 px-0.5"
      >
        <p className="text-foreground text-sm font-medium leading-snug line-clamp-1">{book.title}</p>
        <p className="text-muted text-xs mt-0.5 truncate">{book.author}</p>
      </Link>
    </div>
  );
}
