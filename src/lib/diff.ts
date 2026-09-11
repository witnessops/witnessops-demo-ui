import { parsePortCheckId } from "./ports";
import type { DiffLabel, ExposureRun } from "./types";

export interface RunDiff {
  observationId?: string;
  name: string;
  category: string;
  label: DiffLabel;
  from?: string;
  to?: string;
  kind: "environment" | "coverage";
}

export interface ChangeDigest {
  newObservations: number;
  resolvedAttention: number;
  newAttention: number;
  unchanged: number;
  methodChanged: boolean;
  totalMaterial: number;
  envChanged: number;
  checksAdded: number;
  checksRetired: number;
  runbookChanged: boolean;
  fromVersion?: string;
  toVersion?: string;
  fromRunbook?: string;
  toRunbook?: string;
  addedChecks: { id: string; name: string }[];
  retiredChecks: { id: string; name: string }[];
}

function coverageKey(run: ExposureRun) {
  const ports = (run.ports ?? [])
    .slice()
    .sort((a, b) => a - b)
    .join(",");
  return `${run.runbookName ?? run.checkset}|${run.runbookVersion ?? run.checksetVersion}|${run.checkIds.slice().sort().join(",")}|${ports}`;
}

function isCoverageRow(current: ExposureRun, previous: ExposureRun, row: RunDiff) {
  const id = row.observationId;
  if (!id) return false;
  const port = parsePortCheckId(id);
  if (row.label === "new_check") {
    if (port !== null) return !(previous.ports ?? []).includes(port);
    return !previous.checkIds.includes(id);
  }
  if (row.label === "no_longer_checked") {
    if (port !== null) return !(current.ports ?? []).includes(port);
    return !current.checkIds.includes(id);
  }
  return false;
}

export function diffRuns(
  current: ExposureRun,
  previous: ExposureRun | undefined,
): RunDiff[] {
  if (!previous) {
    return current.observations.map((obs) => ({
      observationId: obs.id,
      name: obs.name,
      category: obs.category,
      label: "new_check" as const,
      to: obs.status,
      kind: "coverage" as const,
    }));
  }

  const currentIds = new Set(current.observations.map((obs) => obs.id));
  const previousById = new Map(previous.observations.map((obs) => [obs.id, obs]));
  const rows: RunDiff[] = [];

  for (const obs of current.observations) {
    const prior = previousById.get(obs.id);
    if (!prior) {
      const row: RunDiff = {
        observationId: obs.id,
        name: obs.name,
        category: obs.category,
        label: "new_check",
        to: obs.status,
        kind: "coverage",
      };
      row.kind = isCoverageRow(current, previous, row) ? "coverage" : "environment";
      rows.push(row);
      continue;
    }
    if (prior.status !== obs.status) {
      rows.push({
        observationId: obs.id,
        name: obs.name,
        category: obs.category,
        label: "changed",
        from: prior.status,
        to: obs.status,
        kind: "environment",
      });
    } else {
      rows.push({
        observationId: obs.id,
        name: obs.name,
        category: obs.category,
        label: "unchanged",
        from: prior.status,
        to: obs.status,
        kind: "environment",
      });
    }
  }

  for (const obs of previous.observations) {
    if (!currentIds.has(obs.id)) {
      const row: RunDiff = {
        observationId: obs.id,
        name: obs.name,
        category: obs.category,
        label: "no_longer_checked",
        from: obs.status,
        kind: "coverage",
      };
      row.kind = isCoverageRow(current, previous, row) ? "coverage" : "environment";
      rows.push(row);
    }
  }

  return rows;
}

export function checksetChanged(
  current: ExposureRun,
  previous: ExposureRun | undefined,
) {
  if (!previous) return false;
  return coverageKey(current) !== coverageKey(previous);
}

export function digestRunChange(
  current: ExposureRun,
  previous: ExposureRun | undefined,
): ChangeDigest {
  const diffs = diffRuns(current, previous);
  let newObservations = 0;
  let resolvedAttention = 0;
  let newAttention = 0;
  let unchanged = 0;
  let envChanged = 0;
  let checksAdded = 0;
  let checksRetired = 0;

  for (const row of diffs) {
    if (row.label === "unchanged") {
      unchanged += 1;
      continue;
    }
    if (row.kind === "coverage" && row.label === "new_check") {
      checksAdded += 1;
      if (row.to === "needs_attention") newAttention += 1;
      continue;
    }
    if (row.kind === "coverage" && row.label === "no_longer_checked") {
      checksRetired += 1;
      continue;
    }
    envChanged += 1;
    if (row.label === "new_check") {
      newObservations += 1;
      if (row.to === "needs_attention") newAttention += 1;
      continue;
    }
    if (row.label === "changed") {
      if (row.from === "needs_attention" && row.to !== "needs_attention") {
        resolvedAttention += 1;
      }
      if (row.from !== "needs_attention" && row.to === "needs_attention") {
        newAttention += 1;
      }
      continue;
    }
    if (row.label === "no_longer_checked" && row.from === "needs_attention") {
      resolvedAttention += 1;
    }
  }

  const runbookChanged = Boolean(
    previous &&
      ((current.runbookName ?? current.checkset) !==
        (previous.runbookName ?? previous.checkset) ||
        (current.runbookVersion ?? current.checksetVersion) !==
          (previous.runbookVersion ?? previous.checksetVersion)),
  );

  const addedChecks = diffs
    .filter((row) => row.kind === "coverage" && row.label === "new_check")
    .map((row) => ({ id: row.observationId ?? row.name, name: row.name }));
  const retiredChecks = diffs
    .filter((row) => row.kind === "coverage" && row.label === "no_longer_checked")
    .map((row) => ({ id: row.observationId ?? row.name, name: row.name }));

  return {
    newObservations,
    resolvedAttention,
    newAttention,
    unchanged,
    methodChanged: checksetChanged(current, previous),
    totalMaterial: diffs.filter((row) => row.label !== "unchanged").length,
    envChanged,
    checksAdded,
    checksRetired,
    runbookChanged,
    fromVersion: previous?.runbookVersion ?? previous?.checksetVersion,
    toVersion: current.runbookVersion ?? current.checksetVersion,
    fromRunbook: previous?.runbookName ?? previous?.checkset,
    toRunbook: current.runbookName ?? current.checkset,
    addedChecks,
    retiredChecks,
  };
}

export function previousRunFor(run: ExposureRun, runs: ExposureRun[]) {
  const same = runs.filter((item) =>
    run.assetId ? item.assetId === run.assetId : item.domain === run.domain,
  );
  const index = same.findIndex((item) => item.id === run.id);
  if (index >= 0) return same[index + 1];
  return same.find((item) => item.id !== run.id && item.observedAt < run.observedAt);
}
