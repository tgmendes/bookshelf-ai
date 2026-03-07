import Link from 'next/link';
import type { Book } from '@/lib/types';
import { BookOpen, Star } from 'lucide-react';
import { getCoverGradient } from '@/lib/coverGradients';
import { FetchCoverOverlay } from './FetchCoverOverlay';

interface BookCardProps {
  book: Book;
  labelColors?: string[];
}

export function BookCard({ book, labelColors }: BookCardProps) {
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

        {/* Label dots */}
        {labelColors && labelColors.length > 0 && (
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            {labelColors.slice(0, 3).map((color, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full border border-white/50"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>
      <Link
        href={book.isRecommendation ? `/library/${book.id}?rec=1` : `/library/${book.id}`}
        className="mt-2 px-0.5"
      >
        <p className="text-foreground text-sm font-medium leading-snug line-clamp-1">{book.title}</p>
        <p className="text-muted text-xs mt-0.5 truncate">{book.author}</p>
        {book.myRating > 0 ? (
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < book.myRating ? 'text-amber-400 fill-amber-400' : 'text-border'}`}
              />
            ))}
          </div>
        ) : book.avgRating ? (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-muted text-xs">{book.avgRating.toFixed(1)}</span>
          </div>
        ) : null}
      </Link>
    </div>
  );
}
