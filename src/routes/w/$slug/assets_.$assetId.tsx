import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ChangeDigestLines, CompactHistory } from "@/components/change-digest";
import { ObservationList } from "@/components/observation-list";
import { RunningCheck } from "@/components/running-check";
import { Button } from "@/components/ui/button";
import {
  buildAssetSnapshot,
  sortObservationsForReturn,
  usesProfileCopy,
} from "@/lib/asset-status";
import { diffRuns } from "@/lib/diff";
import {
  attentionCopy,
  compactChange,
  formatDate,
  newlyObservedCopy,
  reportIdForRun,
} from "@/lib/format";
import { assetTypeLabel } from "@/lib/runbooks";
import {
  isOwner,
  useAppStore,
  useAssetRuns,
  useMembership,
  useWorkspace,
  useWorkspaceRunbooks,
} from "@/lib/store";

export const Route = createFileRoute("/w/$slug/assets_/$assetId")({
  component: AssetPage,
});

function AssetPage() {
  const { slug, assetId } = Route.useParams();
  const navigate = useNavigate();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const owner = isOwner(membership?.role);
  const assets = useAppStore((state) => state.assets);
  const asset = assets.find((item) => item.id === assetId);
  const runbooks = useWorkspaceRunbooks(workspace?.id);
  const runs = useAssetRuns(asset?.id);
  const startRun = useAppStore((state) => state.startRun);
  const completeRun = useAppStore((state) => state.completeRun);
  const running = useAppStore((state) => state.running);
  const runbook = runbooks.find((item) => item.id === asset?.runbookId);

  if (!workspace) return null;

  if (running?.workspaceId === workspace.id) {
    return (
      <RunningCheck
        domain={running.domain}
        checkIds={running.checkIds}
        ports={running.ports}
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

  if (!asset) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <h1 className="text-xl font-medium">Asset not found</h1>
        <Button asChild className="mt-6" variant="secondary">
          <Link to="/w/$slug/assets" params={{ slug }}>
            Back to assets
          </Link>
        </Button>
      </div>
    );
  }

  const snapshot = buildAssetSnapshot(asset, runs, runbook);
  const { latest, previous, digest, summary, stale, observedLabel, nextAction } =
    snapshot;
  const diffs = latest ? diffRuns(latest, previous) : [];
  const observations = latest
    ? sortObservationsForReturn(latest.observations, diffs)
    : [];
  const assetName = asset.name;
  const workspaceId = workspace.id;
  const assetKey = asset.id;
  const quietNext =
    nextAction?.label === "No material change. No action needed.";

  function runNow() {
    if (!runbook) return;
    startRun({
      domain: assetName,
      workspaceId,
      checkIds: runbook.checkIds,
      source: "workspace",
      assetId: assetKey,
      runbookId: runbook.id,
      ports: runbook.ports,
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/w/$slug/assets"
        params={{ slug }}
        className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Assets
      </Link>
      <p className="mt-5 font-mono text-xs text-fg-subtle">
        {assetTypeLabel(asset.type)}
      </p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">{asset.name}</h1>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-fg-subtle">Last observed</dt>
          <dd className="mt-1 text-sm">
            {latest ? formatDate(latest.observedAt) : "Not yet"}
          </dd>
          <dd className="mt-0.5 text-xs text-fg-muted">
            {observedLabel}
            {stale ? " · May be stale" : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Current state</dt>
          <dd className="mt-1 text-sm">
            {summary ? attentionCopy(summary.needsAttention) : "Not observed"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Since previous run</dt>
          <dd className="mt-1 text-sm">
            {previous
              ? compactChange(digest, true)
              : latest
                ? "First observation"
                : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap items-start gap-2">
        {owner && workspace.exposureActive ? (
          <div>
            <Button onClick={runNow}>{latest ? "Run again" : "Observe"}</Button>
            {runbook ? (
              <p className="mt-2 max-w-[16rem] text-xs text-fg-subtle">
                {usesProfileCopy(runbook)}
              </p>
            ) : null}
          </div>
        ) : null}
        {latest ? (
          <Button variant="secondary" asChild>
            <Link
              to="/w/$slug/exposure/$runId"
              params={{ slug, runId: latest.id }}
            >
              Open latest results
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {runbook ? (
          <Link
            to="/w/$slug/runbooks/$runbookId"
            params={{ slug, runbookId: runbook.id }}
            search={{ asset: asset.id }}
            className="text-fg-muted hover:text-fg"
          >
            Edit checks
          </Link>
        ) : null}
        <Link
          to="/w/$slug/exposure"
          params={{ slug }}
          search={{ asset: asset.id }}
          className="text-fg-muted hover:text-fg"
        >
          History
        </Link>
        {latest ? (
          <Link
            to="/w/$slug/reports/$reportId"
            params={{ slug, reportId: reportIdForRun(latest.id) }}
            className="text-fg-muted hover:text-fg"
          >
            Report
          </Link>
        ) : null}
      </div>

      {nextAction ? (
        <p
          className={`mt-6 text-sm ${quietNext ? "text-fg-subtle" : "text-fg-muted"}`}
        >
          {quietNext ? nextAction.label : `Next useful action · ${nextAction.label}`}
        </p>
      ) : null}

      {latest && summary ? (
        <div className="mt-8 rounded-xl border border-border bg-surface p-5">
          {digest && previous ? (
            <ChangeDigestLines digest={digest} />
          ) : (
            <p className="text-sm text-fg-muted">
              {runbook?.templateId === "public-services"
                ? `${snapshot.servicesObserved} public services observed. A reachable service is not automatically a vulnerability.`
                : "See what changed since your last observation. Individual observations are not an overall security grade."}
            </p>
          )}
          {snapshot.priority === "coverage" ? (
            <p className="mt-4 text-xs text-fg-subtle">
              Coverage improves over time. Previous evidence stays intact.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-fg-muted">
            Recommended checks are already selected. Observe this asset to keep
            the first snapshot.
          </p>
        </div>
      )}

      {latest ? (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-medium">Current observations</h2>
          {digest && digest.newAttention > 0 ? (
            <p className="mb-3 text-xs text-fg-muted">
              {newlyObservedCopy(digest.newAttention)} since the previous run.
            </p>
          ) : null}
          <ObservationList
            slug={slug}
            runId={latest.id}
            observations={observations}
            diffs={previous ? diffs : undefined}
          />
        </div>
      ) : null}

      {runs.length > 0 ? (
        <div className="mt-10">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-sm font-medium">History</h2>
            <Link
              to="/w/$slug/exposure"
              params={{ slug }}
              search={{ asset: asset.id }}
              className="text-xs text-fg-muted hover:text-fg"
            >
              View all
            </Link>
          </div>
          <CompactHistory slug={slug} runs={runs} />
        </div>
      ) : null}
    </div>
  );
}
