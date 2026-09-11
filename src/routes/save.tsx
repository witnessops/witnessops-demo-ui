import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { LocationChip } from "@/components/location-chip";
import { Logo } from "@/components/logo";
import { WorkspaceMark } from "@/components/workspace-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/save")({
  component: SavePage,
});

function SavePage() {
  const navigate = useNavigate();
  const signedIn = useAppStore((state) => state.signedIn);
  const user = useAppStore((state) => state.user);
  const workspaces = useAppStore((state) => state.workspaces);
  const members = useAppStore((state) => state.members);
  const pendingSave = useAppStore((state) => state.pendingSave);
  const createWorkspace = useAppStore((state) => state.createWorkspace);
  const savePendingToWorkspace = useAppStore((state) => state.savePendingToWorkspace);
  const owned = useMemo(
    () =>
      workspaces.filter((workspace) =>
        members.some(
          (member) =>
            member.workspaceId === workspace.id &&
            member.email === user?.email &&
            member.role === "owner",
        ),
      ),
    [workspaces, members, user?.email],
  );
  const [selected, setSelected] = useState<string>(owned[0]?.id ?? "new");
  const [name, setName] = useState("Acme Ltd");
  const [domain, setDomain] = useState(pendingSave?.domain ?? "acme.com");
  const [saved, setSaved] = useState<{
    workspaceName: string;
    slug: string;
    runId: string;
    observedAt: string;
  } | null>(null);

  if (!signedIn) {
    return <Navigate to="/login" search={{ next: "/save" }} />;
  }

  if (!pendingSave && !saved) {
    return <Navigate to="/check" />;
  }

  function confirm() {
    if (!pendingSave) return;
    let workspaceId = selected;
    let workspaceName = owned.find((ws) => ws.id === selected)?.name;
    let slug = owned.find((ws) => ws.id === selected)?.slug;
    if (selected === "new" || owned.length === 0) {
      const created = createWorkspace({
        name,
        domain: domain || pendingSave.domain,
      });
      workspaceId = created.id;
      workspaceName = created.name;
      slug = created.slug;
    }
    const run = savePendingToWorkspace(workspaceId);
    if (run && workspaceName && slug) {
      setSaved({
        workspaceName,
        slug,
        runId: run.id,
        observedAt: run.observedAt,
      });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <header className="flex h-14 items-center justify-between px-5">
        <Logo className="text-sm" />
        <LocationChip host="app.witnessops.com" path="/save" />
      </header>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 pb-16">
        {saved ? (
          <div>
            <p className="font-mono text-xs text-fg-subtle">Saved</p>
            <h1 className="mt-2 text-2xl font-medium tracking-tight">
              Review saved to {saved.workspaceName}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">
              Observed {formatDateTime(saved.observedAt)}. Saved to{" "}
              {saved.workspaceName} now. The original observation time was
              preserved — saving did not produce new evidence.
            </p>
            <Button
              className="mt-8"
              onClick={() =>
                void navigate({
                  to: "/w/$slug/exposure/$runId",
                  params: { slug: saved.slug, runId: saved.runId },
                })
              }
            >
              Open workspace
            </Button>
          </div>
        ) : pendingSave ? (
          <div>
            <p className="font-mono text-xs text-fg-subtle">
              {pendingSave.domain} · observed {formatDateTime(pendingSave.observedAt)}
            </p>
            <h1 className="mt-2 text-2xl font-medium tracking-tight">
              Choose where to save this review
            </h1>
            <p className="mt-3 text-sm text-fg-muted">
              The observation stays as it is. It will not be rerun.
            </p>
            <div className="mt-6 grid gap-2">
              {owned.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => setSelected(workspace.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                    selected === workspace.id
                      ? "border-fg/35 bg-surface"
                      : "border-border hover:bg-surface/60",
                  )}
                >
                  <WorkspaceMark
                    name={workspace.name}
                    mark={workspace.mark}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-fg">
                      {workspace.name}
                    </span>
                    <span className="block font-mono text-[11px] text-fg-subtle">
                      {workspace.primaryDomain}
                    </span>
                  </span>
                  {selected === workspace.id ? (
                    <Check className="size-4 text-fg" />
                  ) : null}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelected("new")}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                  selected === "new"
                    ? "border-fg/35 bg-surface"
                    : "border-border hover:bg-surface/60",
                )}
              >
                Create new workspace
                {selected === "new" ? <Check className="size-4 text-fg" /> : null}
              </button>
            </div>
            {selected === "new" || owned.length === 0 ? (
              <div className="mt-5 grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="save-name">Workspace name</Label>
                  <Input
                    id="save-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="save-domain">Primary domain</Label>
                  <Input
                    id="save-domain"
                    value={domain}
                    onChange={(event) => setDomain(event.target.value)}
                  />
                </div>
              </div>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={confirm}>Save review</Button>
              <Button variant="ghost" asChild>
                <Link to="/check">Back</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
