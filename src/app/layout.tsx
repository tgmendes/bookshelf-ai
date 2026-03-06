import type { Metadata } from 'next';
import { Instrument_Serif, DM_Sans } from 'next/font/google';
import { Nav } from '@/components/Nav';
import { ThemeProvider } from '@/components/ThemeProvider';
import { getSession } from '@/lib/auth/session';
import './globals.css';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bookshelf',
  description: 'Your personal AI-powered reading dashboard',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isAdmin = session?.role === 'admin';

  return (
    <html lang="en" className={`${instrumentSerif.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="font-body bg-background text-foreground antialiased">
        <ThemeProvider>
          <Nav isAdmin={isAdmin} />
          <main className="pt-14 min-h-screen">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
