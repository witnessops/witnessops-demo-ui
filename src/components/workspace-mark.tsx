import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function WorkspaceMark({
  name,
  mark,
  size = "md",
}: {
  name: string;
  mark: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm font-medium text-bg",
        size === "sm" ? "size-6 text-[10px]" : "size-8 text-xs",
      )}
      style={{ backgroundColor: mark }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
