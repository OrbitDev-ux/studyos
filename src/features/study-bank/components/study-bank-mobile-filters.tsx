"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { StudyBankFilters } from "@/features/study-bank/components/study-bank-filters";
import type { StudyBankFacets } from "@/features/study-bank/queries";
import { hasActiveFilters, type StudyBankParams } from "@/features/study-bank/search-params";

/** Mobile: filters live in a drawer behind a button (desktop uses the sidebar). */
export function StudyBankMobileFilters({
  params,
  facets,
}: {
  params: StudyBankParams;
  facets: StudyBankFacets;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 lg:hidden">
          <SlidersHorizontal className="size-4" />
          필터
          {hasActiveFilters(params) && (
            <span className="bg-primary size-1.5 rounded-full" aria-hidden />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 max-w-[80vw]">
        <SheetHeader>
          <SheetTitle>필터</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <StudyBankFilters
            params={params}
            facets={facets}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
