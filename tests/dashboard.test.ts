import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { getLocalDate } from '../src/lib/library/dates';

test('dashboard dates use local calendar fields, not a UTC conversion', () => {
  assert.equal(getLocalDate(new Date(2026, 0, 1, 0, 10)), '2026-01-01');
  assert.equal(getLocalDate(new Date(2026, 10, 15, 23, 59)), '2026-11-15');
});

test('dashboard edits and recommendation transitions preserve data and account isolation', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const url = process.env.TEST_DATABASE_URL!;
  assert.match(new URL(url).pathname, /_test$/);
  process.env.DATABASE_URL = url;
  const { db } = await import('../src/lib/db');
  const { users, books, recommendations } = await import('../src/lib/db/schema');
  const { createLibraryService } = await import('../src/lib/library/service');
  const { inArray } = await import('drizzle-orm');
  const a = randomUUID();
  const b = randomUUID();
  const owner = createLibraryService(a);
  const other = createLibraryService(b);
  const date = '2026-11-15';
  try {
    await db.insert(users).values([{ id: a, email: `${a}@test.invalid` }, { id: b, email: `${b}@test.invalid` }]);
    const rec = await owner.saveRecommendation({ title: 'New recommendation', author: 'Writer', reason: 'A saved reason', coverUrl: 'https://example.com/cover.jpg', synopsis: 'A synopsis' });
    await assert.rejects(other.startRecommendation(rec.recommendation.id, { date }), /not found/);
    const started = await owner.startRecommendation(rec.recommendation.id, { date });
    assert.equal(started.book.shelf, 'currently-reading');
    assert.equal(started.book.dateStarted, date);
    assert.equal(started.book.dateAdded, date);
    assert.equal(started.book.coverUrl, 'https://example.com/cover.jpg');
    assert.equal(started.book.synopsis, 'A synopsis');
    assert.equal(started.book.myRating, 0);
    assert.equal((await owner.listRecommendations({ limit: 50, offset: 0 })).recommendations.length, 0);
    const rated = await owner.updateBookState(started.book.id, { myRating: 4 });
    assert.equal(rated.book.myRating, 4);
    assert.equal(rated.book.dateStarted, date);
    assert.equal(rated.book.dateRead, null);
    const read = await owner.updateBookState(started.book.id, { shelf: 'read', effectiveDate: date });
    assert.equal(read.book.dateRead, date);
    assert.equal(read.book.myRating, 4);
    const reread = await owner.updateBookState(started.book.id, { shelf: 'currently-reading', effectiveDate: '2026-11-20' });
    assert.equal(reread.book.dateStarted, date);
    assert.equal(reread.book.dateRead, date);
    const reset = await owner.updateBookState(started.book.id, { myRating: 0, shelf: 'to-read' });
    assert.equal(reset.book.myRating, 0);
    assert.equal(reset.book.dateRead, date);
    await assert.rejects(other.updateBookState(started.book.id, { myRating: 1 }), /not found/);
    await assert.rejects(owner.updateBookState(started.book.id, { myRating: 8 }));

    const existing = await owner.saveBook({ title: 'Already here', author: 'Another writer', myRating: 5, notes: 'Keep my thoughts', shelf: 'to-read', dateAdded: '2019-01-01', dateStarted: '2020-02-03', coverUrl: 'https://example.com/original.jpg' });
    const duplicate = await owner.saveRecommendation({ title: 'already here', author: 'ANOTHER WRITER', reason: 'A reason', coverUrl: 'https://example.com/other.jpg' });
    const reused = await owner.startRecommendation(duplicate.recommendation.id, { date });
    assert.equal(reused.book.id, existing.book.id);
    assert.equal(reused.book.myRating, 5);
    assert.equal(reused.book.notes, 'Keep my thoughts');
    assert.equal(reused.book.dateAdded, '2019-01-01');
    assert.equal(reused.book.dateStarted, '2020-02-03');
    assert.equal(reused.book.coverUrl, 'https://example.com/original.jpg');

    await db.insert(books).values(Array.from({ length: 2 }, () => ({ userId: a, title: 'Ambiguous recommendation', author: 'Same', shelf: 'to-read', dateAdded: date })));
    const ambiguous = await owner.saveRecommendation({ title: 'Ambiguous recommendation', author: 'Same', reason: 'Keep until resolved' });
    await assert.rejects(owner.startRecommendation(ambiguous.recommendation.id, { date }), /more than one/i);
    assert.ok((await owner.listRecommendations({ limit: 50, offset: 0 })).recommendations.some((item) => item.id === ambiguous.recommendation.id));
    assert.equal((await owner.listBooks({ search: 'Ambiguous recommendation', limit: 50, offset: 0 })).books.length, 2);

    const concurrent = await owner.saveRecommendation({ title: 'Concurrent start', author: 'Same', reason: 'Save once' });
    const attempts = await Promise.allSettled(Array.from({ length: 2 }, () => owner.startRecommendation(concurrent.recommendation.id, { date })));
    assert.equal(attempts.filter((item) => item.status === 'fulfilled').length, 1);
    assert.equal((await owner.listBooks({ search: 'Concurrent start', limit: 50, offset: 0 })).books.length, 1);

    const deleteOnly = await owner.saveRecommendation({ title: 'Already here', author: 'Another writer', reason: 'Remove only the suggestion' });
    await assert.rejects(other.removeRecommendation(deleteOnly.recommendation.id), /not found/);
    await owner.removeRecommendation(deleteOnly.recommendation.id);
    assert.equal((await owner.getBook(existing.book.id)).notes, 'Keep my thoughts');
    assert.equal((await owner.getBook(existing.book.id)).myRating, 5);
  } finally {
    await db.delete(books).where(inArray(books.userId, [a, b]));
    await db.delete(recommendations).where(inArray(recommendations.userId, [a, b]));
    await db.delete(users).where(inArray(users.id, [a, b]));
    await db.$client.end();
  }
});
