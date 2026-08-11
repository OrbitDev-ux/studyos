/**
 * Transform a JSON Schema (z.toJSONSchema output) into the STRICT form required
 * by OpenAI-style structured-output APIs (Groq `response_format: json_schema`
 * with `strict: true`): every object must set `additionalProperties: false` AND
 * list every property in `required`. z.toJSONSchema emits optional fields the
 * other way, which strict validators reject — so make every object strict, list
 * all properties as required, widen originally-optional fields to nullable so
 * the model may still omit them (as null), and drop meta keys strict validators
 * dislike ($schema / default / min* ). The StudyOS Zod schemas are unchanged.
 */
const STRIP_KEYS = new Set(["$schema", "default", "minLength", "minItems", "maxLength", "maxItems"]);

export function toStrictJsonSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toStrictJsonSchema);
  if (!node || typeof node !== "object") return node;

  const src = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (STRIP_KEYS.has(k)) continue;
    out[k] = toStrictJsonSchema(v);
  }

  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    const props = out.properties as Record<string, Record<string, unknown>>;
    const keys = Object.keys(props);
    const originallyRequired = new Set(
      Array.isArray(out.required) ? (out.required as string[]) : [],
    );
    for (const key of keys) {
      if (!originallyRequired.has(key)) {
        const p = props[key]!;
        // Make the optional field nullable so it can be omitted (as null).
        if (typeof p.type === "string") p.type = [p.type, "null"];
      }
    }
    out.required = keys;
    out.additionalProperties = false;
  }
  return out;
}

/** Recursively drop null values so originally-optional (non-nullable) Zod fields
 * see `undefined` and validate — the mirror of toStrictJsonSchema's widening. */
export function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null) continue;
      out[k] = stripNulls(v);
    }
    return out;
  }
  return value;
}
