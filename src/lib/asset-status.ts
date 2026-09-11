import { digestRunChange, previousRunFor, type ChangeDigest, type RunDiff } from "./diff";
import {
  compactChange,
  daysSince,
  isStale,
  newlyObservedCopy,
  observedAgo,
  summarize,
} from "./format";
import { profileName } from "./runbooks";
import type { Asset, ExposureRun, Observation, Runbook, Summary } from "./types";

export type AssetPriority =
  | "new_attention"
  | "env_change"
  | "undetermined"
  | "coverage"
  | "stale"
  | "unchanged"
  | "never";

const PRIORITY_ORDER: Record<AssetPriority, number> = {
  new_attention: 0,
  env_change: 1,
  undetermined: 2,
  coverage: 3,
  stale: 4,
  unchanged: 5,
  never: 6,
};

export interface NextAction {
  label: string;
  verb: "open" | "run";
}

export interface AssetSnapshot {
  asset: Asset;
  runbook?: Runbook;
  latest?: ExposureRun;
  previous?: ExposureRun;
  digest: ChangeDigest | null;
  summary: Summary | null;
  priority: AssetPriority;
  stale: boolean;
  daysAgo: number | null;
  observedLabel: string;
  primary: string;
  secondary: string;
  nextAction: NextAction | null;
  servicesObserved: number;
}

export function latestRunForAsset(assetId: string, runs: ExposureRun[]) {
  return runs.find((run) => run.assetId === assetId);
}

export function snapshotsFor(
  assets: Asset[],
  runs: ExposureRun[],
  runbooks: Runbook[],
) {
  return assets.map((asset) =>
    buildAssetSnapshot(
      asset,
      runs,
      runbooks.find((item) => item.id === asset.runbookId),
    ),
  );
}

export function buildAssetSnapshot(
  asset: Asset,
  runs: ExposureRun[],
  runbook?: Runbook,
): AssetSnapshot {
  const latest = latestRunForAsset(asset.id, runs);
  const previous = latest ? previousRunFor(latest, runs) : undefined;
  const digest = latest ? digestRunChange(latest, previous) : null;
  const summary = latest ? summarize(latest.observations) : null;
  const stale = latest ? isStale(latest.observedAt) : false;
  const daysAgo = latest ? daysSince(latest.observedAt) : null;
  const servicesObserved = latest
    ? latest.observations.filter(
        (obs) => obs.id.startsWith("port-") && obs.statusLabel === "Observed",
      ).length
    : 0;

  let priority: AssetPriority = "never";
  if (latest && digest && summary) {
    if (digest.newAttention > 0) priority = "new_attention";
    else if (digest.envChanged > 0) priority = "env_change";
    else if (summary.undetermined > 0) priority = "undetermined";
    else if (digest.checksAdded > 0 || digest.checksRetired > 0) {
      priority = "coverage";
    } else if (stale) priority = "stale";
    else priority = "unchanged";
  } else if (latest) {
    priority = stale ? "stale" : "unchanged";
  }

  const observedLabel = latest ? observedAgo(latest.observedAt) : "Not observed yet";
  const { primary, secondary, nextAction } = copyFor(priority, {
    digest,
    previous: Boolean(previous),
    servicesObserved,
    daysAgo,
    stale,
    observedLabel,
    runbookName: runbook ? profileName(runbook) : undefined,
    publicServices: runbook?.templateId === "public-services",
  });

  return {
    asset,
    runbook,
    latest,
    previous,
    digest,
    summary,
    priority,
    stale,
    daysAgo,
    observedLabel,
    primary,
    secondary,
    nextAction,
    servicesObserved,
  };
}

function copyFor(
  priority: AssetPriority,
  ctx: {
    digest: ChangeDigest | null;
    previous: boolean;
    servicesObserved: number;
    daysAgo: number | null;
    stale: boolean;
    observedLabel: string;
    runbookName?: string;
    publicServices: boolean;
  },
): { primary: string; secondary: string; nextAction: NextAction | null } {
  const digest = ctx.digest;
  if (priority === "never") {
    return {
      primary: "Not observed yet",
      secondary: "Observe to keep a first snapshot",
      nextAction: { label: "Observe this asset.", verb: "run" },
    };
  }
  if (priority === "new_attention") {
    return {
      primary: digest
        ? digest.newAttention === 1
          ? "1 new exposure observed"
          : `${digest.newAttention} new exposures observed`
        : "Newly observed",
      secondary: ctx.stale ? "May be stale" : ctx.observedLabel,
      nextAction: {
        label: "Run again to confirm this newly observed condition.",
        verb: "run",
      },
    };
  }
  if (priority === "env_change") {
    return {
      primary: compactChange(digest, ctx.previous),
      secondary: ctx.stale ? "May be stale" : ctx.observedLabel,
      nextAction: {
        label: "Review the newly observed change.",
        verb: "open",
      },
    };
  }
  if (priority === "undetermined") {
    return {
      primary: "Undetermined observations",
      secondary: compactChange(digest, ctx.previous),
      nextAction: {
        label: "Inspect the undetermined observations.",
        verb: "open",
      },
    };
  }
  if (priority === "coverage") {
    const added = digest?.addedChecks ?? [];
    return {
      primary: "Coverage improved",
      secondary:
        added.length === 1
          ? `${added[0].name} added since previous run`
          : added.length > 1 && added.length <= 3
            ? `${added.map((check) => check.name).join(", ")} added since previous run`
            : compactChange(digest, ctx.previous),
      nextAction: {
        label:
          "Coverage expanded since the previous run. Inspect the new observations.",
        verb: "open",
      },
    };
  }
  if (priority === "stale") {
    const primary =
      ctx.publicServices && ctx.servicesObserved > 0
        ? ctx.servicesObserved === 1
          ? "1 service observed"
          : `${ctx.servicesObserved} services observed`
        : compactChange(digest, ctx.previous);
    return {
      primary,
      secondary: `${ctx.observedLabel} · May be stale`,
      nextAction: {
        label: `Observation is ${ctx.daysAgo ?? 0} days old.`,
        verb: "run",
      },
    };
  }
  const primary =
    ctx.publicServices && ctx.servicesObserved > 0
      ? ctx.servicesObserved === 1
        ? "1 service observed"
        : `${ctx.servicesObserved} services observed`
      : "No material change";
  return {
    primary,
    secondary: ctx.observedLabel,
    nextAction: {
      label: "No material change. No action needed.",
      verb: "open",
    },
  };
}

