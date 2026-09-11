import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { CheckPicker } from "@/components/check-picker";
import { PortPicker } from "@/components/port-picker";
import { RunningCheck } from "@/components/running-check";
import { Button } from "@/components/ui/button";
import { CHECK_CATALOG, CHECK_GROUPS } from "@/lib/checks";
import { formatDate } from "@/lib/format";
import {
  assetTypeLabel,
  kindLabel,
  methodLabel,
  profileName,
  templateById,
} from "@/lib/runbooks";
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

export const Route = createFileRoute("/w/$slug/runbooks_/$runbookId")({
  validateSearch: (search: Record<string, unknown>): Search => {
    if (typeof search.asset === "string" && search.asset.length > 0) {
      return { asset: search.asset };
    }
    return {};
  },
  component: RunbookPage,
});

function RunbookPage() {
  const { slug, runbookId } = Route.useParams();
  const { asset: fromAsset } = Route.useSearch();
  const navigate = useNavigate();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const owner = isOwner(membership?.role);
  const runbooks = useWorkspaceRunbooks(workspace?.id);
  const assets = useWorkspaceAssets(workspace?.id);
  const runbook = runbooks.find((item) => item.id === runbookId);
  const updateRunbook = useAppStore((state) => state.updateRunbook);
  const completeRun = useAppStore((state) => state.completeRun);
  const running = useAppStore((state) => state.running);
  const [advanced, setAdvanced] = useState(false);
  const template = runbook ? templateById(runbook.templateId) : undefined;
  const catalog = CHECK_CATALOG.filter(
    (check) =>
      template?.checkIds.includes(check.id) ||
      template?.optionalCheckIds.includes(check.id) ||
      runbook?.checkIds.includes(check.id),
  );

  if (!workspace) return null;

  if (running?.workspaceId === workspace.id) {
    return (
      <RunningCheck
        domain={running.domain}
        checkIds={running.checkIds}
        ports={running.ports}
        onDone={() => {
          const next = completeRun();
          if (next) {
            void navigate({
              to: "/w/$slug/exposure/$runId",
              params: { slug, runId: next.id },
            });
          }
        }}
      />
    );
  }

  if (!runbook) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <h1 className="text-xl font-medium">Check profile not found</h1>
        <Button asChild className="mt-6" variant="secondary">
          <Link to="/w/$slug/assets" params={{ slug }}>
            Back to assets
          </Link>
        </Button>
      </div>
    );
  }

  const usedBy = assets.filter((item) => item.runbookId === runbook.id);
  const returnAsset = assets.find((item) => item.id === fromAsset) ?? usedBy[0];

  return (
    <div className="mx-auto max-w-2xl">
      {returnAsset ? (
        <Link
          to="/w/$slug/assets/$assetId"
          params={{ slug, assetId: returnAsset.id }}
          className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          {returnAsset.name}
        </Link>
      ) : (
        <Link
          to="/w/$slug/assets"
          params={{ slug }}
          className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Assets
        </Link>
      )}
      <p className="mt-5 font-mono text-xs text-fg-subtle">Edit checks</p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">
        {profileName(runbook)}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        {runbook.description}
      </p>
      <p className="mt-2 text-xs text-fg-subtle">
        Future runs use these checks. Previous evidence stays as it was.
      </p>

      {owner ? (
        <div className="mt-8">
          <CheckPicker
            selected={runbook.checkIds}
            catalog={catalog}
            groups={CHECK_GROUPS}
            optionalIds={template?.optionalCheckIds}
            onChange={(ids) => updateRunbook(runbook.id, { checkIds: ids })}
          />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-lg border border-border">
          {catalog
            .filter((check) => runbook.checkIds.includes(check.id))
            .map((check) => (
              <li key={check.id} className="px-3 py-3">
                <p className="text-sm text-fg">{check.name}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{check.blurb}</p>
              </li>
            ))}
        </ul>
      )}

      {runbook.templateId === "public-services" ? (
        <div className="mt-8">
          {owner ? (
            <PortPicker
              selected={runbook.ports}
              onChange={(ports) => updateRunbook(runbook.id, { ports })}
            />
          ) : (
            <p className="text-sm text-fg-muted">
              Ports: {runbook.ports.map((port) => `${port}/tcp`).join(", ")}
            </p>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="mt-8 text-xs text-fg-muted hover:text-fg"
        onClick={() => setAdvanced((open) => !open)}
      >
        {advanced ? "Hide advanced details" : "Advanced details"}
      </button>
      {advanced ? (
        <div className="mt-3 rounded-xl border border-border px-4 py-4 text-sm text-fg-muted">
          <p>
            Runbook: {methodLabel(runbook)} · {kindLabel(runbook.kind)}
          </p>
          <p className="mt-2 text-xs text-fg-subtle">
            Suitable for{" "}
            {runbook.supportedAssetTypes.map(assetTypeLabel).join(", ")} · Last
            updated {formatDate(runbook.updatedAt)}
          </p>
          {runbook.kind === "authorized_active" ? (
            <p className="mt-2 text-xs">
              Only run against systems you are authorized to assess.
            </p>
          ) : (
            <p className="mt-2 text-xs">
              Public observation. Low-impact outside-in checks against publicly
              reachable information.
            </p>
          )}
        </div>
      ) : null}

      {usedBy.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-sm font-medium">Used by</h2>
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {usedBy.map((asset) => (
              <li key={asset.id}>
                <Link
                  to="/w/$slug/assets/$assetId"
                  params={{ slug, assetId: asset.id }}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface"
                >
                  <span className="font-mono">{asset.name}</span>
                  <span className="text-xs text-fg-muted">
                    {assetTypeLabel(asset.type)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
