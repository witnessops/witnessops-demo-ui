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
  if (lines.length === 0) {
    lines.push(
      digest.envChanged === 0
        ? "No material change"
        : digest.envChanged === 1
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
  if (digest.runbookChanged) {
    const from = digest.fromRunbook
      ? `${digest.fromRunbook}${digest.fromVersion ? ` ${digest.fromVersion}` : ""}`
      : "previous runbook";
    const to = digest.toRunbook
      ? `${digest.toRunbook}${digest.toVersion ? ` ${digest.toVersion}` : ""}`
      : "current runbook";
    lines.push(`Runbook changed from ${from} to ${to}`);
  }
  if (lines.length === 0) {
    lines.push("Same runbook and checks");
  }
  return lines;
}

export function ChangeDigestLines({ digest }: { digest: ChangeDigest }) {
  if (
    digest.totalMaterial === 0 &&
    !digest.methodChanged &&
    !digest.runbookChanged
  ) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-fg">Environment</p>
          <p className="mt-1 text-xs text-fg-muted">No material change</p>
        </div>
        <div>
          <p className="text-xs font-medium text-fg">Coverage</p>
          <p className="mt-1 text-xs text-fg-muted">Same runbook and checks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <p className="text-xs font-medium text-fg">Environment</p>
        <ul className="mt-1 grid gap-1 text-xs text-fg-muted">
          {envLines(digest).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium text-fg">Coverage</p>
        <ul className="mt-1 grid gap-1 text-xs text-fg-muted">
          {coverageLines(digest).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}