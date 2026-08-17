import { describe, expect, it } from "vitest";
import {
  descendantIds,
  flattenFolderTree,
  type FlatFolder,
} from "@/features/study-materials/folder-tree";

const folders: FlatFolder[] = [
  { id: "math", name: "수학", parentId: null },
  { id: "english", name: "영어", parentId: null },
  { id: "math-algebra", name: "대수", parentId: "math" },
  { id: "math-geometry", name: "기하", parentId: "math" },
  { id: "math-algebra-basics", name: "기초", parentId: "math-algebra" },
];

describe("flattenFolderTree", () => {
  it("returns an empty list for no folders", () => {
    expect(flattenFolderTree([])).toEqual([]);
  });

  it("lists root folders at depth 0", () => {
    const result = flattenFolderTree([
      { id: "a", name: "A", parentId: null },
      { id: "b", name: "B", parentId: null },
    ]);
    expect(result).toEqual([
      { id: "a", name: "A", depth: 0 },
      { id: "b", name: "B", depth: 0 },
    ]);
  });

  it("orders children directly after their parent, depth-first", () => {
    const result = flattenFolderTree(folders);
    const ids = result.map((f) => f.id);
    const mathIndex = ids.indexOf("math");
    const algebraIndex = ids.indexOf("math-algebra");
    const englishIndex = ids.indexOf("english");
    // english (another root) must come after math's whole subtree, not
    // interleaved with it.
    expect(mathIndex).toBeLessThan(algebraIndex);
    expect(algebraIndex).toBeLessThan(englishIndex);
  });

  it("assigns increasing depth for nested folders", () => {
    const result = flattenFolderTree(folders);
    const byId = new Map(result.map((f) => [f.id, f.depth]));
    expect(byId.get("math")).toBe(0);
    expect(byId.get("math-algebra")).toBe(1);
    expect(byId.get("math-algebra-basics")).toBe(2);
  });

  it("sorts siblings alphabetically", () => {
    const result = flattenFolderTree(folders);
    const roots = result.filter((f) => f.depth === 0).map((f) => f.name);
    expect(roots).toEqual([...roots].sort((a, b) => a.localeCompare(b)));
  });
});

describe("descendantIds", () => {
  it("includes the folder itself even with no children", () => {
    expect(descendantIds(folders, "english")).toEqual(new Set(["english"]));
  });

  it("includes all nested descendants", () => {
    const result = descendantIds(folders, "math");
    expect(result).toEqual(
      new Set(["math", "math-algebra", "math-geometry", "math-algebra-basics"]),
    );
  });

  it("excludes siblings and ancestors", () => {
    const result = descendantIds(folders, "math-algebra");
    expect(result.has("math")).toBe(false);
    expect(result.has("math-geometry")).toBe(false);
    expect(result.has("english")).toBe(false);
  });
});
