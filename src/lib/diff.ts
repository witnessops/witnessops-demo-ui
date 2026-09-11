import type { DiffLabel, ExposureRun } from "./types";

export interface RunDiff {
  observationId?: string;
  name: string;
  category: string;
  label: DiffLabel;
  from?: string;
  to?: string;
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
  return current.checksetVersion !== previous.checksetVersion;
}
