import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { books } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function cleanTitle(title: string): string {
  return title.replace(/\s*\(.*\)\s*$/, '').trim();
}

async function fetchByIsbn(isbn: string) {
  // Direct cover URL — no search needed
  const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

  // Verify the cover exists (not a 1x1 placeholder)
  try {
    const check = await fetch(coverUrl, { method: 'HEAD', redirect: 'follow' });
    const size = parseInt(check.headers.get('content-length') ?? '0', 10);
    if (!check.ok || size < 1000) return null;
  } catch {
    return null;
  }

  // Get synopsis from the ISBN endpoint
  let synopsis: string | null = null;
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      // Follow the work key for description
      if (data.works?.[0]?.key) {
        const workRes = await fetch(`https://openlibrary.org${data.works[0].key}.json`, { cache: 'no-store' });
        if (workRes.ok) {
          const workData = await workRes.json();
          const desc = workData.description;
          if (typeof desc === 'string') {
            synopsis = desc.length > 500 ? desc.slice(0, 500) : desc;
          } else if (desc?.value) {
            synopsis = desc.value.length > 500 ? desc.value.slice(0, 500) : desc.value;
          }
        }
      }
    }
  } catch {}

  return { coverUrl, synopsis };
}

async function fetchBySearch(rawTitle: string, author: string) {
  const title = cleanTitle(rawTitle);

  // Try Open Library search
  try {
    const query = encodeURIComponent(`${title} ${author}`);
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${query}&limit=1`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      const doc = data?.docs?.[0];
      if (doc?.cover_i) {
        const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        let synopsis: string | null = null;
        if (doc.key) {
          try {
            const workRes = await fetch(`https://openlibrary.org${doc.key}.json`, { cache: 'no-store' });
            if (workRes.ok) {
              const workData = await workRes.json();
              const desc = workData.description;
              if (typeof desc === 'string') {
                synopsis = desc.length > 500 ? desc.slice(0, 500) : desc;
              } else if (desc?.value) {
                synopsis = desc.value.length > 500 ? desc.value.slice(0, 500) : desc.value;
              }
            }
          } catch {}
        }
        return { coverUrl, synopsis };
      }
    }
  } catch {}

  // Fall back to Google Books
  try {
    const encodedTitle = encodeURIComponent(cleanTitle(rawTitle));
    const encodedAuthor = encodeURIComponent(author);
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodedTitle}+inauthor:${encodedAuthor}&maxResults=1`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      const item = data?.items?.[0];
      if (item?.volumeInfo) {
        let coverUrl: string | null = item.volumeInfo.imageLinks?.thumbnail ?? null;
        if (coverUrl) {
          coverUrl = coverUrl.replace('http://', 'https://').replace('zoom=1', 'zoom=2');
        }
        let synopsis: string | null = item.volumeInfo.description ?? null;
        if (synopsis && synopsis.length > 500) synopsis = synopsis.slice(0, 500);
        if (coverUrl) return { coverUrl, synopsis };
      }
    }
  } catch {}

  return null;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rows = await db.select().from(books).where(eq(books.id, id)).limit(1);
  const book = rows[0];
  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  console.log('[fetch-cover] Book:', JSON.stringify({ id: book.id, title: book.title, author: book.author, isbn13: book.isbn13 }));

  // 1. Try ISBN direct lookup first (most reliable)
  let result: { coverUrl: string; synopsis: string | null } | null = null;
  if (book.isbn13) {
    result = await fetchByIsbn(book.isbn13);
    console.log('[fetch-cover] ISBN result:', result ? 'found' : 'not found');
  }

  // 2. Fall back to search
  if (!result) {
    result = await fetchBySearch(book.title, book.author);
    console.log('[fetch-cover] Search result:', result ? 'found' : 'not found');
  }

  if (!result) {
    return NextResponse.json({ found: false });
  }

  const updates: Record<string, string> = {};
  updates.coverUrl = result.coverUrl;
  if (result.synopsis && !book.synopsis) updates.synopsis = result.synopsis;

  await db.update(books).set(updates).where(eq(books.id, id));

  return NextResponse.json({ found: true, coverUrl: result.coverUrl, synopsis: result.synopsis });
}
