import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckPicker } from "@/components/check-picker";
import { PortPicker } from "@/components/port-picker";
import { RunningCheck } from "@/components/running-check";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CHECK_CATALOG, CHECK_GROUPS } from "@/lib/checks";
import {
  assetTypeLabel,
  compatibleRunbooks,
  inferAssetType,
  kindLabel,
  normalizeAssetName,
  observeActionLabel,
  profileName,
  suggestedTemplate,
  templateById,
} from "@/lib/runbooks";
import {
  isOwner,
  useAppStore,
  useMembership,
  useWorkspace,
  useWorkspaceRunbooks,
} from "@/lib/store";
import type { AssetType } from "@/lib/types";

export const Route = createFileRoute("/w/$slug/assets_/new")({
  component: AddAssetPage,
});

const TYPES: AssetType[] = ["domain", "hostname", "public_ip", "server"];

function AddAssetPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const owner = isOwner(membership?.role);
  const runbooks = useWorkspaceRunbooks(workspace?.id);
  const addAsset = useAppStore((state) => state.addAsset);
  const updateRunbook = useAppStore((state) => state.updateRunbook);
  const startRun = useAppStore((state) => state.startRun);
  const completeRun = useAppStore((state) => state.completeRun);
  const running = useAppStore((state) => state.running);
  const [type, setType] = useState<AssetType>("domain");
  const [value, setValue] = useState("");
  const [customize, setCustomize] = useState(false);
  const suggested = suggestedTemplate(type);
  const compatible = useMemo(
    () => compatibleRunbooks(runbooks, type),
    [runbooks, type],
  );
  const defaultRunbook =
    compatible.find((item) => item.templateId === suggested.templateId) ??
    compatible[0];
  const [runbookId, setRunbookId] = useState(defaultRunbook?.id ?? "");
  const chosen =
    runbooks.find((item) => item.id === runbookId) ?? defaultRunbook;
  const [checkIds, setCheckIds] = useState(chosen?.checkIds ?? []);
  const [ports, setPorts] = useState(chosen?.ports ?? []);

  function applyType(nextType: AssetType) {
    setType(nextType);
    const nextSuggested = suggestedTemplate(nextType);
    const match = compatibleRunbooks(runbooks, nextType).find(
      (item) => item.templateId === nextSuggested.templateId,
    );
    if (match) {
      setRunbookId(match.id);
      setCheckIds(match.checkIds);
      setPorts(match.ports);
    }
    setCustomize(false);
  }

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
          Activate External Exposure to add assets.
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
          Only an owner can add assets.
        </h1>
        <Button asChild className="mt-8" variant="secondary">
          <Link to="/w/$slug/assets" params={{ slug }}>
            Back to assets
          </Link>
        </Button>
      </div>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const name = normalizeAssetName(value);
    if (!name || !workspace || !chosen) return;
    const asset = addAsset({
      workspaceId: workspace.id,
      name,
      type,
      runbookId: chosen.id,
    });
    const nextChecks = customize ? checkIds : chosen.checkIds;
    const nextPorts = customize ? ports : chosen.ports;
    if (
      customize &&
      (nextChecks.join() !== chosen.checkIds.join() ||
        nextPorts.join() !== chosen.ports.join())
    ) {
      updateRunbook(chosen.id, { checkIds: nextChecks, ports: nextPorts });
    }
    startRun({
      domain: asset.name,
      workspaceId: workspace.id,
      checkIds: nextChecks,
      source: "workspace",
      assetId: asset.id,
      runbookId: chosen.id,
      ports: nextPorts,
    });
  }

  const template = chosen ? templateById(chosen.templateId) : undefined;
  const catalog = CHECK_CATALOG.filter(
    (check) =>
      template?.checkIds.includes(check.id) ||
      template?.optionalCheckIds.includes(check.id) ||
      chosen?.checkIds.includes(check.id),
  );
  const isPublicServices = chosen?.templateId === "public-services";
  const primaryLabel = observeActionLabel(chosen?.templateId);

  return (
    <div className="mx-auto max-w-xl">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">Add asset</h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        Add what you want WitnessOps to watch. Recommended checks are already
        selected.
      </p>

      <form className="mt-8 grid gap-6" onSubmit={submit}>
        <div>
          <p className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
            Type
          </p>
          <RadioGroup
            className="mt-3 grid gap-2 sm:grid-cols-2"
            value={type}
            onValueChange={(next) => applyType(next as AssetType)}
          >
            {TYPES.map((item) => (
              <label
                key={item}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm hover:bg-surface"
              >
                <RadioGroupItem value={item} />
                {assetTypeLabel(item)}
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="asset-value">Value</Label>
          <Input
            id="asset-value"
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              setValue(next);
              const inferred = inferAssetType(next);
              if (next && inferred !== type) applyType(inferred);
            }}
            placeholder={
              type === "public_ip" ? "203.0.113.24" : "api.acme.com"
            }
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
        </div>

        <div className="rounded-xl border border-border bg-surface px-4 py-4">
          <p className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
            Recommended checks
          </p>
          <p className="mt-2 text-sm text-fg">
            {chosen ? profileName(chosen) : suggested.name}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {chosen?.description ?? suggested.description}
            {isPublicServices
              ? ` Common ports ${ (customize ? ports : chosen?.ports ?? []).join(", ") || "22, 80, 443" }.`
              : ""}
          </p>
          <button
            type="button"
            className="mt-3 text-xs text-fg-muted hover:text-fg"
            onClick={() => setCustomize((open) => !open)}
          >
            {customize ? "Hide customization" : "Customize checks"}
          </button>
        </div>

        {customize ? (
          <div className="grid gap-6">
            {compatible.length > 1 ? (
              <RadioGroup
                className="grid gap-2"
                value={runbookId || defaultRunbook?.id}
                onValueChange={(id) => {
                  setRunbookId(id);
                  const next = runbooks.find((item) => item.id === id);
                  if (next) {
                    setCheckIds(next.checkIds);
                    setPorts(next.ports);
                  }
                }}
              >
                {compatible.map((runbook) => (
                  <label
                    key={runbook.id}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-3 text-sm hover:bg-surface"
                  >
                    <RadioGroupItem value={runbook.id} className="mt-0.5" />
                    <span>
                      <span className="block text-fg">{profileName(runbook)}</span>
                      <span className="mt-0.5 block text-xs text-fg-muted">
                        {kindLabel(runbook.kind)} · {runbook.checkIds.length}{" "}
                        checks
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            ) : null}
            {chosen ? (
              <CheckPicker
                selected={checkIds}
                catalog={catalog}
                groups={CHECK_GROUPS}
                optionalIds={template?.optionalCheckIds}
                onChange={setCheckIds}
              />
            ) : null}
            {isPublicServices ? (
              <PortPicker selected={ports} onChange={setPorts} />
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit">{primaryLabel}</Button>
          <Button type="button" variant="ghost" asChild>
            <Link to="/w/$slug/assets" params={{ slug }}>
              Cancel
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
