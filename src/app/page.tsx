import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { books } from '@/lib/db/schema';
import { ImportZone } from '@/components/ImportZone';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let hasBooks = false;
  try {
    const rows = await db.select({ id: books.id }).from(books).limit(1);
    hasBooks = rows.length > 0;
  } catch {
    // DB not configured yet — show import screen
  }

  if (hasBooks) {
    redirect('/library');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-24">
        <div className="text-center mb-12">
          <h1 className="font-display text-5xl text-foreground tracking-tight mb-4">
            Your reading life,<br />all in one place
          </h1>
          <p className="text-muted text-lg leading-relaxed">
            Import your Goodreads library to get personalised AI recommendations,
            beautiful reading stats, and an organised book dashboard.
          </p>
        </div>

        <ImportZone />
      </div>
    </div>
  );
}
