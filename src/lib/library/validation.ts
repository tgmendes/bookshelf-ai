import { z } from 'zod';
import { shelfValues } from '../types';

const text = (max: number) => z.string().trim().min(1).max(max);
const date = z.iso.date();
const url = z.url().max(2000).refine((value) => /^https?:\/\//.test(value), 'Use an HTTP(S) URL');

export const listInput = z.object({
  search: text(300).optional(),
  shelf: z.enum(shelfValues).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
}).strict();

export const bookInput = z.object({
  id: z.uuid().optional(),
  title: text(500).optional(),
  author: text(300).optional(),
  goodreadsBookId: text(100).nullable().optional(),
  isbn13: z.string().regex(/^\d{13}$/).nullable().optional(),
  shelf: z.enum(shelfValues).optional(),
  myRating: z.number().int().min(0).max(5).nullable().optional(),
  dateRead: date.nullable().optional(),
  dateStarted: date.nullable().optional(),
  dateAdded: date.optional(),
  pages: z.number().int().min(0).max(100000).nullable().optional(),
  yearPublished: z.number().int().min(1).max(9999).nullable().optional(),
  avgRating: z.number().min(0).max(5).nullable().optional(),
  bookshelves: z.array(text(100)).max(50).nullable().optional(),
  coverUrl: url.nullable().optional(),
  synopsis: z.string().max(20000).nullable().optional(),
  notes: z.string().max(20000).nullable().optional(),
}).strict();

export const recommendationInput = z.object({
  id: z.uuid().optional(),
  title: text(500),
  author: text(300),
  reason: text(10000),
  source: text(300).nullable().optional(),
  coverUrl: url.nullable().optional(),
  synopsis: z.string().max(20000).nullable().optional(),
}).strict();

export type BookInput = z.infer<typeof bookInput>;
export type RecommendationInput = z.infer<typeof recommendationInput>;
export type ListInput = z.infer<typeof listInput>;

export const bookStateInput = z.object({
  myRating: z.number().int().min(0).max(5).optional(),
  shelf: z.enum(shelfValues).optional(),
  effectiveDate: date.optional(),
}).strict()
  .refine((value) => value.myRating !== undefined || value.shelf !== undefined, 'Supply a rating or status.')
  .refine((value) => (value.shelf !== 'read' && value.shelf !== 'currently-reading') || !!value.effectiveDate, 'Supply the date of this reading action.');

export const startRecommendationInput = z.object({ date }).strict();
export type BookStateInput = z.infer<typeof bookStateInput>;
export type StartRecommendationInput = z.infer<typeof startRecommendationInput>;
