import { revalidatePath } from 'next/cache';
import { LibraryError } from './service';

export function checkDashboardOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return origin && origin !== new URL(request.url).origin
    ? Response.json({ error: 'Origin not allowed.' }, { status: 403 }) : null;
}

export function refreshLibraryViews(bookId?: string) {
  revalidatePath('/library');
  revalidatePath('/stats');
  if (bookId) revalidatePath(`/library/${bookId}`);
}

export function libraryFailure(error: unknown, message: string) {
  if (error instanceof LibraryError) return Response.json({ error: error.message }, { status: error.status });
  console.error(message);
  return Response.json({ error: message }, { status: 500 });
}
