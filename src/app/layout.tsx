import type { Metadata } from 'next';
import { Raleway, Lato } from 'next/font/google';
import { Nav } from '@/components/Nav';
import { ThemeProvider } from '@/components/ThemeProvider';
import { getSession } from '@/lib/auth/session';
import { getLastLibraryUpdate } from '@/lib/reading-data';
import { formatRelativeTime } from '@/lib/reading-room';
import './globals.css';

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-raleway',
  display: 'swap',
});

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-lato',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OpenShelf',
  description: 'Your reading history and recommendations, managed by your assistant.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isAdmin = session?.role === 'admin';
  const updatedAt = session ? await getLastLibraryUpdate(session.userId) : null;
  const updatedLabel = updatedAt ? formatRelativeTime(updatedAt, new Date().toISOString()) : undefined;

  return (
    <html lang="en" className={`dark ${raleway.variable} ${lato.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.classList.toggle('dark',localStorage.getItem('theme')!=='light')}catch(e){}` }} /></head>
      <body className="font-body bg-background text-foreground antialiased">
        <ThemeProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-invert-bg focus:text-invert-fg focus:p-4">Skip to content</a>
          <Nav isAdmin={isAdmin} updatedAt={updatedAt} updatedLabel={updatedLabel} />
          <main id="main-content" className="min-h-screen">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
