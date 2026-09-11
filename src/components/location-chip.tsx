import { cn } from "@/lib/utils";

export function LocationChip({
  host,
  path,
  className,
}: {
  host: "witnessops.com" | "app.witnessops.com";
  path: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "truncate font-mono text-[11px] text-fg-subtle",
        className,
      )}
      title={`${host}${path}`}
    >
      <span className="text-fg-muted">{host}</span>
      {path}
    </p>
  );
}
