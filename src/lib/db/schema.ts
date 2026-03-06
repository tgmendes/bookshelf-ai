import { pgTable, uuid, text, integer, real, date, timestamp } from 'drizzle-orm/pg-core';

export const books = pgTable('books', {
  id: uuid('id').primaryKey().defaultRandom(),
  goodreadsBookId: text('goodreads_book_id').unique(),
  isbn13: text('isbn13'),
  title: text('title').notNull(),
  author: text('author').notNull(),
  myRating: integer('my_rating').default(0),
  avgRating: real('avg_rating'),
  dateRead: date('date_read'),
  dateAdded: date('date_added').notNull(),
  shelf: text('shelf').notNull(),
  pages: integer('pages').default(0),
  yearPublished: integer('year_published'),
  bookshelves: text('bookshelves').array(),
  coverUrl: text('cover_url'),
  synopsis: text('synopsis'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const recommendations = pgTable('recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  reason: text('reason').notNull(),
  coverUrl: text('cover_url'),
  synopsis: text('synopsis'),
  createdAt: timestamp('created_at').defaultNow(),
});
