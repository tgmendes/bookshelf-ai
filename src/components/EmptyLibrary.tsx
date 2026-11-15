import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export function EmptyLibrary() {
  return (
    <div className="max-w-xl mx-auto py-16 text-center animate-fade-in-up">
      <div className="w-20 h-20 bg-primary-light rounded-3xl flex items-center justify-center mx-auto mb-5">
        <BookOpen className="w-10 h-10 text-primary" />
      </div>
      <h2 className="font-display text-3xl text-foreground mb-3">Your reading life, on display</h2>
      <p className="text-muted mb-6">Connect your assistant to add the books you&apos;ve read, keep your ratings and thoughts, and save recommendations. They&apos;ll appear here for you to browse.</p>
      <Link href="/settings" className="inline-flex rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-medium">Connect an assistant</Link>
    </div>
  );
}
