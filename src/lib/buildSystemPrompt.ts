import type { Book } from './types';

export function buildSystemPrompt(books: Book[]): string {
  const readBooks = books.filter((b) => b.shelf === 'read');
  const currentlyReading = books.filter((b) => b.shelf === 'currently-reading');
  const toRead = books.filter((b) => b.shelf === 'to-read');

  const ratedBooks = readBooks.filter((b) => b.myRating > 0);
  const avgRating =
    ratedBooks.length > 0
      ? (ratedBooks.reduce((sum, b) => sum + b.myRating, 0) / ratedBooks.length).toFixed(1)
      : 'N/A';

  const topRated = readBooks
    .filter((b) => b.myRating === 5)
    .map((b) => `"${b.title}" by ${b.author}`)
    .slice(0, 10)
    .join(', ');

  const authorCounts: Record<string, number> = {};
  readBooks.forEach((b) => {
    authorCounts[b.author] = (authorCounts[b.author] || 0) + 1;
  });
  const topAuthors = Object.entries(authorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([author, count]) => `${author} (${count} books)`)
    .join(', ');

  const readList = readBooks
    .slice(0, 100)
    .map(
      (b) =>
        `- "${b.title}" by ${b.author}${b.myRating > 0 ? ` (rated ${b.myRating}/5)` : ''}`
    )
    .join('\n');

  const currentList = currentlyReading
    .map((b) => `- "${b.title}" by ${b.author}`)
    .join('\n');

  const wishList = toRead
    .slice(0, 50)
    .map((b) => `- "${b.title}" by ${b.author}`)
    .join('\n');

  return `You are a personal book advisor with deep knowledge of the user's reading history.

## Reading Stats
- Total books read: ${readBooks.length}
- Currently reading: ${currentlyReading.length}
- Want to read: ${toRead.length}
- Average personal rating: ${avgRating}/5

## Favourite books (rated 5/5)
${topRated || 'None yet'}

## Most-read authors
${topAuthors || 'N/A'}

## Books read (most recent shown)
${readList || 'None yet'}

${currentlyReading.length > 0 ? `## Currently reading\n${currentList}\n` : ''}
${toRead.length > 0 ? `## Want to read\n${wishList}\n` : ''}

## Your role
- Give personalised book recommendations based on the user's taste
- Answer questions about their reading history accurately
- Be conversational, enthusiastic about books, and concise
- When recommending, briefly explain why it fits their taste
- When recommending specific books, always format them as **Book Title** by Author Name. You may recommend multiple books this way.
- IMPORTANT: NEVER recommend books the user has already read, is currently reading, or has on their want-to-read list. All those books are listed above. Only recommend books that do NOT appear anywhere in their library.
`;
}
