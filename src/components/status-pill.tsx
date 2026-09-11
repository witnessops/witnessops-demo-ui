import { statusLabel } from "@/lib/format";
import type { DiffLabel, ObservationStatus, Summary } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusVariant = {
  clear: "clear",
  needs_attention: "attention",
  informational: "info",
  undetermined: "undetermined",
} as const;

export function StatusPill({
  status,
  className,
  onPaper = false,
  label,
}: {
  status: ObservationStatus;
  className?: string;
  onPaper?: boolean;
  label?: string;
}) {
  const variant = onPaper
    ? ({
        clear: "paperClear",
        needs_attention: "paperAttention",
        informational: "paperInfo",
        undetermined: "paperUndetermined",
      } as const)[status]
    : statusVariant[status];
  return (
    <Badge variant={variant} className={className}>
      {label ?? statusLabel(status)}
    </Badge>
  );
}

export function DiffPill({ label }: { label: DiffLabel }) {
  const map = {
    changed: { className: "bg-attention-dim text-attention", text: "Changed" },
    unchanged: { className: "bg-surface text-fg-muted border border-border", text: "Unchanged" },
    new_check: { className: "bg-info-dim text-info", text: "New check" },
    no_longer_checked: {
      className: "bg-undetermined-dim text-undetermined",
      text: "No longer checked",
    },
    undetermined: {
      className: "bg-undetermined-dim text-undetermined",
      text: "Undetermined",
    },
  } as const;
  const item = map[label];
  return (
    <span
      className={cn(
        "inline-flex rounded-sm px-2 py-0.5 text-xs font-medium",
        item.className,
      )}
    >
      {item.text}
    </span>
  );
}

export function SummaryCounts({
  summary,
  compact = false,
  onPaper = false,
}: {
  summary: Summary;
  compact?: boolean;
  onPaper?: boolean;
}) {
  const items = [
    {
      label: "Need attention",
      value: summary.needsAttention,
      className: onPaper ? "text-attention-ink" : "text-attention",
    },
    {
      label: "Clear",
      value: summary.clear,
      className: onPaper ? "text-clear-ink" : "text-clear",
    },
    {
      label: "Informational",
      value: summary.informational,
      className: onPaper ? "text-info-ink" : "text-info",
    },
    {
      label: "Undetermined",
      value: summary.undetermined,
      className: onPaper ? "text-undetermined-ink" : "text-undetermined",
    },
  ];

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2">
          <span
            className={cn(
              "font-medium tabular-nums",
              compact ? "text-sm" : "text-xl",
              item.className,
            )}
          >
            {item.value}
          </span>
          <span className="text-xs text-fg-muted">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
