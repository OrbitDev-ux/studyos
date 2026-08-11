import { cn } from "@/lib/utils";

/**
 * 과목 색상 칩 — 단일 구현.
 * 과목 색(subject.color)은 사용자별 임의 HEX라 고정 Badge variant로 매핑할 수 없으므로
 * 색만 인라인 변수로 주입하고, 형태·크기·타이포는 이 컴포넌트가 통일한다.
 * (기존에 problem-card 인라인 스타일 / 대시보드 회색칩 / 랜딩 하드코딩으로 갈라져 있던 것을 대체)
 */
export function SubjectChip({
  name,
  color,
  className,
}: {
  name: string;
  /** 과목 대표 색 HEX. 없으면 브랜드 primary로 대체. */
  color?: string | null;
  className?: string;
}) {
  const dot = color ?? "var(--primary)";
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        backgroundColor: color ? `${color}1f` : "color-mix(in oklch, var(--primary), transparent 88%)",
        color: color ?? "var(--primary)",
      }}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: dot }}
      />
      {name}
    </span>
  );
}
