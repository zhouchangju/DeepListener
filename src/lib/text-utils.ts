export interface Token {
  text: string;
  index: number;
}

/**
 * Tokenizes a sentence by splitting by whitespace while preserving word units.
 * For simplicity in this implementation, we treat each word-unit (including attached punctuation)
 * as a single token for notation purposes.
 */
export function tokenizeSentence(text: string): Token[] {
  if (!text) return [];
  
  // Split by whitespace
  const rawTokens = text.trim().split(/\s+/);
  
  return rawTokens.map((t, i) => ({
    text: t,
    index: i
  }));
}
