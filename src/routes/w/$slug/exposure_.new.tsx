import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { RunningCheck } from "@/components/running-check";
import { Button } from "@/components/ui/button";
import { runbookLabel } from "@/lib/runbooks";
import {
  isOwner,
  useAppStore,
  useMembership,
  useWorkspace,
  useWorkspaceAssets,
  useWorkspaceRunbooks,
} from "@/lib/store";

type Search = {
  asset?: string;
};

export const Route = createFileRoute("/w/$slug/exposure_/new")({
  validateSearch: (search: Record<string, unknown>): Search => {
    if (typeof search.asset === "string" && search.asset.length > 0) {
      return { asset: search.asset };
    }
    return {};
  },
  component: NewExposurePage,
});

function NewExposurePage() {
  const { slug } = Route.useParams();
  const { asset: assetId } = Route.useSearch();
  const navigate = useNavigate();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const owner = isOwner(membership?.role);
  const assets = useWorkspaceAssets(workspace?.id);
  const runbooks = useWorkspaceRunbooks(workspace?.id);
  const startRun = useAppStore((state) => state.startRun);
  const completeRun = useAppStore((state) => state.completeRun);
  const running = useAppStore((state) => state.running);
  const asset = assets.find((item) => item.id === assetId) ?? assets[0];
  const runbook = runbooks.find((item) => item.id === asset?.runbookId);

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

  if (!workspace.exposureActive) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <h1 className="text-2xl font-medium tracking-tight">
          Activate External Exposure to choose checks.
        </h1>
        <Button asChild className="mt-8">
          <Link to="/w/$slug" params={{ slug }}>
            Back to workspace
          </Link>
        </Button>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <h1 className="text-2xl font-medium tracking-tight">
          Only an owner can run checks.
        </h1>
        <Button asChild className="mt-8" variant="secondary">
          <Link to="/w/$slug" params={{ slug }}>
            Back to workspace
          </Link>
        </Button>
      </div>
    );
  }

  if (!asset) {
    return <Navigate to="/w/$slug/assets/new" params={{ slug }} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">{asset.name}</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        Run the current runbook against this tracked asset. Recommended checks
        are already selected.
      </p>
      <div className="mt-6 rounded-xl border border-border bg-surface p-5">
        <p className="text-sm text-fg">
          {runbook ? runbookLabel(runbook) : "No runbook"}
        </p>
        <p className="mt-1 text-xs text-fg-muted">
          {runbook
            ? `${runbook.checkIds.length} checks${runbook.ports.length ? ` · ${runbook.ports.length} ports` : ""}`
            : "Assign a runbook before running."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (!runbook) return;
              startRun({
                domain: asset.name,
                workspaceId: workspace.id,
                checkIds: runbook.checkIds,
                source: "workspace",
                assetId: asset.id,
                runbookId: runbook.id,
                ports: runbook.ports,
              });
            }}
          >
            Run observation
          </Button>
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
          <Button variant="ghost" asChild>
            <Link
              to="/w/$slug/assets/$assetId"
              params={{ slug, assetId: asset.id }}
            >
              Open asset
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}