import { Link } from "@tanstack/react-router";
import { LocationChip } from "@/components/location-chip";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

export function PublicShell({
  children,
  path = "/check",
}: {
  children: React.ReactNode;
  path?: string;
}) {
  const signedIn = useAppStore((state) => state.signedIn);
  const lastWorkspaceSlug = useAppStore((state) => state.lastWorkspaceSlug);
  const workspaces = useAppStore((state) => state.workspaces);
  const slug = lastWorkspaceSlug ?? workspaces[0]?.slug;

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="flex h-14 items-center gap-4 border-b border-border px-4 sm:px-8">
        <Link to="/check">
          <Logo className="text-sm" />
        </Link>
        <LocationChip host="witnessops.com" path={path} className="hidden sm:block" />
        <div className="ml-auto">
          {signedIn && slug ? (
            <Button asChild size="sm">
              <Link to="/w/$slug" params={{ slug }}>
                Open workspace
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="secondary">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
