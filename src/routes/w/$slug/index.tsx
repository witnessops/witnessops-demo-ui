import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { EmptyExposure } from "@/components/empty-exposure";
import { RunningCheck } from "@/components/running-check";
import { SummaryCounts } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { formatDate, reportIdForRun, summarize } from "@/lib/format";
import {
  isOwner,
  useAppStore,
  useMembership,
  useWorkspace,
  useWorkspaceRuns,
} from "@/lib/store";

export const Route = createFileRoute("/w/$slug/")({
  component: WorkspaceOverview,
});

function WorkspaceOverview() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const runs = useWorkspaceRuns(workspace?.id);
  const startRun = useAppStore((state) => state.startRun);
  const completeRun = useAppStore((state) => state.completeRun);
  const running = useAppStore((state) => state.running);
  const owner = isOwner(membership?.role);

  if (!workspace) return null;

  if (running?.workspaceId === workspace.id) {
    return (
      <RunningCheck
        domain={running.domain}
        onDone={() => {
          const run = completeRun();
          if (run) {
            void navigate({
              to: "/w/$slug/exposure/$runId",
              params: { slug, runId: run.id },
            });
          }
        }}
      />
    );
  }

  if (runs.length === 0) {
    return <EmptyExposure workspace={workspace} canRun={owner} />;
  }

  const latest = runs[0]!;
  const summary = summarize(latest.observations);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">
            {workspace.primaryDomain}
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Last checked {formatDate(latest.observedAt)} ·{" "}
            {summary.completed} public checks completed
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <SummaryCounts summary={summary} />
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-fg-muted">
          What ten public checks observed about this hostname. Individual
          observations are not an overall security grade.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link
              to="/w/$slug/exposure/$runId"
              params={{ slug, runId: latest.id }}
            >
              Open review
            </Link>
          </Button>
          {owner ? (
            <Button
              variant="secondary"
              onClick={() =>
                startRun({
                  domain: workspace.primaryDomain,
                  workspaceId: workspace.id,
                })
              }
            >
              Run again
            </Button>
          ) : null}
          <Button variant="ghost" asChild>
            <Link
              to="/w/$slug/reports/$reportId"
              params={{ slug, reportId: reportIdForRun(latest.id) }}
            >
              View report
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium">Recent runs</h2>
          <Link
            to="/w/$slug/exposure"
            params={{ slug }}
            className="text-xs text-fg-muted hover:text-fg"
          >
            All history
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {runs.slice(0, 3).map((run) => {
            const counts = summarize(run.observations);
            return (
              <li key={run.id}>
                <Link
                  to="/w/$slug/exposure/$runId"
                  params={{ slug, runId: run.id }}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface"
                >
                  <span>
                    <span className="block text-sm text-fg">
                      {formatDate(run.observedAt)}
                    </span>
                    <span className="block font-mono text-[11px] text-fg-subtle">
                      {run.checkset}
                    </span>
                  </span>
                  <span className="text-sm text-attention">
                    {counts.needsAttention} need attention
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
