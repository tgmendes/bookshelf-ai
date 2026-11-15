import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export async function handleMcpRequest(request: Request, dependencies: {
  authenticate: (request: Request) => Promise<string | null>;
  createServer: (userId: string) => McpServer;
}) {
  const origin = request.headers.get('origin');
  const appOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? request.url).origin;
  if (origin && origin !== appOrigin) {
    return Response.json({ error: 'Origin not allowed' }, { status: 403 });
  }
  const userId = await dependencies.authenticate(request);
  if (!userId) {
    return Response.json({ error: 'A valid OpenShelf access token is required.' }, {
      status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="openshelf"', 'Cache-Control': 'no-store' },
    });
  }
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }
  const server = dependencies.createServer(userId);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    // JSON mode has completed the tool call before returning; no open SSE stream.
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } finally {
    await server.close();
  }
}
