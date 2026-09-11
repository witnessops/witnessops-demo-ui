import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-surface text-fg-muted border border-border",
        clear: "bg-clear-dim text-clear",
        attention: "bg-attention-dim text-attention",
        info: "bg-info-dim text-info",
        undetermined: "bg-undetermined-dim text-undetermined",
        owner: "bg-surface text-fg border border-border",
        viewer: "bg-bg-raised text-fg-muted border border-border",
        coming: "bg-transparent text-fg-subtle border border-border",
        paperClear: "bg-clear-ink/10 text-clear-ink",
        paperAttention: "bg-attention-ink/10 text-attention-ink",
        paperInfo: "bg-info-ink/10 text-info-ink",
        paperUndetermined: "bg-undetermined-ink/10 text-undetermined-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
