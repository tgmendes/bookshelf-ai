import { cache } from 'react';
import { and, desc, eq, max } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, recommendations, bookLabels, labels } from '@/lib/db/schema';
import type { Label, ReadingBook, SavedRecommendation } from '@/lib/types';

export const getReadingData = cache(async (userId: string) => {
  const [rows, recs, assignments, userLabels] = await Promise.all([
    db.select().from(books).where(eq(books.userId, userId)).orderBy(desc(books.updatedAt), books.id),
    db.select().from(recommendations).where(eq(recommendations.userId, userId)).orderBy(desc(recommendations.createdAt), recommendations.id),
    db.select({ bookId: bookLabels.bookId, id: labels.id, name: labels.name, color: labels.color }).from(bookLabels)
      .innerJoin(labels, eq(bookLabels.labelId, labels.id)).innerJoin(books, eq(bookLabels.bookId, books.id))
      .where(and(eq(labels.userId, userId), eq(books.userId, userId))),
    db.select({ id: labels.id, name: labels.name, color: labels.color }).from(labels).where(eq(labels.userId, userId)).orderBy(labels.name),
  ]);
  const labelsByBook = new Map<string, Label[]>();
  for (const { bookId, ...label } of assignments) labelsByBook.set(bookId, [...(labelsByBook.get(bookId) ?? []), label]);
  const library: ReadingBook[] = rows.map((row) => ({ ...row, shelf: row.shelf as ReadingBook['shelf'],
    myRating: row.myRating ?? 0, pages: row.pages ?? 0, updatedAt: row.updatedAt?.toISOString() ?? null,
    labels: labelsByBook.get(row.id) ?? [],
  }));
  const saved: SavedRecommendation[] = recs.map((rec) => ({ ...rec, createdAt: rec.createdAt?.toISOString() ?? null, updatedAt: rec.updatedAt?.toISOString() ?? null }));
  return { books: library, recommendations: saved, labels: userLabels };
});

export async function getLastLibraryUpdate(userId: string) {
  const [[book], [rec]] = await Promise.all([
    db.select({ updated: max(books.updatedAt), created: max(books.createdAt) }).from(books).where(eq(books.userId, userId)),
    db.select({ updated: max(recommendations.updatedAt), created: max(recommendations.createdAt) }).from(recommendations).where(eq(recommendations.userId, userId)),
  ]);
  return [book.updated, book.created, rec.updated, rec.created].filter((date): date is Date => date !== null).map((date) => date.toISOString()).sort().at(-1) ?? null;
}
