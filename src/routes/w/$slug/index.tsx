import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ActivationPanel } from "@/components/activation-panel";
import { AssetRow } from "@/components/asset-row";
import { EmptyExposure } from "@/components/empty-exposure";
import { RunningCheck } from "@/components/running-check";
import { Button } from "@/components/ui/button";
import { digestRunChange, previousRunFor } from "@/lib/diff";
import { changeCopy, summarize } from "@/lib/format";
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

  const attention = assets.reduce((count, asset) => {
    const run = runs.find((item) => item.assetId === asset.id);
    return count + (run ? summarize(run.observations).needsAttention : 0);
  }, 0);
  const changeCount = assets.reduce((count, asset) => {
    const latest = runs.find((item) => item.assetId === asset.id);
    if (!latest) return count;
    const previous = previousRunFor(latest, runs);
    if (!previous) return count;
    return count + digestRunChange(latest, previous).envChanged;
  }, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">
        {workspace.name}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        Keep track of what the outside world can observe.
      </p>
      <dl className="mt-6 grid grid-cols-3 gap-4">
        <div>
          <dt className="text-xs text-fg-subtle">Assets</dt>
          <dd className="mt-1 text-sm">{assets.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Needs attention</dt>
          <dd className="mt-1 text-sm">{attention > 0 ? String(attention) : "None"}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Since last observation</dt>
          <dd className="mt-1 text-sm">
            {changeCount > 0 ? changeCopy(changeCount) : "No material change"}
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

      <div className="mt-10">
        <h2 className="text-sm font-medium">Recent assets</h2>
        {assets.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">No assets tracked yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {assets.map((asset) => (
              <li key={asset.id}>
                <AssetRow
                  slug={slug}
                  asset={asset}
                  runbook={runbooks.find((item) => item.id === asset.runbookId)}
                  runs={runs}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
