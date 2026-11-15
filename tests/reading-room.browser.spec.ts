import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const userId = randomUUID();
const sessionId = randomUUID();
const currentId = randomUUID();
const secondReadingId = randomUUID();
const thirdReadingId = randomUUID();
const olderId = randomUUID();
const otherId = randomUUID();
const foreignBookId = randomUUID();
const labelId = randomUUID();
const year = new Date().getUTCFullYear();
const artifacts = resolve('test-results/reading-room');
let database: typeof import('../src/lib/db');
let schema: typeof import('../src/lib/db/schema');
let editableBookId: string;

test.beforeAll(async ({ browser }) => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !/_test$/.test(new URL(url).pathname)) throw new Error('Use a disposable TEST_DATABASE_URL ending in _test.');
  process.env.DATABASE_URL = url;
  database = await import('../src/lib/db');
  schema = await import('../src/lib/db/schema');
  const { db } = database;
  const { users, sessions, books, recommendations, labels, bookLabels } = schema;
  await db.insert(users).values([{ id: userId, email: `${userId}@test.invalid` }, { id: otherId, email: `${otherId}@test.invalid` }]);
  await db.insert(sessions).values({ id: sessionId, userId, expiresAt: new Date(Date.now() + 3600000) });
  const titles = ['Piranesi', 'The Left Hand of Darkness', 'Project Hail Mary', 'Klara and the Sun', 'Tomorrow, and Tomorrow, and Tomorrow', 'The Overstory', 'Sea of Tranquility', 'Circe', 'A Memory Called Empire', 'Educated', 'The Remains of the Day', 'Dune'];
  const authors = ['Susanna Clarke', 'Ursula K. Le Guin', 'Andy Weir', 'Kazuo Ishiguro'];
  const rows = await db.insert(books).values(titles.map((title, index) => ({
    userId, title, author: authors[index % authors.length], myRating: index % 5 + 1, pages: 220 + index * 35,
    dateAdded: `${year}-01-01`, shelf: 'read', dateRead: `${year}-${String(index % 10 + 1).padStart(2, '0')}-14`, yearPublished: 2020,
    synopsis: 'A story of strange worlds, quiet discoveries, and the things we carry home.', notes: 'Read it in two sittings. The reveal lands because the voice is so gentle.',
  }))).returning({ id: books.id });
  editableBookId = rows[0].id;
  await db.insert(books).values([
    { id: currentId, userId, title: 'The Dispossessed', author: 'Ursula K. Le Guin', shelf: 'currently-reading', pages: 387, yearPublished: 1974, dateAdded: `${year}-11-03`, dateStarted: `${year}-11-03`, notes: 'Shevek’s two worlds keep arguing in my head. Anarres feels less like utopia every chapter, and I think that’s the point.' },
    { id: secondReadingId, userId, title: 'The Waves', author: 'Virginia Woolf', shelf: 'currently-reading', pages: 240, dateAdded: `${year}-10-01`, dateStarted: `${year}-11-10`, notes: 'A second reading note.' },
    { id: thirdReadingId, userId, title: 'The Odyssey', author: 'Homer', shelf: 'currently-reading', pages: 400, dateAdded: `${year}-09-01`, dateStarted: null, notes: null },
    { id: olderId, userId, title: 'Last year’s book', author: 'Another Author', shelf: 'read', myRating: 5, dateAdded: `${year - 1}-01-01`, dateRead: `${year - 1}-01-01` },
    { userId, title: 'A book for later', author: 'Future Author', shelf: 'to-read', dateAdded: `${year}-01-01` },
    { id: foreignBookId, userId: otherId, title: 'Private other-account book', author: 'Hidden', shelf: 'read', dateAdded: `${year}-01-01`, dateRead: `${year}-10-14`, myRating: 5 },
  ]);
  await db.insert(labels).values({ id: labelId, userId, name: 'favourites', color: '#B6ADCF' });
  await db.insert(bookLabels).values({ bookId: rows[0].id, labelId });
  await db.insert(recommendations).values([
    { userId, title: 'A Psalm for the Wild-Built', author: 'Becky Chambers', reason: 'You rated Piranesi highly for its gentleness. This is a short, hopeful story about a tea monk and a robot with the same calm.', source: 'Claude' },
    { userId, title: 'Babel', author: 'R. F. Kuang', reason: 'You keep reading books that question empire. This one uses translation to do it.' },
    { userId, title: 'The Lathe of Heaven', author: 'Ursula K. Le Guin', reason: 'More of the quiet, strange worlds you enjoyed.' },
  ]);
  await mkdir(artifacts, { recursive: true });
  // Open the supplied references in a browser, not just as source markup.
  const reference = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  for (const name of ['shelf', 'reading-year']) {
    await reference.goto(pathToFileURL(resolve(`docs/redesign/${name}.html`)).href);
    await reference.screenshot({ path: `${artifacts}/reference-${name}.png`, fullPage: true });
  }
  await reference.close();
});

