'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { Label } from '@/lib/types';

const PRESET_COLORS = [
  '#E57373', '#F06292', '#BA68C8', '#7986CB',
  '#4FC3F7', '#4DB6AC', '#81C784', '#FFB74D',
];

export function LabelManager() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const fetchLabels = useCallback(async () => {
    const res = await fetch('/api/labels');
    if (res.ok) setLabels(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    if (res.ok) {
      setNewName('');
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
      fetchLabels();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' });
    if (res.ok) fetchLabels();
  };

  if (loading) {
    return <p className="text-sm text-muted">Loading labels…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Label list */}
      {labels.length > 0 && (
        <ul className="space-y-2">
          {labels.map((label) => (
            <li key={label.id} className="flex items-center gap-2">
              {editId === label.id ? (
                <>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 text-sm px-2 py-1 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(label.id)}
                  />
                  <button onClick={() => handleUpdate(label.id)} className="p-1 text-primary hover:text-primary/80 cursor-pointer">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditId(null)} className="p-1 text-muted hover:text-foreground cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <span className="flex-1 text-sm text-foreground">{label.name}</span>
                  <button
                    onClick={() => { setEditId(label.id); setEditName(label.name); setEditColor(label.color); }}
                    className="p-1 text-muted hover:text-foreground cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(label.id)}
                    className="p-1 text-muted hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {labels.length === 0 && (
        <p className="text-sm text-muted">No labels yet. Create one below.</p>
      )}

      {/* Add new label */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <ColorPicker value={newColor} onChange={setNewColor} />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New label name…"
          className="flex-1 text-sm px-2 py-1.5 border border-border rounded-lg bg-surface text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
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
        className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0 cursor-pointer"
        style={{ backgroundColor: value }}
      />
      {open && (
        <div className="absolute top-8 left-0 z-10 bg-surface border border-border rounded-lg p-2 grid grid-cols-4 gap-1.5 shadow-lg">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { onChange(c); setOpen(false); }}
              className={`w-6 h-6 rounded-full cursor-pointer ${value === c ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
