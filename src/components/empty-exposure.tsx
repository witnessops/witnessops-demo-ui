import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { RunningCheck } from "@/components/running-check";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PUBLIC_CHECK_IDS } from "@/lib/checks";
import { useAppStore } from "@/lib/store";
import type { Workspace } from "@/lib/types";

export function EmptyExposure({
  workspace,
  canRun,
}: {
  workspace: Workspace;
  canRun: boolean;
}) {
  const navigate = useNavigate();
  const startRun = useAppStore((state) => state.startRun);
  const completeRun = useAppStore((state) => state.completeRun);
  const running = useAppStore((state) => state.running);
  const [domain, setDomain] = useState(workspace.primaryDomain);

  if (running?.workspaceId === workspace.id) {
    return (
      <RunningCheck
        domain={running.domain}
        checkIds={running.checkIds}
        onDone={() => {
          const run = completeRun();
          if (run) {
            void navigate({
              to: "/w/$slug/exposure/$runId",
              params: { slug: workspace.slug, runId: run.id },
            });
          }
        }}
      />
    );
  }

  if (workspace.exposureActive) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">
          No domains monitored yet.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Observe what is publicly visible about a hostname and track how it
          changes over time.
        </p>
        {canRun ? (
          <div className="mt-8">
            <Button asChild>
              <Link
                to="/w/$slug/exposure/new"
                params={{ slug: workspace.slug }}
                search={{ edit: true }}
              >
                Add domain
              </Link>
            </Button>
          </div>
        ) : (
          <p className="mt-8 text-sm text-fg-muted">
            Only an owner can add a domain in this workspace.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-6">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">
        See what is publicly observable about your external presence.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        A first snapshot is saved to {workspace.name}. This is an
        unauthenticated observation of a public hostname, not a complete
        security assessment.
      </p>
      {canRun ? (
        <form
          className="mt-8 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const host = domain
              .trim()
              .toLowerCase()
              .replace(/^https?:\/\//, "")
              .replace(/\/.*$/, "");
            if (!host) return;
            startRun({
              domain: host,
              workspaceId: workspace.id,
              checkIds: PUBLIC_CHECK_IDS,
              source: "public",
            });
          }}
        >
          <Label htmlFor="empty-domain">Hostname</Label>
          <Input
            id="empty-domain"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <div className="pt-2">
            <Button type="submit">Run a first observation</Button>
          </div>
        </form>
      ) : (
        <p className="mt-8 text-sm text-fg-muted">
          Only an owner can run a check in this workspace.
        </p>
      )}
    </div>
  );
}
