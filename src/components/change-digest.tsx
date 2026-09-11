import type { ChangeDigest } from "@/lib/diff";

export function ChangeDigestLines({ digest }: { digest: ChangeDigest }) {
  if (digest.totalMaterial === 0 && !digest.methodChanged) {
    return (
      <p className="text-xs text-fg-muted">No material change since previous run.</p>
    );
  }

  return (
    <ul className="grid gap-1 text-xs text-fg-muted">
      <li>
        {digest.newObservations === 1
          ? "+ 1 new observation"
          : `+ ${digest.newObservations} new observations`}
      </li>
      <li>
        {digest.resolvedAttention === 1
          ? "1 issue no longer observed"
          : `${digest.resolvedAttention} issues no longer observed`}
      </li>
      {digest.newAttention > 0 ? (
        <li>
          {digest.newAttention === 1
            ? "1 new item needs attention"
            : `${digest.newAttention} new items need attention`}
        </li>
      ) : null}
      {digest.methodChanged ? (
        <li>Check profile changed since previous run.</li>
      ) : null}
    </ul>
  );
}
