import { createFileRoute, Link } from "@tanstack/react-router";
import { ChangeDigestLines } from "@/components/change-digest";
import { EmptyExposure } from "@/components/empty-exposure";
import { SummaryCounts } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { digestRunChange, previousRunFor } from "@/lib/diff";
import { formatDate, summarize } from "@/lib/format";
import { runbookLabelFromRun } from "@/lib/runbooks";
import { isOwner, useMembership, useWorkspace, useWorkspaceRuns } from "@/lib/store";

export const Route = createFileRoute("/w/$slug/exposure")({
  component: ExposureHistoryPage,
});

function ExposureHistoryPage() {
  const { slug } = Route.useParams();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const runs = useWorkspaceRuns(workspace?.id);
  const owner = isOwner(membership?.role);

  if (!workspace) return null;

  if (runs.length === 0) {
    return <EmptyExposure workspace={workspace} canRun={owner} />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">Run history</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/w/$slug/runbooks" params={{ slug }}>
              Runbooks
            </Link>
          </Button>
          {owner && workspace.exposureActive ? (
            <Button asChild variant="secondary" size="sm">
              <Link to="/w/$slug/assets" params={{ slug }}>
                Run again
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        Completed runs are immutable snapshots. Environment change is what
        changed on the asset. Coverage change is what the runbook checked.
      </p>
      <p className="mt-2 text-xs text-fg-subtle">
        Coverage improves. History stays comparable. New checks can be added to
        future runs without changing previous evidence.
      </p>
      <ol className="mt-8 grid gap-3">
        {runs.map((run, index) => {
          const previous = previousRunFor(run, runs);
          const summary = summarize(run.observations);
          const digest = digestRunChange(run, previous);
          const number = /(?:^run-|-)(\d+)$/.exec(run.id)?.[1] ?? String(runs.length - index);
          return (
            <li key={run.id}>
              <Link
                to="/w/$slug/exposure/$runId"
                params={{ slug, runId: run.id }}
                className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-fg-subtle">
                      {index === 0
                        ? "Latest run"
                        : index === 1
                          ? "Previous run"
                          : `Run #${number}`}
                    </p>
                    <h2 className="mt-1 text-lg font-medium tracking-tight">
                      {formatDate(run.observedAt)}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-fg-subtle">
                      {run.domain} · {runbookLabelFromRun(run)} · {run.initiator}
                    </p>
                  </div>
                  <SummaryCounts summary={summary} compact />
                </div>
                {previous ? (
                  <div className="mt-4">
                    <ChangeDigestLines digest={digest} />
                  </div>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}