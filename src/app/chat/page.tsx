import { db } from '@/lib/db';
import { chatMessages } from '@/lib/db/schema';
import { ChatInterface } from '@/components/ChatInterface';
import { asc } from 'drizzle-orm';
import type { ChatMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  let history: ChatMessage[] = [];
  try {
    const rows = await db
      .select()
      .from(chatMessages)
      .orderBy(asc(chatMessages.createdAt))
      .limit(100);

    history = rows.map((r) => ({
      id: r.id,
      role: r.role as 'user' | 'assistant',
      content: r.content,
      createdAt: r.createdAt?.toISOString(),
    }));
  } catch {
    // DB not ready yet
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="mb-4">
        <h1 className="font-display text-4xl text-foreground">Chat with AI</h1>
        <p className="text-muted mt-1">Ask for recommendations and discuss your reads</p>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <ChatInterface initialMessages={history} />
      </div>
    </div>
  );
}
