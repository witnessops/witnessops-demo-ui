import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { formatDateTime } from "@/lib/format";
import type { Observation } from "@/lib/types";

export function ObservationList({
  slug,
  runId,
  observations,
}: {
  slug: string;
  runId: string;
  observations: Observation[];
}) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {observations.map((obs) => (
        <li key={obs.id}>
          <Link
            to="/w/$slug/exposure/$runId/$obsId"
            params={{ slug, runId, obsId: obs.id }}
            className="flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-surface-hover sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-fg">{obs.name}</p>
                <StatusPill status={obs.status} label={obs.statusLabel} />
              </div>
              <p className="mt-1 text-xs text-fg-subtle">{obs.category}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                {obs.summary}
              </p>
            </div>
            <span className="hidden shrink-0 pt-1 font-mono text-[11px] text-fg-subtle sm:block">
              {formatDateTime(obs.observedAt)}
            </span>
            <ChevronRight className="mt-1 size-4 shrink-0 text-fg-subtle" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
