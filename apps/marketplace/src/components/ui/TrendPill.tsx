import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Trend } from "@/lib/derived";
import { Badge } from "./primitives";

export function TrendPill({ trend, delta, className }: { trend: Trend; delta?: number | null; className?: string }) {
  const tone = trend === "improving" ? "positive" : trend === "deteriorating" ? "negative" : "neutral";
  const Icon = trend === "improving" ? ArrowUpRight : trend === "deteriorating" ? ArrowDownRight : Minus;
  const label = trend === "improving" ? "Rising" : trend === "deteriorating" ? "Falling" : "Stable";
  return (
    <Badge tone={tone} className={className}>
      <Icon size={11} strokeWidth={2.5} />
      {label}
      {delta != null && <span className="tnum opacity-80">{delta > 0 ? "+" : ""}{delta.toFixed(1)}</span>}
    </Badge>
  );
}
