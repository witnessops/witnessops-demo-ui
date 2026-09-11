import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Box,
  FileText,
  LayoutGrid,
  LogOut,
  Menu,
  RotateCcw,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { InviteDialog } from "@/components/invite-dialog";
import { LocationChip } from "@/components/location-chip";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { isOwner, useAppStore, useMembership } from "@/lib/store";
import type { Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";

function navItems(slug: string) {
  return [
    { to: "/w/$slug" as const, label: "Overview", icon: LayoutGrid, params: { slug } },
    { to: "/w/$slug/assets" as const, label: "Assets", icon: Box, params: { slug } },
    {
      to: "/w/$slug/reports" as const,
      label: "Reports",
      icon: FileText,
      params: { slug },
    },
  ];
}

function navHref(slug: string, to: string) {
  if (to === "/w/$slug") return `/w/${slug}`;
  if (to === "/w/$slug/assets") return `/w/${slug}/assets`;
  return `/w/${slug}/reports`;
}

function isActive(pathname: string, slug: string, to: string) {
  const href = navHref(slug, to);
  if (to === "/w/$slug") return pathname === href;
  return pathname.startsWith(href);
}

function NavLinks({
  slug,
  pathname,
  onNavigate,
}: {
  slug: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <nav className="grid gap-0.5">
        {navItems(slug).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              params={item.params}
              onClick={onNavigate}
              className={cn(
                "flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                isActive(pathname, slug, item.to)
                  ? "bg-surface text-fg"
                  : "text-fg-muted hover:bg-surface/70 hover:text-fg",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="grid gap-0.5 border-t border-border pt-4">
        <Link
          to="/w/$slug/members"
          params={{ slug }}
          onClick={onNavigate}
          className={cn(
            "flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
            pathname.startsWith(`/w/${slug}/members`)
              ? "bg-surface text-fg"
              : "text-fg-muted hover:bg-surface/70 hover:text-fg",
          )}
        >
          <Users className="size-4" />
          Members
        </Link>
        <Link
          to="/w/$slug/settings"
          params={{ slug }}
          onClick={onNavigate}
          className={cn(
            "flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
            pathname.startsWith(`/w/${slug}/settings`)
              ? "bg-surface text-fg"
              : "text-fg-muted hover:bg-surface/70 hover:text-fg",
          )}
        >
          <Settings className="size-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}

function AccountMenu() {
  const user = useAppStore((state) => state.user);
  const signOut = useAppStore((state) => state.signOut);
  const resetPrototype = useAppStore((state) => state.resetPrototype);
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 gap-2 px-2"
          aria-label="Account menu"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-surface text-xs font-medium">
            {user?.name.slice(0, 1) ?? "K"}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-sm text-fg">
              {user?.name ?? "Account"}
            </span>
            <span className="block truncate font-mono text-[11px] text-fg-subtle">
              {user?.email}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {user?.name}
          <span className="mt-0.5 block font-normal text-fg-subtle">
            {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut();
            void navigate({ to: "/login" });
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            resetPrototype();
            void navigate({ to: "/login" });
          }}
        >
          <RotateCcw className="size-4" />
          Reset prototype
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: React.ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const membership = useMembership(workspace.id);
  const owner = isOwner(membership?.role);
  const setInviteOpen = useAppStore((state) => state.setInviteOpen);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setInviteOpen(false);
    setNavOpen(false);
    window.scrollTo(0, 0);
  }, [workspace.id, pathname, setInviteOpen]);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-bg-raised lg:flex lg:flex-col">
        <div className="flex h-14 items-center px-4">
          <Link to="/w/$slug" params={{ slug: workspace.slug }}>
            <Logo className="text-sm" />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks slug={workspace.slug} pathname={pathname} />
        </div>
        <div className="border-t border-border px-4 py-3">
          <LocationChip host="app.witnessops.com" path={pathname} />
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg/90 px-3 backdrop-blur-sm sm:px-5">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>
                  <Logo className="text-sm" />
                </SheetTitle>
              </SheetHeader>
              <NavLinks
                slug={workspace.slug}
                pathname={pathname}
                onNavigate={() => setNavOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <WorkspaceSwitcher workspace={workspace} className="min-w-0 flex-1 sm:flex-none" />

          <p className="hidden truncate font-mono text-xs text-fg-muted md:block">
            {workspace.primaryDomain}
          </p>

          <div className="ml-auto flex items-center gap-1.5">
            {owner ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="size-3.5" />
                <span className="hidden sm:inline">Invite</span>
              </Button>
            ) : (
              <span className="hidden text-xs text-fg-subtle sm:inline">
                Viewer
              </span>
            )}
            <AccountMenu />
          </div>
        </header>
        <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
      <InviteDialog workspace={workspace} />
    </div>
  );
}
