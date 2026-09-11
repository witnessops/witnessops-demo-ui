import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronsUpDown } from "lucide-react";
import { WorkspaceMark } from "@/components/workspace-mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/store";
import type { Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({
  workspace,
  className,
}: {
  workspace: Workspace;
  className?: string;
}) {
  const navigate = useNavigate();
  const workspaces = useAppStore((state) => state.workspaces);
  const setLastWorkspace = useAppStore((state) => state.setLastWorkspace);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-11 max-w-full justify-start gap-2.5 rounded-md px-2 text-left hover:bg-surface",
            className,
          )}
        >
          <WorkspaceMark name={workspace.name} mark={workspace.mark} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-fg">
              {workspace.name}
            </span>
            <span className="block truncate font-mono text-[11px] text-fg-subtle">
              Workspace
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-fg-subtle" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        {workspaces.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onSelect={() => {
              setLastWorkspace(item.slug);
              void navigate({ to: "/w/$slug", params: { slug: item.slug } });
            }}
            className="gap-3 py-2.5"
          >
            <WorkspaceMark name={item.name} mark={item.mark} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{item.name}</span>
              <span className="block truncate font-mono text-[11px] text-fg-subtle">
                {item.primaryDomain}
              </span>
            </span>
            {item.id === workspace.id ? (
              <Check className="size-4 text-fg" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void navigate({ to: "/onboarding" });
          }}
        >
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
