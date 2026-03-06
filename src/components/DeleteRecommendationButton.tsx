'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { X } from 'lucide-react';

export function DeleteRecommendationButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await fetch(`/api/recommendations/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Remove recommendation"
      className="p-1.5 text-white/70 hover:text-white hover:bg-black/30 rounded-lg transition-colors disabled:opacity-50 backdrop-blur-sm"
    >
      <X className="w-4 h-4" />
    </button>
  );
}
