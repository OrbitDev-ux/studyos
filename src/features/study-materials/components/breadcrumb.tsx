import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buildStudyMaterialsHref } from "@/features/study-materials/search-params";

export function MaterialsBreadcrumb({
  path,
  rootLabel,
}: {
  path: { id: string; name: string }[];
  rootLabel: string;
}) {
  return (
    <nav className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
      <Link href="/study-materials" className="hover:text-foreground">
        {rootLabel}
      </Link>
      {path.map((folder) => (
        <span key={folder.id} className="flex items-center gap-1">
          <ChevronRight className="size-3.5 shrink-0" />
          <Link
            href={buildStudyMaterialsHref({ folder: folder.id })}
            className="hover:text-foreground"
          >
            {folder.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}
