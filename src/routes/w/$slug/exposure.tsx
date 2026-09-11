import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ChangeDigestLines } from "@/components/change-digest";
import { EmptyExposure } from "@/components/empty-exposure";
import { SummaryCounts } from "@/components/status-pill";
import { digestRunChange, previousRunFor } from "@/lib/diff";
import { formatDate, summarize } from "@/lib/format";
import { methodLabelFromRun, profileNameFromRun } from "@/lib/runbooks";
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
        Completed runs are snapshots. Environment change is what changed on the
        asset. Coverage change is what was checked.
      </p>
      <ol className="mt-8 grid gap-3">
        {visible.map((run, index) => {
          const previous = previousRunFor(run, visible);
          const summary = summarize(run.observations);
          const digest = digestRunChange(run, previous);
          return (
            <li key={run.id}>
              <Link
                to="/w/$slug/exposure/$runId"
                params={{ slug, runId: run.id }}
                className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-fg-subtle">
                      {index === 0 ? "Latest run" : `Previous · ${formatDate(run.observedAt)}`}
                    </p>
                    <h2 className="mt-1 text-lg font-medium tracking-tight">
                      {formatDate(run.observedAt)}
                    </h2>
                    <p className="mt-1 text-xs text-fg-muted">
                      {run.domain} · {profileNameFromRun(run)}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-fg-subtle">
                      Method · {methodLabelFromRun(run)}
                    </p>
                  </div>
                  <SummaryCounts summary={summary} compact />
                </div>
                {previous ? (
                  <div className="mt-4">
                    <ChangeDigestLines digest={digest} />
                  </div>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
      {visible.length === 0 ? (
        <p className="mt-8 text-sm text-fg-muted">
          No observations for this asset yet.
        </p>
      ) : null}
    </div>
  );
}
