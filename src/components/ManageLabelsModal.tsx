'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Check, X, Sparkles, Loader2, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Label } from '@/lib/types';

const PRESET_COLORS = [
  '#CF5F55', '#E57373', '#F06292', '#BA68C8',
  '#9C6C9E', '#7986CB', '#5987AC', '#4DB6AC',
  '#8BA668', '#81C784', '#B58957', '#FFB74D',
];

interface ManageLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageLabelsModal({ isOpen, onClose }: ManageLabelsModalProps) {
  const router = useRouter();
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [autoLabelId, setAutoLabelId] = useState<string | null>(null);
  const [autoLabelResult, setAutoLabelResult] = useState<{ id: string; count: number } | null>(null);
  const [dirty, setDirty] = useState(false);

  const fetchLabels = useCallback(async () => {
    const res = await fetch('/api/labels');
    if (res.ok) setLabels(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) fetchLabels();
  }, [isOpen, fetchLabels]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    if (res.ok) {
      setNewName('');
      setDirty(true);
      fetchLabels();
    }
  };

  const handleUpdate = async (id: string) => {
    const res = await fetch(`/api/labels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    });
    if (res.ok) {
      setEditId(null);
      setDirty(true);
      fetchLabels();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDirty(true);
      fetchLabels();
    }
  };

  const handleAutoLabel = async (id: string) => {
    setAutoLabelId(id);
    setAutoLabelResult(null);
    try {
      const res = await fetch(`/api/labels/${id}/auto-label`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAutoLabelResult({ id, count: data.assigned });
        setDirty(true);
      } else if (res.status === 429) {
        alert('Daily AI limit reached. Try again tomorrow.');
      }
    } finally {
      setAutoLabelId(null);
    }
  };

  const handleClose = useCallback(() => {
    if (dirty) router.refresh();
    onClose();
  }, [dirty, router, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-foreground/40" />
      <div
        className="relative bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in max-sm:max-h-[90vh] max-sm:flex max-sm:flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center">
              <Tag className="w-4.5 h-4.5 text-primary" />
            </div>
            <h2 className="font-display text-xl text-foreground">Manage labels</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-full text-muted hover:text-foreground hover:bg-primary-light transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Label list */}
        <div className="px-6 py-4 space-y-1.5 max-sm:overflow-y-auto max-sm:flex-1">
          {loading && <p className="text-sm text-muted py-4 text-center">Loading…</p>}

          {!loading && labels.length === 0 && (
            <p className="text-sm text-muted py-4 text-center">No labels yet. Create one below.</p>
          )}

          {!loading && labels.map((label) => (
            <div key={label.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface border border-border">
              {editId === label.id ? (
                <>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 text-sm px-2 py-1 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(label.id)}
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(label.id)} className="p-1 text-primary hover:text-primary/80">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditId(null)} className="p-1 text-muted hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <span className="flex-1 text-sm text-foreground font-medium">{label.name}</span>
                  {autoLabelResult?.id === label.id && (
                    <span className="text-xs text-primary">{autoLabelResult.count} labelled</span>
                  )}
                  <button
                    onClick={() => handleAutoLabel(label.id)}
                    disabled={autoLabelId !== null}
                    className="p-1 text-muted hover:text-primary transition-colors disabled:opacity-50"
                    title="Auto-label with AI"
                  >
                    {autoLabelId === label.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => { setEditId(label.id); setEditName(label.name); setEditColor(label.color); }}
                    className="p-1 text-muted hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(label.id)}
                    className="p-1 text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Create new */}
        <div className="px-6 pb-6 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <ColorPicker value={newColor} onChange={setNewColor} />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New label name…"
              className="flex-1 text-sm px-3 py-2 border border-border rounded-xl bg-surface text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="p-2 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-full border-2 border-border flex-shrink-0 cursor-pointer transition-shadow hover:shadow-sm"
        style={{ backgroundColor: value }}
      />
      {open && (
        <div className="absolute top-9 left-0 z-10 bg-surface border border-border rounded-xl p-2 grid grid-cols-6 gap-1.5 shadow-lg">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { onChange(c); setOpen(false); }}
              className={`w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110 ${value === c ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
