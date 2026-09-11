import { Check } from "lucide-react";
import {
  CHECK_CATALOG,
  CHECK_GROUPS,
  OPTIONAL_CHECK_IDS,
  ALL_CHECK_IDS,
} from "@/lib/checks";
import { cn } from "@/lib/utils";

export function CheckPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const selectedSet = new Set(selected);

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      if (selected.length === 1) return;
      onChange(selected.filter((item) => item !== id));
      return;
    }
    onChange([...selected, id]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Choose what to check</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-xs text-fg-muted hover:text-fg"
            onClick={() => onChange([...ALL_CHECK_IDS])}
          >
            Select all
          </button>
          <button
            type="button"
            className="text-xs text-fg-muted hover:text-fg"
            onClick={() =>
              onChange(selected.filter((id) => !OPTIONAL_CHECK_IDS.includes(id)))
            }
          >
            Clear optional checks
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-6">
        {CHECK_GROUPS.map((group) => {
          const checks = CHECK_CATALOG.filter((check) => check.group === group.id);
          return (
            <section key={group.id}>
              <h3 className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
                {group.label}
              </h3>
              <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                {checks.map((check) => {
                  const on = selectedSet.has(check.id);
                  return (
                    <li key={check.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggle(check.id)}
                        className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-surface"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                            on
                              ? "border-accent bg-accent text-accent-fg"
                              : "border-border-strong bg-transparent",
                          )}
                        >
                          {on ? <Check className="size-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm text-fg">{check.name}</span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-fg-muted">
                            {check.blurb}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
