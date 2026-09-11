import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { attentionCopy, formatDate, reportIdForRun, summarize } from "@/lib/format";
import { profileNameFromRun } from "@/lib/runbooks";
import {
  isOwner,
  useMembership,
  useWorkspace,
  useWorkspaceRuns,
} from "@/lib/store";

export const Route = createFileRoute("/w/$slug/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { slug } = Route.useParams();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const runs = useWorkspaceRuns(workspace?.id);
  const owner = isOwner(membership?.role);

  if (!workspace) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">Reports</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        A report is a readable snapshot of one observation. It is not a
        security score.
      </p>
      {runs.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border px-5 py-8">
          <h2 className="text-lg font-medium">No reports yet.</h2>
          <p className="mt-2 text-sm text-fg-muted">
            Observe an asset to produce a report you can forward.
          </p>
          {owner && workspace.exposureActive ? (
            <Button asChild className="mt-6">
              <Link to="/w/$slug/assets/new" params={{ slug }}>
                Add asset
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-xl border border-border">
          {runs.map((run) => {
            const summary = summarize(run.observations);
            return (
              <li key={run.id}>
                <Link
                  to="/w/$slug/reports/$reportId"
                  params={{ slug, reportId: reportIdForRun(run.id) }}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 hover:bg-surface"
                >
                  <span>
                    <span className="block font-mono text-sm text-fg">
                      {run.domain}
                    </span>
                    <span className="mt-1 block text-xs text-fg-muted">
                      {formatDate(run.observedAt)} · {profileNameFromRun(run)}
                    </span>
                  </span>
                  <span className="text-sm text-attention">
                    {attentionCopy(summary.needsAttention)}
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
