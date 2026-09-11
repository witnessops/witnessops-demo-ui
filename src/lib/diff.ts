import type { DiffLabel, ExposureRun } from "./types";

export interface RunDiff {
  observationId?: string;
  name: string;
  category: string;
  label: DiffLabel;
  from?: string;
  to?: string;
}

export interface ChangeDigest {
  newObservations: number;
  resolvedAttention: number;
  newAttention: number;
  unchanged: number;
  methodChanged: boolean;
  totalMaterial: number;
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
    }));
  }

  const currentIds = new Set(current.observations.map((obs) => obs.id));
  const previousById = new Map(previous.observations.map((obs) => [obs.id, obs]));
  const rows: RunDiff[] = [];

  for (const obs of current.observations) {
    const prior = previousById.get(obs.id);
    if (!prior) {
      rows.push({
        observationId: obs.id,
        name: obs.name,
        category: obs.category,
        label: "new_check",
        to: obs.status,
      });
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
      });
    } else {
      rows.push({
        observationId: obs.id,
        name: obs.name,
        category: obs.category,
        label: "unchanged",
        from: prior.status,
        to: obs.status,
      });
    }
  }

  for (const obs of previous.observations) {
    if (!currentIds.has(obs.id)) {
      rows.push({
        observationId: obs.id,
        name: obs.name,
        category: obs.category,
        label: "no_longer_checked",
        from: obs.status,
      });
    }
  }

  return rows;
}

export function checksetChanged(
  current: ExposureRun,
  previous: ExposureRun | undefined,
) {
  if (!previous) return false;
  return (
    current.checksetVersion !== previous.checksetVersion ||
    current.checkset !== previous.checkset
  );
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

  for (const row of diffs) {
    if (row.label === "unchanged") {
      unchanged += 1;
      continue;
    }
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

  return {
    newObservations,
    resolvedAttention,
    newAttention,
    unchanged,
    methodChanged: checksetChanged(current, previous),
    totalMaterial: diffs.filter((row) => row.label !== "unchanged").length,
  };
}
