import assert from 'node:assert/strict';
import test from 'node:test';
import { bookInput, listInput, recommendationInput, bookStateInput, startRecommendationInput } from '../src/lib/library/validation';

test('book validation rejects unsafe or invalid values', () => {
  for (const input of [
    { title: ' ' }, { shelf: 'finished' }, { myRating: 6 }, { myRating: 3.5 },
    { dateRead: '2026-02-30' }, { dateRead: 'yesterday' }, { dateStarted: '2026-02-30' }, { dateStarted: 'yesterday' }, { pages: -1 },
    { isbn13: '123' }, { coverUrl: 'javascript:alert(1)' }, { userId: 'someone-else' },
  ]) assert.equal(bookInput.safeParse(input).success, false, JSON.stringify(input));
});

test('book validation trims names and distinguishes omitted fields from null', () => {
  assert.deepEqual(bookInput.parse({ title: ' Dune ', notes: null }), { title: 'Dune', notes: null });
  assert.deepEqual(bookInput.parse({ myRating: 0, dateRead: '2026-11-15' }), { myRating: 0, dateRead: '2026-11-15' });
  assert.deepEqual(bookInput.parse({ dateStarted: null }), { dateStarted: null });
  assert.deepEqual(bookInput.parse({ dateStarted: '2026-11-01' }), { dateStarted: '2026-11-01' });
});

test('pagination is bounded and recommendation reasons are required', () => {
  assert.deepEqual(listInput.parse({}), { limit: 50, offset: 0 });
  assert.equal(listInput.safeParse({ limit: 101 }).success, false);
  assert.equal(listInput.safeParse({ offset: -1 }).success, false);
  assert.equal(recommendationInput.safeParse({ title: 'Dune', author: 'Frank Herbert', reason: ' ' }).success, false);
});

test('dashboard updates are narrow, bounded, and require an explicit date for reading actions', () => {
  assert.deepEqual(bookStateInput.parse({ myRating: 0 }), { myRating: 0 });
  assert.equal(bookStateInput.safeParse({ myRating: 6 }).success, false);
  assert.equal(bookStateInput.safeParse({ myRating: 2.5 }).success, false);
  assert.equal(bookStateInput.safeParse({ userId: 'someone-else', myRating: 5 }).success, false);
  assert.equal(bookStateInput.safeParse({ title: 'Unrequested edit' }).success, false);
  assert.equal(bookStateInput.safeParse({}).success, false);
  assert.equal(bookStateInput.safeParse({ shelf: 'finished' }).success, false);
  assert.equal(bookStateInput.safeParse({ shelf: 'read' }).success, false);
  assert.equal(bookStateInput.safeParse({ shelf: 'read', effectiveDate: '2026-02-30' }).success, false);
  assert.equal(bookStateInput.safeParse({ shelf: 'to-read' }).success, true);
  assert.equal(bookStateInput.safeParse({ shelf: 'read', effectiveDate: '2026-11-15' }).success, true);
  assert.equal(startRecommendationInput.safeParse({}).success, false);
  assert.equal(startRecommendationInput.safeParse({ date: 'today' }).success, false);
  assert.equal(startRecommendationInput.safeParse({ date: '2026-11-15' }).success, true);
});
