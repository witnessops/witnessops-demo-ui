import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

export function ActivationPanel({
  workspaceId,
  compact = false,
  onActivated,
  onContinue,
}: {
  workspaceId: string;
  compact?: boolean;
  onActivated?: () => void;
  onContinue?: () => void;
}) {
  const activateExposure = useAppStore((state) => state.activateExposure);

  function activate() {
    activateExposure(workspaceId);
    onActivated?.();
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h2 className="mt-2 text-lg font-medium tracking-tight">
        Activate External Exposure
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">
        Keep your assets, observations, history and reports in one workspace.
      </p>
      {compact ? null : (
        <ul className="mt-4 grid gap-1.5 text-sm text-fg-muted">
          <li>Multiple assets</li>
          <li>Repeat observations</li>
          <li>Change history</li>
          <li>Improving check coverage</li>
          <li>Reports</li>
          <li>Team access</li>
        </ul>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={activate}>Activate External Exposure</Button>
        {onContinue ? (
          <Button variant="ghost" onClick={onContinue}>
            Continue with current review
          </Button>
        ) : null}
      </div>
    </div>
  );
}
