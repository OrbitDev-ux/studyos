import { FileImage, FileText } from "lucide-react";
import type { MaterialType } from "@/features/study-materials/constants";
import { cn } from "@/lib/utils";

export function MaterialIcon({ type, className }: { type: string; className?: string }) {
  const Icon = (type as MaterialType) === "IMAGE" ? FileImage : FileText;
  return <Icon className={cn("size-4", className)} />;
}