export function sortSnapshots(snapshots: AssetSnapshot[]) {
  return snapshots.slice().sort((a, b) => {
    const delta = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (delta !== 0) return delta;
    const aTime = a.latest?.observedAt ?? "";
    const bTime = b.latest?.observedAt ?? "";
    return aTime < bTime ? 1 : aTime > bTime ? -1 : 0;
  });
}

export function deservesAttention(snapshot: AssetSnapshot) {
  return (
    snapshot.priority === "new_attention" ||
    snapshot.priority === "env_change" ||
    (snapshot.priority === "stale" &&
      (snapshot.summary?.needsAttention ?? 0) > 0)
  );
}

export function workspaceReturnSummary(snapshots: AssetSnapshot[]) {
  let newExposure = 0;
  let noLonger = 0;
  let unchanged = 0;
  let coverage = 0;
  let stale = 0;
  let attentionNow = 0;
  let envAssets = 0;
  for (const snapshot of snapshots) {
    if (deservesAttention(snapshot)) attentionNow += 1;
    if ((snapshot.digest?.envChanged ?? 0) > 0) envAssets += 1;
    newExposure += snapshot.digest?.newAttention ?? 0;
    noLonger += snapshot.digest?.resolvedAttention ?? 0;
    if (snapshot.priority === "coverage") coverage += 1;
    if (snapshot.priority === "unchanged" || snapshot.priority === "stale") {
      unchanged += 1;
    }
    if (snapshot.stale) stale += 1;
  }
  return {
    newExposure,
    noLonger,
    unchanged,
    coverage,
    stale,
    attentionNow,
    envAssets,
  };
}

export function returnSummaryLines(
  stats: ReturnType<typeof workspaceReturnSummary>,
) {
  const lines: string[] = [];
  if (stats.newExposure > 0) {
    lines.push(
      stats.newExposure === 1
        ? "1 new exposure observed"
        : `${stats.newExposure} new exposures observed`,
    );
  }
  if (stats.noLonger > 0) {
    lines.push(
      stats.noLonger === 1
        ? "1 previous issue no longer observed"
        : `${stats.noLonger} previous issues no longer observed`,
    );
  }
  if (stats.unchanged > 0) {
    lines.push(
      stats.unchanged === 1
        ? "1 asset unchanged"
        : `${stats.unchanged} assets unchanged`,
    );
  }
  if (stats.coverage > 0) {
    lines.push(
      stats.coverage === 1
        ? "1 asset has broader coverage"
        : `${stats.coverage} assets have broader coverage`,
    );
  }
  if (stats.stale > 0) {
    lines.push(
      stats.stale === 1
        ? "1 observation may be stale"
        : `${stats.stale} observations may be stale`,
    );
  }
  return lines;
}

export function worthChecking(snapshots: AssetSnapshot[], max = 3) {
  const ranked = sortSnapshots(snapshots).filter(
    (snapshot) =>
      snapshot.priority === "new_attention" ||
      snapshot.priority === "env_change" ||
      snapshot.priority === "stale" ||
      snapshot.priority === "undetermined" ||
      snapshot.priority === "never",
  );
  return ranked.slice(0, max).map((snapshot) => ({
    snapshot,
    reason:
      snapshot.priority === "stale"
        ? snapshot.nextAction?.label ?? snapshot.observedLabel
        : snapshot.primary,
    verb:
      snapshot.priority === "stale" || snapshot.priority === "never"
        ? ("run" as const)
        : ("open" as const),
  }));
}

export function observationChangeLabel(
  observationId: string,
  diffs: RunDiff[],
) {
  const row = diffs.find((item) => item.observationId === observationId);
  if (!row) return undefined;
  if (row.kind === "coverage" && row.label === "new_check") return "New coverage";
  if (row.label === "new_check") return "Newly observed";
  if (row.label === "changed" && row.to === "needs_attention") return "Newly observed";
  if (
    row.label === "changed" &&
    row.from === "needs_attention" &&
    row.to !== "needs_attention"
  ) {
    return "No longer observed";
  }
  if (row.label === "no_longer_checked" && row.kind === "environment") {
    return "No longer observed";
  }
  return undefined;
}

export function sortObservationsForReturn(
  observations: Observation[],
  diffs: RunDiff[],
) {
  return observations.slice().sort((a, b) => {
    const rank = (obs: Observation) => {
      const label = observationChangeLabel(obs.id, diffs);
      if (label === "Newly observed") return 0;
      if (obs.status === "needs_attention") return 1;
      if (label === "New coverage") return 2;
      return 3;
    };
    return rank(a) - rank(b);
  });
}

export function usesProfileCopy(runbook?: Runbook) {
  if (!runbook) return "Uses the saved check profile";
  return `Uses current ${profileName(runbook)} checks`;
}

export { newlyObservedCopy };
