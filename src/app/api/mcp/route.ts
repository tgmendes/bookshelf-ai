import { authenticateToken } from '@/lib/auth/apiToken';
import { createLibraryService } from '@/lib/library/service';
import { createMcpServer } from '@/lib/mcp/server';
import { handleMcpRequest } from '@/lib/mcp/transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  return handleMcpRequest(request, {
    authenticate: authenticateToken,
    createServer: (userId) => createMcpServer(createLibraryService(userId)),
  });
}

export { handle as POST, handle as GET, handle as DELETE };
