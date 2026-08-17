"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/features/i18n/provider";
import {
  buildStudyMaterialsHref,
  type StudyMaterialsParams,
} from "@/features/study-materials/search-params";

/** Debounced search box → updates the `q` URL param (server re-filters),
 * matching features/study-bank/components/study-bank-search.tsx's pattern. */
export function MaterialsSearchBar({ params }: { params: StudyMaterialsParams }) {
  const router = useRouter();
  const { messages } = useI18n();
  const t = messages.materials;

  const [value, setValue] = useState(params.q);
  const lastParam = useRef(params.q);

  useEffect(() => {
    if (params.q !== lastParam.current) {
      lastParam.current = params.q;
      setValue(params.q);
    }
  }, [params.q]);

  useEffect(() => {
    if (value === params.q) return;
    const id = setTimeout(() => {
      lastParam.current = value;
      router.push(buildStudyMaterialsHref({ q: value }));
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="search"
        aria-label={t.searchPlaceholder}
        placeholder={t.searchPlaceholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}
