import type { ChangeDigest } from "@/lib/diff";

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
  if (digest.checksAdded > 0) {
    lines.push(
      digest.checksAdded === 1
        ? "1 new check added"
        : `${digest.checksAdded} new checks added`,
    );
  }
  if (digest.checksRetired > 0) {
    lines.push(
      digest.checksRetired === 1
        ? "1 check retired"
        : `${digest.checksRetired} checks retired`,
    );
  }
  return lines;
}

export function ChangeDigestLines({ digest }: { digest: ChangeDigest }) {
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
      <p className="text-xs font-medium text-fg">What changed</p>
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
      ) : (
        <p className="text-xs text-fg-subtle">Coverage unchanged</p>
      )}
    </div>
  );
}
