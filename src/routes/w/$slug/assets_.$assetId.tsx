import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ChangeDigestLines } from "@/components/change-digest";
import { ObservationList } from "@/components/observation-list";
import { RunningCheck } from "@/components/running-check";
import { Button } from "@/components/ui/button";
import { digestRunChange, previousRunFor } from "@/lib/diff";
import {
  attentionCopy,
  changeCopy,
  formatDate,
  reportIdForRun,
  summarize,
} from "@/lib/format";
import {
  assetTypeLabel,
  methodLabel,
  profileName,
} from "@/lib/runbooks";
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

  const latest = runs[0];
  const previous = latest ? previousRunFor(latest, runs) : undefined;
  const summary = latest ? summarize(latest.observations) : null;
  const digest = latest ? digestRunChange(latest, previous) : null;
  const servicesObserved = latest
    ? latest.observations.filter(
        (obs) => obs.id.startsWith("port-") && obs.statusLabel === "Observed",
      ).length
    : 0;
  const assetName = asset.name;
  const workspaceId = workspace.id;
  const assetKey = asset.id;
  const envChanges = digest && previous ? digest.envChanged : 0;

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
      <p className="mt-3 text-sm text-fg-muted">
        {latest
          ? `Last observed ${formatDate(latest.observedAt)}`
          : "Not observed yet"}
        {summary ? ` · ${attentionCopy(summary.needsAttention)}` : null}
        {previous && envChanges > 0
          ? ` · ${changeCopy(envChanges)} since previous run`
          : previous
            ? " · No material change since previous run"
            : null}
      </p>
      {runbook ? (
        <p className="mt-1 text-xs text-fg-subtle">
          Checks: {profileName(runbook)}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {owner && workspace.exposureActive ? (
          <Button onClick={runNow}>
            {latest ? "Run again" : "Observe"}
          </Button>
        ) : null}
        {latest ? (
          <Button variant="secondary" asChild>
            <Link
              to="/w/$slug/exposure/$runId"
              params={{ slug, runId: latest.id }}
            >
              View results
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

      {latest && summary ? (
        <div className="mt-8 rounded-xl border border-border bg-surface p-5">
          {runbook?.templateId === "public-services" ? (
            <p className="text-sm text-fg-muted">
              {servicesObserved} public services observed. A reachable service is
              not automatically a vulnerability.
            </p>
          ) : (
            <p className="text-sm text-fg-muted">
              See what changed since your last observation. Individual
              observations are not an overall security grade.
            </p>
          )}
          {digest && previous ? (
            <div className="mt-4">
              <ChangeDigestLines digest={digest} />
            </div>
          ) : null}
          {runbook ? (
            <p className="mt-4 text-xs text-fg-subtle">
              Method · {methodLabel(runbook)}
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
          <h2 className="mb-3 text-sm font-medium">Latest observations</h2>
          <ObservationList
            slug={slug}
            runId={latest.id}
            observations={latest.observations}
          />
        </div>
      ) : null}
    </div>
  );
}
