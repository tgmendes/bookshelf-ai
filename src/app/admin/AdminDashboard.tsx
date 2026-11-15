'use client';

import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string | null;
}

interface Props {
  initialUsers: AdminUser[];
  initialConfig: Record<string, string>;
}

export function AdminDashboard({ initialUsers, initialConfig }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [config, setConfig] = useState(initialConfig);
  const [allowedEmails, setAllowedEmails] = useState(
    config.allowed_emails?.split(',').map((e) => e.trim()).filter(Boolean) ?? []
  );
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  async function toggleRole(userId: string, current: string) {
    const newRole = current === 'admin' ? 'user' : 'admin';
    setSaving(userId);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    }
    setSaving(null);
  }

  async function revokeUser(userId: string) {
    if (!confirm('Revoke all browser sessions and assistant tokens for this user?')) return;
    setSaving(userId);
    await fetch(`/api/admin/users/${userId}/revoke`, { method: 'POST' });
    setSaving(null);
  }

  async function saveAllowedEmails(emails: string[]) {
    const value = emails.join(',');
    await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'allowed_emails', value }),
    });
    setConfig((prev) => ({ ...prev, allowed_emails: value }));
  }

  async function addEmail() {
    const email = newEmail.trim().toLowerCase();
    if (!email || allowedEmails.includes(email)) return;
    const updated = [...allowedEmails, email];
    setAllowedEmails(updated);
    setNewEmail('');
    await saveAllowedEmails(updated);
  }

  async function removeEmail(email: string) {
    const updated = allowedEmails.filter((e) => e !== email);
    setAllowedEmails(updated);
    await saveAllowedEmails(updated);
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30';
  const btnClass =
    'rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50';
  const primaryBtn = `${btnClass} bg-primary text-white hover:bg-primary/90`;
  const ghostBtn = `${btnClass} text-muted hover:bg-primary-light hover:text-foreground`;

  return (
    <div className="space-y-10">
      {/* Users Table */}
      <section>
        <h2 className="font-display text-xl mb-4">Users</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-primary-light text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-center">Admin</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-primary-light/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3">{u.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleRole(u.id, u.role)}
                      disabled={saving === u.id}
                      className={`inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        u.role === 'admin' ? 'bg-primary' : 'bg-border'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          u.role === 'admin' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => revokeUser(u.id)}
                      disabled={saving === u.id}
                      className={ghostBtn}
                      title="Revoke sessions and assistant tokens"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Allowed Emails */}
      <section>
        <h2 className="font-display text-xl mb-4">Allowed Emails</h2>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEmail()}
              placeholder="user@example.com"
              className={inputClass}
            />
            <button onClick={addEmail} className={primaryBtn}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {allowedEmails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-sm"
              >
                {email}
                <button
                  onClick={() => removeEmail(email)}
                  className="text-muted hover:text-foreground"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
            {allowedEmails.length === 0 && (
              <p className="text-sm text-muted">No allowed emails configured (using env var fallback).</p>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
