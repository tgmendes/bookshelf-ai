import assert from 'node:assert/strict';
import test from 'node:test';
import { getBookPastel, getSpineSize, getMiniSpineHeight } from '../src/lib/coverGradients';
import { getReadingYear, filterShelf, selectDefaultBook, formatBookDate, formatRelativeTime, getReadingNowBooks, getCarouselOffset } from '../src/lib/reading-room';
import type { ReadingBook } from '../src/lib/types';

function book(id: string, values: Partial<ReadingBook> = {}): ReadingBook {
  return { id, goodreadsBookId: null, title: id, author: 'Author', myRating: 4, avgRating: null,
    dateRead: '2026-01-01', dateStarted: null, dateAdded: '2026-01-01', shelf: 'read', pages: 200,
    yearPublished: null, bookshelves: null, coverUrl: null, synopsis: null, notes: null,
    updatedAt: null, labels: [], ...values };
}

test('pastels are stable by ID and spine dimensions are bounded', () => {
  assert.equal(getBookPastel('stable-id'), getBookPastel('stable-id'));
  assert.ok(['sage', 'blush', 'butter', 'lavender', 'sky', 'peach'].includes(getBookPastel('stable-id')));
  assert.deepEqual(getSpineSize(0), { height: 210, width: 44 });
  assert.deepEqual(getSpineSize(2000), { height: 280, width: 70 });
  assert.ok(getSpineSize(500).height > getSpineSize(100).height);
  assert.equal(getMiniSpineHeight(0), 50);
  assert.equal(getMiniSpineHeight(10000), 140);
});

test('reading year uses finished dates, rated books, and distinct authors only', () => {
  const books = [book('a', { dateRead: '2026-01-01', myRating: 5, labels: [{ id: 'l', name: 'fantasy', color: '#000000' }] }),
    book('b', { dateRead: '2026-12-31', myRating: 0, pages: 300 }),
    book('c', { dateRead: '2025-12-31', myRating: 1 }),
    book('d', { shelf: 'currently-reading', author: 'Other', dateRead: null, dateStarted: '2026-11-01' }),
    book('e', { dateRead: null }), book('f', { dateRead: '2026-02-01', author: 'Second', pages: 0, myRating: 3 })];
  const stats = getReadingYear(books, 2026, 2026);
  assert.equal(stats.totalBooks, 3);
  assert.equal(stats.totalPages, 500);
  assert.equal(stats.averageRating, 4);
  assert.equal(stats.authorCount, 2);
  assert.equal(stats.months[10].reading.length, 1);
  assert.equal(stats.months[11].books.length, 1);
  assert.equal(stats.longest?.id, 'b');
  assert.equal(stats.shortest?.id, 'a');
  assert.equal(stats.topLabel?.name, 'fantasy');
  assert.deepEqual(stats.years, [2025, 2026]);
});

test('year highlights break rating ties by latest read date, and historical charts omit reading-now', () => {
  const books = [book('older', { myRating: 5, dateRead: '2025-02-01' }),
    book('newer', { myRating: 5, dateRead: '2025-03-01' }),
    book('reading', { shelf: 'currently-reading', dateStarted: '2025-03-01' })];
  const stats = getReadingYear(books, 2025, 2026);
  assert.equal(stats.bookOfYear?.id, 'newer');
  assert.equal(stats.months.flatMap((month) => month.reading).length, 0);
  const empty = getReadingYear([], 2026, 2026);
  assert.equal(empty.averageRating, null);
  assert.equal(empty.bookOfYear, null);
  assert.equal(empty.busiestMonth, null);
  assert.equal(empty.topLabel, null);
});

test('shelf filtering preserves label/search/sort behavior and default selection uses the latest read date', () => {
  const a = book('a', { title: 'Dune', myRating: 5, dateRead: '2026-01-01', labels: [{ id: 'l', name: 'sci-fi', color: '#000000' }] });
  const b = book('b', { title: 'Piranesi', dateRead: '2026-10-01', myRating: 4 });
  const reading = book('reading', { shelf: 'currently-reading' });
  assert.equal(selectDefaultBook([a, b])?.id, 'b');
  assert.deepEqual(filterShelf([a, b, reading], { shelf: 'read', label: 'l', search: 'dUnE' }).map((item) => item.id), ['a']);
  assert.deepEqual(filterShelf([b, a], { sort: 'myRating' }).map((item) => item.id), ['a', 'b']);
  assert.equal(filterShelf([a, b, reading], {}).length, 2);
  assert.equal(selectDefaultBook([]), null);
});

test('date-only formatting is timezone-safe and relative time has useful boundaries', () => {
  assert.equal(formatBookDate('2026-01-01'), '1 Jan');
  assert.equal(formatBookDate(null), null);
  assert.equal(formatRelativeTime('2026-11-15T10:00:00Z', '2026-11-15T12:00:00Z'), '2 hours ago');
  assert.equal(formatRelativeTime('2026-11-15T12:00:30Z', '2026-11-15T12:00:00Z'), 'just now');
});

test('Reading now is newest-added first, never ordered by reading start or edits', () => {
  const books = [
    book('old', { shelf: 'currently-reading', dateAdded: '2026-01-01', dateStarted: '2026-12-01', updatedAt: '2026-12-01T00:00:00Z' }),
    book('new', { shelf: 'currently-reading', dateAdded: '2026-11-01', dateStarted: null }),
    book('finished', { shelf: 'read', dateAdded: '2026-12-01' }),
    book('a', { shelf: 'currently-reading', dateAdded: '2026-06-01' }),
    book('b', { shelf: 'currently-reading', dateAdded: '2026-06-01' }),
  ];
  assert.deepEqual(getReadingNowBooks(books).map((item) => item.id), ['new', 'a', 'b', 'old']);
  assert.equal(books[0].id, 'old');
  assert.deepEqual(getReadingNowBooks([]), []);
});

test('carousel neighbours wrap without duplicating the two-book case', () => {
  assert.equal(getCarouselOffset(0, 0, 1), 0);
  assert.deepEqual([0, 1].map((index) => getCarouselOffset(index, 0, 2)), [0, 1]);
  assert.deepEqual([0, 1].map((index) => getCarouselOffset(index, 1, 2)), [-1, 0]);
  assert.equal(getCarouselOffset(4, 0, 5), -1);
  assert.equal(getCarouselOffset(0, 4, 5), 1);
  assert.deepEqual([0, 1, 2, 3, 4].map((index) => getCarouselOffset(index, 2, 5)), [-2, -1, 0, 1, 2]);
});

test('paused and abandoned stay filterable but are excluded from finished totals and Reading now', () => {
  const books = [book('finished'), book('paused', { shelf: 'paused', dateStarted: '2026-01-01' }),
    book('abandoned', { shelf: 'abandoned', dateStarted: '2026-01-01', dateRead: '2025-01-01' })];
  assert.deepEqual(filterShelf(books, { shelf: 'paused' }).map((item) => item.id), ['paused']);
  assert.deepEqual(filterShelf(books, { shelf: 'abandoned' }).map((item) => item.id), ['abandoned']);
  assert.equal(filterShelf(books, { shelf: 'all' }).length, 3);
  assert.deepEqual(getReadingNowBooks(books), []);
  const stats = getReadingYear(books, 2026, 2026);
  assert.equal(stats.totalBooks, 1);
  assert.equal(stats.totalPages, 200);
  assert.equal(stats.months.flatMap((month) => month.reading).length, 0);
  assert.deepEqual(stats.years, [2026]);
});
