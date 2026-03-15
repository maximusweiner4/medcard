/**
 * Strip HTML tags from a string to prevent XSS in rendered views.
 * EJS <%= %> already HTML-escapes, but this adds defense-in-depth.
 */
export function stripHtml(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').trim();
}
