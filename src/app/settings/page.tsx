import { McpConnections } from '@/components/McpConnections';
import { requireUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireUser();
  return (
    <div className="room-wrap py-14"><div className="max-w-2xl">
      <h1 className="font-display text-[44px] font-light leading-tight mb-2">Connections</h1>
      <p className="text-muted mb-8">Manage your library with the assistant you choose.</p>
      <McpConnections />
    </div></div>
  );
}
