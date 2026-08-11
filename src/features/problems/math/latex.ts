/**
 * Pure text→segments parser for math rendering. No React/KaTeX import so it is
 * unit-testable. Two phases:
 *
 *  1. Split out EXPLICIT LaTeX the AI already emits — \[..\] / $$..$$ (block),
 *     \(..\) (inline). (Single `$` is intentionally NOT a delimiter to avoid
 *     currency false positives.)
 *  2. In the remaining plain text, CONSERVATIVELY convert bare numeric fractions
 *     ("2/3", "(a+b)/2") to \frac — but never dates (2026/08/11), URLs
 *     (https://…), or file paths (foo/bar.png). Everything else stays text.
 */

export type MathSegment =
  | { kind: "text"; text: string }
  | { kind: "math"; latex: string; display: boolean };

// \[ .. \]  |  $$ .. $$  |  \( .. \)
const DELIMITERS = /\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)/g;

// (group)/num  OR  num/num  — boundaries validated manually (no lookbehind, for
// Safari compatibility) so adjacent digits/word/./:/\ disqualify the match.
const FRACTION = /(\(([^()]{1,24})\)|\d{1,4})\s*\/\s*(\d{1,4})/g;
const BOUNDARY = /[\w./:\\$]/;

/** Convert bare fractions in a plain-text run into text + inline-math segments. */
function convertFractions(text: string): MathSegment[] {
  const out: MathSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(FRACTION)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const before = start > 0 ? text[start - 1]! : "";
    const after = end < text.length ? text[end]! : "";
    // Reject if glued to digits/word/dot/slash/colon (dates, URLs, paths, decimals).
    if (BOUNDARY.test(before) || BOUNDARY.test(after)) continue;

    if (start > last) out.push({ kind: "text", text: text.slice(last, start) });
    const numerator = m[2] ?? m[1]!; // paren-group content, else the number
    out.push({ kind: "math", latex: `\\frac{${numerator}}{${m[3]}}`, display: false });
    last = end;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out.length > 0 ? out : [{ kind: "text", text }];
}

/** Parse a string into ordered text / math segments for rendering. */
export function parseMathSegments(input: string): MathSegment[] {
  if (!input) return [{ kind: "text", text: "" }];
  const segments: MathSegment[] = [];
  let last = 0;

  for (const m of input.matchAll(DELIMITERS)) {
    const start = m.index ?? 0;
    if (start > last) {
      segments.push(...convertFractions(input.slice(last, start)));
    }
    const block = m[1] ?? m[2]; // \[..\] or $$..$$
    const inline = m[3]; // \(..\)
    const latex = (block ?? inline ?? "").trim();
    segments.push({ kind: "math", latex, display: block !== undefined });
    last = start + m[0].length;
  }
  if (last < input.length) segments.push(...convertFractions(input.slice(last)));

  return segments.length > 0 ? segments : [{ kind: "text", text: input }];
}

/** True if the string contains anything that will render as math (fast check to
 * skip KaTeX work for pure-text content). */
export function hasMath(input: string): boolean {
  if (!input) return false;
  return parseMathSegments(input).some((s) => s.kind === "math");
}
