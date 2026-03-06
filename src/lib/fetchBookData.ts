import { fetchFromOpenLibrary } from './fetchOpenLibrary';

async function fetchFromGoogleBooks(
  title: string,
  author: string
): Promise<{ coverUrl: string | null; synopsis: string | null; avgRating: number | null }> {
  try {
    const encodedTitle = encodeURIComponent(title);
    const encodedAuthor = encodeURIComponent(author);
    const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodedTitle}+inauthor:${encodedAuthor}&maxResults=1`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return { coverUrl: null, synopsis: null, avgRating: null };
    }

    const data = await res.json();
    const item = data?.items?.[0];
    if (!item) {
      return { coverUrl: null, synopsis: null, avgRating: null };
    }

    const volumeInfo = item.volumeInfo ?? {};

    let coverUrl: string | null = volumeInfo.imageLinks?.thumbnail ?? null;
    if (coverUrl) {
      coverUrl = coverUrl.replace('http://', 'https://').replace('zoom=1', 'zoom=2');
    }

    let synopsis: string | null = volumeInfo.description ?? null;
    if (synopsis && synopsis.length > 500) {
      synopsis = synopsis.slice(0, 500);
    }

    const avgRating: number | null = volumeInfo.averageRating ?? null;

    return { coverUrl, synopsis, avgRating };
  } catch {
    return { coverUrl: null, synopsis: null, avgRating: null };
  }
}

export async function fetchBookData(
  title: string,
  author: string
): Promise<{ coverUrl: string | null; synopsis: string | null; avgRating: number | null }> {
  // Fetch from both sources in parallel
  const [google, openLib] = await Promise.all([
    fetchFromGoogleBooks(title, author),
    fetchFromOpenLibrary(title, author),
  ]);

  return {
    // Prefer Open Library covers (higher quality, more reliable)
    coverUrl: openLib.coverUrl ?? google.coverUrl,
    synopsis: google.synopsis ?? openLib.synopsis,
    avgRating: google.avgRating,
  };
}
