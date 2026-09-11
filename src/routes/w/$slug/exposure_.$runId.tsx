import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ActivationPanel } from "@/components/activation-panel";
import { ChangeDigestLines } from "@/components/change-digest";
import { ObservationList } from "@/components/observation-list";
import { RunningCheck } from "@/components/running-check";
import { SummaryCounts } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { digestRunChange } from "@/lib/diff";
import { formatDateTime, reportIdForRun, summarize } from "@/lib/format";
import {
  isOwner,
  useAppStore,
  useMembership,
  useWorkspace,
  useWorkspaceRuns,
} from "@/lib/store";

export const Route = createFileRoute("/w/$slug/exposure_/$runId")({
  component: ExposureRunPage,
});

function ExposureRunPage() {
  const { slug, runId } = Route.useParams();
  const navigate = useNavigate();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const runs = useWorkspaceRuns(workspace?.id);
  const run = runs.find((item) => item.id === runId);
  const completeRun = useAppStore((state) => state.completeRun);
  const running = useAppStore((state) => state.running);
  const owner = isOwner(membership?.role);

  if (!workspace) return null;

  if (running?.workspaceId === workspace.id) {
    return (
      <RunningCheck
        domain={running.domain}
        checkIds={running.checkIds}
        onDone={() => {
          const next = completeRun();
          if (next) {
            void navigate({
              to: "/w/$slug/exposure/$runId",
              params: { slug, runId: next.id },
            });
          }
        }}
      />
    );
  }

  if (!run) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <h1 className="text-xl font-medium">Run not found</h1>
        <p className="mt-2 text-sm text-fg-muted">
          This snapshot is not in {workspace.name}.
        </p>
        <Button asChild className="mt-6" variant="secondary">
          <Link to="/w/$slug/exposure" params={{ slug }}>
            Back to history
          </Link>
        </Button>
      </div>
    );
  }

  const summary = summarize(run.observations);
  const runIndex = runs.findIndex((item) => item.id === run.id);
  const previous = runIndex >= 0 ? runs[runIndex + 1] : undefined;
  const digest = digestRunChange(run, previous);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/w/$slug/exposure"
        params={{ slug }}
        className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Run history
      </Link>
      <p className="mt-5 font-mono text-xs text-fg-subtle">{run.domain}</p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">
        External Exposure review
      </h1>
      <p className="mt-3 text-sm text-fg-muted">
        Observed {formatDateTime(run.observedAt)} · {run.checkset} ·{" "}
        {run.checksetVersion} · Observations completed: {summary.completed}/
        {summary.total}
        {run.savedAt
          ? ` · Saved to ${workspace.name} ${formatDateTime(run.savedAt)}`
          : null}
      </p>
      <p className="mt-2 text-sm text-fg-muted">
        What these public checks observed about this hostname. This is not a
        complete security assessment.
      </p>

      {!workspace.exposureActive && owner ? (
        <div className="mt-6">
          <ActivationPanel
            workspaceId={workspace.id}
            compact
            onActivated={() =>
              void navigate({
                to: "/w/$slug/exposure/new",
                params: { slug },
                search: { edit: true },
              })
            }
          />
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-border bg-surface p-5">
        <SummaryCounts summary={summary} />
        {previous ? (
          <div className="mt-4">
            <p className="text-xs font-medium text-fg">Since previous run</p>
            <div className="mt-2">
              <ChangeDigestLines digest={digest} />
            </div>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link
              to="/w/$slug/reports/$reportId"
              params={{ slug, reportId: reportIdForRun(run.id) }}
            >
              View report
            </Link>
          </Button>
          {owner && workspace.exposureActive ? (
            <Button variant="secondary" asChild>
              <Link to="/w/$slug/exposure/new" params={{ slug }}>
                Run again
              </Link>
            </Button>
          ) : null}
          <Button variant="ghost" asChild>
            <Link to="/w/$slug" params={{ slug }}>
              Back to workspace
            </Link>
          </Button>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium">Observations</h2>
        <ObservationList
          slug={slug}
          runId={run.id}
          observations={run.observations}
        />
      </div>
    </div>
  );
}
