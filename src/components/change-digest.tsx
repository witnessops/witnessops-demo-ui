import { Link } from "@tanstack/react-router";
import { digestRunChange, previousRunFor, type ChangeDigest } from "@/lib/diff";
import {
  attentionCopy,
  compactChange,
  formatShortDate,
  summarize,
} from "@/lib/format";
import type { ExposureRun } from "@/lib/types";

function envLines(digest: ChangeDigest) {
  const lines: string[] = [];
  if (digest.newAttention > 0) {
    lines.push(
      digest.newAttention === 1
        ? "1 new exposure observed"
        : `${digest.newAttention} new exposures observed`,
    );
  }
  if (digest.resolvedAttention > 0) {
    lines.push(
      digest.resolvedAttention === 1
        ? "1 previous issue no longer observed"
        : `${digest.resolvedAttention} previous issues no longer observed`,
    );
  }
  if (digest.newObservations > 0 && digest.newAttention === 0) {
    lines.push(
      digest.newObservations === 1
        ? "1 new observation on existing checks"
        : `${digest.newObservations} new observations on existing checks`,
    );
  }
  if (lines.length === 0 && digest.envChanged > 0) {
    lines.push(
      digest.envChanged === 1
        ? "1 environment change"
        : `${digest.envChanged} environment changes`,
    );
  }
  return lines;
}

function coverageLines(digest: ChangeDigest) {
  const lines: string[] = [];
  for (const check of digest.addedChecks) {
    lines.push(`${check.name} added to this profile.`);
  }
  for (const check of digest.retiredChecks) {
    lines.push(`${check.name} no longer in this profile.`);
  }
  if (lines.length === 0 && digest.checksAdded > 0) {
    lines.push(
      digest.checksAdded === 1
        ? "1 new check added"
        : `${digest.checksAdded} new checks added`,
    );
  }
  if (lines.length === 0 && digest.checksRetired > 0) {
    lines.push(
      digest.checksRetired === 1
        ? "1 check retired"
        : `${digest.checksRetired} checks retired`,
    );
  }
  return lines;
}

export function ChangeDigestLines({
  digest,
  title = "What changed",
}: {
  digest: ChangeDigest;
  title?: string | false;
}) {
  const env = envLines(digest);
  const coverage = coverageLines(digest);
  const coverageChanged = coverage.length > 0;

  if (env.length === 0 && !coverageChanged) {
    return (
      <p className="text-xs text-fg-muted">
        No material change since previous run.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {title ? (
        <p className="text-xs font-medium text-fg">{title}</p>
      ) : null}
      {env.length > 0 ? (
        <div>
          <p className="text-xs text-fg-subtle">Environment</p>
          <ul className="mt-1 grid gap-1 text-xs text-fg-muted">
            {env.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {coverageChanged ? (
        <div>
          <p className="text-xs text-fg-subtle">Coverage</p>
          <ul className="mt-1 grid gap-1 text-xs text-fg-muted">
            {coverage.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function CompactHistory({
  slug,
  runs,
  showDomain = false,
}: {
  slug: string;
  runs: ExposureRun[];
  showDomain?: boolean;
}) {
  if (runs.length === 0) {
    return (
      <p className="text-sm text-fg-muted">No observations for this asset yet.</p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {runs.map((run, index) => {
        const previous = previousRunFor(run, runs);
        const digest = digestRunChange(run, previous);
        const summary = summarize(run.observations);
        return (
          <li key={run.id}>
            <Link
              to="/w/$slug/exposure/$runId"
              params={{ slug, runId: run.id }}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 hover:bg-surface"
            >
              <span>
                <span className="block font-mono text-sm text-fg">
                  {formatShortDate(run.observedAt)}
                  {index === 0 ? " · Latest" : null}
                </span>
                <span className="mt-1 block text-xs text-fg-muted">
                  {showDomain ? `${run.domain} · ` : null}
                  {compactChange(digest, Boolean(previous))}
                </span>
              </span>
              <span className="text-sm text-attention">
                {attentionCopy(summary.needsAttention)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
