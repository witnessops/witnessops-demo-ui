import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDate } from "@/lib/format";
import { kindLabel, profileName } from "@/lib/runbooks";
import {
  useWorkspace,
  useWorkspaceAssets,
  useWorkspaceRunbooks,
} from "@/lib/store";

export const Route = createFileRoute("/w/$slug/runbooks")({
  component: RunbooksPage,
});

function RunbooksPage() {
  const { slug } = Route.useParams();
  const workspace = useWorkspace(slug);
  const runbooks = useWorkspaceRunbooks(workspace?.id);
  const assets = useWorkspaceAssets(workspace?.id);

  if (!workspace) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs text-fg-subtle">Advanced</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">
        Observation profiles
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        Each profile is the set of checks used when an asset is observed.
        Coverage can improve. Previous evidence stays as it was.
      </p>
      <ul className="mt-8 grid gap-3">
        {runbooks.map((runbook) => {
          const used = assets.filter((asset) => asset.runbookId === runbook.id)
            .length;
          return (
            <li
              key={runbook.id}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium tracking-tight">
                    {profileName(runbook)}
                  </h2>
                  <p className="mt-1 text-sm text-fg-muted">
                    {runbook.description}
                  </p>
                  <p className="mt-3 text-xs text-fg-subtle">
                    {runbook.checkIds.length} checks
                    {runbook.ports.length > 0
                      ? ` · ${runbook.ports.length} ports`
                      : ""}
                    {used > 0 ? ` · Used by ${used} assets` : ""}
                    {" · "}
                    {kindLabel(runbook.kind)}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-fg-subtle">
                    Runbook: {runbook.name} {runbook.version} · Updated{" "}
                    {formatDate(runbook.updatedAt)}
                  </p>
                </div>
                <Link
                  to="/w/$slug/runbooks/$runbookId"
                  params={{ slug, runbookId: runbook.id }}
                  className="text-xs text-fg-muted hover:text-fg"
                >
                  Edit checks
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
