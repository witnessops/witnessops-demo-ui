import { useEffect, useRef, useState } from "react";
import { PUBLIC_CHECK_IDS, stepsForIds } from "@/lib/checks";
import { portDef } from "@/lib/ports";
import { cn } from "@/lib/utils";

export function RunningCheck({
  domain,
  checkIds = PUBLIC_CHECK_IDS,
  ports = [],
  onDone,
}: {
  domain: string;
  checkIds?: string[];
  ports?: number[];
  onDone: () => void;
}) {
  const checks = stepsForIds(checkIds);
  const portSteps = ports.map((port) => {
    const def = portDef(port);
    return { id: `port-${port}`, name: `${port}/tcp ${def.name}` };
  });
  const steps = [...checks, ...portSteps];
  const [index, setIndex] = useState(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDoneRef.current();
    };
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || steps.length === 0) {
      finish();
      return;
    }
    const id = window.setInterval(() => {
      setIndex((current) => {
        if (current >= steps.length - 1) {
          window.clearInterval(id);
          window.setTimeout(finish, 280);
          return current;
        }
        return current + 1;
      });
    }, 220);
    return () => window.clearInterval(id);
  }, [steps.length]);

  return (
    <div className="mx-auto max-w-lg py-10">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">
        Observing {domain}
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        {steps.length} checks. The result is a snapshot at this time, not a
        security grade.
      </p>
      <ol className="mt-8 grid gap-1.5">
        {steps.map((step, i) => {
          const done = i < index;
          const active = i === index;
          return (
            <li
              key={step.id}
              className="flex items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    done && "bg-clear",
                    active && "bg-attention animate-pulse",
                    !done && !active && "bg-fg-subtle/40",
                  )}
                />
                <span className="truncate text-sm text-fg">{step.name}</span>
              </span>
              <span className="font-mono text-[11px] text-fg-subtle">
                {done ? "observed" : active ? "observing" : "queued"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}