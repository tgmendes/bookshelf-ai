export function isEmailAllowed(email: string): boolean {
  const allowed = process.env.ALLOWED_EMAILS ?? '';
  if (!allowed) return false;
  const list = allowed.split(',').map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}
