"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { parseMathSegments } from "@/features/problems/math/latex";
import { cn } from "@/lib/utils";

/**
 * The single shared math/text renderer for StudyOS. Renders explicit LaTeX the
 * AI emits (\(..\), \[..\], $$..$$) plus conservatively-detected bare fractions
 * (see parseMathSegments) via KaTeX; everything else is plain text with the
 * existing whitespace-pre-wrap behavior. Used everywhere a problem's prompt /
 * choices / answer / explanation appears, so math looks consistent across the app.
 *
 * KaTeX runs synchronously (SSR + client, identical output). Block math scrolls
 * horizontally so long expressions never overflow on mobile. Invalid LaTeX
 * renders in place (throwOnError:false) instead of crashing.
 */
export function MathText({
  children,
  className,
}: {
  children: string | null | undefined;
  className?: string;
}) {
  const source = children ?? "";
  const segments = parseMathSegments(source);

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {segments.map((seg, i) => {
        if (seg.kind === "text") return <span key={i}>{seg.text}</span>;
        const html = katex.renderToString(seg.latex, {
          displayMode: seg.display,
          throwOnError: false,
          // KaTeX output is generated from the LaTeX itself and is safe to inject;
          // trust:false (default) blocks \href etc.
        });
        return seg.display ? (
          <span
            key={i}
            className="my-1 block overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
        );
      })}
    </span>
  );
}
