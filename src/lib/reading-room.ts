import type { ReadingBook } from './types';

export interface ShelfParams { shelf?: string; search?: string; sort?: string; label?: string }

export function getReadingNowBooks(books: ReadingBook[]) {
  return books.filter((book) => book.shelf === 'currently-reading')
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded) || a.id.localeCompare(b.id));
}

export function getCarouselOffset(index: number, selected: number, count: number) {
  let offset = index - selected;
  if (offset > count / 2) offset -= count;
  if (offset < -count / 2) offset += count;
  return offset;
}

export function filterShelf(books: ReadingBook[], params: ShelfParams) {
  const shelf = params.shelf ?? 'read';
  const search = params.search?.trim().toLowerCase();
  const filtered = books.filter((book) =>
    (shelf === 'all' || book.shelf === shelf) &&
    (!search || `${book.title} ${book.author}`.toLowerCase().includes(search)) &&
    (!params.label || book.labels.some((label) => label.id === params.label)));
  return filtered.sort((a, b) => {
    switch (params.sort) {
      case 'title': return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
      case 'author': return a.author.localeCompare(b.author) || a.title.localeCompare(b.title);
      case 'myRating': return b.myRating - a.myRating || (b.dateRead ?? '').localeCompare(a.dateRead ?? '') || a.id.localeCompare(b.id);
      case 'dateAdded': return b.dateAdded.localeCompare(a.dateAdded) || a.id.localeCompare(b.id);
      default: return (b.dateRead ?? '').localeCompare(a.dateRead ?? '') || b.dateAdded.localeCompare(a.dateAdded) || a.id.localeCompare(b.id);
    }
  });
}

export function selectDefaultBook(books: ReadingBook[]) {
  return [...books].sort((a, b) => (b.dateRead ?? '').localeCompare(a.dateRead ?? '') || b.dateAdded.localeCompare(a.dateAdded) || a.id.localeCompare(b.id))[0] ?? null;
}

export function formatBookDate(value: string | null | undefined, year = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(date);
}

export function formatRelativeTime(value: string, now: string) {
  const seconds = Math.max(0, (new Date(now).getTime() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const [amount, unit] = seconds < 3600 ? [Math.floor(seconds / 60), 'minute']
    : seconds < 86400 ? [Math.floor(seconds / 3600), 'hour']
      : seconds < 2592000 ? [Math.floor(seconds / 86400), 'day']
        : seconds < 31536000 ? [Math.floor(seconds / 2592000), 'month'] : [Math.floor(seconds / 31536000), 'year'];
  return `${amount} ${unit}${amount === 1 ? '' : 's'} ago`;
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getReadingYear(books: ReadingBook[], year: number, currentYear: number) {
  const read = books.filter((book) => book.shelf === 'read' && book.dateRead?.startsWith(`${year}-`));
  const rated = read.filter((book) => book.myRating > 0);
  const months = MONTHS.map((name, index) => ({ name, index,
    books: read.filter((book) => Number(book.dateRead?.slice(5, 7)) === index + 1),
    reading: year === currentYear ? books.filter((book) => book.shelf === 'currently-reading' && book.dateStarted?.startsWith(`${year}-`) && Number(book.dateStarted.slice(5, 7)) === index + 1) : [],
  }));
  const authors = new Map<string, number>();
  const labelCounts = new Map<string, { name: string; count: number }>();
  for (const book of read) {
    authors.set(book.author, (authors.get(book.author) ?? 0) + 1);
    for (const label of new Map(book.labels.map((label) => [label.id, label])).values()) {
      const old = labelCounts.get(label.id);
      labelCounts.set(label.id, { name: label.name, count: (old?.count ?? 0) + 1 });
    }
  }
  const topAuthors = [...authors].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5);
  const withPages = read.filter((book) => book.pages > 0).sort((a, b) => b.pages - a.pages || a.title.localeCompare(b.title));
  const busiest = [...months].sort((a, b) => b.books.length - a.books.length || a.index - b.index)[0];
  return {
    totalBooks: read.length,
    totalPages: read.reduce((sum, book) => sum + Math.max(book.pages, 0), 0),
    averageRating: rated.length ? rated.reduce((sum, book) => sum + book.myRating, 0) / rated.length : null,
    authorCount: authors.size, topAuthors, months,
    ratings: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: rated.filter((book) => book.myRating === rating).length })),
    bookOfYear: [...rated].sort((a, b) => b.myRating - a.myRating || (b.dateRead ?? '').localeCompare(a.dateRead ?? '') || a.id.localeCompare(b.id))[0] ?? null,
    longest: withPages[0] ?? null, shortest: withPages.at(-1) ?? null,
    busiestMonth: busiest?.books.length ? busiest : null,
    topLabel: [...labelCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0] ?? null,
    years: [...new Set(books.filter((book) => book.shelf === 'read' && book.dateRead).map((book) => Number(book.dateRead!.slice(0, 4))))].sort((a, b) => a - b),
  };
}
