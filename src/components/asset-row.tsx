import { Link } from "@tanstack/react-router";
import type { AssetSnapshot } from "@/lib/asset-status";
import { deservesAttention } from "@/lib/asset-status";
import { assetTypeLabel, profileName } from "@/lib/runbooks";
import { cn } from "@/lib/utils";

export function AssetRow({
  slug,
  snapshot,
  actionLabel,
}: {
  slug: string;
  snapshot: AssetSnapshot;
  actionLabel?: string;
}) {
  const { asset, runbook, primary, secondary, stale } = snapshot;
  const attention = deservesAttention(snapshot);

  return (
    <Link
      to="/w/$slug/assets/$assetId"
      params={{ slug, assetId: asset.id }}
      className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 hover:bg-surface"
    >
      <span>
        <span className="block font-mono text-sm text-fg">{asset.name}</span>
        <span className="mt-1 block text-xs text-fg-muted">
          {assetTypeLabel(asset.type)}
          {runbook ? ` · ${profileName(runbook)}` : null}
        </span>
      </span>
      <span className="text-right text-sm">
        <span
          className={cn(
            "block",
            attention ? "text-attention" : "text-fg",
          )}
        >
          {primary}
        </span>
        <span className="mt-1 block text-xs text-fg-muted">
          {secondary}
          {stale && !secondary.includes("stale") ? " · May be stale" : null}
        </span>
        {actionLabel ? (
          <span className="mt-2 block text-xs text-fg-subtle">{actionLabel}</span>
        ) : null}
      </span>
    </Link>
  );
}
