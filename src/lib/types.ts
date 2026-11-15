export type Shelf = 'read' | 'currently-reading' | 'to-read';

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
