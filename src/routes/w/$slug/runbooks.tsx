import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { assetTypeLabel, kindLabel, runbookLabel } from "@/lib/runbooks";
import {
  isOwner,
  useAppStore,
  useMembership,
  useWorkspace,
  useWorkspaceAssets,
  useWorkspaceRunbooks,
} from "@/lib/store";

export const Route = createFileRoute("/w/$slug/runbooks")({
  component: RunbooksPage,
});

function RunbooksPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const owner = isOwner(membership?.role);
  const runbooks = useWorkspaceRunbooks(workspace?.id);
  const assets = useWorkspaceAssets(workspace?.id);
  const duplicateRunbook = useAppStore((state) => state.duplicateRunbook);

  if (!workspace) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">Runbooks</h1>
        </div>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        A runbook defines what WitnessOps will observe, using which methods.
        Coverage can improve over time. Previous runs stay comparable.
      </p>
      <ul className="mt-8 grid gap-3">
        {runbooks.map((runbook) => {
          const used = assets.filter((asset) => asset.runbookId === runbook.id).length;
          return (
            <li
              key={runbook.id}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium tracking-tight">
                    {runbookLabel(runbook)}
                  </h2>
                  <p className="mt-1 text-sm text-fg-muted">{runbook.description}</p>
                  <p className="mt-3 font-mono text-xs text-fg-subtle">
                    {runbook.checkIds.length} checks
                    {runbook.ports.length > 0 ? ` · ${runbook.ports.length} ports` : ""}
                    {" · "}
                    {runbook.supportedAssetTypes.map(assetTypeLabel).join(", ")}
                    {" · "}
                    {kindLabel(runbook.kind)}
                  </p>
                  <p className="mt-1 text-xs text-fg-subtle">
                    Last updated {formatDate(runbook.updatedAt)}
                    {used > 0 ? ` · Used by ${used} assets` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" asChild>
                    <Link
                      to="/w/$slug/runbooks/$runbookId"
                      params={{ slug, runbookId: runbook.id }}
                    >
                      View
                    </Link>
                  </Button>
                  {owner ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const copy = duplicateRunbook(runbook.id);
                        if (copy) {
                          void navigate({
                            to: "/w/$slug/runbooks/$runbookId",
                            params: { slug, runbookId: copy.id },
                          });
                        }
                      }}
                    >
                      Duplicate
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}