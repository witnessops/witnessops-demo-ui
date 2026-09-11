import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  assetTypeLabel,
  compatibleRunbooks,
  inferAssetType,
  kindLabel,
  normalizeAssetName,
  runbookLabel,
  suggestedTemplate,
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
  const [type, setType] = useState<AssetType>("domain");
  const [value, setValue] = useState("");
  const suggested = suggestedTemplate(type);
  const compatible = useMemo(
    () => compatibleRunbooks(runbooks, type),
    [runbooks, type],
  );
  const defaultRunbook =
    compatible.find((item) => item.templateId === suggested.templateId) ??
    compatible[0];
  const [runbookId, setRunbookId] = useState(defaultRunbook?.id ?? "");

  if (!workspace) return null;

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
    if (!name || !workspace) return;
    const chosen =
      runbooks.find((item) => item.id === runbookId) ?? defaultRunbook;
    if (!chosen) return;
    const asset = addAsset({
      workspaceId: workspace.id,
      name,
      type,
      runbookId: chosen.id,
    });
    void navigate({
      to: "/w/$slug/assets/$assetId",
      params: { slug, assetId: asset.id },
    });
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className="font-mono text-xs text-fg-subtle">Tracked asset</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">Add asset</h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        A tracked asset is something WitnessOps can observe. It does not prove
        ownership or authorization.
      </p>

      <form className="mt-8 grid gap-6" onSubmit={submit}>
        <div>
          <p className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
            Type
          </p>
          <RadioGroup
            className="mt-3 grid gap-2 sm:grid-cols-2"
            value={type}
            onValueChange={(next) => {
              const nextType = next as AssetType;
              setType(nextType);
              const nextSuggested = suggestedTemplate(nextType);
              const match = compatibleRunbooks(runbooks, nextType).find(
                (item) => item.templateId === nextSuggested.templateId,
              );
              if (match) setRunbookId(match.id);
            }}
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
              if (next && inferred !== type) {
                setType(inferred);
                const match = compatibleRunbooks(runbooks, inferred).find(
                  (item) =>
                    item.templateId === suggestedTemplate(inferred).templateId,
                );
                if (match) setRunbookId(match.id);
              }
            }}
            placeholder={
              type === "public_ip" ? "203.0.113.24" : "api.acme.com"
            }
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div>
          <p className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
            Choose what to observe
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            Suggested runbook: {suggested.name}. You can change this later.
          </p>
          <RadioGroup
            className="mt-3 grid gap-2"
            value={runbookId || defaultRunbook?.id}
            onValueChange={setRunbookId}
          >
            {compatible.map((runbook) => (
              <label
                key={runbook.id}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-3 text-sm hover:bg-surface"
              >
                <RadioGroupItem value={runbook.id} className="mt-0.5" />
                <span>
                  <span className="block text-fg">{runbookLabel(runbook)}</span>
                  <span className="mt-0.5 block text-xs text-fg-muted">
                    {kindLabel(runbook.kind)} · {runbook.checkIds.length} checks
                    {runbook.ports.length > 0
                      ? ` · ${runbook.ports.length} ports`
                      : ""}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">Add asset</Button>
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