test.afterAll(async () => {
  if (!database) return;
  const { eq, inArray } = await import('drizzle-orm');
  const { db } = database;
  try {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
    await db.delete(schema.books).where(inArray(schema.books.userId, [userId, otherId]));
    await db.delete(schema.recommendations).where(eq(schema.recommendations.userId, userId));
    await db.delete(schema.labels).where(eq(schema.labels.userId, userId));
    await db.delete(schema.users).where(inArray(schema.users.id, [userId, otherId]));
  } finally { await db.$client.end(); }
});

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'bookshelf_session', value: sessionId, url: baseURL! }]);
});

for (const width of [1280, 390]) {
  for (const theme of ['dark', 'light']) {
    test(`${width}px ${theme}: real pages, contrast, containment and navigation`, async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      for (const [path, name] of [['/library', 'shelf'], [`/stats?year=${year}`, 'reading-year']]) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*\bdark\b)/);
        const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
        expect(widths.scroll).toBeLessThanOrEqual(widths.viewport);
        await expect(page.getByText('Private other-account book')).toHaveCount(0);
        const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
        for (const target of await page.locator('main a, main button, main input:not([type="hidden"]), main select').all()) {
          if (!await target.isVisible()) continue;
          const bounds = await target.boundingBox();
          expect(bounds?.height, await target.getAttribute('aria-label') ?? await target.textContent() ?? 'target').toBeGreaterThanOrEqual(44);
          expect(bounds?.width).toBeGreaterThanOrEqual(44);
        }
        await page.screenshot({ path: `${artifacts}/${name}-${theme}-${width}.png`, fullPage: true });
      }
      if (width === 390) {
        await page.getByRole('button', { name: 'Open navigation' }).click();
        await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
        await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Shelf', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
      }
      expect(errors).toEqual([]);
    });
  }
}

