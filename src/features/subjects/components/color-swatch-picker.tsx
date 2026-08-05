"use client";

import { SUBJECT_COLOR_PALETTE } from "@/features/subjects/constants";
import { cn } from "@/lib/utils";

export function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUBJECT_COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          className={cn(
            "ring-offset-background size-7 rounded-full ring-offset-2 transition-transform",
            value === color && "ring-ring scale-110 ring-2",
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
