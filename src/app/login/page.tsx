import { LoginForm } from '@/components/LoginForm';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/library');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-sm w-full mx-auto px-4">
        <div className="text-center mb-8">
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
