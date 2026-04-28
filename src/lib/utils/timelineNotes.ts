/**
 * Helper function to extract content from timeline notes (removes ID marker)
 * Format: [type:id] content
 * Returns just the content part
 */
export function extractNotesContent(notes: string | null): string | null {
  if (!notes) return null;
  // Match pattern [type:id] at the start and remove it, including any following space
  return notes.replace(/^\[[a-z]+:[^\]]+\]\s*/, '');
}

/**
 * Helper function to extract the type and ID from timeline notes marker
 * Format: [type:id] content
 * Returns { type: 'interview' | 'followup', id: 'uuid' } or null
 */
export function extractIdMarker(
  notes: string | null,
): { type: 'interview' | 'followup'; id: string } | null {
  if (!notes) return null;
  const match = notes.match(/^\[([a-z]+):([^\]]+)\]/);
  if (match && (match[1] === 'interview' || match[1] === 'followup')) {
    return { type: match[1] as 'interview' | 'followup', id: match[2] };
  }
  return null;
}
