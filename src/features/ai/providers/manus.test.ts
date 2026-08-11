import { afterEach, describe, expect, it } from "vitest";
import { extractStructuredValue } from "@/features/ai/providers/manus";
import { activeProviderName } from "@/features/ai/providers";

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
