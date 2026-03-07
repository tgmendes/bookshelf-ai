export function cleanTitle(title: string): string {
  return title.replace(/\s*\(.*\)\s*$/, '').trim();
}

export function parseOpenLibraryDesc(desc: unknown): string | null {
  if (typeof desc === 'string') return desc.length > 500 ? desc.slice(0, 500) : desc;
  if (desc && typeof desc === 'object' && 'value' in desc && typeof (desc as { value: string }).value === 'string') {
    const v = (desc as { value: string }).value;
    return v.length > 500 ? v.slice(0, 500) : v;
  }
  return null;
}

export async function fetchFromOpenLibrary(
  rawTitle: string,
  author: string
): Promise<{ coverUrl: string | null; synopsis: string | null }> {
  try {
    const title = cleanTitle(rawTitle);
    const query = encodeURIComponent(`${title} ${author}`);
    const searchUrl = `https://openlibrary.org/search.json?q=${query}&limit=1`;

    const res = await fetch(searchUrl, { next: { revalidate: 3600 } });
    if (!res.ok) return { coverUrl: null, synopsis: null };

    const data = await res.json();
    const doc = data?.docs?.[0];
    if (!doc) return { coverUrl: null, synopsis: null };

    // Extract cover
    let coverUrl: string | null = null;
    if (doc.cover_i) {
      coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    }

    // Try to get description from the work endpoint
    let synopsis: string | null = null;
    const workKey = doc.key; // e.g. "/works/OL123W"
    if (workKey) {
      try {
        const workRes = await fetch(`https://openlibrary.org${workKey}.json`, {
          next: { revalidate: 3600 },
        });
        if (workRes.ok) {
          const workData = await workRes.json();
          synopsis = parseOpenLibraryDesc(workData.description);
        }
      } catch {
        // ignore work fetch errors
      }
    }

    return { coverUrl, synopsis };
  } catch {
    return { coverUrl: null, synopsis: null };
  }
}
