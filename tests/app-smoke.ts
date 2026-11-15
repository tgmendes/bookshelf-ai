import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { eq, inArray } from 'drizzle-orm';

async function main() {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  const appUrl = process.env.TEST_APP_URL;
  assert.ok(databaseUrl && appUrl, 'Set TEST_DATABASE_URL and TEST_APP_URL; the app must use the same disposable database.');
  assert.match(new URL(databaseUrl).pathname, /_test$/);
  process.env.DATABASE_URL = databaseUrl;
  const { db } = await import('../src/lib/db');
  const { users, sessions, books, recommendations, apiTokens } = await import('../src/lib/db/schema');
  const userId = randomUUID();
  const otherId = randomUUID();
  const sessionId = randomUUID();
  const otherSessionId = randomUUID();
  const client = new Client({ name: 'http-smoke', version: '1.0.0' });
  const cookie = `bookshelf_session=${sessionId}`;
  async function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (!headers.has('cookie')) headers.set('cookie', cookie);
    return fetch(`${appUrl}${path}`, { ...init, headers, redirect: 'manual' });
  }
  try {
    await db.insert(users).values([
      { id: userId, email: `${userId}@test.invalid` },
      { id: otherId, email: `${otherId}@test.invalid` },
    ]);
    await db.insert(sessions).values([
      { id: sessionId, userId, expiresAt: new Date(Date.now() + 60000) },
      { id: otherSessionId, userId: otherId, expiresAt: new Date(Date.now() + 60000) },
    ]);
    const unauthorized = await fetch(`${appUrl}/api/mcp`, { method: 'POST', redirect: 'manual' });
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.headers.get('location'), null);
    const created = await request('/api/tokens', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Smoke assistant' }),
    });
    assert.equal(created.status, 201);
    const token = await created.json();
    assert.ok(token.token.startsWith('os_'));
    assert.equal(token.tokenHash, undefined);
    const listed = await (await request('/api/tokens')).json();
    assert.equal(listed[0].token, undefined);
    assert.equal(listed[0].tokenHash, undefined);
    const otherRevoke = await request(`/api/tokens/${token.id}`, { method: 'DELETE', headers: { cookie: `bookshelf_session=${otherSessionId}` } });
    assert.deepEqual(await otherRevoke.json(), { revoked: false });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${appUrl}/api/mcp`), {
      requestInit: { headers: { authorization: `Bearer ${token.token}` } },
    }));
    const saved = await client.callTool({ name: 'save_book', arguments: {
      title: 'Smoke Book', author: 'Test Author', shelf: 'read', myRating: 4,
      dateRead: '2026-11-15', dateStarted: '2026-11-01', notes: 'A memorable ending.',
    } });
    assert.equal(saved.isError, undefined);
    const savedData = JSON.parse((saved.content as Array<{ text: string }>)[0].text);
    assert.equal(savedData.book.dateStarted, '2026-11-01');
    const rated = await request(`/api/books/${savedData.book.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ myRating: 5 }) });
    assert.equal(rated.status, 200);
    const afterManualEdit = await client.callTool({ name: 'get_book', arguments: { id: savedData.book.id } });
    assert.equal(JSON.parse((afterManualEdit.content as Array<{ text: string }>)[0].text).myRating, 5);
    const recommendation = await client.callTool({ name: 'save_recommendation', arguments: {
      title: 'Smoke Recommendation', author: 'Another Author', reason: 'Because you liked the ending.', source: 'Smoke assistant',
    } });
    assert.equal(recommendation.isError, undefined);
    const recData = JSON.parse((recommendation.content as Array<{ text: string }>)[0].text);
    const library = await request('/library');
    assert.equal(library.status, 200);
    const libraryHtml = await library.text();
    assert.match(libraryHtml, /Smoke Book/);
    assert.doesNotMatch(libraryHtml, /Suggest Labels|ImportZone|ChatBubble|Search Books/);
    const detail = await request(`/library/${savedData.book.id}`);
    assert.equal(detail.status, 200);
    assert.match(await detail.text(), /A memorable ending/);
    const legacyRecs = await request('/library?shelf=next-read');
    assert.equal(legacyRecs.status, 307);
    assert.equal(legacyRecs.headers.get('location'), '/library#next');
    const recs = await request('/library#next');
    assert.equal(recs.status, 200);
    assert.match(await recs.text(), /Smoke Recommendation/);
    const recDetail = await request(`/library/${recData.recommendation.id}?rec=1`);
    assert.equal(recDetail.status, 200);
    const recHtml = await recDetail.text();
    assert.match(recHtml, /Because you liked the ending/);
    assert.match(recHtml, /Smoke assistant/);
    const settings = await request('/settings');
    assert.equal(settings.status, 200);
    assert.match(await settings.text(), /Connect your assistant/);
    const status = await request(`/api/books/${savedData.book.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shelf: 'currently-reading', effectiveDate: '2026-11-15' }) });
    assert.equal(status.status, 200);
    const retained = await status.json();
    assert.equal(retained.book.dateStarted, '2026-11-01');
    assert.equal(retained.book.dateRead, '2026-11-15');
    for (const shelf of ['paused', 'abandoned']) {
      const updated = await request(`/api/books/${savedData.book.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shelf }) });
      assert.equal(updated.status, 200);
      const mcpList = await client.callTool({ name: 'list_books', arguments: { shelf } });
      assert.equal(mcpList.isError, undefined);
      const listedBooks = JSON.parse((mcpList.content as Array<{ text: string }>)[0].text).books;
      assert.equal(listedBooks.length, 1);
      assert.equal(listedBooks[0].id, savedData.book.id);
      assert.equal(listedBooks[0].shelf, shelf);
      assert.equal(listedBooks[0].dateStarted, '2026-11-01');
      assert.equal(listedBooks[0].dateRead, '2026-11-15');
      assert.equal(listedBooks[0].myRating, 5);
      const mcpSave = await client.callTool({ name: 'save_book', arguments: { id: savedData.book.id, shelf } });
      assert.equal(mcpSave.isError, undefined);
      const updatedPage = await request(`/library/${savedData.book.id}`);
      assert.match(await updatedPage.text(), new RegExp(shelf === 'paused' ? 'Paused' : 'Abandoned'));
    }
    const started = await request(`/api/recommendations/${recData.recommendation.id}/start-reading`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: '2026-11-15' }) });
    assert.equal(started.status, 200);
    const startedData = await started.json();
    const mcpStarted = await client.callTool({ name: 'get_book', arguments: { id: startedData.book.id } });
    assert.equal(JSON.parse((mcpStarted.content as Array<{ text: string }>)[0].text).shelf, 'currently-reading');
    const recommendationsAfterStart = await client.callTool({ name: 'list_recommendations', arguments: {} });
    assert.equal(JSON.parse((recommendationsAfterStart.content as Array<{ text: string }>)[0].text).recommendations.length, 0);
    const extraRec = await client.callTool({ name: 'save_recommendation', arguments: { title: 'Smoke delete only', author: 'Another Author', reason: 'Delete this suggestion only' } });
    const extraId = JSON.parse((extraRec.content as Array<{ text: string }>)[0].text).recommendation.id;
    assert.equal((await request(`/api/recommendations/${extraId}`, { method: 'DELETE' })).status, 200);
    const recommendationsAfterDelete = await client.callTool({ name: 'list_recommendations', arguments: {} });
    assert.equal(JSON.parse((recommendationsAfterDelete.content as Array<{ text: string }>)[0].text).recommendations.length, 0);
    const revoked = await request(`/api/tokens/${token.id}`, { method: 'DELETE' });
    assert.deepEqual(await revoked.json(), { revoked: true });
    const denied = await fetch(`${appUrl}/api/mcp`, { method: 'POST', headers: { authorization: `Bearer ${token.token}` } });
    assert.equal(denied.status, 401);
    console.log('HTTP smoke passed: MCP and dashboard edits share data, recommendation start/delete, token lifecycle/isolation, and rendered pages.');
  } finally {
    await client.close();
    await db.delete(apiTokens).where(inArray(apiTokens.userId, [userId, otherId]));
    await db.delete(sessions).where(inArray(sessions.id, [sessionId, otherSessionId]));
    await db.delete(books).where(eq(books.userId, userId));
    await db.delete(recommendations).where(eq(recommendations.userId, userId));
    await db.delete(users).where(inArray(users.id, [userId, otherId]));
    await db.$client.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