test('dark is default, spines select details, filters and theme preferences work', async ({ page }) => {
  await page.goto('/library');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Dispossessed');
  await expect(page.getByText('Reading since 3 Nov')).toBeVisible();
  const spine = page.getByRole('button', { name: 'Piranesi by Susanna Clarke', exact: true });
  await spine.click();
  await expect(spine).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#selected-book').getByRole('heading')).toHaveText('Piranesi');
  await expect(page.locator('#selected-book').getByText('favourites', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Up next', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Up next', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Want to read', exact: true }).click();
  await expect(page.getByRole('button', { name: 'A book for later by Future Author' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Piranesi by Susanna Clarke', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Read', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search books' }).fill('Piranesi');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(spine).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dune by Kazuo Ishiguro', exact: true })).toHaveCount(0);
  await page.goto(`/stats?year=${year - 1}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(String(year - 1));
  await expect(page.getByText('Book of the year', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /Reading The Dispossessed/ })).toHaveCount(0);
  await page.goto(`/library/${currentId}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Dispossessed');
  await page.goto('/library/invalid-id');
  await expect(page.getByText('This page could not be found.')).toBeVisible();
});

test('missing start date and notes are omitted instead of inferred', async ({ page }) => {
  const { eq } = await import('drizzle-orm');
  await database.db.update(schema.books).set({ notes: null, dateStarted: null }).where(eq(schema.books.id, currentId));
  try {
    await page.goto('/library');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Dispossessed');
    await expect(page.getByText('Your note', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Reading since/)).toHaveCount(0);
    await page.goto(`/stats?year=${year}`);
    await expect(page.getByRole('img', { name: /Reading The Dispossessed/ })).toHaveCount(0);
  } finally {
    await database.db.update(schema.books).set({ notes: 'A thoughtful reading note.', dateStarted: `${year}-11-03` }).where(eq(schema.books.id, currentId));
  }
});

test('long assistant-written metadata stays inside the phone layout', async ({ page }) => {
  const { eq } = await import('drizzle-orm');
  const [recommendation] = await database.db.select().from(schema.recommendations).where(eq(schema.recommendations.userId, userId)).limit(1);
  await database.db.update(schema.books).set({ author: 'Author'.repeat(45) }).where(eq(schema.books.id, currentId));
  await database.db.update(schema.recommendations).set({ source: 'Assistant'.repeat(30) }).where(eq(schema.recommendations.id, recommendation.id));
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/library');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  } finally {
    await database.db.update(schema.books).set({ author: 'Ursula K. Le Guin' }).where(eq(schema.books.id, currentId));
    await database.db.update(schema.recommendations).set({ source: recommendation.source }).where(eq(schema.recommendations.id, recommendation.id));
  }
});

test('Reading now carousel follows date added, selects neighbours, wraps and supports keyboard navigation', async ({ page }) => {
  await page.goto('/library');
  const carousel = page.getByRole('region', { name: 'Reading now', exact: true });
  await expect(carousel.getByRole('heading', { level: 1 })).toHaveText('The Dispossessed');
  await expect(carousel.getByRole('button', { name: 'Show The Dispossessed by Ursula K. Le Guin' })).toHaveAttribute('aria-pressed', 'true');
  await expect(carousel.getByRole('status', { name: 'Reading position' })).toContainText('Book 1 of 3');
  await page.getByRole('button', { name: 'Next reading book' }).click();
  await expect(carousel.getByRole('heading', { level: 1 })).toHaveText('The Waves');
  await expect(carousel.getByText('A second reading note.', { exact: false })).toBeVisible();
  await expect(carousel.getByText('Reading since 10 Nov')).toBeVisible();
  await carousel.getByRole('button', { name: 'Show The Odyssey by Homer' }).click();
  await expect(carousel.getByRole('heading', { level: 1 })).toHaveText('The Odyssey');
  await expect(carousel.getByText('Your note', { exact: true })).toHaveCount(0);
  await expect(carousel.getByText(/Reading since/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Next reading book' }).click();
  await expect(carousel.getByRole('heading', { level: 1 })).toHaveText('The Dispossessed');
  const stage = page.getByRole('group', { name: 'Reading now book covers' });
  await stage.focus();
  await page.keyboard.press('ArrowLeft');
  const oldest = carousel.getByRole('button', { name: 'Show The Odyssey by Homer' });
  await expect(oldest).toBeFocused();
  await expect(oldest).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Home');
  await expect(carousel.getByRole('heading', { level: 1 })).toHaveText('The Dispossessed');
  await page.keyboard.press('End');
  await expect(carousel.getByRole('heading', { level: 1 })).toHaveText('The Odyssey');
  await page.keyboard.press('ArrowRight');
  await expect(carousel.getByRole('heading', { level: 1 })).toHaveText('The Dispossessed');
});

test('Reading now swipes horizontally without hijacking vertical scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/library');
  await page.waitForFunction(() => localStorage.getItem('theme') !== null);
  const stage = page.getByRole('group', { name: 'Reading now book covers' });
  const swipe = async (dx: number, dy: number) => stage.evaluate((element, { dx, dy }) => {
    const start = new Touch({ identifier: 1, target: element, clientX: 240, clientY: 220 });
    const end = new Touch({ identifier: 1, target: element, clientX: 240 + dx, clientY: 220 + dy });
    element.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [start] }));
    element.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [end] }));
  }, { dx, dy });
  await swipe(-120, 10);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Waves');
  await swipe(5, 120);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Waves');
  await swipe(120, 10);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Dispossessed');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('Reading now handles two, one and no books without duplicates or empty controls', async ({ page }) => {
  const { eq, inArray } = await import('drizzle-orm');
  const { db } = database;
  try {
    await db.update(schema.books).set({ shelf: 'to-read' }).where(eq(schema.books.id, thirdReadingId));
    await page.goto('/library');
    const carousel = page.getByRole('region', { name: 'Reading now', exact: true });
    await expect(carousel.locator('.coverflow-book')).toHaveCount(2);
    await page.getByRole('button', { name: 'Next reading book' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Waves');
    await db.update(schema.books).set({ shelf: 'to-read' }).where(eq(schema.books.id, secondReadingId));
    await page.reload();
    await expect(carousel.locator('.coverflow-book')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Next reading book' })).toHaveCount(0);
    await db.update(schema.books).set({ shelf: 'to-read' }).where(eq(schema.books.id, currentId));
    await page.reload();
    await expect(carousel).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('A life in books.');
  } finally {
    await db.update(schema.books).set({ shelf: 'currently-reading' }).where(inArray(schema.books.id, [currentId, secondReadingId, thirdReadingId]));
  }
});

test('Reading now respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/library');
  const cover = page.getByRole('button', { name: 'Show The Dispossessed by Ursula K. Le Guin' });
  expect(await cover.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
  await page.getByRole('button', { name: 'Next reading book' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Waves');
});

test('many reading books stay bounded and keyboard jumps focus previously hidden covers', async ({ page }) => {
  const { inArray } = await import('drizzle-orm');
  const ids = Array.from({ length: 4 }, () => randomUUID());
  await database.db.insert(schema.books).values(ids.map((id, index) => ({
    id, userId, title: `Earlier reading ${index + 1}`, author: 'Test Author', shelf: 'currently-reading',
    dateAdded: `${year}-0${8 - index}-01`, pages: 300,
  })));
  try {
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.goto('/library');
    const carousel = page.getByRole('region', { name: 'Reading now', exact: true });
    await expect(carousel.locator('.coverflow-book')).toHaveCount(7);
    await expect(carousel.locator('.coverflow-book:visible')).toHaveCount(5);
    for (const target of await carousel.locator('.coverflow-book:visible').all()) {
      expect((await target.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('group', { name: 'Reading now book covers' }).focus();
    await page.keyboard.press('End');
    const oldest = carousel.getByRole('button', { name: 'Show Earlier reading 4 by Test Author' });
    await expect(oldest).toBeFocused();
    await expect(oldest).toHaveAttribute('aria-pressed', 'true');
    await expect(carousel.getByRole('heading', { level: 1 })).toHaveText('Earlier reading 4');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(carousel.locator('.coverflow-book:visible')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  } finally {
    await database.db.delete(schema.books).where(inArray(schema.books.id, ids));
  }
});

test('book rating and status can be edited, cleared and cancelled without losing notes or dates', async ({ page }) => {
  const { eq } = await import('drizzle-orm');
  const { db } = database;
  const [original] = await db.select().from(schema.books).where(eq(schema.books.id, editableBookId));
  try {
    await page.goto(`/library/${editableBookId}`);
    const detail = page.getByTestId('book-details');
    const edit = detail.getByRole('button', { name: 'Edit rating & status' });
    await edit.click();
    const form = page.getByRole('form', { name: 'Edit Piranesi', exact: true });
    await expect(form.getByRole('combobox', { name: 'Your rating' })).toBeFocused();
    await form.getByRole('combobox', { name: 'Your rating' }).selectOption('5');
    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(edit).toBeFocused();
    expect((await db.select().from(schema.books).where(eq(schema.books.id, editableBookId)))[0].myRating).toBe(original.myRating);
    await edit.click();
    await form.getByRole('combobox', { name: 'Your rating' }).selectOption('4');
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(detail.locator('[aria-label="4 of 5 stars"]')).toBeVisible();
    const saved = (await db.select().from(schema.books).where(eq(schema.books.id, editableBookId)))[0];
    expect(saved.shelf).toBe(original.shelf);
    expect(saved.dateRead).toBe(original.dateRead);
    expect(saved.notes).toBe(original.notes);
    await edit.click();
    await form.getByRole('combobox', { name: 'Your rating' }).selectOption('0');
    await form.getByRole('combobox', { name: 'Reading status' }).selectOption('currently-reading');
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(detail.getByText('Reading now', { exact: true })).toBeVisible();
    await expect(detail.getByText('Unrated', { exact: true })).toBeVisible();
    const reading = (await db.select().from(schema.books).where(eq(schema.books.id, editableBookId)))[0];
    expect(reading.dateStarted).not.toBeNull();
    expect(reading.dateRead).toBe(original.dateRead);
    await edit.click();
    await form.getByRole('combobox', { name: 'Reading status' }).selectOption('to-read');
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(detail.getByText('Want to read', { exact: true })).toBeVisible();
  } finally {
    await db.update(schema.books).set({ myRating: original.myRating, shelf: original.shelf, dateStarted: original.dateStarted, dateRead: original.dateRead, updatedAt: original.updatedAt }).where(eq(schema.books.id, editableBookId));
  }
});

test('book editor keeps drafts after errors, supports retry and remains accessible on phones', async ({ page }) => {
  const { eq } = await import('drizzle-orm');
  const [original] = await database.db.select().from(schema.books).where(eq(schema.books.id, editableBookId));
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/library/${editableBookId}`);
    await page.getByRole('button', { name: 'Edit rating & status' }).click();
    const form = page.getByRole('form', { name: 'Edit Piranesi', exact: true });
    await form.getByRole('combobox', { name: 'Your rating' }).selectOption('3');
    await page.route(`**/api/books/${editableBookId}`, (route) => route.fulfill({ status: 500, json: { error: 'Temporary save failure.' } }));
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(form.getByRole('alert')).toHaveText('Temporary save failure.');
    await expect(form.getByRole('combobox', { name: 'Your rating' })).toHaveValue('3');
    expect((await database.db.select().from(schema.books).where(eq(schema.books.id, editableBookId)))[0].myRating).toBe(original.myRating);
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: `${artifacts}/book-editor-dark-390.png`, fullPage: true });
    await page.unroute(`**/api/books/${editableBookId}`);
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByTestId('book-details').locator('[aria-label="3 of 5 stars"]')).toBeVisible();
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await page.getByRole('button', { name: 'Edit rating & status' }).click();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `${artifacts}/book-editor-light-390.png`, fullPage: true });
  } finally {
    await database.db.update(schema.books).set({ myRating: original.myRating, updatedAt: original.updatedAt }).where(eq(schema.books.id, editableBookId));
  }
});

test('starting a recommendation moves it to the shared library', async ({ page }) => {
  const { eq, and } = await import('drizzle-orm');
  const id = randomUUID();
  const title = 'Startable recommendation';
  await database.db.insert(schema.recommendations).values({ id, userId, title, author: 'New Writer', reason: 'A recommendation to start', synopsis: 'Preserved synopsis' });
  try {
    await page.goto('/library#next');
    const card = page.locator('#next article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await card.getByRole('button', { name: 'Start reading', exact: true }).click();
    await expect(page).toHaveURL(/\/library\/[a-f0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    const [book] = await database.db.select().from(schema.books).where(and(eq(schema.books.userId, userId), eq(schema.books.title, title)));
    expect(book.shelf).toBe('currently-reading');
    expect(book.dateStarted).not.toBeNull();
    expect(book.synopsis).toBe('Preserved synopsis');
    expect(await database.db.select().from(schema.recommendations).where(eq(schema.recommendations.id, id))).toHaveLength(0);
    await page.getByRole('link', { name: /Back to the shelf/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.locator('#next').getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  } finally {
    await database.db.delete(schema.recommendations).where(eq(schema.recommendations.id, id));
    await database.db.delete(schema.books).where(and(eq(schema.books.userId, userId), eq(schema.books.title, title)));
  }
});

test('start from a recommendation detail page reuses an existing book and preserves its rating', async ({ page }) => {
  const { eq } = await import('drizzle-orm');
  const [original] = await database.db.select().from(schema.books).where(eq(schema.books.id, editableBookId));
  const id = randomUUID();
  await database.db.insert(schema.recommendations).values({ id, userId, title: 'piranesi', author: 'SUSANNA CLARKE', reason: 'Start the existing book' });
  try {
    await page.goto(`/library/${id}?rec=1`);
    await page.getByRole('button', { name: 'Start reading' }).click();
    await expect(page).toHaveURL(new RegExp(`/library/${editableBookId}$`));
    await expect(page.getByTestId('book-details').getByText('Reading now', { exact: true })).toBeVisible();
    const [saved] = await database.db.select().from(schema.books).where(eq(schema.books.id, editableBookId));
    expect(saved.myRating).toBe(original.myRating);
    expect(saved.notes).toBe(original.notes);
    expect(saved.dateAdded).toBe(original.dateAdded);
  } finally {
    await database.db.delete(schema.recommendations).where(eq(schema.recommendations.id, id));
    await database.db.update(schema.books).set({ shelf: original.shelf, dateStarted: original.dateStarted, updatedAt: original.updatedAt }).where(eq(schema.books.id, editableBookId));
  }
});

test('recommendation deletion requires confirmation, can be cancelled and never deletes the book', async ({ page }) => {
  const { eq } = await import('drizzle-orm');
  const id = randomUUID();
  await database.db.insert(schema.recommendations).values({ id, userId, title: 'Piranesi', author: 'Susanna Clarke', reason: 'Delete only this suggestion' });
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/library#next');
    const card = page.locator('#next article').filter({ has: page.getByRole('heading', { name: 'Piranesi', exact: true }) });
    await card.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(card.getByRole('button', { name: 'Confirm delete' })).toBeFocused();
    await card.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(card.getByRole('button', { name: 'Delete', exact: true })).toBeFocused();
    expect(await database.db.select().from(schema.recommendations).where(eq(schema.recommendations.id, id))).toHaveLength(1);
    await card.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.route(`**/api/recommendations/${id}`, (route) => route.fulfill({ status: 500, json: { error: 'Temporary delete failure.' } }));
    await card.getByRole('button', { name: 'Confirm delete' }).click();
    await expect(card.getByRole('alert')).toHaveText('Temporary delete failure.');
    expect(await database.db.select().from(schema.recommendations).where(eq(schema.recommendations.id, id))).toHaveLength(1);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `${artifacts}/recommendation-delete-dark-390.png`, fullPage: true });
    await page.unroute(`**/api/recommendations/${id}`);
    await card.getByRole('button', { name: 'Confirm delete' }).click();
    await expect(card).toHaveCount(0);
    expect(await database.db.select().from(schema.books).where(eq(schema.books.id, editableBookId))).toHaveLength(1);
  } finally { await database.db.delete(schema.recommendations).where(eq(schema.recommendations.id, id)); }
});

test('dashboard mutation endpoints reject invalid data, foreign accounts and cross-origin writes', async ({ page, playwright, baseURL }) => {
  const { eq } = await import('drizzle-orm');
  const recId = randomUUID();
  await database.db.insert(schema.recommendations).values({ id: recId, userId: otherId, title: 'Private suggestion', author: 'Hidden', reason: 'Never change this' });
  try {
    expect((await page.request.patch(`/api/books/${editableBookId}`, { data: { myRating: 6 } })).status()).toBe(400);
    expect((await page.request.patch(`/api/books/${editableBookId}`, { data: { shelf: 'read' } })).status()).toBe(400);
    expect((await page.request.patch(`/api/books/${editableBookId}`, { data: { userId: otherId, myRating: 5 } })).status()).toBe(400);
    expect((await page.request.patch('/api/books/not-a-uuid', { data: { myRating: 3 } })).status()).toBe(400);
    expect((await page.request.patch(`/api/books/${foreignBookId}`, { data: { myRating: 1 } })).status()).toBe(404);
    expect((await page.request.post(`/api/recommendations/${recId}/start-reading`, { data: { date: `${year}-11-15` } })).status()).toBe(404);
    expect((await page.request.delete(`/api/recommendations/${recId}`)).status()).toBe(404);
    expect((await page.request.patch(`/api/books/${editableBookId}`, { data: { myRating: 1 }, headers: { origin: 'https://evil.test' } })).status()).toBe(403);
    const anonymous = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { cookie: `bookshelf_session=${randomUUID()}` } });
    try { expect((await anonymous.patch(`/api/books/${editableBookId}`, { data: { myRating: 1 } })).status()).toBe(401); } finally { await anonymous.dispose(); }
    expect((await database.db.select().from(schema.books).where(eq(schema.books.id, foreignBookId)))[0].myRating).toBe(5);
    expect(await database.db.select().from(schema.recommendations).where(eq(schema.recommendations.id, recId))).toHaveLength(1);
  } finally { await database.db.delete(schema.recommendations).where(eq(schema.recommendations.id, recId)); }
});
