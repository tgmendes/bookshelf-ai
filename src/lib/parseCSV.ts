import Papa from 'papaparse';
import type { BookImportRow, Shelf } from './types';

// Goodreads CSV column names
interface GoodreadsRow {
  'Book Id': string;
  Title: string;
  Author: string;
  ISBN13: string;
  'My Rating': string;
  'Average Rating': string;
  'Date Read': string;
  'Date Added': string;
  'Exclusive Shelf': string;
  'Number of Pages': string;
  'Year Published': string;
  Bookshelves: string;
}

function parseDate(raw: string): string | null {
  if (!raw || raw.trim() === '') return null;
  // Goodreads format: YYYY/MM/DD
  return raw.trim().replace(/\//g, '-');
}

function parseIsbn(raw: string): string | null {
  if (!raw) return null;
  // Goodreads wraps ISBNs as ="0123456789012"
  const cleaned = raw.replace(/[="]/g, '').trim();
  return cleaned.length >= 10 ? cleaned : null;
}

function parseShelf(raw: string): Shelf {
  if (raw === 'currently-reading') return 'currently-reading';
  if (raw === 'to-read') return 'to-read';
  return 'read';
}

export function parseGoodreadsCSV(csvText: string): BookImportRow[] {
  const result = Papa.parse<GoodreadsRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data
    .filter((row) => row['Book Id'] && row['Title'])
    .map((row) => ({
      goodreadsBookId: row['Book Id'].trim(),
      isbn13: parseIsbn(row['ISBN13']),
      title: row['Title'].trim(),
      author: row['Author'].trim(),
      myRating: parseInt(row['My Rating'] || '0', 10) || 0,
      avgRating: parseFloat(row['Average Rating']) || null,
      dateRead: parseDate(row['Date Read']),
      dateAdded: parseDate(row['Date Added']) || new Date().toISOString().split('T')[0],
      shelf: parseShelf(row['Exclusive Shelf']),
      pages: parseInt(row['Number of Pages'] || '0', 10) || 0,
      yearPublished: parseInt(row['Year Published'] || '0', 10) || null,
      bookshelves: row['Bookshelves']
        ? row['Bookshelves'].split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    }));
}
