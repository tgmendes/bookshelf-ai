import { z } from 'zod';
import { requireApiUser } from '@/lib/auth/requireApiUser';
import { createLibraryService } from '@/lib/library/service';
import { startRecommendationInput } from '@/lib/library/validation';
import { checkDashboardOrigin, libraryFailure, refreshLibraryViews } from '@/lib/library/http';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const denied = checkDashboardOrigin(request);
  if (denied) return denied;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Invalid recommendation id.' }, { status: 400 });
  const parsed = startRecommendationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Supply a valid start date.' }, { status: 400 });
  try {
    const result = await createLibraryService(auth.userId).startRecommendation(id, parsed.data);
    refreshLibraryViews(id);
    refreshLibraryViews(result.book.id);
    return Response.json({ book: { id: result.book.id }, created: result.created }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return libraryFailure(error, 'Could not start this recommendation. Please try again.'); }
}
