import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ActivationPanel } from "@/components/activation-panel";
import { AssetRow } from "@/components/asset-row";
import { EmptyExposure } from "@/components/empty-exposure";
import { RunningCheck } from "@/components/running-check";
import { Button } from "@/components/ui/button";
import {
  deservesAttention,
  returnSummaryLines,
  snapshotsFor,
  sortSnapshots,
  usesProfileCopy,
  workspaceReturnSummary,
  worthChecking,
} from "@/lib/asset-status";
import { newlyObservedCopy } from "@/lib/format";
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

  const snapshots = sortSnapshots(snapshotsFor(assets, runs, runbooks));
  const stats = workspaceReturnSummary(snapshots);
  const summaryLines = returnSummaryLines(stats);
  const attention = snapshots.filter(deservesAttention);
  const other = snapshots.filter((snapshot) => !deservesAttention(snapshot));
  const checking = worthChecking(snapshots);
  const hasHistory = snapshots.some((snapshot) => snapshot.previous);

  function runSnapshot(assetId: string) {
    const snapshot = snapshots.find((item) => item.asset.id === assetId);
    if (!workspace || !snapshot?.runbook) return;
    startRun({
      domain: snapshot.asset.name,
      workspaceId: workspace.id,
      checkIds: snapshot.runbook.checkIds,
      source: "workspace",
      assetId: snapshot.asset.id,
      runbookId: snapshot.runbook.id,
      ports: snapshot.runbook.ports,
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">
        {workspace.name}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        Keep track of what the outside world can observe.
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-fg-subtle">Assets</dt>
          <dd className="mt-1 text-sm">{assets.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Needs attention</dt>
          <dd className="mt-1 text-sm">
            {stats.attentionNow > 0 ? String(stats.attentionNow) : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Since last observation</dt>
          <dd className="mt-1 text-sm">
            {stats.newExposure > 0
              ? newlyObservedCopy(stats.newExposure)
              : stats.envAssets > 0
                ? stats.envAssets === 1
                  ? "1 environment change"
                  : `${stats.envAssets} environment changes`
                : "No material change"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Coverage</dt>
          <dd className="mt-1 text-sm">
            {stats.coverage > 0
              ? stats.coverage === 1
                ? "Improved on 1 asset"
                : `Improved on ${stats.coverage} assets`
              : "Unchanged"}
          </dd>
        </div>
      </dl>

      {hasHistory && summaryLines.length > 0 ? (
        <section className="mt-8 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">Since your last observations</h2>
          <ul className="mt-3 grid gap-1.5 text-sm text-fg-muted">
            {summaryLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

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
              runs[0]
                ? () =>
                    void navigate({
                      to: "/w/$slug/exposure/$runId",
                      params: { slug, runId: runs[0]!.id },
                    })
                : undefined
            }
          />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-2">
        {owner && workspace.exposureActive ? (
          <Button asChild>
            <Link to="/w/$slug/assets/new" params={{ slug }}>
              Add asset
            </Link>
          </Button>
        ) : null}
        <Button variant="secondary" asChild>
          <Link to="/w/$slug/assets" params={{ slug }}>
            View all assets
          </Link>
        </Button>
      </div>

      {attention.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium">Needs attention</h2>
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {attention.map((snapshot) => (
              <li key={snapshot.asset.id}>
                <AssetRow slug={slug} snapshot={snapshot} actionLabel="Open" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {other.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium">Other assets</h2>
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {other.map((snapshot) => (
              <li key={snapshot.asset.id}>
                <AssetRow slug={slug} snapshot={snapshot} />
              </li>
            ))}
          </ul>
        </section>
      ) : assets.length === 0 ? (
        <p className="mt-10 text-sm text-fg-muted">No assets tracked yet.</p>
      ) : null}

      {checking.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium">Worth checking</h2>
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {checking.map(({ snapshot, reason, verb }) => (
              <li
                key={snapshot.asset.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
              >
                <span>
                  <span className="block font-mono text-sm text-fg">
                    {snapshot.asset.name}
                  </span>
                  <span className="mt-1 block text-xs text-fg-muted">{reason}</span>
                </span>
                {verb === "run" && owner && workspace.exposureActive ? (
                  <span className="grid justify-items-end gap-1">
                    <Button
                      onClick={() => runSnapshot(snapshot.asset.id)}
                    >
                      Run again
                    </Button>
                    <span className="text-xs text-fg-subtle">
                      {usesProfileCopy(snapshot.runbook)}
                    </span>
                  </span>
                ) : (
                  <Button variant="secondary" asChild>
                    <Link
                      to="/w/$slug/assets/$assetId"
                      params={{ slug, assetId: snapshot.asset.id }}
                    >
                      Open
                    </Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
