'use client';

import { useChat as useAIChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useCallback, useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';

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

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

const transport = new DefaultChatTransport({ api: '/api/chat' });

export function useChat(initialMessages?: UIMessage[]) {
  const [suggestedBooksMap, setSuggestedBooksMap] = useState<
    Record<string, Array<{ title: string; author: string }>>
  >({});
  const initializedRef = useRef(false);

  const {
    messages,
    setMessages,
    status,
    error: aiError,
    sendMessage: aiSendMessage,
    stop,
  } = useAIChat({
    transport,
    onFinish: ({ message }) => {
      const text = getMessageText(message);
      const books = extractSuggestedBooks(text);
      if (books.length > 0) {
        setSuggestedBooksMap((prev) => ({ ...prev, [message.id]: books }));
      }
    },
  });

  // Set initial messages on mount
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  const isStreaming = status === 'submitted' || status === 'streaming';

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;
      aiSendMessage({ text: content.trim() });
    },
    [isStreaming, aiSendMessage]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSuggestedBooksMap({});
  }, [setMessages]);

  return {
    messages,
    setMessages,
    isStreaming,
    isWaiting: status === 'submitted',
    error: aiError?.message ?? null,
    sendMessage,
    clearMessages,
    suggestedBooksMap,
    stop,
  };
}
