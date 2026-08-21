import { describe, expect, it } from "vitest";
import {
  buildProblemsHref,
  parseProblemsParams,
  type ProblemsParams,
} from "@/features/problems/search-params";

const base = (over: Partial<ProblemsParams> = {}): ProblemsParams => ({
  tab: "all",
  subjectId: "",
  page: 1,
  ...over,
});

describe("parseProblemsParams", () => {
  it("returns safe defaults for empty input", () => {
    expect(parseProblemsParams({})).toEqual(base());
  });

  it("rejects an invalid tab and a bad page", () => {
    const p = parseProblemsParams({ tab: "nope", page: "-3" });
    expect(p.tab).toBe("all");
    expect(p.page).toBe(1);
  });

  it("parses valid values", () => {
    const p = parseProblemsParams({ tab: "favorites", subjectId: "subj-1", page: "3" });
    expect(p).toEqual(base({ tab: "favorites", subjectId: "subj-1", page: 3 }));
  });

  it("takes the first value of array params", () => {
    expect(parseProblemsParams({ tab: ["favorites", "all"] }).tab).toBe("favorites");
  });
});

describe("buildProblemsHref", () => {
  it("omits default values", () => {
    expect(buildProblemsHref(base())).toBe("/problems");
  });

  it("serializes only non-default params", () => {
    expect(buildProblemsHref(base({ tab: "favorites", subjectId: "s1" }))).toBe(
      "/problems?tab=favorites&subjectId=s1",
    );
  });

  it("resets page to 1 when a filter changes", () => {
    const href = buildProblemsHref(base({ page: 5 }), { subjectId: "s1" });
    expect(href).toContain("subjectId=s1");
    expect(href).not.toContain("page=");
  });

  it("keeps the page when page is explicitly overridden", () => {
    expect(buildProblemsHref(base(), { page: 4 })).toBe("/problems?page=4");
  });

  it("resets page to 1 for a tab change too — favorites can have far fewer pages than all", () => {
    const href = buildProblemsHref(base({ page: 2 }), { tab: "favorites" });
    expect(href).toContain("tab=favorites");
    expect(href).not.toContain("page=");
  });

  it("keeps an explicit page override even alongside a tab change", () => {
    const href = buildProblemsHref(base({ page: 2 }), { tab: "favorites", page: 3 });
    expect(href).toContain("tab=favorites");
    expect(href).toContain("page=3");
  });
});
