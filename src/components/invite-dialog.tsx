import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAppStore } from "@/lib/store";
import type { Role, Workspace } from "@/lib/types";

export function InviteDialog({ workspace }: { workspace: Workspace }) {
  const open = useAppStore((state) => state.inviteOpen);
  const setInviteOpen = useAppStore((state) => state.setInviteOpen);
  const inviteMember = useAppStore((state) => state.inviteMember);
  const [email, setEmail] = useState("alice@acme.com");
  const [role, setRole] = useState<Role>("viewer");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      toast("Enter an email address");
      return;
    }
    const member = inviteMember({
      workspaceId: workspace.id,
      email,
      role,
    });
    toast(
      `Invite sent to ${member.name}. They join ${workspace.name} after signing in.`,
    );
    setEmail("alice@acme.com");
    setRole("viewer");
  }

  return (
    <Dialog open={open} onOpenChange={setInviteOpen}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Invite a person to {workspace.name}</DialogTitle>
            <DialogDescription>
              They are invited into this workspace only. People are not added
              from an email domain, and opening a mail link does not join them
              by itself.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alice@acme.com"
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <RadioGroup
                value={role}
                onValueChange={(value) => setRole(value as Role)}
                className="gap-2"
              >
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-border-strong">
                  <RadioGroupItem value="viewer" className="mt-0.5" />
                  <span>
                    <span className="block text-sm text-fg">Viewer</span>
                    <span className="block text-xs text-fg-muted">
                      Can inspect runs, evidence, history and reports.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-border-strong">
                  <RadioGroupItem value="owner" className="mt-0.5" />
                  <span>
                    <span className="block text-sm text-fg">Owner</span>
                    <span className="block text-xs text-fg-muted">
                      Can run checks, invite people and manage this workspace.
                    </span>
                  </span>
                </label>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Send invite</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
