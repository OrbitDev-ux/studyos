import { afterEach, describe, expect, it } from "vitest";
import { stripNulls, toStrictJsonSchema } from "@/features/ai/providers/strict-schema";
import { activeProviderName } from "@/features/ai/providers";

describe("toStrictJsonSchema (strict structured-output schema)", () => {
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
    const out = toStrictJsonSchema(input) as Record<string, unknown>;
    expect(out.$schema).toBeUndefined();
    expect(out.additionalProperties).toBe(false);
    expect(out.required).toEqual(["prompt", "answerText"]);
    const props = out.properties as Record<string, Record<string, unknown>>;
    expect(props.prompt!.minLength).toBeUndefined();
    expect(props.prompt!.type).toBe("string");
    expect(props.answerText!.type).toEqual(["string", "null"]); // optional → nullable
  });

  it("strips 'default' (rejected by strict validators) and recurses nested objects", () => {
    const input = {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { a: { type: "string" }, tier: { type: "string", default: "x" } },
            required: ["a"],
          },
        },
      },
      required: ["items"],
    };
    const out = toStrictJsonSchema(input) as Record<string, unknown>;
    const nested = (out.properties as Record<string, Record<string, unknown>>).items!.items as Record<string, unknown>;
    expect(nested.additionalProperties).toBe(false);
    expect(nested.required).toEqual(["a", "tier"]);
    const nprops = nested.properties as Record<string, Record<string, unknown>>;
    expect(nprops.tier!.default).toBeUndefined();
  });
});

describe("stripNulls", () => {
  it("removes null values so optional Zod fields see undefined", () => {
    expect(stripNulls({ prompt: "q", answerText: null })).toEqual({ prompt: "q" });
  });
  it("recurses arrays and nested objects", () => {
    expect(
      stripNulls({ problems: [{ prompt: "a", answerText: null }, { prompt: "b", answerText: "x" }] }),
    ).toEqual({ problems: [{ prompt: "a" }, { prompt: "b", answerText: "x" }] });
  });
});

describe("activeProviderName (AI_PROVIDER selection)", () => {
  const original = process.env.AI_PROVIDER;
  afterEach(() => {
    if (original === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = original;
  });

  it("defaults to groq when unset or unknown", () => {
    delete process.env.AI_PROVIDER;
    expect(activeProviderName()).toBe("groq");
    process.env.AI_PROVIDER = "manus"; // removed provider → falls back to groq
    expect(activeProviderName()).toBe("groq");
  });

  it("selects gemini only when explicitly set (case-insensitive)", () => {
    process.env.AI_PROVIDER = "gemini";
    expect(activeProviderName()).toBe("gemini");
    process.env.AI_PROVIDER = "GEMINI";
    expect(activeProviderName()).toBe("gemini");
    process.env.AI_PROVIDER = "groq";
    expect(activeProviderName()).toBe("groq");
  });
});
