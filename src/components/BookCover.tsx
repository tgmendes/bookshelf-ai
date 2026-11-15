import { getBookColor } from '@/lib/coverGradients';

export function BookCover({ book, small = false }: { book: { id: string; title: string; author: string; coverUrl: string | null }; small?: boolean }) {
  return (
    <span className={`cover-tile relative flex shrink-0 flex-col justify-between overflow-hidden ${small ? 'h-[180px] w-[120px] px-4 py-4' : 'h-[270px] w-[180px] py-6 pl-7 pr-5'}`}
      style={{ backgroundColor: getBookColor(book.id) }}>
      {book.coverUrl ? <img src={book.coverUrl} alt={`${book.title} cover`} className="absolute inset-0 size-full object-cover" /> : (
        <>
          <span className="font-display text-[11px] uppercase tracking-[.2em] break-words">{book.author}</span>
          <span className={`font-display font-light leading-[1.1] hyphens-auto break-words ${small ? 'text-xl' : 'text-[30px]'}`}>{book.title}</span>
        </>
      )}
    </span>
  );
}
