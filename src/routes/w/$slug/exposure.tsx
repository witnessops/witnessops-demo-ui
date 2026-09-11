import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CompactHistory } from "@/components/change-digest";
import { EmptyExposure } from "@/components/empty-exposure";
import {
  isOwner,
  useMembership,
  useWorkspace,
  useWorkspaceAssets,
  useWorkspaceRuns,
} from "@/lib/store";

type Search = {
  asset?: string;
};

export const Route = createFileRoute("/w/$slug/exposure")({
  validateSearch: (search: Record<string, unknown>): Search => {
    if (typeof search.asset === "string" && search.asset.length > 0) {
      return { asset: search.asset };
    }
    return {};
  },
  component: ExposureHistoryPage,
});

function ExposureHistoryPage() {
  const { slug } = Route.useParams();
  const { asset: assetId } = Route.useSearch();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const runs = useWorkspaceRuns(workspace?.id);
  const assets = useWorkspaceAssets(workspace?.id);
  const owner = isOwner(membership?.role);
  const asset = assets.find((item) => item.id === assetId);
  const visible = assetId
    ? runs.filter((run) => run.assetId === assetId)
    : runs;

  if (!workspace) return null;

  if (runs.length === 0) {
    return <EmptyExposure workspace={workspace} canRun={owner} />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      {asset ? (
        <Link
          to="/w/$slug/assets/$assetId"
          params={{ slug, assetId: asset.id }}
          className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          {asset.name}
        </Link>
      ) : (
        <Link
          to="/w/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Workspace
        </Link>
      )}
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">
            {asset ? `History · ${asset.name}` : "History"}
          </h1>
        </div>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        Completed runs are snapshots. Skim what changed without opening every
        run. Previous evidence stays intact.
      </p>
      <div className="mt-8">
        <CompactHistory slug={slug} runs={visible} showDomain={!asset} />
      </div>
    </div>
  );
}
