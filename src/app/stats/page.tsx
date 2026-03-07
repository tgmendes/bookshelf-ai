import { db } from '@/lib/db';
import { books } from '@/lib/db/schema';
import { StatsCharts } from '@/components/StatsCharts';
import { BookOpen, Star, FileText, BookMarked, BarChart2 } from 'lucide-react';
import { eq } from 'drizzle-orm';
import type { Shelf } from '@/lib/types';
import { requireUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';

async function getStats(userId: string) {
  const rows = await db.select().from(books).where(eq(books.userId, userId));
  const all = rows.map((r) => ({ ...r, myRating: r.myRating ?? 0, pages: r.pages ?? 0, shelf: r.shelf as Shelf }));

  const readBooks = all.filter((b) => b.shelf === 'read');
  const ratedBooks = readBooks.filter((b) => b.myRating > 0);
  const totalPages = readBooks.reduce((sum, b) => sum + b.pages, 0);
  const avgRating = ratedBooks.length
    ? ratedBooks.reduce((sum, b) => sum + b.myRating, 0) / ratedBooks.length
    : 0;

  const yearMap: Record<number, number> = {};
  for (const b of readBooks) {
    if (!b.dateRead) continue;
    const year = new Date(b.dateRead).getFullYear();
    yearMap[year] = (yearMap[year] ?? 0) + 1;
  }
  const booksByYear = Object.entries(yearMap)
    .map(([year, count]) => ({ year: parseInt(year), count }))
    .sort((a, b) => a.year - b.year);

  const ratingMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const b of ratedBooks) ratingMap[b.myRating] = (ratingMap[b.myRating] ?? 0) + 1;
  const ratingDist = [1, 2, 3, 4, 5].map((rating) => ({ rating, count: ratingMap[rating] ?? 0 }));

  const authorMap: Record<string, number> = {};
  for (const b of readBooks) authorMap[b.author] = (authorMap[b.author] ?? 0) + 1;
  const topAuthors = Object.entries(authorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([author, count]) => ({ author, count }));

  return {
    totalBooks: readBooks.length,
    totalPages,
    avgRating,
    ratedCount: ratedBooks.length,
    booksByYear,
    ratingDist,
    topAuthors,
    currentlyReading: all.filter((b) => b.shelf === 'currently-reading').length,
  };
}

export default async function StatsPage() {
  const { userId } = await requireUser();
  const stats = await getStats(userId);

  const statCards = [
    { label: 'Books Read', value: stats.totalBooks.toLocaleString(), icon: BookOpen },
    { label: 'Total Pages', value: stats.totalPages.toLocaleString(), icon: FileText },
    { label: 'Average Rating', value: stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)} ★` : '—', icon: Star },
    { label: 'Currently Reading', value: stats.currentlyReading.toString(), icon: BookMarked },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl text-foreground mb-2 animate-fade-in">Reading Stats</h1>
      <p className="text-muted mb-8 animate-fade-in stagger-1">Your reading journey at a glance</p>

      {stats.totalBooks === 0 ? (
        <div className="text-center py-20 text-muted animate-fade-in-up">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl text-foreground mb-2">No reading data yet</h2>
          <p>Import your Goodreads library to see your reading stats come to life.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map(({ label, value, icon: Icon }, i) => (
              <div key={label} className="bg-surface rounded-2xl border border-border p-5 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-muted text-sm">{label}</p>
                <p className="text-4xl font-bold text-foreground tracking-tight mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <div className="animate-fade-in-up stagger-5">
            <StatsCharts
              booksByYear={stats.booksByYear}
              ratingDist={stats.ratingDist}
              topAuthors={stats.topAuthors}
            />
          </div>
        </>
      )}
    </div>
  );
}
