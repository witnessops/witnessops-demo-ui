import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { isOwner, useAppStore, useMembership, useWorkspace } from "@/lib/store";

export const Route = createFileRoute("/w/$slug/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { slug } = Route.useParams();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const updateWorkspace = useAppStore((state) => state.updateWorkspace);
  const owner = isOwner(membership?.role);
  const [name, setName] = useState(workspace?.name ?? "");
  const [domain, setDomain] = useState(workspace?.primaryDomain ?? "");

  useEffect(() => {
    if (!workspace) return;
    setName(workspace.name);
    setDomain(workspace.primaryDomain);
  }, [workspace]);

  if (!workspace) return null;

  return (
    <div className="mx-auto max-w-xl">
      <p className="font-mono text-xs text-fg-subtle">{workspace.name}</p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">Settings</h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        A workspace is the access and retention container for this company work.
        It does not prove legal identity, and the slug {workspace.slug} does not
        grant access by itself.
      </p>

      <form
        className="mt-8 grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!owner) return;
          updateWorkspace(workspace.id, {
            name: name.trim() || workspace.name,
            primaryDomain: domain
              .trim()
              .toLowerCase()
              .replace(/^https?:\/\//, "")
              .replace(/\/.*$/, ""),
          });
          toast("Workspace updated.");
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="set-name">Workspace name</Label>
          <Input
            id="set-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!owner}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="set-domain">Primary domain</Label>
          <Input
            id="set-domain"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            disabled={!owner}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        {owner ? (
          <div>
            <Button type="submit">Save changes</Button>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">
            You are a viewer in this workspace. Owners manage these settings.
          </p>
        )}
      </form>

      <dl className="mt-10 grid gap-3 border-t border-border pt-6 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-fg-muted">Slug</dt>
          <dd className="font-mono text-xs text-fg">{workspace.slug}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-fg-muted">Created</dt>
          <dd className="text-fg">{formatDate(workspace.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-fg-muted">Your role</dt>
          <dd className="text-fg">{owner ? "Owner" : "Viewer"}</dd>
        </div>
      </dl>

      <p className="mt-8 text-xs text-fg-subtle">
        Advanced:{" "}
        <Link
          to="/w/$slug/runbooks"
          params={{ slug }}
          className="text-fg-muted hover:text-fg"
        >
          Observation profiles
        </Link>
      </p>
    </div>
  );
}
