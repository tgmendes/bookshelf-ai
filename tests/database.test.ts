import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';

const url = process.env.TEST_DATABASE_URL;

test('database operations: isolation, retry safety, pagination and token revocation', { skip: !url }, async () => {
  // Never run integration fixtures against a normal application database.
  assert.match(new URL(url!).pathname, /_test$/);
  process.env.DATABASE_URL = url;
  const { db } = await import('../src/lib/db');
  const { users, books, recommendations, apiTokens } = await import('../src/lib/db/schema');
  const { createLibraryService } = await import('../src/lib/library/service');
  const { generateToken, authenticateToken, hashToken } = await import('../src/lib/auth/apiToken');
  const { eq, inArray } = await import('drizzle-orm');
  const a = randomUUID();
  const b = randomUUID();
  const library = createLibraryService(a);
  const other = createLibraryService(b);
  try {
    await db.insert(users).values([{ id: a, email: `${a}@test.invalid` }, { id: b, email: `${b}@test.invalid` }]);
    const initial = await library.saveBook({ title: 'Dune', author: 'Frank Herbert', shelf: 'currently-reading', dateAdded: '2020-01-02', notes: 'First impression', isbn13: '9780441172719' });
    const id = initial.book.id;
    assert.equal(initial.created, true);
    assert.equal(initial.book.myRating, 0);
    assert.equal(initial.book.dateRead, null);
    assert.equal(initial.book.dateStarted, null);
    await library.saveBook({ id, dateStarted: '2026-11-01' });
    assert.equal((await library.getBook(id)).dateStarted, '2026-11-01');
    const finished = await library.saveBook({ id, shelf: 'read', myRating: 5, dateRead: '2026-11-15' });
    assert.equal(finished.book.notes, 'First impression');
    assert.equal(finished.book.dateStarted, '2026-11-01');
    assert.equal((await library.listBooks({ limit: 50, offset: 0 })).books[0].dateStarted, '2026-11-01');
    await library.saveBook({ id, dateStarted: null });
    assert.equal((await library.getBook(id)).dateStarted, null);
    assert.equal(finished.book.dateAdded, '2020-01-02');
    await library.saveBook({ id, notes: null });
    assert.equal((await library.getBook(id)).notes, null);
    assert.equal((await library.getBook(id)).dateRead, '2026-11-15');
    const duplicate = await library.saveBook({ title: ' dune ', author: 'FRANK HERBERT' });
    assert.equal(duplicate.book.id, id);
    assert.equal(duplicate.created, false);
    assert.equal(duplicate.book.myRating, 5);
    const isbnMatch = await library.saveBook({ title: 'Different edition name', author: 'Frank Herbert', isbn13: '9780441172719' });
    assert.equal(isbnMatch.book.id, id);
    const imported = await library.saveBook({ title: 'Imported title', author: 'CSV Author', goodreadsBookId: '12345', dateRead: '2019-07-01', shelf: 'read' });
    const reimported = await library.saveBook({ title: 'Imported new edition', author: 'CSV Author', goodreadsBookId: '12345' });
    assert.equal(reimported.book.id, imported.book.id);
    assert.equal(reimported.book.dateRead, '2019-07-01');
    await assert.rejects(library.saveBook({ title: 'Invalid', author: 'Test', myRating: 6 }));
    await assert.rejects(other.getBook(id), /not found/);
    await assert.rejects(other.saveBook({ id, myRating: 1 }), /not found/);
    assert.equal((await other.listBooks({ limit: 50, offset: 0 })).books.length, 0);
    assert.equal((await other.saveBook({ title: 'Dune', author: 'Frank Herbert' })).created, true);
    const retry = await Promise.all(Array.from({ length: 4 }, () => library.saveBook({ title: 'Concurrent', author: 'Same author' })));
    assert.equal(new Set(retry.map((item) => item.book.id)).size, 1);
    await db.insert(books).values([
      { userId: a, title: 'Ambiguous', author: 'Same', shelf: 'read', dateAdded: '2020-01-01' },
      { userId: a, title: 'Ambiguous', author: 'Same', shelf: 'read', dateAdded: '2020-01-01' },
    ]);
    await assert.rejects(library.saveBook({ title: 'Ambiguous', author: 'Same' }), /Multiple books match/);
    await library.saveBook({ title: '100% literal_title', author: 'Test' });
    assert.equal((await library.listBooks({ search: '%', limit: 50, offset: 0 })).books.length, 1);
    const page = await library.listBooks({ limit: 1, offset: 0 });
    assert.equal(page.nextOffset, 1);
    assert.notEqual((await library.listBooks({ limit: 1, offset: page.nextOffset! })).books[0].id, page.books[0].id);
    const rec = await library.saveRecommendation({ title: 'Foundation', author: 'Isaac Asimov', reason: 'For your interest in large-scale societies', source: 'Your assistant' });
    const updated = await library.saveRecommendation({ title: 'foundation', author: 'ISAAC ASIMOV', reason: 'Revised reason' });
    assert.equal(updated.recommendation.id, rec.recommendation.id);
    assert.equal(updated.recommendation.source, 'Your assistant');
    assert.ok(updated.recommendation.updatedAt instanceof Date);
    await assert.rejects(other.saveRecommendation({ id: rec.recommendation.id, title: 'X', author: 'Y', reason: 'Z' }), /not found/);
    await assert.rejects(other.removeRecommendation(rec.recommendation.id), /not found/);
    assert.equal((await other.listRecommendations({ limit: 50, offset: 0 })).recommendations.length, 0);
    await library.removeRecommendation(rec.recommendation.id);
    assert.equal((await library.listRecommendations({ limit: 50, offset: 0 })).recommendations.length, 0);
    const generated = generateToken();
    assert.notEqual(generated.token, generated.tokenHash);
    assert.equal(hashToken(generated.token), generated.tokenHash);
    await db.insert(apiTokens).values({ userId: a, name: 'Test', tokenHash: generated.tokenHash, prefix: generated.prefix });
    const request = new Request('http://localhost/api/mcp', { headers: { authorization: `Bearer ${generated.token}` } });
    assert.equal(await authenticateToken(request), a);
    assert.equal(await authenticateToken(new Request('http://localhost/api/mcp')), null);
    await db.delete(apiTokens).where(eq(apiTokens.tokenHash, generated.tokenHash));
    assert.equal(await authenticateToken(request), null);
  } finally {
    await db.delete(apiTokens).where(inArray(apiTokens.userId, [a, b]));
    await db.delete(books).where(inArray(books.userId, [a, b]));
    await db.delete(recommendations).where(inArray(recommendations.userId, [a, b]));
    await db.delete(users).where(inArray(users.id, [a, b]));
    await db.$client.end();
  }
});
