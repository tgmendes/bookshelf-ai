import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { books, chatMessages } from '@/lib/db/schema';
import { buildSystemPrompt } from '@/lib/buildSystemPrompt';
import { desc } from 'drizzle-orm';
import type { Book } from '@/lib/types';

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: IncomingMessage[] } = await req.json();

    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
    }

    // Build system prompt from user's library
    const libraryRows = await db.select().from(books).orderBy(desc(books.dateAdded));
    const library = libraryRows.map((r) => ({
      ...r,
      myRating: r.myRating ?? 0,
      pages: r.pages ?? 0,
    })) as Book[];
    const systemPrompt = buildSystemPrompt(library);

    // Save user message
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg.role === 'user') {
      await db.insert(chatMessages).values({
        role: 'user',
        content: lastUserMsg.content,
      });
    }

    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bookshelf-ai.vercel.app',
        'X-Title': 'BookShelf AI',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!openRouterRes.ok) {
      const errText = await openRouterRes.text();
      console.error('OpenRouter error:', errText);
      return NextResponse.json({ error: 'AI request failed' }, { status: 502 });
    }

    // Stream response back to client, capture full text for saving
    let fullContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openRouterRes.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(new TextEncoder().encode(chunk));

            // Extract text from SSE for saving
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                fullContent += parsed.choices?.[0]?.delta?.content ?? '';
              } catch {
                // skip malformed lines
              }
            }
          }
        } finally {
          controller.close();
          // Save assistant response after streaming completes
          if (fullContent) {
            await db.insert(chatMessages).values({
              role: 'assistant',
              content: fullContent,
            }).catch(console.error);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
