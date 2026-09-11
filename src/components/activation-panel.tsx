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
        Keep this workspace active
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">
        Keep assets, reusable runbooks and saved evidence in one workspace. The
        snapshot you already have stays as it is.
      </p>
      {compact ? null : (
        <ul className="mt-4 grid gap-1.5 text-sm text-fg-muted">
          <li>Assets</li>
          <li>Reusable runbooks</li>
          <li>Saved runs</li>
          <li>Change history</li>
          <li>Reports</li>
          <li>Workspace members</li>
          <li>Repeat checks</li>
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