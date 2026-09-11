import { Link } from "@tanstack/react-router";
import { digestRunChange, previousRunFor } from "@/lib/diff";
import {
  attentionCopy,
  changeCopy,
  formatShortDate,
  summarize,
} from "@/lib/format";
import { assetTypeLabel, profileName } from "@/lib/runbooks";
import type { Asset, ExposureRun, Runbook } from "@/lib/types";

export function AssetRow({
  slug,
  asset,
  runbook,
  runs,
}: {
  slug: string;
  asset: Asset;
  runbook?: Runbook;
  runs: ExposureRun[];
}) {
  const latest = runs.find((run) => run.assetId === asset.id);
  const previous = latest ? previousRunFor(latest, runs) : undefined;
  const summary = latest ? summarize(latest.observations) : null;
  const digest = latest ? digestRunChange(latest, previous) : null;
  const envChanges = digest && previous ? digest.envChanged : 0;

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
          {runbook ? ` · Checks: ${profileName(runbook)}` : null}
        </span>
      </span>
      <span className="text-right text-sm">
        {summary && latest ? (
          <>
            <span className="block text-attention">
              {attentionCopy(summary.needsAttention)}
            </span>
            <span className="mt-1 block text-xs text-fg-muted">
              Last observed {formatShortDate(latest.observedAt)}
              {previous && envChanges > 0
                ? ` · ${changeCopy(envChanges)}`
                : null}
            </span>
          </>
        ) : (
          <span className="text-xs text-fg-subtle">Not observed yet</span>
        )}
      </span>
    </Link>
  );
}
