import { NextResponse } from 'next/server';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { db } from '@/lib/db';
import { chatMessages } from '@/lib/db/schema';
import { buildSystemPrompt } from '@/lib/buildSystemPrompt';
import { requireApiUser } from '@/lib/auth/requireApiUser';
import { checkAiLimit } from '@/lib/auth/rateLimit';
import { openrouter } from '@/lib/openrouter';
import { fetchUserLibraryWithLabels } from '@/lib/fetchUserLibrary';

export const maxDuration = 30;

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { allowed } = await checkAiLimit(auth.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily AI limit reached. Try again tomorrow.' },
      { status: 429 }
    );
  }

  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
    }

    const { library, labelsByBookId } = await fetchUserLibraryWithLabels(auth.userId);
    const systemPrompt = buildSystemPrompt(library, labelsByBookId);

    // Save user message
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg.role === 'user') {
      const textContent = lastUserMsg.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? '';
      if (textContent) {
        await db.insert(chatMessages).values({
          userId: auth.userId,
          role: 'user',
          content: textContent,
        });
      }
    }

    const result = streamText({
      model: openrouter('anthropic/claude-3.5-haiku'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      onFinish: async ({ text }) => {
        if (text) {
          await db.insert(chatMessages).values({
            userId: auth.userId,
            role: 'assistant',
            content: text,
          }).catch(console.error);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error('Chat route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
