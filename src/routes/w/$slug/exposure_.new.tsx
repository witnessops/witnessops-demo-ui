import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { RunningCheck } from "@/components/running-check";
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
  const started = useRef(false);

  useEffect(() => {
    if (
      started.current ||
      running ||
      !workspace?.exposureActive ||
      !owner ||
      !asset ||
      !runbook
    ) {
      return;
    }
    started.current = true;
    startRun({
      domain: asset.name,
      workspaceId: workspace.id,
      checkIds: runbook.checkIds,
      source: "workspace",
      assetId: asset.id,
      runbookId: runbook.id,
      ports: runbook.ports,
    });
  }, [asset, owner, runbook, running, startRun, workspace]);

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

  if (!workspace.exposureActive || !owner) {
    return <Navigate to="/w/$slug" params={{ slug }} />;
  }

  if (!asset) {
    return <Navigate to="/w/$slug/assets/new" params={{ slug }} />;
  }

  return null;
}
