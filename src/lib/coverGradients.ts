export const COVER_GRADIENTS = [
  'from-teal-400 to-teal-700',
  'from-cyan-400 to-cyan-700',
  'from-emerald-400 to-emerald-700',
  'from-sky-400 to-sky-700',
  'from-amber-400 to-amber-700',
  'from-rose-400 to-rose-700',
  'from-indigo-400 to-indigo-700',
  'from-lime-400 to-green-700',
];

export function getCoverGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
}
