import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ActivationPanel } from "@/components/activation-panel";
import { ChangeDigestLines } from "@/components/change-digest";
import { EmptyExposure } from "@/components/empty-exposure";
import { RunningCheck } from "@/components/running-check";
import { SummaryCounts } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { digestRunChange } from "@/lib/diff";
import {
  cadenceLabel,
  profileCountLabel,
} from "@/lib/checks";
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
  const previous = runs[1];
  const summary = summarize(latest.observations);
  const digest = digestRunChange(latest, previous);
  const profileCount = workspace.checkProfile.checkIds.length;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">
        {workspace.primaryDomain}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        See what is publicly observable about your external presence and what
        changed since the last check.
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-fg-subtle">Profile</dt>
          <dd className="mt-1 text-sm">{profileCountLabel(profileCount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Last checked</dt>
          <dd className="mt-1 text-sm">{formatDate(latest.observedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Needs attention</dt>
          <dd className="mt-1 text-sm">
            {summary.needsAttention > 0
              ? String(summary.needsAttention)
              : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Since previous</dt>
          <dd className="mt-1 text-sm">
            {previous
              ? digest.totalMaterial === 1
                ? "1 change"
                : `${digest.totalMaterial} changes`
              : "First saved run"}
          </dd>
        </div>
      </dl>

      {!workspace.exposureActive && owner ? (
        <div className="mt-8">
          <ActivationPanel
            workspaceId={workspace.id}
            onActivated={() =>
              void navigate({
                to: "/w/$slug/exposure/new",
                params: { slug },
                search: { edit: true },
              })
            }
            onContinue={() =>
              void navigate({
                to: "/w/$slug/exposure/$runId",
                params: { slug, runId: latest.id },
              })
            }
          />
        </div>
      ) : null}

      <div className="mt-8 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <SummaryCounts summary={summary} />
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-fg-muted">
          What these public checks observed about this hostname. Individual
          observations are not an overall security grade.
        </p>
        {previous ? (
          <div className="mt-4">
            <p className="text-xs font-medium text-fg">Since previous run</p>
            <div className="mt-2">
              <ChangeDigestLines digest={digest} />
            </div>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link
              to="/w/$slug/exposure/$runId"
              params={{ slug, runId: latest.id }}
            >
              Open review
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
            <Link
              to="/w/$slug/reports/$reportId"
              params={{ slug, reportId: reportIdForRun(latest.id) }}
            >
              View report
            </Link>
          </Button>
        </div>
      </div>

      {workspace.exposureActive ? (
        <div className="mt-6 rounded-xl border border-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Monitoring profile</p>
              <p className="mt-1 text-xs text-fg-muted">
                {profileCountLabel(profileCount)} · {cadenceLabel(workspace.checkProfile.cadence)}
              </p>
            </div>
            {owner ? (
              <Button variant="secondary" size="sm" asChild>
                <Link
                  to="/w/$slug/exposure/new"
                  params={{ slug }}
                  search={{ edit: true }}
                >
                  Edit checks
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

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
          {runs.slice(0, 3).map((run, index) => {
            const counts = summarize(run.observations);
            const prior = runs[index + 1];
            const change = digestRunChange(run, prior);
            return (
              <li key={run.id}>
                <Link
                  to="/w/$slug/exposure/$runId"
                  params={{ slug, runId: run.id }}
                  className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-surface"
                >
                  <span>
                    <span className="block text-sm text-fg">
                      {formatDate(run.observedAt)}
                    </span>
                    <span className="block font-mono text-[11px] text-fg-subtle">
                      {run.checkIds.length} checks · {run.checkset}
                    </span>
                    {prior ? (
                      <span className="mt-1 block text-xs text-fg-muted">
                        {change.newObservations} new · {change.resolvedAttention}{" "}
                        no longer observed
                      </span>
                    ) : null}
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
