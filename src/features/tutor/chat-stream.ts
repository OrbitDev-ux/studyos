import { tutorReplySchema, type TutorReply } from "@/features/tutor/schema";

/**
 * Marks the boundary between the student-visible reply and the trailing
 * metadata JSON in a streamed tutor turn. Streaming forces free-form text
 * instead of generateStructured()'s JSON Schema mode (see
 * AIProvider#generateStream's doc comment for why), so understanding /
 * reviewRecommendation are carried after this marker instead of as separate
 * schema fields. The system prompt (features/tutor/ai.ts#buildStreamingSystem)
 * instructs the model to follow this convention.
 */
export const TUTOR_STREAM_SENTINEL = "\n---META---\n";

const streamMetaSchema = tutorReplySchema.omit({ reply: true });

/**
 * Splits a fully-streamed tutor reply into the student-visible text and the
 * trailing metadata. Nothing here trusts the model to actually follow the
 * sentinel convention — a missing or malformed metadata block just means the
 * reply has no understanding/reviewRecommendation, never a thrown error. This
 * is the tradeoff of streaming free text instead of a JSON-schema response:
 * the shape can't be enforced, only parsed defensively.
 */
export function splitStreamedReply(fullText: string): TutorReply {
  const idx = fullText.indexOf(TUTOR_STREAM_SENTINEL);
  if (idx === -1) return { reply: fullText.trim() };

  const reply = fullText.slice(0, idx).trim();
  const metaRaw = fullText.slice(idx + TUTOR_STREAM_SENTINEL.length).trim();
  // No body text before the sentinel — treat the whole thing as unparsed
  // rather than return an empty reply.
  if (!reply) return { reply: fullText.trim() };

  try {
    const parsed = streamMetaSchema.parse(JSON.parse(metaRaw));
    return { reply, ...parsed };
  } catch {
    return { reply };
  }
}
