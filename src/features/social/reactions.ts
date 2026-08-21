/**
 * Fixed quick-reaction set. Server-validated allow-list (reactToMessage
 * rejects anything outside this), not free-text emoji input — keeps
 * MessageReaction.emoji a small, predictable set without needing an emoji
 * picker dependency. Extending this list later is a pure addition, no
 * migration needed (emoji is a plain string column).
 */
export const QUICK_REACTIONS = ["❤️", "👍", "😂", "🔥", "😮", "😢"] as const;
export type ReactionEmoji = (typeof QUICK_REACTIONS)[number];

export function isQuickReaction(value: string): value is ReactionEmoji {
  return (QUICK_REACTIONS as readonly string[]).includes(value);
}
