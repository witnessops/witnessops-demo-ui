import { createFileRoute, Link, Navigate, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAppStore, useWorkspace } from "@/lib/store";

export const Route = createFileRoute("/w/$slug")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { slug } = Route.useParams();
  const signedIn = useAppStore((state) => state.signedIn);
  const setLastWorkspace = useAppStore((state) => state.setLastWorkspace);
  const lastWorkspaceSlug = useAppStore((state) => state.lastWorkspaceSlug);
  const workspaces = useAppStore((state) => state.workspaces);
  const workspace = useWorkspace(slug);

  useEffect(() => {
    if (workspace?.slug) setLastWorkspace(workspace.slug);
  }, [workspace?.slug, setLastWorkspace]);

  if (!signedIn) {
    return <Navigate to="/login" search={{ next: `/w/${slug}` }} />;
  }

  if (!workspace) {
    const fallback =
      lastWorkspaceSlug && lastWorkspaceSlug !== slug
        ? lastWorkspaceSlug
        : workspaces[0]?.slug;
    if (fallback) {
      return <Navigate to="/w/$slug" params={{ slug: fallback }} />;
    }
    if (workspaces.length === 0) {
      return <Navigate to="/onboarding" />;
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
        <h1 className="text-lg font-medium">Workspace not found</h1>
        <p className="max-w-md text-sm text-fg-muted">
          This prototype only shows workspaces you already belong to. The slug
          itself does not grant access.
        </p>
        <Button asChild variant="secondary">
          <Link to="/onboarding">Create a workspace</Link>
        </Button>
      </div>
    );
  }

  return (
    <AppShell workspace={workspace}>
      <Outlet />
    </AppShell>
  );
}
