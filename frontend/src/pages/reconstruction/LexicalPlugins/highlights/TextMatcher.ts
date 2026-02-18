/**
 * TextMatcher — Pure functions for finding datapoint text in editor content.
 * No React/Lexical dependencies. Fully testable.
 */

export interface MatchResult {
  type: "exact" | "normalized";
  startOffset: number;
  endOffset: number;
  confidence: number;
}

/**
 * Find the best match of `query` within `text`.
 * Strategy: exact substring → normalized substring.
 * No fuzzy matching — keeps behavior predictable.
 */
export function findMatch(text: string, query: string): MatchResult | null {
  if (!text || !query || !query.trim()) return null;

  // 1. Exact substring
  const exactIdx = text.indexOf(query);
  if (exactIdx >= 0) {
    return { type: "exact", startOffset: exactIdx, endOffset: exactIdx + query.length, confidence: 100 };
  }

  // 2. Normalized match (ignore whitespace, punctuation, case)
  const normText = normalize(text);
  const normQuery = normalize(query);
  if (!normQuery) return null;

  const normIdx = normText.indexOf(normQuery);
  if (normIdx >= 0) {
    const [origStart, origEnd] = mapNormRangeToOriginal(text, normText, normIdx, normIdx + normQuery.length);
    return { type: "normalized", startOffset: origStart, endOffset: origEnd, confidence: 95 };
  }

  return null;
}

/**
 * Try matching across concatenated texts (for spanning nodes).
 * Returns which segments are involved and the match range.
 */
export function findSpanningMatch(
  segments: string[],
  query: string
): { startSegment: number; endSegment: number; confidence: number } | null {
  if (segments.length < 2) return null;

  const normQuery = normalize(query);
  if (!normQuery || normQuery.length < 10) return null;

  // Try combining 2-4 adjacent segments
  for (let start = 0; start < segments.length; start++) {
    for (let span = 2; span <= Math.min(4, segments.length - start); span++) {
      const combined = segments.slice(start, start + span).join(" ");
      const normCombined = normalize(combined);
      if (normCombined.includes(normQuery)) {
        return { startSegment: start, endSegment: start + span - 1, confidence: 90 };
      }
    }
  }

  return null;
}

export function normalize(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, " ")
    .toLowerCase();
}

/**
 * Map a range in normalized text back to the original text positions.
 */
function mapNormRangeToOriginal(
  original: string,
  _normalized: string,
  normStart: number,
  normEnd: number
): [number, number] {
  return [
    mapNormPosToOriginal(original, normStart),
    mapNormPosToOriginal(original, normEnd),
  ];
}

function mapNormPosToOriginal(original: string, normPos: number): number {
  if (normPos <= 0) return 0;

  let normCount = 0;
  let origIdx = 0;

  // Walk through original, counting normalized characters
  while (normCount < normPos && origIdx < original.length) {
    const origChar = original[origIdx];
    // Skip leading extra whitespace (already collapsed in normalize)
    if (/\s/.test(origChar)) {
      // Consume all consecutive whitespace as one normalized space
      while (origIdx < original.length && /\s/.test(original[origIdx])) origIdx++;
      normCount++; // One space in normalized
    } else {
      origIdx++;
      normCount++;
    }
  }

  return Math.min(origIdx, original.length);
}
