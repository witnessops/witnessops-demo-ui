import { createFileRoute, Link } from "@tanstack/react-router";
import { AssetRow } from "@/components/asset-row";
import { Button } from "@/components/ui/button";
import { snapshotsFor, sortSnapshots } from "@/lib/asset-status";
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

  const snapshots = sortSnapshots(snapshotsFor(assets, runs, runbooks));

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
        Add what you want WitnessOps to watch. Adding an asset does not prove
        ownership.
      </p>

      {assets.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border px-5 py-8">
          <h2 className="text-lg font-medium">No assets yet.</h2>
          <p className="mt-2 text-sm text-fg-muted">
            Start with a domain, hostname or public IP. Recommended checks are
            already selected.
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
          {snapshots.map((snapshot) => (
            <li key={snapshot.asset.id}>
              <AssetRow slug={slug} snapshot={snapshot} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
