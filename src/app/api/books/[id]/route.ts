import { z } from 'zod';
import { requireApiUser } from '@/lib/auth/requireApiUser';
import { createLibraryService } from '@/lib/library/service';
import { bookStateInput } from '@/lib/library/validation';
import { checkDashboardOrigin, libraryFailure, refreshLibraryViews } from '@/lib/library/http';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const denied = checkDashboardOrigin(request);
  if (denied) return denied;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Invalid book id.' }, { status: 400 });
  const parsed = bookStateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Supply a valid rating/status and a date for reading actions.' }, { status: 400 });
  try {
    const result = await createLibraryService(auth.userId).updateBookState(id, parsed.data);
    refreshLibraryViews(id);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return libraryFailure(error, 'Could not update this book. Please try again.'); }
}
