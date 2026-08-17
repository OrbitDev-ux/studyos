"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  flattenFolderTree,
  type FlatFolder,
} from "@/features/study-materials/folder-tree";

export function FolderPicker({
  folders,
  value,
  onChange,
  excludeIds,
  rootLabel,
  placeholder,
}: {
  folders: FlatFolder[];
  /** null = root ("내 자료"). */
  value: string | null;
  onChange: (folderId: string | null) => void;
  /** Folder ids to hide from the list (e.g. a folder being moved + its own subtree). */
  excludeIds?: Set<string>;
  rootLabel: string;
  placeholder: string;
}) {
  const items = flattenFolderTree(folders).filter((f) => !excludeIds?.has(f.id));

  return (
    <Select
      value={value ?? "__root__"}
      onValueChange={(next) => onChange(next === "__root__" ? null : next)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__root__">{rootLabel}</SelectItem>
        {items.map((folder) => (
          <SelectItem key={folder.id} value={folder.id}>
            {"　".repeat(folder.depth)}
            {folder.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
