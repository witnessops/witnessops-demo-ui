import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LocationChip } from "@/components/location-chip";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const signedIn = useAppStore((state) => state.signedIn);
  const createWorkspace = useAppStore((state) => state.createWorkspace);
  const [name, setName] = useState("Acme Ltd");
  const [domain, setDomain] = useState("acme.com");

  if (!signedIn) {
    return <Navigate to="/login" />;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const workspace = createWorkspace({ name, domain });
    void navigate({ to: "/w/$slug", params: { slug: workspace.slug } });
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <header className="flex h-14 items-center justify-between px-5">
        <Logo className="text-sm" />
        <LocationChip host="app.witnessops.com" path="/onboarding" />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <form className="w-full max-w-md" onSubmit={submit}>
          <h1 className="text-2xl font-medium tracking-tight">
            Create your workspace
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            This workspace holds your assets, observations, reports and history.
            It is an access container — not proof of company identity or domain
            ownership.
          </p>
          <div className="mt-8 grid gap-5">
            <div className="grid gap-1.5">
              <Label htmlFor="ws-name">Workspace name</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme Ltd"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ws-domain">Primary domain</Label>
              <Input
                id="ws-domain"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="acme.com"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>
          <Button type="submit" className="mt-8 h-11">
            Create workspace
          </Button>
        </form>
      </div>
    </div>
  );
}
