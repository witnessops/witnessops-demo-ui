import { cn } from "@/lib/utils";

export function WitnessMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-5", className)}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.25"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      <path
        d="M12 3.6v2.1M12 18.3v2.1M3.6 12h2.1M18.3 12h2.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-medium tracking-tight text-fg",
        className,
      )}
    >
      <WitnessMark className={markClassName} />
      WitnessOps
    </span>
  );
}
