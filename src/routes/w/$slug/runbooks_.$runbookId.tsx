import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CheckPicker } from "@/components/check-picker";
import { PortPicker } from "@/components/port-picker";
import { RunningCheck } from "@/components/running-check";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CHECK_CATALOG,
  CHECK_GROUPS,
  cadenceLabel,
  profileCountLabel,
  type Cadence,
} from "@/lib/checks";
import { formatDate } from "@/lib/format";
import {
  assetTypeLabel,
  kindLabel,
  runbookLabel,
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

export const Route = createFileRoute("/w/$slug/runbooks_/$runbookId")({
  component: RunbookPage,
});

function RunbookPage() {
  const { slug, runbookId } = Route.useParams();
  const navigate = useNavigate();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const owner = isOwner(membership?.role);
  const runbooks = useWorkspaceRunbooks(workspace?.id);
  const assets = useWorkspaceAssets(workspace?.id);
  const runbook = runbooks.find((item) => item.id === runbookId);
  const updateRunbook = useAppStore((state) => state.updateRunbook);
  const startRun = useAppStore((state) => state.startRun);
  const completeRun = useAppStore((state) => state.completeRun);
  const running = useAppStore((state) => state.running);
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
        <h1 className="text-xl font-medium">Runbook not found</h1>
        <Button asChild className="mt-6" variant="secondary">
          <Link to="/w/$slug/runbooks" params={{ slug }}>
            Back to runbooks
          </Link>
        </Button>
      </div>
    );
  }

  const usedBy = assets.filter((item) => item.runbookId === runbook.id);
  const workspaceId = workspace.id;
  const current = runbook;

  function runAgainst(id: string) {
    const asset = usedBy.find((item) => item.id === id) ?? assets[0];
    if (!asset) return;
    startRun({
      domain: asset.name,
      workspaceId,
      checkIds: current.checkIds,
      source: "workspace",
      assetId: asset.id,
      runbookId: current.id,
      ports: current.ports,
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/w/$slug/runbooks"
        params={{ slug }}
        className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Runbooks
      </Link>
      <p className="mt-5 font-mono text-xs text-fg-subtle">
        {kindLabel(runbook.kind)}
      </p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">
        {runbookLabel(runbook)}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        {runbook.description}
      </p>
      <p className="mt-2 font-mono text-xs text-fg-subtle">
        {profileCountLabel(runbook.checkIds.length)}
        {runbook.ports.length > 0 ? ` · ${runbook.ports.length} ports` : ""}
        {" · "}
        Suitable for {runbook.supportedAssetTypes.map(assetTypeLabel).join(", ")}
        {" · Last updated "}
        {formatDate(runbook.updatedAt)}
      </p>
      {runbook.kind === "authorized_active" ? (
        <p className="mt-3 text-sm text-fg-muted">
          Only run against systems you are authorized to assess.
        </p>
      ) : (
        <p className="mt-3 text-sm text-fg-muted">
          Public observation. Low-impact outside-in checks against publicly
          reachable information.
        </p>
      )}
      <p className="mt-2 text-xs text-fg-subtle">
        Coverage improves. History stays comparable. New checks can be added to
        future runs without changing previous evidence.
      </p>

      {usedBy.length > 0 && owner ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => runAgainst(usedBy[0]!.id)}>
            Run now{usedBy[0] ? ` on ${usedBy[0].name}` : ""}
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/w/$slug/assets" params={{ slug }}>
              Choose asset
            </Link>
          </Button>
        </div>
      ) : null}

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

      {owner ? (
        <div className="mt-8">
          <p className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
            Repeat
          </p>
          <RadioGroup
            className="mt-3 grid gap-2 sm:grid-cols-3"
            value={runbook.cadence}
            onValueChange={(value) =>
              updateRunbook(runbook.id, { cadence: value as Cadence })
            }
          >
            {(["manual", "weekly", "daily"] as const).map((value) => (
              <label
                key={value}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm hover:bg-surface"
              >
                <RadioGroupItem value={value} />
                {cadenceLabel(value)}
              </label>
            ))}
          </RadioGroup>
          <p className="mt-2 text-xs text-fg-subtle">
            Scheduling is mocked in this prototype. It does not send
            notifications.
          </p>
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