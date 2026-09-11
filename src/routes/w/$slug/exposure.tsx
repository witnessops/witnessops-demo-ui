import { createFileRoute, Link } from "@tanstack/react-router";
import { ChangeDigestLines } from "@/components/change-digest";
import { EmptyExposure } from "@/components/empty-exposure";
import { SummaryCounts } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { digestRunChange } from "@/lib/diff";
import { formatDate, summarize } from "@/lib/format";
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
        {owner && workspace.exposureActive ? (
          <Button asChild variant="secondary" size="sm">
            <Link to="/w/$slug/exposure/new" params={{ slug }}>
              Run again
            </Link>
          </Button>
        ) : null}
      </div>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        Completed runs are immutable snapshots. A difference between runs may
        be a change on the hostname, or a change in the check profile.
      </p>
      <ol className="mt-8 grid gap-3">
        {runs.map((run, index) => {
          const previous = runs[index + 1];
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
                      {run.checkIds.length} checks · {run.checkset} · {run.initiator}
                    </p>
                  </div>
                  <SummaryCounts summary={summary} compact />
                </div>
                {previous ? (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-fg">Since previous run</p>
                    <div className="mt-2">
                      <ChangeDigestLines digest={digest} />
                    </div>
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
