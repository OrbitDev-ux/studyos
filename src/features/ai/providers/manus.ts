import { AiGenerationError } from "@/features/ai/errors";
import type { AIProvider, GenerateInput } from "@/features/ai/providers/types";

/**
 * Manus provider (https://open.manus.ai/docs). Manus is ASYNC: create a task,
 * poll task.detail until it stops, then read the structured_output_result from
 * task.listMessages. We keep it synchronous from StudyOS's point of view (the
 * server action awaits the poll loop within its maxDuration budget), so the
 * existing generation guard / usage / UI stay unchanged.
 *
 * Contract (verified from the official v2 docs):
 *  - Auth header:  x-manus-api-key: <key>
 *  - POST /v2/task.create  { message: { content }, structured_output_schema } -> { task_id }
 *  - GET  /v2/task.detail?task_id=..  -> task.status ∈ running|waiting|stopped|error
 *  - GET  /v2/task.listMessages?task_id=..  -> messages[]; the event with
 *    type === "structured_output_result" carries { success, value, error }.
 */

const MANUS_BASE = "https://api.manus.ai/v2";
const POLL_INTERVAL_MS = 2000;
const LIST_PAGE_LIMIT = 200;
const MAX_LIST_PAGES = 10;

type ManusMessage = {
  type?: string;
  structured_output_result?: { success?: boolean; value?: unknown; error?: string | null };
};

/** Pure: find the structured_output_result value in a messages page. Exported
 * for unit tests. Returns { found, value } — value conforms to the schema even
 * when success is false (per the docs). */
export function extractStructuredValue(
  messages: ManusMessage[],
): { found: true; value: unknown } | { found: false } {
  for (const m of messages) {
    if (m?.type === "structured_output_result" && m.structured_output_result) {
      return { found: true, value: m.structured_output_result.value };
    }
  }
  return { found: false };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class ManusProvider implements AIProvider {
  readonly name = "manus";

  private apiKey(): string {
    const key = process.env.MANUS_API_KEY?.trim();
    if (!key) {
      // Config problem — classified as "auth" so it reads as a setup issue, not
      // a transient one. Never logs the (absent) key.
      throw new AiGenerationError(
        "auth",
        "AI 서비스 설정에 문제가 있어요. 관리자에게 문의해주세요.",
      );
    }
    return key;
  }

  /** One Manus HTTP call. Throws an Error carrying the HTTP status so the caller
   * classifies it (401 -> auth, 429 -> rate, 5xx -> unavailable). Never surfaces
   * the raw provider body to the user. */
  private async call(
    path: string,
    init: { method: "GET" | "POST"; key: string; body?: unknown; timeoutMs: number },
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), init.timeoutMs);
    try {
      const res = await fetch(`${MANUS_BASE}${path}`, {
        method: init.method,
        headers: { "x-manus-api-key": init.key, "content-type": "application/json" },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: controller.signal,
      });
      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok || (json && json.ok === false)) {
        const err = (json?.error ?? {}) as { message?: string };
        const e = new Error(err.message ?? `Manus HTTP ${res.status}`);
        (e as { status?: number }).status = res.status;
        throw e;
      }
      return json ?? {};
    } finally {
      clearTimeout(timer);
    }
  }

  async generate(input: GenerateInput): Promise<unknown> {
    const key = this.apiKey();
    const deadline = Date.now() + input.timeoutMs;

    // 1) Create the task. Manus has no separate system field, so the StudyOS
    // system prompt is prepended to the content (minimal wrapping only). The
    // JSON shape is enforced by structured_output_schema, not by rewording.
    const created = await this.call("/task.create", {
      method: "POST",
      key,
      timeoutMs: Math.min(30_000, input.timeoutMs),
      body: {
        message: { content: `${input.system}\n\n${input.prompt}` },
        structured_output_schema: input.jsonSchema,
        hide_in_task_list: true,
        locale: "ko",
      },
    });
    const taskId = created.task_id;
    if (typeof taskId !== "string") {
      throw new AiGenerationError("failed", "AI 요청에 실패했어요. 잠시 후 다시 시도해주세요.");
    }

    // 2) Poll until the task stops (or errors / times out).
    let status = "running";
    while (Date.now() < deadline) {
      const detail = await this.call(
        `/task.detail?task_id=${encodeURIComponent(taskId)}`,
        { method: "GET", key, timeoutMs: 15_000 },
      );
      status = String((detail.task as { status?: string } | undefined)?.status ?? "running");
      if (status === "stopped") break;
      if (status === "error") {
        throw new AiGenerationError("failed", "AI 생성에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
      // "waiting" would require interactive input, which one-shot generation
      // never provides — treat as unusable.
      if (status === "waiting") {
        throw new AiGenerationError("failed", "AI 생성을 완료하지 못했어요. 다시 시도해주세요.");
      }
      await sleep(POLL_INTERVAL_MS);
    }
    if (status !== "stopped") {
      throw new AiGenerationError(
        "unavailable",
        "AI 생성이 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.",
      );
    }

    // 3) Read the structured output from the message history (paginate defensively).
    let cursor: string | undefined;
    for (let page = 0; page < MAX_LIST_PAGES; page++) {
      const qs =
        `/task.listMessages?task_id=${encodeURIComponent(taskId)}&limit=${LIST_PAGE_LIMIT}` +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
      const list = await this.call(qs, { method: "GET", key, timeoutMs: 15_000 });
      const messages = Array.isArray(list.messages) ? (list.messages as ManusMessage[]) : [];
      const found = extractStructuredValue(messages);
      if (found.found) return found.value;
      if (list.has_more === true && typeof list.next_cursor === "string") {
        cursor = list.next_cursor;
      } else {
        break;
      }
    }
    // Stopped but no structured output produced.
    throw new AiGenerationError("failed", "AI 응답 형식이 올바르지 않아요. 다시 시도해주세요.");
  }
}
