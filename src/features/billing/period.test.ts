import { describe, expect, it } from "vitest";
import { addOneMonthClamped } from "@/features/billing/period";

describe("addOneMonthClamped", () => {
  it("adds a month for a mid-month date", () => {
    expect(addOneMonthClamped(new Date("2026-03-15T00:00:00Z")).toISOString()).toBe(
      "2026-04-15T00:00:00.000Z",
    );
  });

  it("clamps Jan 31 to Feb 28 in a non-leap year", () => {
    expect(addOneMonthClamped(new Date("2027-01-31T00:00:00Z")).toISOString()).toBe(
      "2027-02-28T00:00:00.000Z",
    );
  });

  it("clamps Jan 31 to Feb 29 in a leap year", () => {
    expect(addOneMonthClamped(new Date("2028-01-31T00:00:00Z")).toISOString()).toBe(
      "2028-02-29T00:00:00.000Z",
    );
  });

  it("rolls Dec into Jan of the next year", () => {
    expect(addOneMonthClamped(new Date("2026-12-10T00:00:00Z")).toISOString()).toBe(
      "2027-01-10T00:00:00.000Z",
    );
  });
});
