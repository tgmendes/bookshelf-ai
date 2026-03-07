'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { SaveRecommendationModal } from './SaveRecommendationModal';
import type { UIMessage } from 'ai';
import { Send, Trash2, Sparkles } from 'lucide-react';

const STARTER_PROMPTS = [
  'What should I read next based on my history?',
  'What are my highest rated books?',
  'Recommend something similar to my favourite books.',
  'How many books did I read this year?',
];

interface ChatInterfaceProps {
  initialMessages?: UIMessage[];
}

export function ChatInterface({ initialMessages }: ChatInterfaceProps) {
  const { messages, isStreaming, isWaiting, error, sendMessage, clearMessages, suggestedBooksMap } =
    useChat(initialMessages);
  const [input, setInput] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveDefaultReason, setSaveDefaultReason] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenSave = (content: string) => {
    setSaveDefaultReason(content.slice(0, 200));
    setSaveModalOpen(true);
  };

  const handleAddBook = async (title: string, author: string): Promise<void> => {
    const params = new URLSearchParams({ title, author });
    const lookupRes = await fetch(`/api/books/lookup?${params.toString()}`);
    const bookData = lookupRes.ok
      ? await lookupRes.json()
      : { coverUrl: null, synopsis: null };

    await fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        author,
        reason: '',
        coverUrl: bookData.coverUrl ?? null,
        synopsis: bookData.synopsis ?? null,
      }),
    });
  };

  return (
    <>
      {/* Messages card */}
      <div className="bg-surface rounded-2xl border border-border flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-center py-8 animate-fade-in">
              <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center animate-scale-in">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Start a conversation about books</h2>
                <p className="text-muted text-sm mt-1">
                  Get personalised recommendations based on your reading history
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left px-4 py-3 rounded-xl border border-border bg-surface text-sm text-foreground hover:border-primary hover:bg-primary-light transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
                suggestedBooks={suggestedBooksMap[msg.id]}
                onSave={msg.role === 'assistant' ? handleOpenSave : undefined}
                onAddBook={msg.role === 'assistant' ? handleAddBook : undefined}
              />
            ))
          )}
          {isWaiting && <TypingIndicator />}
          {error && (
            <p className="text-center text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="mt-3 flex items-center gap-2">
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex-shrink-0 p-2.5 text-muted hover:text-foreground hover:bg-primary-light rounded-full transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about your books…"
          className="flex-1 rounded-full border border-border bg-surface px-5 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-shadow"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          className="flex-shrink-0 p-3 bg-primary hover:opacity-90 disabled:bg-border disabled:text-muted text-white rounded-full transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <SaveRecommendationModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        defaultReason={saveDefaultReason}
      />
    </>
  );
}
