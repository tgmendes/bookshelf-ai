'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Trash2, Sparkles } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { SaveRecommendationModal } from './SaveRecommendationModal';
import type { UIMessage } from 'ai';

const STARTER_PROMPTS = [
  'What should I read next?',
  'Recommend something similar to my favourites.',
];

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveDefaultReason, setSaveDefaultReason] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    setMessages,
    isStreaming,
    isWaiting,
    error,
    sendMessage,
    clearMessages,
    suggestedBooksMap,
  } = useChat();

  // Lazy-load history on first open
  useEffect(() => {
    if (isOpen && !historyLoaded) {
      setHistoryLoaded(true);
      fetch('/api/chat/history')
        .then((res) => res.json())
        .then((data: UIMessage[]) => {
          if (data.length > 0) setMessages(data);
        })
        .catch(() => {});
    }
  }, [isOpen, historyLoaded, setMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Escape to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  }, [input, isStreaming, sendMessage]);

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
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:opacity-90 transition-all flex items-center justify-center animate-scale-in"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[520px] max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:bottom-0 max-sm:right-0 bg-background border border-border rounded-2xl max-sm:rounded-none shadow-2xl flex flex-col animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary-light rounded-full flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Book Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="p-1.5 text-muted hover:text-foreground rounded-full hover:bg-primary-light transition-colors"
                  title="Clear chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-muted hover:text-foreground rounded-full hover:bg-primary-light transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-4">
                <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Ask about your books</p>
                  <p className="text-xs text-muted mt-1">Get personalised recommendations</p>
                </div>
                <div className="flex flex-col gap-1.5 w-full max-w-xs">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="text-left px-3 py-2 rounded-lg border border-border bg-surface text-xs text-foreground hover:border-primary hover:bg-primary-light transition-colors"
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
              <p className="text-center text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-1.5">
                {error}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-border bg-surface flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your books…"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-shadow"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="flex-shrink-0 p-2.5 bg-primary hover:opacity-90 disabled:bg-border disabled:text-muted text-white rounded-full transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <SaveRecommendationModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        defaultReason={saveDefaultReason}
      />
    </>
  );
}
