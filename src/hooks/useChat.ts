'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/lib/types';

const BOOK_REGEX = /\*\*([^*]+)\*\*\s+by\s+([A-Z][^\n,!?.]+)/g;

function extractSuggestedBooks(text: string): Array<{ title: string; author: string }> {
  const matches: Array<{ title: string; author: string }> = [];
  const regex = new RegExp(BOOK_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push({ title: match[1].trim(), author: match[2].trim() });
  }
  return matches;
}

export function useChat(initialMessages: ChatMessage[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevStreamingRef = useRef(false);

  // After streaming finishes, extract book suggestions from the last assistant message
  useEffect(() => {
    const wasStreaming = prevStreamingRef.current;
    prevStreamingRef.current = isStreaming;

    if (wasStreaming && !isStreaming) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== 'assistant') return prev;
        const suggestedBooks = extractSuggestedBooks(last.content);
        if (suggestedBooks.length === 0) return prev;
        return prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, suggestedBooks } : m
        );
      });
    }
  }, [isStreaming]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setIsStreaming(true);
      setError(null);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '' },
      ]);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages.map(({ role, content }) => ({ role, content })),
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || 'Chat request failed');
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content ?? '';
              if (token) {
                accumulated += token;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulated } : m
                  )
                );
              }
            } catch {
              // malformed SSE line, skip
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, sendMessage, clearMessages };
}
