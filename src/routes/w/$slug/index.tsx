import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ActivationPanel } from "@/components/activation-panel";
import { ChangeDigestLines } from "@/components/change-digest";
import { EmptyExposure } from "@/components/empty-exposure";
import { RunningCheck } from "@/components/running-check";
import { SummaryCounts } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { digestRunChange, previousRunFor } from "@/lib/diff";
import { formatDate, reportIdForRun, summarize } from "@/lib/format";
import { assetTypeLabel } from "@/lib/runbooks";
import {
  isOwner,
  useAppStore,
  useMembership,
  useWorkspace,
  useWorkspaceAssets,
  useWorkspaceRunbooks,
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
  const assets = useWorkspaceAssets(workspace?.id);
  const runbooks = useWorkspaceRunbooks(workspace?.id);
  const completeRun = useAppStore((state) => state.completeRun);
  const startRun = useAppStore((state) => state.startRun);
  const running = useAppStore((state) => state.running);
  const owner = isOwner(membership?.role);

  if (!workspace) return null;

  if (running?.workspaceId === workspace.id) {
    return (
      <RunningCheck
        domain={running.domain}
        checkIds={running.checkIds}
        ports={running.ports}
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

  if (runs.length === 0 && assets.length === 0) {
    return <EmptyExposure workspace={workspace} canRun={owner} />;
  }

  const latest = runs[0];
  const previous = latest ? previousRunFor(latest, runs) : undefined;
  const summary = latest ? summarize(latest.observations) : null;
  const digest = latest ? digestRunChange(latest, previous) : null;
  const attention = assets.reduce((count, asset) => {
    const run = runs.find((item) => item.assetId === asset.id);
    return count + (run ? summarize(run.observations).needsAttention : 0);
  }, 0);

  function runLatestAsset() {
    const asset = assets[0];
    if (!asset || !workspace) {
      void navigate({ to: "/w/$slug/assets/new", params: { slug } });
      return;
    }
    const runbook = runbooks.find((item) => item.id === asset.runbookId);
    if (!runbook) return;
    startRun({
      domain: asset.name,
      workspaceId: workspace.id,
      checkIds: runbook.checkIds,
      source: "workspace",
      assetId: asset.id,
      runbookId: runbook.id,
      ports: runbook.ports,
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">
        {workspace.name}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        Observe public presence across tracked assets. Reuse runbooks, keep
        history comparable, and see what changed.
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-fg-subtle">Assets</dt>
          <dd className="mt-1 text-sm">{assets.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Last run</dt>
          <dd className="mt-1 text-sm">
            {latest ? formatDate(latest.observedAt) : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Needs attention</dt>
          <dd className="mt-1 text-sm">
            {attention > 0 ? String(attention) : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Since previous</dt>
          <dd className="mt-1 text-sm">
            {digest && previous
              ? digest.totalMaterial === 1
                ? "1 change"
                : `${digest.totalMaterial} changes`
              : latest
                ? "First saved run"
                : "—"}
          </dd>
        </div>
      </dl>

      {!workspace.exposureActive && owner ? (
        <div className="mt-8">
          <ActivationPanel
            workspaceId={workspace.id}
            onActivated={() =>
              void navigate({
                to: "/w/$slug/assets",
                params: { slug },
              })
            }
            onContinue={
              latest
                ? () =>
                    void navigate({
                      to: "/w/$slug/exposure/$runId",
                      params: { slug, runId: latest.id },
                    })
                : undefined
            }
          />
        </div>
      ) : null}

      <div className="mt-8 rounded-xl border border-border bg-surface p-5 sm:p-6">
        {summary ? <SummaryCounts summary={summary} /> : null}
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-fg-muted">
          Latest snapshot
          {latest ? ` · ${latest.domain}` : ""}. Individual observations are not
          an overall security grade.
        </p>
        {digest && previous ? (
          <div className="mt-4">
            <p className="text-xs font-medium text-fg">Since previous run</p>
            <div className="mt-2">
              <ChangeDigestLines digest={digest} />
            </div>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          {owner && workspace.exposureActive ? (
            <Button onClick={runLatestAsset}>Run checks</Button>
          ) : null}
          {owner && workspace.exposureActive ? (
            <Button variant="secondary" asChild>
              <Link to="/w/$slug/assets/new" params={{ slug }}>
                Add asset
              </Link>
            </Button>
          ) : null}
          {latest ? (
            <Button variant="ghost" asChild>
              <Link
                to="/w/$slug/reports/$reportId"
                params={{ slug, reportId: reportIdForRun(latest.id) }}
              >
                View report
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium">Assets</h2>
          <Link
            to="/w/$slug/assets"
            params={{ slug }}
            className="text-xs text-fg-muted hover:text-fg"
          >
            All assets
          </Link>
        </div>
        {assets.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">No assets tracked yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {assets.map((asset) => {
              const runbook = runbooks.find((item) => item.id === asset.runbookId);
              const run = runs.find((item) => item.assetId === asset.id);
              const counts = run ? summarize(run.observations) : null;
              return (
                <li key={asset.id}>
                  <Link
                    to="/w/$slug/assets/$assetId"
                    params={{ slug, assetId: asset.id }}
                    className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-surface"
                  >
                    <span>
                      <span className="block font-mono text-sm text-fg">
                        {asset.name}
                      </span>
                      <span className="block text-xs text-fg-muted">
                        {assetTypeLabel(asset.type)}
                        {runbook ? ` · ${runbook.name}` : ""}
                      </span>
                    </span>
                    <span className="text-sm text-fg-muted">
                      {counts
                        ? `${counts.needsAttention} need attention`
                        : "Not observed"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {workspace.exposureActive ? (
        <div className="mt-6 rounded-xl border border-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Runbooks</p>
              <p className="mt-1 text-xs text-fg-muted">
                {runbooks.length} reusable profiles · coverage can improve without
                rewriting history
              </p>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link to="/w/$slug/runbooks" params={{ slug }}>
                View runbooks
              </Link>
            </Button>
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
        {runs.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">No runs yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {runs.slice(0, 3).map((run) => {
              const counts = summarize(run.observations);
              const prior = previousRunFor(run, runs);
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
                        {formatDate(run.observedAt)} · {run.domain}
                      </span>
                      <span className="block font-mono text-[11px] text-fg-subtle">
                        {run.runbookName ?? run.checkset}{" "}
                        {run.runbookVersion ?? run.checksetVersion}
                      </span>
                      {prior ? (
                        <span className="mt-1 block text-xs text-fg-muted">
                          {change.envChanged} environment · {change.checksAdded}{" "}
                          coverage
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
        )}
      </div>
    </div>
  );
}