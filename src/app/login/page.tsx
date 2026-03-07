import { LoginForm } from '@/components/LoginForm';
import { BookOpen } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/library');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary-light/30 flex items-center justify-center relative overflow-hidden">
      {/* Decorative background icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <BookOpen className="w-[28rem] h-[28rem] text-primary/[0.04]" strokeWidth={0.5} />
      </div>

      <div className="max-w-sm w-full mx-auto px-4 relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-5 animate-scale-in">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-4xl text-foreground tracking-tight mb-2">
            Sign in to Bookshelf
          </h1>
          <p className="text-muted text-sm">
            Enter your email and we&apos;ll send you a magic link
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
