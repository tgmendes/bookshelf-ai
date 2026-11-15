export const PASTELS = ['sage', 'blush', 'butter', 'lavender', 'sky', 'peach'] as const;

export function getBookPastel(id: string): typeof PASTELS[number] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PASTELS[hash % PASTELS.length];
}

export function getBookColor(id: string) {
  return `var(--${getBookPastel(id)})`;
}

export function getSpineSize(pages: number) {
  const ratio = Math.max(0, Math.min(pages / 620, 1));
  return { height: Math.round(210 + ratio * 70), width: Math.max(44, Math.round(42 + ratio * 28)) };
}

export function getMiniSpineHeight(pages: number) {
  return Math.max(50, Math.min(50 + Math.max(0, pages) / 620 * 90, 140));
}
