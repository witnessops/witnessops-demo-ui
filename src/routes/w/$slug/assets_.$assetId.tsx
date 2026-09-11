import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ChangeDigestLines } from "@/components/change-digest";
import { ObservationList } from "@/components/observation-list";
import { RunningCheck } from "@/components/running-check";
import { SummaryCounts } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { digestRunChange, previousRunFor } from "@/lib/diff";
import { formatDateTime, reportIdForRun, summarize } from "@/lib/format";
import {
  assetTypeLabel,
  compatibleRunbooks,
  kindLabel,
  runbookLabel,
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
  const updateAsset = useAppStore((state) => state.updateAsset);
  const running = useAppStore((state) => state.running);
  const runbook = runbooks.find((item) => item.id === asset?.runbookId);
  const compatible = asset ? compatibleRunbooks(runbooks, asset.type) : [];

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
        {assetTypeLabel(asset.type)} · Tracked asset
      </p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">{asset.name}</h1>
      <p className="mt-3 text-sm text-fg-muted">
        Current runbook: {runbook ? runbookLabel(runbook) : "None"}
        {latest ? ` · Last observed ${formatDateTime(latest.observedAt)}` : " · Not observed yet"}
      </p>
      {runbook ? (
        <p className="mt-1 text-xs text-fg-subtle">
          {kindLabel(runbook.kind)}
          {runbook.kind === "authorized_active"
            ? " · Only run against systems you are authorized to assess."
            : null}
        </p>
      ) : null}

      {summary ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <SummaryCounts summary={summary} />
          {runbook?.templateId === "public-services" ? (
            <p className="mt-3 text-sm text-fg-muted">
              {servicesObserved} public services observed. A reachable service is
              not automatically a vulnerability.
            </p>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">
              What this runbook observed about this asset. Individual
              observations are not an overall security grade.
            </p>
          )}
          {digest && previous ? (
            <div className="mt-4">
              <ChangeDigestLines digest={digest} />
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {owner && workspace.exposureActive ? (
              <Button onClick={runNow}>Run observation</Button>
            ) : null}
            {runbook ? (
              <Button variant="secondary" asChild>
                <Link
                  to="/w/$slug/runbooks/$runbookId"
                  params={{ slug, runbookId: runbook.id }}
                >
                  Edit runbook
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
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-fg-muted">
            Recommended checks are already selected. Run the first observation
            for this asset.
          </p>
          {owner && workspace.exposureActive ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={runNow}>Run observation</Button>
              {runbook ? (
                <Button variant="secondary" asChild>
                  <Link
                    to="/w/$slug/runbooks/$runbookId"
                    params={{ slug, runbookId: runbook.id }}
                  >
                    Edit runbook
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {owner && compatible.length > 1 ? (
        <div className="mt-6 rounded-xl border border-border px-5 py-4">
          <p className="text-sm font-medium">Change runbook</p>
          <p className="mt-1 text-xs text-fg-muted">
            Future runs use the selected runbook. Previous evidence stays tied
            to its original version.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {compatible.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={item.id === runbook?.id ? "secondary" : "ghost"}
                onClick={() => updateAsset(asset.id, { runbookId: item.id })}
              >
                {item.name}
              </Button>
            ))}
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
          <p className="mt-3 text-sm text-fg-muted">No runs for this asset yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {runs.slice(0, 5).map((run) => {
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
                        {formatDateTime(run.observedAt)}
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