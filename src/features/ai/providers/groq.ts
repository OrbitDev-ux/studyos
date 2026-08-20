import { AiGenerationError } from "@/features/ai/errors";
import type {
  AIProvider,
  GenerateInput,
  GenerateStreamInput,
} from "@/features/ai/providers/types";
import { stripNulls, toStrictJsonSchema } from "@/features/ai/providers/strict-schema";

/**
 * Groq provider — synchronous, OpenAI-compatible Chat Completions with strict
 * structured outputs. One request → one JSON response (no async task/polling),
 * so it fits the existing synchronous generateStructured model
 * and StudyOS timeouts. Prompts, Zod schemas, the generation guard, usage/
 * entitlement, and the UI are all unchanged — only the transport differs.
 *
 * Contract (Groq official docs):
 *  - POST https://api.groq.com/openai/v1/chat/completions
 *  - Authorization: Bearer <GROQ_API_KEY>
 *  - response_format: { type:"json_schema", json_schema:{ name, strict:true, schema } }
 *    (strict schemas: all-required + additionalProperties:false → see toStrictJsonSchema)
 *  - Strict structured output models: openai/gpt-oss-120b / openai/gpt-oss-20b.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Default to the larger strict-capable model; override via GROQ_MODEL.
const DEFAULT_MODEL = "openai/gpt-oss-120b";

function backoff(attempt: number): Promise<void> {
  const ms = Math.min(500 * 2 ** attempt, 8000) * (0.5 + Math.random());
  return new Promise((r) => setTimeout(r, ms));
}

export class GroqProvider implements AIProvider {
  readonly name = "groq";

  private apiKey(): string {
    const key = process.env.GROQ_API_KEY?.trim();
    if (!key) {
      // Config problem — classified as "auth" so it reads as a setup issue.
      throw new AiGenerationError(
        "auth",
        "AI 서비스 설정에 문제가 있어요. 관리자에게 문의해주세요.",
      );
    }
    return key;
  }

  async generate(input: GenerateInput): Promise<unknown> {
    const key = this.apiKey();
    const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
    const body = JSON.stringify({
      model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "studyos_output",
          strict: true,
          schema: toStrictJsonSchema(input.jsonSchema),
        },
      },
      temperature: 0.7,
    });

    const retries = Math.max(0, input.retryAttempts);
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body,
          signal: AbortSignal.timeout(input.timeoutMs),
        });

        if (res.ok) {
          const json = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const content = json.choices?.[0]?.message?.content;
          if (!content) {
            throw new AiGenerationError(
              "failed",
              "AI 응답이 비어 있어요. 잠시 후 다시 시도해주세요.",
            );
          }
          // stripNulls: the strict schema widened optional fields to nullable, so
          // drop nulls before the caller's (still-optional) Zod validation.
          return stripNulls(JSON.parse(content));
        }

        // Retry transient statuses (429 rate limit, 5xx); fail fast on 4xx.
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          lastErr = Object.assign(new Error(`Groq HTTP ${res.status}`), {
            status: res.status,
          });
          await backoff(attempt);
          continue;
        }
        // Non-retryable / exhausted → throw with status for classifyAiError.
        const errBody = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw Object.assign(
          new Error(errBody?.error?.message ?? `Groq HTTP ${res.status}`),
          {
            status: res.status,
          },
        );
      } catch (err) {
        // AiGenerationError (empty response) / abort / network. Retry transient.
        if (err instanceof AiGenerationError) throw err;
        lastErr = err;
        if (attempt < retries) {
          await backoff(attempt);
          continue;
        }
        throw err;
      }
    }
    throw (
      lastErr ??
      new AiGenerationError("failed", "AI 요청에 실패했어요. 잠시 후 다시 시도해주세요.")
    );
  }

  async *generateStream(input: GenerateStreamInput): AsyncGenerator<string, void, void> {
    const key = this.apiKey();
    const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
    const body = JSON.stringify({
      model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt },
      ],
      stream: true,
      temperature: 0.7,
    });

    // Retries only cover connecting/establishing the stream — once the first
    // chunk has reached the caller, a retry would duplicate text the student
    // has already seen, so a mid-stream failure is surfaced as-is instead.
    const CONNECT_RETRIES = 1;
    let res: Response | undefined;
    for (let attempt = 0; attempt <= CONNECT_RETRIES; attempt++) {
      const candidate = await fetch(GROQ_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body,
        signal: AbortSignal.timeout(input.timeoutMs),
      });
      if (candidate.ok) {
        res = candidate;
        break;
      }
      if (
        (candidate.status === 429 || candidate.status >= 500) &&
        attempt < CONNECT_RETRIES
      ) {
        await backoff(attempt);
        continue;
      }
      const errBody = (await candidate.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw Object.assign(
        new Error(errBody?.error?.message ?? `Groq HTTP ${candidate.status}`),
        {
          status: candidate.status,
        },
      );
    }
    if (!res || !res.body) {
      throw new AiGenerationError(
        "failed",
        "AI 응답이 비어 있어요. 잠시 후 다시 시도해주세요.",
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice("data:".length).trim();
          if (payload === "[DONE]") return;
          let parsed: { choices?: { delta?: { content?: string } }[] };
          try {
            parsed = JSON.parse(payload);
          } catch {
            // Ignore malformed/partial keep-alive lines rather than aborting
            // an otherwise-healthy stream over one unparsable event.
            continue;
          }
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
