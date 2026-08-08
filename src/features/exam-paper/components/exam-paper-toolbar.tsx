"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Screen-only toolbar above the paper: back link + "인쇄 / PDF 저장" (window.print).
 * Hidden in print (.exam-toolbar has display:none in @media print).
 */
export function ExamPaperToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="exam-toolbar">
      <Button asChild variant="ghost" size="sm" className="gap-1.5">
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          돌아가기
        </Link>
      </Button>
      <Button type="button" size="sm" className="gap-1.5" onClick={() => window.print()}>
        <Printer className="size-4" />
        인쇄 / PDF 저장
      </Button>
    </div>
  );
}
