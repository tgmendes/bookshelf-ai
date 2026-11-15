export const shelfValues = ['read', 'currently-reading', 'to-read', 'paused', 'abandoned'] as const;
export type Shelf = typeof shelfValues[number];
export const shelfLabels: Record<Shelf, string> = {
  read: 'Read', 'currently-reading': 'Reading', 'to-read': 'Want to read',
  paused: 'Paused', abandoned: 'Abandoned',
};

export interface Book {
  id: string;
  goodreadsBookId: string | null;
  title: string;
  author: string;
  myRating: number;
  avgRating: number | null;
  dateRead: string | null;
  dateAdded: string;
  shelf: Shelf;
  pages: number;
  yearPublished: number | null;
  bookshelves: string[] | null;
  coverUrl: string | null;
  synopsis: string | null;
  isRecommendation?: boolean;
  reason?: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface ReadingBook extends Book {
  dateStarted: string | null;
  notes: string | null;
  updatedAt: string | null;
  labels: Label[];
}

export interface SavedRecommendation {
  id: string;
  title: string;
  author: string;
  reason: string;
  source: string | null;
  coverUrl: string | null;
  synopsis: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
