import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const userId = randomUUID();
const sessionId = randomUUID();
const currentId = randomUUID();
const olderId = randomUUID();
const otherId = randomUUID();
const labelId = randomUUID();
const year = new Date().getUTCFullYear();
const artifacts = resolve('test-results/reading-room');
let database: typeof import('../src/lib/db');
let schema: typeof import('../src/lib/db/schema');

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
  await db.insert(books).values([
    { id: currentId, userId, title: 'The Dispossessed', author: 'Ursula K. Le Guin', shelf: 'currently-reading', pages: 387, yearPublished: 1974, dateAdded: `${year}-11-03`, dateStarted: `${year}-11-03`, notes: 'Shevek’s two worlds keep arguing in my head. Anarres feels less like utopia every chapter, and I think that’s the point.' },
    { id: olderId, userId, title: 'Last year’s book', author: 'Another Author', shelf: 'read', myRating: 5, dateAdded: `${year - 1}-01-01`, dateRead: `${year - 1}-01-01` },
    { userId, title: 'A book for later', author: 'Future Author', shelf: 'to-read', dateAdded: `${year}-01-01` },
    { userId: otherId, title: 'Private other-account book', author: 'Hidden', shelf: 'read', dateAdded: `${year}-01-01`, dateRead: `${year}-10-14`, myRating: 5 },
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
