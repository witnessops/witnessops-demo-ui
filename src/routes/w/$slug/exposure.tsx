import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyExposure } from "@/components/empty-exposure";
import { DiffPill, SummaryCounts } from "@/components/status-pill";
import { checksetChanged, diffRuns } from "@/lib/diff";
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
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">Run history</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        Completed runs are immutable snapshots. A difference between runs may
        be a change on the hostname, or a change in the checkset.
      </p>
      <ol className="mt-8 grid gap-3">
        {runs.map((run, index) => {
          const previous = runs[index + 1];
          const summary = summarize(run.observations);
          const diffs = diffRuns(run, previous);
          const changed = diffs.filter((row) => row.label === "changed").length;
          const methodChanged = checksetChanged(run, previous);
          const newChecks = diffs.filter((row) => row.label === "new_check").length;
          const dropped = diffs.filter((row) => row.label === "no_longer_checked").length;
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
                      Run #{number}
                    </p>
                    <h2 className="mt-1 text-lg font-medium tracking-tight">
                      {formatDate(run.observedAt)}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-fg-subtle">
                      {run.checkset} · {run.initiator}
                    </p>
                  </div>
                  <SummaryCounts summary={summary} compact />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {previous && changed > 0 ? (
                    <DiffPill label="changed" />
                  ) : previous ? (
                    <DiffPill label="unchanged" />
                  ) : null}
                  {methodChanged ? <DiffPill label="new_check" /> : null}
                  {previous && newChecks > 0 && !methodChanged ? (
                    <span className="text-xs text-info">{newChecks} new check</span>
                  ) : null}
                  {previous && dropped > 0 ? (
                    <span className="text-xs text-undetermined">
                      {dropped} no longer checked
                    </span>
                  ) : null}
                </div>
                {methodChanged ? (
                  <p className="mt-3 text-xs leading-relaxed text-fg-muted">
                    Checkset changed from {previous?.checksetVersion} to{" "}
                    {run.checksetVersion}. Some differences are method changes,
                    not changes on the hostname.
                  </p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
