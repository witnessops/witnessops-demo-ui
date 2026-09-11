import { Check } from "lucide-react";
import {
  CHECK_CATALOG,
  CHECK_GROUPS,
  OPTIONAL_CHECK_IDS,
  type CheckDef,
  type CheckGroup,
} from "@/lib/checks";
import { cn } from "@/lib/utils";

export function CheckPicker({
  selected,
  onChange,
  catalog = CHECK_CATALOG,
  groups = CHECK_GROUPS,
  optionalIds,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  catalog?: CheckDef[];
  groups?: CheckGroup[];
  optionalIds?: string[];
}) {
  const selectedSet = new Set(selected);
  const allIds = catalog.map((check) => check.id);
  const optional = optionalIds ?? OPTIONAL_CHECK_IDS.filter((id) => allIds.includes(id));

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
        <p className="text-sm font-medium">Checks</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-xs text-fg-muted hover:text-fg"
            onClick={() => onChange([...allIds])}
          >
            Select all
          </button>
          <button
            type="button"
            className="text-xs text-fg-muted hover:text-fg"
            onClick={() =>
              onChange(selected.filter((id) => !optional.includes(id)))
            }
          >
            Clear optional checks
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-6">
        {groups.map((group) => {
          const checks = catalog.filter((check) => check.group === group.id);
          if (checks.length === 0) return null;
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