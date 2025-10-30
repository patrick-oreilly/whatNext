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

  // First try: Match text after [DECISION] or [DESCISON] (typo) marker
  const markerMatch = text.match(/\[(DECISION|DESCISON)\]\s*:?\s*([^?]+\?)/i);
  if (markerMatch && markerMatch[2]) {
    return markerMatch[2].trim();
  }

  // Fallback: If no marker found, extract the last sentence that ends with a question mark
  // This handles cases where backend doesn't include the marker
  const sentences = text.split(/(?<=[.!?])\s+/);
  const lastSentence = sentences[sentences.length - 1]?.trim();

  if (lastSentence && lastSentence.endsWith('?')) {
    return lastSentence;
  }

  return null;
};

/**
 * Remove decision, status, and end sections from story text for display
 * Removes everything from [DECISION] marker onwards, including the decision sentence
 * Also removes Status: section and [END] section if present
 * Preserves paragraph breaks (double newlines)
 * @param text - Full AI story text
 * @returns Clean text with only the main story content
 */
export const cleanStoryText = (text: string): string => {
  if (!text) return '';

  let cleaned = text;

  // First, remove everything from [END] marker onwards if present (case insensitive)
  if (/\[END\]/i.test(cleaned)) {
    cleaned = cleaned.replace(/\[END\]\s*:?\s*.*$/is, '');
  }

  // Then, try to remove everything from [DECISION] marker onwards
  if (/\[(DECISION|DESCISON)\]/i.test(cleaned)) {
    cleaned = cleaned.replace(/\[(DECISION|DESCISON)\].*$/is, '');
  } else {
    // Fallback: If no marker, remove the last sentence if it ends with a question mark
    // This handles cases where backend doesn't include the marker
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    const lastSentence = sentences[sentences.length - 1]?.trim();

    if (lastSentence && lastSentence.endsWith('?')) {
      // Remove the last question sentence
      sentences.pop();
      cleaned = sentences.join(' ');
    }
  }

  // Also handle case where Status comes before or without Decision
  // Remove everything from Status: or **Status**: onwards
  cleaned = cleaned.replace(/\*?\*?Status\*?\*?\s*:?\s*.*/is, '');

  // Clean up trailing whitespace
  cleaned = cleaned.trim();

  // Normalize paragraph breaks (preserve double newlines, remove excess)
  // Convert 3+ newlines to exactly 2 newlines (paragraph break)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned;
};

/**
 * Extract status information from AI story text
 * Looks for text after "Status" marker (with or without colon, with or without markdown bold)
 * Status appears optionally after the decision in AI responses
 * @param text - Full AI story segment
 * @returns The status text or null if not found
 */
export const extractStatus = (text: string): string | null => {
  if (!text) return null;

  // Try multiple patterns to match different AI output formats:
  // 1. **Status**: text
  // 2. **Status** text (no colon)
  // 3. Status: text (no markdown)
  // 4. Status text (no markdown, no colon)

  const patterns = [
    /\*\*Status\*\*\s*:?\s*(.+?)(?:\n|$)/is,  // **Status**: or **Status**
    /\bStatus\s*:\s*(.+?)(?:\n|$)/is,         // Status:
    /\bStatus\s+([^\n]+?)(?:\n|$)/is,         // Status (followed by space, no colon)
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim()) {
      return match[1].trim();
    }
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

/**
 * Check if a story segment contains an END marker
 * @param text - Story text to check
 * @returns True if text contains end marker
 */
export const hasEndMarker = (text: string): boolean => {
  if (!text) return false;
  return /\[END\]/i.test(text);
};

/**
 * Extract ending summary from AI story text
 * Looks for text after [END]: marker
 * @param text - Full AI story segment
 * @returns The ending summary text or null if not found
 */
export const extractEndSummary = (text: string): string | null => {
  if (!text) return null;

  // Match text after "[END]:" or "[END]" marker (case insensitive)
  // Captures everything after the marker until end of string
  const match = text.match(/\[END\]\s*:?\s*(.*)$/is);

  if (match && match[1]) {
    const summary = match[1].trim();

    // Remove any Status: section that might follow
    const cleanedSummary = summary.replace(/\*?\*?Status\*?\*?\s*:?.*/is, '').trim();

    // Remove any Decision markers that might follow
    const finalSummary = cleanedSummary.replace(/\[(DECISION|DESCISON)\].*/is, '').trim();

    return finalSummary || null;
  }

  return null;
};
