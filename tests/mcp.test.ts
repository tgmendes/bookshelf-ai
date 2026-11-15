import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMcpServer } from '../src/lib/mcp/server';
import { handleMcpRequest } from '../src/lib/mcp/transport';
import type { LibraryService } from '../src/lib/library/service';

function harness() {
  const calls: unknown[] = [];
  const service = {
    listBooks: async (input: unknown) => ({ books: [], nextOffset: null, input }),
    getBook: async () => { throw new Error('Book not found in your library.'); },
    saveBook: async (input: unknown) => { calls.push(input); return { created: true }; },
    listRecommendations: async () => ({ recommendations: [], nextOffset: null }),
    saveRecommendation: async () => ({ created: true }),
    removeRecommendation: async () => ({ removed: true }),
  } as unknown as LibraryService;
  const users: string[] = [];
  const handle = (request: Request) => handleMcpRequest(request, {
    authenticate: async (req) => req.headers.get('authorization') === 'Bearer valid' ? 'user-a' : null,
    createServer: (userId) => { users.push(userId); return createMcpServer(service); },
  });
  return { handle, calls, users };
}

test('MCP returns HTTP auth errors instead of login redirects, and rejects foreign origins', async () => {
  const { handle, users } = harness();
  const denied = await handle(new Request('https://openshelf.test/api/mcp', { method: 'POST' }));
  assert.equal(denied.status, 401);
  assert.match(denied.headers.get('www-authenticate')!, /Bearer/);
  assert.equal(denied.headers.get('location'), null);
  const foreign = await handle(new Request('https://openshelf.test/api/mcp', {
    method: 'POST', headers: { authorization: 'Bearer valid', origin: 'https://evil.test' },
  }));
  assert.equal(foreign.status, 403);
  assert.equal(users.length, 0);
  const get = await handle(new Request('https://openshelf.test/api/mcp', { headers: { authorization: 'Bearer valid' } }));
  assert.equal(get.status, 405);
});

test('official MCP client initializes, discovers schemas, reads and writes via stateless HTTP', async () => {
  const { handle, calls, users } = harness();
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL('https://openshelf.test/api/mcp'), {
    requestInit: { headers: { authorization: 'Bearer valid' } },
    fetch: async (input, init) => handle(new Request(input, init)),
  });
  try {
    await client.connect(transport);
    assert.match(client.getInstructions()!, /Do not invent ratings/);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [
      'get_book', 'list_books', 'list_recommendations', 'lookup_book_metadata',
      'remove_recommendation', 'save_book', 'save_recommendation',
    ]);
    const read = await client.callTool({ name: 'list_books', arguments: {} });
    assert.equal(read.isError, undefined);
    const saved = await client.callTool({ name: 'save_book', arguments: { title: 'Dune', author: 'Frank Herbert', myRating: 5, shelf: 'read' } });
    assert.equal(saved.isError, undefined);
    assert.equal(calls.length, 1);
    const invalid = await client.callTool({ name: 'save_book', arguments: { myRating: 9 } });
    assert.equal(invalid.isError, true);
    assert.equal(calls.length, 1);
    const missing = await client.callTool({ name: 'get_book', arguments: { id: crypto.randomUUID() } });
    assert.equal(missing.isError, true);
    assert.ok(users.every((user) => user === 'user-a'));
  } finally {
    await client.close();
  }
});
