import { pgTable, uuid, text, integer, real, date, timestamp, unique, boolean } from 'drizzle-orm/pg-core';

// ── Auth tables ──

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').default('user').notNull(),
  aiUnlimited: boolean('ai_unlimited').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const magicLinks = pgTable('magic_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── Data tables ──

export const books = pgTable('books', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  goodreadsBookId: text('goodreads_book_id'),
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
}, (t) => [
  unique('books_goodreads_user_unique').on(t.goodreadsBookId, t.userId),
]);

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  date: date('date').notNull(),
  count: integer('count').notNull().default(0),
}, (t) => [
  unique('ai_usage_user_date_unique').on(t.userId, t.date),
]);

export const recommendations = pgTable('recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  author: text('author').notNull(),
  reason: text('reason').notNull(),
  coverUrl: text('cover_url'),
  synopsis: text('synopsis'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const labels = pgTable('labels', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  color: text('color').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  unique('labels_user_name_unique').on(t.userId, t.name),
]);

export const bookLabels = pgTable('book_labels', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  labelId: uuid('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  unique('book_labels_book_label_unique').on(t.bookId, t.labelId),
]);

export const siteConfig = pgTable('site_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
