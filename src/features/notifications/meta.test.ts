import { describe, expect, it } from "vitest";
import { getMessages } from "@/features/i18n/messages";
import { resolveNotificationText } from "@/features/notifications/meta";
import type { NotificationListItem } from "@/features/notifications/types";

const t = getMessages("ko-KR").notifications;

function row(overrides: Partial<NotificationListItem>): Parameters<typeof resolveNotificationText>[1] {
  return {
    type: "friend_request",
    title: "DB fallback title",
    body: null,
    metadata: null,
    ...overrides,
  };
}

describe("resolveNotificationText", () => {
  it("renders friend_request from metadata.actorName, in the viewer's locale", () => {
    const result = resolveNotificationText(
      t,
      row({ type: "friend_request", metadata: { actorName: "Alice" } }),
    );
    expect(result.title).toBe("Alice님이 친구 요청을 보냈어요");
    expect(result.body).toBeNull();
  });

  it("falls back to a generic name when metadata has no actorName", () => {
    const result = resolveNotificationText(t, row({ type: "friend_request", metadata: null }));
    expect(result.title).toBe(`${t.someone}님이 친구 요청을 보냈어요`);
  });

  it("renders dm_message with the actor name and the stored preview as body", () => {
    const result = resolveNotificationText(
      t,
      row({ type: "dm_message", metadata: { actorName: "Bob" }, body: "안녕하세요!" }),
    );
    expect(result.title).toBe("Bob님의 새 메시지");
    expect(result.body).toBe("안녕하세요!");
  });

  it("renders battle_invite_response differently for accepted vs declined", () => {
    const accepted = resolveNotificationText(
      t,
      row({ type: "battle_invite_response", metadata: { actorName: "Carol", accepted: true } }),
    );
    expect(accepted.title).toBe("Carol님이 배틀 초대를 수락했어요");

    const declined = resolveNotificationText(
      t,
      row({ type: "battle_invite_response", metadata: { actorName: "Carol", accepted: false } }),
    );
    expect(declined.title).toBe("Carol님이 배틀 초대를 거절했어요");
  });

  it("passes system_announcement's title/body through unchanged (admin-authored, no template)", () => {
    const result = resolveNotificationText(
      t,
      row({ type: "system_announcement", title: "점검 안내", body: "오늘 밤 점검이 있어요." }),
    );
    expect(result).toEqual({ title: "점검 안내", body: "오늘 밤 점검이 있어요." });
  });

  it("ignores a non-string actorName in metadata rather than rendering [object Object]", () => {
    const result = resolveNotificationText(
      t,
      row({ type: "friend_request", metadata: { actorName: { nested: true } } }),
    );
    expect(result.title).toBe(`${t.someone}님이 친구 요청을 보냈어요`);
  });

  it("renders a display name containing '$&' literally instead of duplicating the matched text", () => {
    // Regression: actorName is another user's freely-chosen display name.
    // String.replace(pattern, someString) interprets `$&` inside someString
    // as "insert the whole match" — a plain (non-function) replacer would
    // turn "$&" into "{name}" here, and other $-specials would corrupt the
    // recipient's notification text in worse ways (Codebase audit).
    const result = resolveNotificationText(
      t,
      row({ type: "friend_request", metadata: { actorName: "$&" } }),
    );
    expect(result.title).toBe("$&님이 친구 요청을 보냈어요");
  });
});
