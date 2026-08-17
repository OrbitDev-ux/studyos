export type FlatFolder = { id: string; name: string; parentId: string | null };
export type FolderTreeItem = { id: string; name: string; depth: number };

function groupByParent(folders: FlatFolder[]): Map<string | null, FlatFolder[]> {
  const byParent = new Map<string | null, FlatFolder[]>();
  for (const folder of folders) {
    const list = byParent.get(folder.parentId) ?? [];
    list.push(folder);
    byParent.set(folder.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return byParent;
}

/** A flat list of folders in depth-first order with a `depth` for indentation —
 * used to render the whole nested tree as a flat "move to folder" picker. */
export function flattenFolderTree(folders: FlatFolder[]): FolderTreeItem[] {
  const byParent = groupByParent(folders);
  const result: FolderTreeItem[] = [];

  function visit(parentId: string | null, depth: number) {
    for (const folder of byParent.get(parentId) ?? []) {
      result.push({ id: folder.id, name: folder.name, depth });
      visit(folder.id, depth + 1);
    }
  }
  visit(null, 0);
  return result;
}

/** `folderId` plus every descendant of it — used to exclude a folder and its
 * own subtree from its own "move to" picker (moving a folder into its own
 * child would create a cycle). */
export function descendantIds(folders: FlatFolder[], folderId: string): Set<string> {
  const byParent = groupByParent(folders);
  const result = new Set<string>([folderId]);

  function visit(id: string) {
    for (const child of byParent.get(id) ?? []) {
      if (!result.has(child.id)) {
        result.add(child.id);
        visit(child.id);
      }
    }
  }
  visit(folderId);
  return result;
}
