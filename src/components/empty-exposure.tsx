import { Link, useNavigate } from "@tanstack/react-router";
import { RunningCheck } from "@/components/running-check";
import { Button } from "@/components/ui/button";
import { PUBLIC_CHECK_IDS } from "@/lib/checks";
import { useAppStore } from "@/lib/store";
import type { Workspace } from "@/lib/types";

export function EmptyExposure({
  workspace,
  canRun,
}: {
  workspace: Workspace;
  canRun: boolean;
}) {
  const navigate = useNavigate();
  const startRun = useAppStore((state) => state.startRun);
  const completeRun = useAppStore((state) => state.completeRun);
  const running = useAppStore((state) => state.running);
  const assets = useAppStore((state) =>
    state.assets.filter((asset) => asset.workspaceId === workspace.id),
  );
  const runbooks = useAppStore((state) =>
    state.runbooks.filter((runbook) => runbook.workspaceId === workspace.id),
  );

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
              params: { slug: workspace.slug, runId: run.id },
            });
          }
        }}
      />
    );
  }

  if (workspace.exposureActive) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">
          Add what you want WitnessOps to watch.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          A domain, hostname or public IP is enough. Recommended checks are
          already selected. Adding an asset does not prove ownership.
        </p>
        {canRun ? (
          <div className="mt-8">
            <Button asChild>
              <Link
                to="/w/$slug/assets/new"
                params={{ slug: workspace.slug }}
              >
                Add asset
              </Link>
            </Button>
          </div>
        ) : (
          <p className="mt-8 text-sm text-fg-muted">
            Only an owner can add an asset in this workspace.
          </p>
        )}
      </div>
    );
  }

  const asset = assets[0];
  const runbook = runbooks.find((item) => item.id === asset?.runbookId);

  return (
    <div className="mx-auto max-w-lg py-6">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">
        See what is publicly observable about your external presence.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        A first snapshot is saved to {workspace.name}. This is an
        unauthenticated observation of a public hostname, not a complete
        security assessment.
      </p>
      {canRun ? (
        <div className="mt-8">
          <Button
            onClick={() => {
              const host = asset?.name || workspace.primaryDomain;
              if (!host) return;
              startRun({
                domain: host,
                workspaceId: workspace.id,
                checkIds: runbook?.checkIds ?? PUBLIC_CHECK_IDS,
                source: "public",
                assetId: asset?.id,
                runbookId: runbook?.id,
              });
            }}
          >
            Run a first observation
          </Button>
        </div>
      ) : (
        <p className="mt-8 text-sm text-fg-muted">
          Only an owner can run a check in this workspace.
        </p>
      )}
    </div>
  );
}
