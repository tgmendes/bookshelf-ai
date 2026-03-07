'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { UIMessage } from 'ai';
import { Sparkles, User, Bookmark, Loader2 } from 'lucide-react';
import { getMessageText } from '@/hooks/useChat';

interface ChatMessageProps {
  message: UIMessage;
  isStreaming?: boolean;
  suggestedBooks?: Array<{ title: string; author: string }>;
  onSave?: (content: string) => void;
  onAddBook?: (title: string, author: string) => Promise<void>;
}

interface BookCardButtonProps {
  title: string;
  author: string;
  onAddBook: (title: string, author: string) => Promise<void>;
}


function BookSuggestionCard({ title, author, onAddBook }: BookCardButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved'>('idle');

  const handleClick = async () => {
    if (status !== 'idle') return;
    setStatus('loading');
    try {
      await onAddBook(title, author);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('idle');
    }
  };

  return (
    <div className="flex-shrink-0 w-44 rounded-xl border border-border bg-surface p-3 flex flex-col gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-snug" title={title}>
          {title}
        </p>
        <p className="text-xs text-muted truncate mt-0.5" title={author}>
          {author}
        </p>
      </div>
      <button
        onClick={handleClick}
        disabled={status !== 'idle'}
        className="mt-auto w-full flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors bg-primary text-white hover:opacity-90 disabled:cursor-default disabled:opacity-60"
      >
        {status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
        {status === 'loading' && 'Adding…'}
        {status === 'saved' && 'Saved ✓'}
        {status === 'idle' && 'Add to Next Read'}
      </button>
    </div>
  );
}

export function ChatMessage({ message, isStreaming, suggestedBooks, onSave, onAddBook }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const content = getMessageText(message);
  const hasSuggestions =
    !isUser && !isStreaming && (suggestedBooks?.length ?? 0) > 0 && onAddBook;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary' : 'bg-primary-light'
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        )}
      </div>

      <div className={`relative max-w-[80%] group`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-primary text-white rounded-tr-sm'
              : 'bg-surface text-foreground border border-border rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p>{content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
              {isStreaming && content === '' && (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bookmark button for assistant messages */}
        {!isUser && onSave && !isStreaming && content && (
          <button
            onClick={() => onSave(content)}
            title="Save recommendation"
            className="absolute top-2 right-2 p-1 text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity rounded"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Book suggestion cards */}
        {hasSuggestions && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {suggestedBooks!.map((book) => (
              <BookSuggestionCard
                key={`${book.title}::${book.author}`}
                title={book.title}
                author={book.author}
                onAddBook={onAddBook!}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
