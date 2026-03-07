import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireApiUser';

interface GoogleBooksVolume {
  volumeInfo: {
    title?: string;
    authors?: string[];
    description?: string;
    averageRating?: number;
    publishedDate?: string;
    pageCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8`
    );
    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    const volumes: GoogleBooksVolume[] = data.items ?? [];

    const results = volumes.map((v) => {
      const info = v.volumeInfo;
      const isbn13 = info.industryIdentifiers?.find((id) => id.type === 'ISBN_13')?.identifier ?? null;
      const coverUrl = info.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null;
      const year = info.publishedDate ? parseInt(info.publishedDate.slice(0, 4), 10) : null;

      return {
        title: info.title ?? 'Unknown',
        author: info.authors?.join(', ') ?? 'Unknown',
        coverUrl,
        synopsis: info.description ?? null,
        avgRating: info.averageRating ?? null,
        yearPublished: isNaN(year as number) ? null : year,
        pages: info.pageCount ?? null,
        isbn13,
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Book search error:', err);
    return NextResponse.json({ results: [] });
  }
}
