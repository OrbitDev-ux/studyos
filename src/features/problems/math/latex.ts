/**
 * Pure text→segments parser for math rendering. No React/KaTeX import so it is
 * unit-testable. Three phases:
 *
 *  1. Split out EXPLICIT LaTeX the AI emits — \[..\] / $$..$$ (block),
 *     \(..\) (inline). Delimiters are matched TOLERANTLY: the gpt-oss model
 *     sometimes over-escapes LaTeX inside its JSON, so after JSON.parse the
 *     string can arrive double-escaped ("\\(\\frac{7}{9}\\)") instead of the
 *     canonical single-escape ("\(\frac{7}{9}\)"). We accept 1–2 backslashes on
 *     the delimiters and collapse doubled command backslashes inside the math so
 *     BOTH forms render identically. (Single `$` is intentionally NOT a
 *     delimiter to avoid currency false positives.)
 *  2. In the remaining plain text, normalize AI punctuation noise ("것은??" →
 *     "것은?") — never inside math, URLs, or paths.
 *  3. CONSERVATIVELY convert bare numeric fractions ("2/3", "(a+b)/2") to \frac —
 *     but never dates (2026/08/11), URLs (https://…), file paths (foo/bar.png),
 *     or spaced ratios ("1 / 43", the 문항 진행 표시). Everything else stays text.
 */

export type MathSegment =
  | { kind: "text"; text: string }
  | { kind: "math"; latex: string; display: boolean };

// \[ .. \]  |  $$ .. $$  |  \( .. \)  — 1–2 leading backslashes on each delimiter
// so a double-escaped ("\\(..\\)") string parses the same as the canonical one.
const DELIMITERS =
  /\\{1,2}\[([\s\S]+?)\\{1,2}\]|\$\$([\s\S]+?)\$\$|\\{1,2}\(([\s\S]+?)\\{1,2}\)/g;

// (group)/num  OR  num/num — NO spaces around "/" so the 문항 진행 표시 ("1 / 43")
// and spaced ratios are never touched. Boundaries validated manually below.
const FRACTION = /(\(([^()]{1,24})\)|\d{1,4})\/(\d{1,4})/g;
const BOUNDARY = /[\w./:\\$]/;

/**
 * Collapse a doubled command/delimiter backslash ("\\frac", "\\times", "\\(")
 * down to a single one, so an over-escaped payload renders like the canonical
 * form. Only collapses "\\" that is followed by a letter or opening
 * brace/paren/bracket — a genuine "\\" line break (followed by space/newline) is
 * preserved.
 */
function collapseDoubleEscapes(latex: string): string {
  return latex.replace(/\\\\(?=[A-Za-z({[])/g, "\\");
}

/** Collapse runs of repeated ?/! ("것은??" → "것은?", "정답!!!" → "정답!"). */
function normalizePunctuation(text: string): string {
  // Process token-by-token so URLs/paths (which could, in theory, hold "??") are
  // left untouched. Only same-character ?/! runs collapse.
  return text.replace(/\S+/g, (token) => {
    if (token.includes("://") || /\/\S/.test(token)) return token; // URL / path
    return token.replace(/([?!])\1+/g, "$1");
  });
}

/** Convert bare fractions in a plain-text run into text + inline-math segments. */
function convertFractions(rawText: string): MathSegment[] {
  const text = normalizePunctuation(rawText);
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
    const latex = collapseDoubleEscapes((block ?? inline ?? "").trim());
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
