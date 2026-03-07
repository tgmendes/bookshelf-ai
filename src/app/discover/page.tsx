import { requireUser } from '@/lib/auth/requireUser';
import { DiscoverInterface } from '@/components/DiscoverInterface';

export const metadata = {
  title: 'Discover — Bookshelf',
};

export default async function DiscoverPage() {
  await requireUser();

  return <DiscoverInterface />;
}
