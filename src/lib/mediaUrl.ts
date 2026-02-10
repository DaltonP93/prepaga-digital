export function sanitizeMediaUrl(value?: string | null): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }

  // Common case: Supabase domain saved without protocol.
  if (trimmed.includes('.supabase.co/')) {
    return `https://${trimmed}`;
  }

  return undefined;
}
