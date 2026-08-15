import { describe, expect, it } from "vitest";
import { chunk, isCategoryEnabled, isOwnedBy } from "@/features/notifications/service-core";

describe("isCategoryEnabled", () => {
  it("treats null/missing preferences as fully enabled (opt-out model)", () => {
    expect(isCategoryEnabled(null, "dm")).toBe(true);
    expect(isCategoryEnabled(undefined, "friend")).toBe(true);
    expect(isCategoryEnabled({}, "study")).toBe(true);
  });

  it("respects an explicit false", () => {
    expect(isCategoryEnabled({ dm: false }, "dm")).toBe(false);
  });

  it("does not disable other categories when one is off", () => {
    expect(isCategoryEnabled({ dm: false }, "friend")).toBe(true);
  });

  it("treats an explicit true the same as missing", () => {
    expect(isCategoryEnabled({ system: true }, "system")).toBe(true);
  });
});

describe("chunk", () => {
  it("splits evenly-divisible arrays", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("keeps a smaller last batch", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns one batch when size exceeds the array length", () => {
    expect(chunk([1, 2], 500)).toEqual([[1, 2]]);
  });

  it("returns an empty array for empty input", () => {
    expect(chunk([], 10)).toEqual([]);
  });

  it("rejects a non-positive chunk size rather than looping forever", () => {
    expect(() => chunk([1, 2], 0)).toThrow();
  });
});

describe("isOwnedBy", () => {
  it("is true only when the ids match exactly", () => {
    expect(isOwnedBy("user-1", "user-1")).toBe(true);
    expect(isOwnedBy("user-1", "user-2")).toBe(false);
  });
});
