import { EXTERNAL_VERSION, type CheckStatus, type ExternalCheckResultV1, type ExternalSnapshotV1 } from "./contracts";
import { contractStatusFromUi } from "./checks";
import type { ExposureRun, Observation } from "./types";

function observationToCheck(run: ExposureRun, obs: Observation): ExternalCheckResultV1 {
  const status: CheckStatus =
    obs.contractStatus ?? contractStatusFromUi(obs.status, obs.collected ?? true);
  const payload = Object.fromEntries(obs.evidence.map((item) => [item.label, item.value]));
  return {
    check_id: obs.checkId ?? obs.id,
    check_version: obs.checkVersion ?? run.snapshotVersion ?? EXTERNAL_VERSION,
    target: run.domain,
    started_at: obs.startedAt ?? run.observedAt,
    finished_at: obs.finishedAt ?? run.observedAt,
    status,
    method: obs.method,
    title: obs.name,
    observation: payload,
    evidence: obs.sourceEvidenceRefs ?? [
      `external-exposure-snapshot.json: checks[check_id=${obs.checkId ?? obs.id}]`,
    ],
    interpretation: obs.interpretation ?? obs.observed,
    limitations: obs.limitations ?? [obs.remainsUnknown],
    recommendation: obs.recommendation ?? null,
    collected: obs.collected ?? true,
  };
}

/** Rebuild a snapshot-shaped source record from a prototype run. */
export function snapshotFromRun(run: ExposureRun): ExternalSnapshotV1 {
  const checks = run.observations
    .filter((obs) => !obs.id.startsWith("port-"))
    .map((obs) => observationToCheck(run, obs));
  return {
    version: run.snapshotVersion ?? EXTERNAL_VERSION,
    target: run.domain,
    started_at: run.observedAt,
    finished_at: run.observedAt,
    checks,
    usage: { dns: 0, normalTls: 0, legacyTls: 0, http: 0, redirects: 0 },
    network: [],
  };
}

export function completionStateFor(observations: Observation[]) {
  return observations.some((obs) => obs.collected === false) ? "partial" : "complete";
}

export function mockSourceDigest(input: {
  id: string;
  domain: string;
  observedAt: string;
}) {
  return `sha256:demo-${input.id}-${input.domain}-${input.observedAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
}
