import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { digestRunChange, previousRunFor } from "@/lib/diff";
import { formatDate, summarize } from "@/lib/format";
import { assetTypeLabel, runbookLabel } from "@/lib/runbooks";
import {
  isOwner,
  useMembership,
  useWorkspace,
  useWorkspaceAssets,
  useWorkspaceRunbooks,
  useWorkspaceRuns,
} from "@/lib/store";

export const Route = createFileRoute("/w/$slug/assets")({
  component: AssetsPage,
});

function AssetsPage() {
  const { slug } = Route.useParams();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const assets = useWorkspaceAssets(workspace?.id);
  const runbooks = useWorkspaceRunbooks(workspace?.id);
  const runs = useWorkspaceRuns(workspace?.id);
  const owner = isOwner(membership?.role);

  if (!workspace) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">Assets</h1>
        </div>
        {owner && workspace.exposureActive ? (
          <Button asChild>
            <Link to="/w/$slug/assets/new" params={{ slug }}>
              Add asset
            </Link>
          </Button>
        ) : null}
      </div>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        Tracked assets are names WitnessOps can observe. Adding an asset does
        not prove ownership or authorization.
      </p>

      {assets.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border px-5 py-8">
          <h2 className="text-lg font-medium">No assets tracked yet.</h2>
          <p className="mt-2 text-sm text-fg-muted">
            Add a domain and run the recommended Web Exposure runbook.
          </p>
          {owner ? (
            <Button asChild className="mt-6">
              <Link to="/w/$slug/assets/new" params={{ slug }}>
                Add asset
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-xl border border-border">
          {assets.map((asset) => {
            const runbook = runbooks.find((item) => item.id === asset.runbookId);
            const latest = runs.find((run) => run.assetId === asset.id);
            const previous = latest ? previousRunFor(latest, runs) : undefined;
            const summary = latest ? summarize(latest.observations) : null;
            const digest = latest ? digestRunChange(latest, previous) : null;
            return (
              <li key={asset.id}>
                <Link
                  to="/w/$slug/assets/$assetId"
                  params={{ slug, assetId: asset.id }}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 hover:bg-surface"
                >
                  <span>
                    <span className="block font-mono text-sm text-fg">
                      {asset.name}
                    </span>
                    <span className="mt-1 block text-xs text-fg-muted">
                      {assetTypeLabel(asset.type)}
                      {runbook ? ` · ${runbookLabel(runbook)}` : null}
                    </span>
                    <span className="mt-1 block text-xs text-fg-subtle">
                      {latest
                        ? `Last observed ${formatDate(latest.observedAt)}`
                        : "Not observed yet"}
                    </span>
                  </span>
                  <span className="text-right text-sm">
                    {summary ? (
                      <>
                        <span className="block text-attention">
                          {summary.needsAttention === 0
                            ? "No attention"
                            : `${summary.needsAttention} need attention`}
                        </span>
                        {digest && previous ? (
                          <span className="mt-1 block text-xs text-fg-muted">
                            {digest.totalMaterial === 1
                              ? "1 change since previous run"
                              : `${digest.totalMaterial} changes since previous run`}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-xs text-fg-subtle">No runs</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}