'use client';

import { useEffect, useState } from 'react';

interface Token {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
}

export function McpConnections() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setEndpoint(`${window.location.origin}/api/mcp`);
    fetch('/api/tokens').then(async (response) => {
      if (!response.ok) throw new Error('Could not load connections.');
      setTokens(await response.json());
    }).catch((error: Error) => setError(error.message)).finally(() => setLoading(false));
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/tokens', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Could not create a token. Try again.');
      const { token, ...row } = await response.json();
      setTokens((current) => [row, ...current]);
      setSecret(token);
      setName('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not create token.');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm('Revoke this token? Any assistant using it will lose access immediately.')) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/tokens/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not revoke token.');
      setTokens((current) => current.filter((token) => token.id !== id));
      setSecret(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not revoke token.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-surface rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-display text-2xl">Connect your assistant</h2>
        <p className="text-sm text-muted">Use an MCP client that supports Streamable HTTP and a custom Authorization header. Each token can read and manage only your library and recommendations.</p>
        <div>
          <p className="text-xs font-semibold text-muted mb-2">MCP endpoint</p>
          <code className="block rounded-xl bg-background border border-border p-3 text-sm break-all">{endpoint || '/api/mcp'}</code>
        </div>
        <p className="text-sm text-muted">Create a separate token for each assistant. Paste it into your client&apos;s secure connection settings—not into a chat. Tokens remain valid until revoked. OAuth-only clients are not supported.</p>
        <form onSubmit={create} className="flex flex-wrap gap-3">
          <input aria-label="Connection name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100}
            placeholder="Connection name" className="min-h-11 flex-1 min-w-40 rounded-xl border border-border-strong bg-background px-3 py-2 text-sm" />
          <button disabled={busy || loading || !name.trim()} className="min-h-11 rounded-full bg-accent text-bg px-4 py-2 text-sm font-bold disabled:opacity-50">Create token</button>
        </form>
        {secret && (
          <div className="rounded-xl bg-primary-light p-4 space-y-3" role="status">
            <p className="text-sm font-medium">Copy this token now. It will not be shown again.</p>
            <code className="block text-sm break-all select-all">{secret}</code>
            <p className="text-xs text-muted">Authorization header value: <code>Bearer YOUR_TOKEN</code></p>
            <button onClick={() => setSecret(null)} className="min-h-11 text-sm text-accent-on-soft underline">I&apos;ve saved it</button>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        {loading ? <p className="text-sm text-muted">Loading connections…</p> : (
          <ul className="divide-y divide-border">
            {tokens.map((token) => (
              <li key={token.id} className="flex items-center justify-between gap-4 py-3">
                <div><p className="text-sm font-medium">{token.name}</p><p className="text-xs text-muted">{token.prefix}… · Created {new Date(token.createdAt).toLocaleDateString()}</p></div>
                <button onClick={() => revoke(token.id)} disabled={busy} className="min-h-11 min-w-11 text-sm text-muted hover:text-accent disabled:opacity-50">Revoke</button>
              </li>
            ))}
            {!tokens.length && <li className="py-3 text-sm text-muted">No assistant connections yet.</li>}
          </ul>
        )}
      </section>
      <section className="bg-surface rounded-2xl border border-border p-6 space-y-3">
        <h2 className="font-display text-2xl">Your library, with your assistant</h2>
        <p className="text-sm text-muted">Tell your assistant “I finished this book.” It can find the book, ask about your rating and reading date, and save your thoughts. Ask it for recommendations and save the ones you want to keep.</p>
        <p className="text-sm text-muted">You can also edit ratings and reading status here, or start and delete saved recommendations. Your assistant sees those same updates.</p>
        <p className="text-sm text-muted">Moving an existing library? Give your CSV to your assistant and ask it to add the books through OpenShelf. There is no file upload or built-in AI here, and Kindle syncing is not available.</p>
      </section>
    </div>
  );
}
