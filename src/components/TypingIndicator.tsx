import { Sparkles } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 flex-row">
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-primary-light">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="rounded-2xl px-4 py-2.5 bg-surface border border-border rounded-tl-sm">
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}
