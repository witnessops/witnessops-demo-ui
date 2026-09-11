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

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${formatDate(iso)} ${hours}:${minutes} UTC`;
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

export function diffLabel(label: DiffLabel) {
  switch (label) {
    case "changed":
      return "Changed";
    case "unchanged":
      return "Unchanged";
    case "new_check":
      return "New check";
    case "no_longer_checked":
      return "No longer checked";
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
