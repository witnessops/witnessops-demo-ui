import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COMMON_PORTS, normalizePort, portDef } from "@/lib/ports";
import { cn } from "@/lib/utils";

export function PortPicker({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (ports: number[]) => void;
}) {
  const [custom, setCustom] = useState("");
  const selectedSet = new Set(selected);
  const extra = selected.filter(
    (port) => !COMMON_PORTS.some((item) => item.port === port),
  );

  function toggle(port: number) {
    if (selectedSet.has(port)) {
      if (selected.length === 1) return;
      onChange(selected.filter((item) => item !== port));
      return;
    }
    onChange([...selected, port].sort((a, b) => a - b));
  }

  function addCustom(event: React.FormEvent) {
    event.preventDefault();
    const port = normalizePort(custom);
    if (!port) return;
    if (!selectedSet.has(port)) {
      onChange([...selected, port].sort((a, b) => a - b));
    }
    setCustom("");
  }

  const rows = [...COMMON_PORTS, ...extra.map((port) => portDef(port))];

  return (
    <div>
      <p className="text-sm font-medium">Common services</p>
      <p className="mt-1 text-xs text-fg-muted">
        Bounded TCP reachability only. This is not a port range or internet-wide
        scan.
      </p>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
        {rows.map((item) => {
          const on = selectedSet.has(item.port);
          return (
            <li key={item.port}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(item.port)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-surface"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                    on
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border-strong bg-transparent",
                  )}
                >
                  {on ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
                <span className="font-mono text-sm text-fg">{item.port}/tcp</span>
                <span className="text-xs text-fg-muted">{item.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <form className="mt-3 flex gap-2" onSubmit={addCustom}>
        <Input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Add port"
          inputMode="numeric"
          aria-label="Add port"
        />
        <Button type="submit" variant="secondary">
          Add port
        </Button>
      </form>
    </div>
  );
}