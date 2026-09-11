import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isOwner, useAppStore, useMembership, useWorkspace } from "@/lib/store";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/w/$slug/members")({
  component: MembersPage,
});

function MembersPage() {
  const { slug } = Route.useParams();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const allMembers = useAppStore((state) => state.members);
  const members = useMemo(
    () => allMembers.filter((member) => member.workspaceId === workspace?.id),
    [allMembers, workspace?.id],
  );
  const user = useAppStore((state) => state.user);
  const setInviteOpen = useAppStore((state) => state.setInviteOpen);
  const changeRole = useAppStore((state) => state.changeRole);
  const removeMember = useAppStore((state) => state.removeMember);
  const owner = isOwner(membership?.role);
  const ownerCount = members.filter((member) => member.role === "owner").length;

  if (!workspace) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-fg-subtle">{workspace.name}</p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight">Members</h1>
          <p className="mt-2 max-w-xl text-sm text-fg-muted">
            People invited into this workspace. Membership is explicit — nobody
            joins because their email is on {workspace.primaryDomain}.
          </p>
        </div>
        {owner ? (
          <Button onClick={() => setInviteOpen(true)}>Invite person</Button>
        ) : null}
      </div>
      <ul className="mt-8 divide-y divide-border rounded-xl border border-border bg-surface">
        {members.map((member) => {
          const isSelf = member.email === user?.email;
          const lastOwner = member.role === "owner" && ownerCount < 2;
          return (
            <li
              key={member.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-bg-raised text-xs font-medium">
                {member.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-fg">
                  {member.name}
                  {isSelf ? (
                    <span className="text-fg-subtle"> · you</span>
                  ) : null}
                </span>
                <span className="block font-mono text-[11px] text-fg-subtle">
                  {member.email}
                </span>
              </span>
              <Badge variant={member.role === "owner" ? "owner" : "viewer"}>
                {member.role === "owner" ? "Owner" : "Viewer"}
              </Badge>
              {member.status === "invited" ? (
                <Badge>Invite sent</Badge>
              ) : null}
              {owner && !isSelf ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      Manage
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(["viewer", "owner"] as Role[]).map((role) => (
                      <DropdownMenuItem
                        key={role}
                        disabled={member.role === role || (member.role === "owner" && lastOwner)}
                        onSelect={() => {
                          changeRole(member.id, role);
                          toast(`${member.name} is now ${role === "owner" ? "Owner" : "Viewer"}.`);
                        }}
                      >
                        Make {role === "owner" ? "Owner" : "Viewer"}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                      disabled={lastOwner}
                      onSelect={() => {
                        removeMember(member.id);
                        toast(`${member.name} removed from ${workspace.name}.`);
                      }}
                    >
                      Remove member
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
