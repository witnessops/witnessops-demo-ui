import type { ChangeDigest } from "./diff";
import type { DiffLabel, ObservationStatus, Summary } from "./types";

export function summarize(
  observations: { status: ObservationStatus }[],
): Summary {
  const summary: Summary = {
    total: observations.length,
    completed: observations.length,
    needsAttention: 0,
    clear: 0,
    informational: 0,
    undetermined: 0,
  };
  for (const observation of observations) {
    if (observation.status === "needs_attention") summary.needsAttention += 1;
    else if (observation.status === "clear") summary.clear += 1;
    else if (observation.status === "informational") summary.informational += 1;
    else summary.undetermined += 1;
  }
  return summary;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDate(iso: string) {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatShortDate(iso: string) {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${formatDate(iso)} ${hours}:${minutes} UTC`;
}

export const PROTOTYPE_NOW = "2026-09-11T12:31:00.000Z";
export const STALE_AFTER_DAYS = 14;

export function daysSince(iso: string, nowIso = PROTOTYPE_NOW) {
  const then = Date.parse(iso);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(then) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

export function observedAgo(iso: string, nowIso = PROTOTYPE_NOW) {
  const days = daysSince(iso, nowIso);
  if (days <= 0) return "Observed today";
  if (days === 1) return "Observed yesterday";
  return `Observed ${days} days ago`;
}

export function isStale(iso: string, nowIso = PROTOTYPE_NOW) {
  return daysSince(iso, nowIso) >= STALE_AFTER_DAYS;
}

export function statusLabel(status: ObservationStatus) {
  switch (status) {
    case "clear":
      return "Clear";
    case "needs_attention":
      return "Needs attention";
    case "undetermined":
      return "Undetermined";
    case "informational":
      return "Informational";
  }
}

export function attentionCopy(count: number) {
  if (count === 0) return "No attention";
  return count === 1 ? "1 needs attention" : `${count} need attention`;
}

export function changeCopy(count: number) {
  return count === 1 ? "1 change" : `${count} changes`;
}

export function newlyObservedCopy(count: number) {
  return count === 1 ? "1 newly observed" : `${count} newly observed`;
}

export function noLongerObservedCopy(count: number) {
  return count === 1 ? "1 no longer observed" : `${count} no longer observed`;
}

export function coverageCopy(digest: {
  checksAdded: number;
  addedChecks: { id: string; name: string }[];
}) {
  if (digest.checksAdded <= 0) return "Coverage unchanged";
  if (digest.addedChecks.length === 1) {
    return `${digest.addedChecks[0].name} added since previous run`;
  }
  if (digest.addedChecks.length > 1 && digest.addedChecks.length <= 3) {
    return `${digest.addedChecks.map((check) => check.name).join(", ")} added since previous run`;
  }
  return digest.checksAdded === 1
    ? "+1 check since previous run"
    : `+${digest.checksAdded} checks since previous run`;
}

export function compactChange(
  digest: ChangeDigest | null | undefined,
  hasPrevious: boolean,
) {
  if (!hasPrevious) return "First observation";
  if (!digest) return "No material change";
  const bits: string[] = [];
  if (digest.newAttention > 0) bits.push(newlyObservedCopy(digest.newAttention));
  else if (digest.newObservations > 0) {
    bits.push(
      digest.newObservations === 1
        ? "1 newly observed"
        : `${digest.newObservations} newly observed`,
    );
  }
  if (digest.resolvedAttention > 0) {
    bits.push(noLongerObservedCopy(digest.resolvedAttention));
  }
  if (digest.checksAdded > 0) {
    if (digest.addedChecks.length === 1) {
      bits.push(`${digest.addedChecks[0].name} added`);
    } else if (digest.addedChecks.length > 1 && digest.addedChecks.length <= 3) {
      bits.push(`${digest.addedChecks.map((check) => check.name).join(", ")} added`);
    } else {
      bits.push(
        digest.checksAdded === 1
          ? "Coverage +1 check"
          : `Coverage +${digest.checksAdded} checks`,
      );
    }
  }
  if (digest.checksRetired > 0 && digest.retiredChecks.length === 1) {
    bits.push(`${digest.retiredChecks[0].name} no longer checked`);
  }
  if (bits.length === 0) return "No material change";
  return bits.join(" · ");
}

export function diffLabel(label: DiffLabel) {
  switch (label) {
    case "changed":
      return "Changed";
    case "unchanged":
      return "Still observed";
    case "new_check":
      return "Newly observed";
    case "no_longer_checked":
      return "No longer observed";
    case "undetermined":
      return "Undetermined";
  }
}

export function reportIdForRun(runId: string) {
  return runId.replace(/^run-/, "report-");
}

export function runIdForReport(reportId: string) {
  return reportId.replace(/^report-/, "run-");
}
