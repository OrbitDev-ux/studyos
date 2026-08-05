import { Progress } from "@/components/ui/progress";

export function BattleProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100);
  return <Progress value={percent} className="h-2" />;
}
