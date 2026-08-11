import { afterEach, describe, expect, it } from "vitest";
import {
  extractStructuredValue,
  stripNulls,
  toManusSchema,
} from "@/features/ai/providers/manus";
import { activeProviderName } from "@/features/ai/providers";

describe("toManusSchema (Manus strict structured-output schema)", () => {
  it("makes every object strict: all props required + additionalProperties:false", () => {
    const input = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        prompt: { type: "string", minLength: 1 },
        answerText: { type: "string" }, // optional (not in required)
      },
      required: ["prompt"],
    };
    const out = toManusSchema(input) as Record<string, unknown>;
    expect(out.$schema).toBeUndefined(); // meta stripped
    expect(out.additionalProperties).toBe(false);
    expect(out.required).toEqual(["prompt", "answerText"]); // all required now
    const props = out.properties as Record<string, Record<string, unknown>>;
    expect(props.prompt!.minLength).toBeUndefined(); // meta stripped
    expect(props.prompt!.type).toBe("string"); // originally required → unchanged
    expect(props.answerText!.type).toEqual(["string", "null"]); // optional → nullable
  });

  it("recurses into nested arrays/objects", () => {
    const input = {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { a: { type: "string" }, b: { type: "boolean" } },
            required: ["a", "b"],
          },
        },
      },
      required: ["items"],
    };
    const out = toManusSchema(input) as Record<string, unknown>;
    const nested = (out.properties as Record<string, Record<string, unknown>>).items!.items as Record<string, unknown>;
    expect(nested.additionalProperties).toBe(false);
    expect(nested.required).toEqual(["a", "b"]);
  });
});

describe("stripNulls", () => {
  it("removes null values so optional Zod fields see undefined", () => {
    expect(
      stripNulls({ prompt: "q", answerText: null, choices: null }),
    ).toEqual({ prompt: "q" });
  });
  it("recurses arrays and nested objects", () => {
    expect(
      stripNulls({ problems: [{ prompt: "a", answerText: null }, { prompt: "b", answerText: "x" }] }),
    ).toEqual({ problems: [{ prompt: "a" }, { prompt: "b", answerText: "x" }] });
  });
});

describe("extractStructuredValue (Manus structured_output_result)", () => {
  it("returns the value from the structured_output_result event", () => {
    const messages = [
      { type: "assistant_message" },
      { type: "structured_output_result", structured_output_result: { success: true, value: { problems: [1, 2] }, error: null } },
    ];
    const r = extractStructuredValue(messages);
    expect(r).toEqual({ found: true, value: { problems: [1, 2] } });
  });

  it("returns the value even when success is false (docs: value always present)", () => {
    const messages = [
      { type: "structured_output_result", structured_output_result: { success: false, value: { x: 1 }, error: "partial" } },
    ];
    const r = extractStructuredValue(messages);
    expect(r).toEqual({ found: true, value: { x: 1 } });
  });

  it("reports not-found when there is no structured_output_result event", () => {
    expect(extractStructuredValue([{ type: "assistant_message" }])).toEqual({ found: false });
    expect(extractStructuredValue([])).toEqual({ found: false });
  });
});

describe("activeProviderName (AI_PROVIDER selection)", () => {
  const original = process.env.AI_PROVIDER;
  afterEach(() => {
    if (original === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = original;
  });

  it("defaults to manus when unset or unknown", () => {
    delete process.env.AI_PROVIDER;
    expect(activeProviderName()).toBe("manus");
    process.env.AI_PROVIDER = "something-else";
    expect(activeProviderName()).toBe("manus");
  });

  it("selects gemini only when explicitly set (case-insensitive)", () => {
    process.env.AI_PROVIDER = "gemini";
    expect(activeProviderName()).toBe("gemini");
    process.env.AI_PROVIDER = "GEMINI";
    expect(activeProviderName()).toBe("gemini");
    process.env.AI_PROVIDER = "manus";
    expect(activeProviderName()).toBe("manus");
  });
});
