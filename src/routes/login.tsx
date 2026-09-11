import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { LocationChip } from "@/components/location-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KAROL } from "@/lib/seed";
import { useAppStore } from "@/lib/store";

type Search = {
  next?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const signIn = useAppStore((state) => state.signIn);
  const workspaces = useAppStore((state) => state.workspaces);
  const lastWorkspaceSlug = useAppStore((state) => state.lastWorkspaceSlug);
  const [mode, setMode] = useState<"options" | "email" | "code">("options");
  const [email, setEmail] = useState("karol@acme.com");
  const [code, setCode] = useState("");

  function afterSignIn() {
    if (next) {
      void navigate({ to: next });
      return;
    }
    if (workspaces.length === 0) {
      void navigate({ to: "/onboarding" });
      return;
    }
    const slug = lastWorkspaceSlug ?? workspaces[0]?.slug;
    if (slug) {
      void navigate({ to: "/w/$slug", params: { slug } });
      return;
    }
    void navigate({ to: "/onboarding" });
  }

  function continueWithGoogle() {
    signIn(KAROL);
    afterSignIn();
  }

  function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) return;
    setMode("code");
  }

  function submitCode(event: React.FormEvent) {
    event.preventDefault();
    if (code.trim().length < 6) return;
    signIn({ ...KAROL, email: email.trim().toLowerCase() });
    afterSignIn();
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <header className="flex h-14 items-center justify-between px-5">
        <Logo className="text-sm" />
        <LocationChip host="app.witnessops.com" path="/login" />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-medium tracking-tight">
            Sign in to WitnessOps
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Enter the workspace for saved checks, evidence and reports.
          </p>

          {mode === "options" ? (
            <div className="mt-8 grid gap-3">
              <Button className="h-11 w-full" onClick={continueWithGoogle}>
                Continue with Google
              </Button>
              <Button
                className="h-11 w-full"
                variant="secondary"
                onClick={() => setMode("email")}
              >
                Continue with email
              </Button>
            </div>
          ) : null}

          {mode === "email" ? (
            <form className="mt-8 grid gap-3" onSubmit={submitEmail}>
              <Label htmlFor="login-email">Work email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button type="submit" className="mt-2 h-11">
                Email a one-time code
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode("options")}
              >
                Back
              </Button>
            </form>
          ) : null}

          {mode === "code" ? (
            <form className="mt-8 grid gap-3" onSubmit={submitCode}>
              <p className="text-sm text-fg-muted">
                Enter the six-digit code sent to {email}.
              </p>
              <Label htmlFor="login-code">One-time code</Label>
              <Input
                id="login-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="font-mono tracking-[0.3em]"
              />
              <Button type="submit" className="mt-2 h-11">
                Continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode("email")}
              >
                Use a different email
              </Button>
            </form>
          ) : null}

          <p className="mt-10 text-xs leading-relaxed text-fg-subtle">
            Access is granted per workspace. Signing in does not prove company
            identity or domain ownership.
          </p>
        </div>
      </div>
    </div>
  );
}
