import { z } from 'zod';
import { requireApiUser } from '@/lib/auth/requireApiUser';
import { createLibraryService } from '@/lib/library/service';
import { checkDashboardOrigin, libraryFailure, refreshLibraryViews } from '@/lib/library/http';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const denied = checkDashboardOrigin(request);
  if (denied) return denied;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Invalid recommendation id.' }, { status: 400 });
  try {
    await createLibraryService(auth.userId).removeRecommendation(id);
    refreshLibraryViews(id);
    return Response.json({ ok: true });
  } catch (error) { return libraryFailure(error, 'Could not delete this recommendation. Please try again.'); }
}
