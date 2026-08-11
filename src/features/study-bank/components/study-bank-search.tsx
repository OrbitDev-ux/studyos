"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  buildStudyBankHref,
  type StudyBankParams,
} from "@/features/study-bank/search-params";

/** Debounced search box → updates the `q` URL param (server re-filters). */
export function StudyBankSearch({ params }: { params: StudyBankParams }) {
  const router = useRouter();
  const [value, setValue] = useState(params.q);
  // Track the param so external changes (reset, back button) sync the input.
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
      router.push(buildStudyBankHref(params, { q: value }));
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="search"
        aria-label="문제 검색"
        placeholder="문제, 개념, 단원을 검색하세요."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}
