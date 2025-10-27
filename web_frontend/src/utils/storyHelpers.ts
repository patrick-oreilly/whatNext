// Story parsing utilities for AI-generated content

/**
 * Extract decision prompt from AI story text
 * Looks for text after [DECISION] or [DESCISON] marker (handles backend typo)
 * and before end of string or next marker
 * @param text - Full AI story segment
 * @returns The decision prompt or null if not found
 */
export const extractDecisionPrompt = (text: string): string | null => {
  if (!text) return null;

  // Match text after [DECISION] or [DESCISON] (typo) marker
  // Use both patterns to handle backend inconsistency
  // Stop at next bracket, Status: marker, or end of string
  const match = text.match(/\[(DECISION|DESCISON)\]\s*(.+?)(?:\[|Status:|$)/is);

  if (match && match[2]) {
    return match[2].trim();
  }

  return null;
};

/**
 * Remove decision and status sections from story text for display
 * Removes everything from [DECISION] marker onwards, including the decision sentence
 * Also removes Status: section if present
 * Preserves paragraph breaks (double newlines)
 * @param text - Full AI story text
 * @returns Clean text with only the main story content
 */
export const cleanStoryText = (text: string): string => {
  if (!text) return '';

  // Remove everything from [DECISION] marker onwards
  // This removes both the marker and the decision sentence
  let cleaned = text.replace(/\[(DECISION|DESCISON)\].*$/is, '');

  // Also handle case where Status comes before or without Decision
  // Remove everything from Status: onwards
  cleaned = cleaned.replace(/\bStatus:\s*.*/is, '');

  // Clean up trailing whitespace
  cleaned = cleaned.trim();

  // Normalize paragraph breaks (preserve double newlines, remove excess)
  // Convert 3+ newlines to exactly 2 newlines (paragraph break)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned;
};

/**
 * Extract status information from AI story text
 * Looks for text after "Status:" marker
 * Status appears optionally after the decision in AI responses
 * @param text - Full AI story segment
 * @returns The status text or null if not found
 */
export const extractStatus = (text: string): string | null => {
  if (!text) return null;

  // Match text after "Status:" marker
  // Could appear after [DECISION] or standalone
  const match = text.match(/\bStatus:\s*(.+?)(?:\n|$)/is);

  if (match && match[1] && match[1].trim()) {
    return match[1].trim();
  }

  return null;
};

/**
 * Format status text for better visual display
 * Replaces commas with bullets for cleaner separation
 * @param status - Raw status text
 * @returns Formatted status text
 */
export const formatStatus = (status: string): string => {
  if (!status) return '';
  // Replace comma separators with bullet points
  return status.replace(/,\s+/g, ' • ');
};

/**
 * Check if a story segment contains a decision marker
 * @param text - Story text to check
 * @returns True if text contains decision marker
 */
export const hasDecisionMarker = (text: string): boolean => {
  if (!text) return false;
  return /\[(DECISION|DESCISON)\]/i.test(text);
};
