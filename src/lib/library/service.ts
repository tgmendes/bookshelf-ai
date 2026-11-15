import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { books, recommendations, users, labels, bookLabels } from '@/lib/db/schema';
import { bookInput, listInput, recommendationInput, type BookInput, type ListInput, type RecommendationInput } from './validation';

function literal(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function createLibraryService(userId: string) {
  return {
    async listBooks(input: ListInput) {
      const { search, shelf, limit, offset } = listInput.parse(input);
      const rows = await db.select().from(books).where(and(
        eq(books.userId, userId),
        shelf ? eq(books.shelf, shelf) : undefined,
        search ? or(ilike(books.title, `%${literal(search)}%`), ilike(books.author, `%${literal(search)}%`)) : undefined,
      )).orderBy(desc(books.dateAdded), books.id).limit(limit + 1).offset(offset);
      return { books: rows.slice(0, limit), nextOffset: rows.length > limit ? offset + limit : null };
    },

    async getBook(id: string) {
      const [book] = await db.select().from(books).where(and(eq(books.id, id), eq(books.userId, userId)));
      if (!book) throw new Error('Book not found in your library.');
      const assignedLabels = await db.select({ id: labels.id, name: labels.name, color: labels.color })
        .from(bookLabels).innerJoin(labels, eq(bookLabels.labelId, labels.id))
        .where(and(eq(bookLabels.bookId, id), eq(labels.userId, userId)));
      return { ...book, labels: assignedLabels };
    },

    async saveBook(input: BookInput) {
      const { id, ...values } = bookInput.parse(input);
      return db.transaction(async (tx) => {
        // Serialize identity matching and insertion for this user, including retries.
        await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
        let existing;
        if (id) {
          [existing] = await tx.select().from(books).where(and(eq(books.id, id), eq(books.userId, userId)));
          if (!existing) throw new Error('Book not found in your library.');
        } else {
          if (!values.title || !values.author) throw new Error('Title and author are required for a new book.');
          const matches = await tx.select().from(books).where(and(eq(books.userId, userId), or(
            values.isbn13 ? eq(books.isbn13, values.isbn13) : undefined,
            values.goodreadsBookId ? eq(books.goodreadsBookId, values.goodreadsBookId) : undefined,
            and(ilike(books.title, literal(values.title)), ilike(books.author, literal(values.author))),
          )));
          if (matches.length > 1) throw new Error('Multiple books match. Search your library and update by id.');
          existing = matches[0];
        }
        if (existing) {
          if (Object.keys(values).length === 0) throw new Error('Supply at least one field to update.');
          const [book] = await tx.update(books).set({ ...values, updatedAt: new Date() })
            .where(and(eq(books.id, existing.id), eq(books.userId, userId))).returning();
          return { book, created: false };
        }
        const [book] = await tx.insert(books).values({
          ...values, userId, title: values.title!, author: values.author!,
          shelf: values.shelf ?? 'to-read', dateAdded: values.dateAdded ?? new Date().toISOString().slice(0, 10),
        }).returning();
        return { book, created: true };
      });
    },

    async listRecommendations(input: Pick<ListInput, 'search' | 'limit' | 'offset'>) {
      const { search, limit, offset } = listInput.parse(input);
      const rows = await db.select().from(recommendations).where(and(
        eq(recommendations.userId, userId),
        search ? or(ilike(recommendations.title, `%${literal(search)}%`), ilike(recommendations.author, `%${literal(search)}%`)) : undefined,
      )).orderBy(desc(recommendations.createdAt), recommendations.id).limit(limit + 1).offset(offset);
      return { recommendations: rows.slice(0, limit), nextOffset: rows.length > limit ? offset + limit : null };
    },

    async saveRecommendation(input: RecommendationInput) {
      const { id, ...values } = recommendationInput.parse(input);
      return db.transaction(async (tx) => {
        await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
        const matches = await tx.select().from(recommendations).where(and(eq(recommendations.userId, userId), id
          ? eq(recommendations.id, id)
          : and(ilike(recommendations.title, literal(values.title)), ilike(recommendations.author, literal(values.author)))));
        if (id && !matches[0]) throw new Error('Recommendation not found.');
        if (matches.length > 1) throw new Error('Multiple recommendations match. Update by id.');
        if (matches[0]) {
          const [recommendation] = await tx.update(recommendations).set(values)
            .where(and(eq(recommendations.id, matches[0].id), eq(recommendations.userId, userId))).returning();
          return { recommendation, created: false };
        }
        const [recommendation] = await tx.insert(recommendations).values({ ...values, userId }).returning();
        return { recommendation, created: true };
      });
    },

    async removeRecommendation(id: string) {
      const rows = await db.delete(recommendations).where(and(eq(recommendations.id, id), eq(recommendations.userId, userId)))
        .returning({ id: recommendations.id });
      if (!rows.length) throw new Error('Recommendation not found.');
      return { removed: id };
    },
  };
}

export type LibraryService = ReturnType<typeof createLibraryService>;
