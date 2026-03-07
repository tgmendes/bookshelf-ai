import { db } from '@/lib/db';
import { books, bookLabels, labels } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { Book } from '@/lib/types';

export async function fetchUserLibraryWithLabels(userId: string): Promise<{
  library: Book[];
  labelsByBookId: Record<string, string[]>;
}> {
  const [libraryRows, labelRows] = await Promise.all([
    db.select().from(books).where(eq(books.userId, userId)).orderBy(desc(books.dateAdded)),
    db
      .select({ bookId: bookLabels.bookId, labelName: labels.name })
      .from(bookLabels)
      .innerJoin(labels, eq(bookLabels.labelId, labels.id))
      .where(eq(labels.userId, userId)),
  ]);

  const library = libraryRows.map((r) => ({
    ...r,
    myRating: r.myRating ?? 0,
    pages: r.pages ?? 0,
  })) as Book[];

  const labelsByBookId: Record<string, string[]> = {};
  for (const row of labelRows) {
    if (!labelsByBookId[row.bookId]) labelsByBookId[row.bookId] = [];
    labelsByBookId[row.bookId].push(row.labelName);
  }

  return { library, labelsByBookId };
}
