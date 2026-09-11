import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PublicShell } from "@/components/public-shell";
import { RunningCheck } from "@/components/running-check";
import { StatusPill, SummaryCounts } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PUBLIC_CHECK_IDS, publicCheckset } from "@/lib/checks";
import { formatDateTime, summarize } from "@/lib/format";
import { observationsForDomain } from "@/lib/observations";
import { FROZEN_OBSERVED_AT } from "@/lib/seed";
import { useAppStore } from "@/lib/store";
import type { Observation } from "@/lib/types";

export const Route = createFileRoute("/check")({
  component: PublicCheckPage,
});

function PublicCheckPage() {
  const navigate = useNavigate();
  const signedIn = useAppStore((state) => state.signedIn);
  const setPendingSave = useAppStore((state) => state.setPendingSave);
  const [domain, setDomain] = useState("acme.com");
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<{
    domain: string;
    observedAt: string;
    observations: Observation[];
  } | null>(null);

  function run(event: React.FormEvent) {
    event.preventDefault();
    const host = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (!host) return;
    setDomain(host);
    setPhase("running");
  }

  function finishRun() {
    const observedAt =
      domain === "acme.com" ? FROZEN_OBSERVED_AT : new Date().toISOString();
    const observations = observationsForDomain(
      domain,
      observedAt,
      PUBLIC_CHECK_IDS,
    );
    setResult({ domain, observedAt, observations });
    setPhase("done");
  }

  function save() {
    if (!result) return;
    const meta = publicCheckset();
    setPendingSave({
      domain: result.domain,
      observedAt: result.observedAt,
      ...meta,
      observations: result.observations,
    });
    if (signedIn) {
      void navigate({ to: "/save" });
    } else {
      void navigate({ to: "/login", search: { next: "/save" } });
    }
  }

  return (
    <PublicShell path="/check">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {phase === "running" ? (
          <RunningCheck
            domain={domain}
            checkIds={PUBLIC_CHECK_IDS}
            onDone={finishRun}
          />
        ) : null}

        {phase === "idle" ? (
          <div className="max-w-lg">
            <p className="font-mono text-xs text-fg-subtle">
              Public External Exposure check
            </p>
            <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
              What public checks observe about a hostname.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-fg-muted">
              Ten defined public observations of one hostname. This is not a
              penetration test, does not produce a score, and does not establish
              the absence of vulnerabilities.
            </p>
            <form className="mt-8 grid gap-3" onSubmit={run}>
              <Label htmlFor="public-domain">Hostname</Label>
              <Input
                id="public-domain"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <div className="pt-1">
                <Button type="submit">Run public check</Button>
              </div>
            </form>
          </div>
        ) : null}

        {phase === "done" && result ? (
          <div>
            <p className="font-mono text-xs text-fg-subtle">
              Public observation · not saved
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight">
              {result.domain}
            </h1>
            <p className="mt-2 text-sm text-fg-muted">
              Observed {formatDateTime(result.observedAt)} · Public snapshot ·{" "}
              {result.observations.length}/{result.observations.length}{" "}
              observations completed
            </p>
            <div className="mt-6">
              <SummaryCounts summary={summarize(result.observations)} />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={save}>Save this review</Button>
              <Button variant="ghost" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
            <p className="mt-4 max-w-xl text-xs leading-relaxed text-fg-subtle">
              Saving stores this observation in a workspace. It does not rerun
              the checks or create new evidence. History and repeat checks are
              kept in the workspace.
            </p>
            <ul className="mt-8 divide-y divide-border rounded-xl border border-border bg-surface">
              {result.observations.map((obs) => (
                <li key={obs.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{obs.name}</p>
                    <StatusPill status={obs.status} />
                  </div>
                  <p className="mt-1 text-xs text-fg-subtle">{obs.category}</p>
                  <p className="mt-1.5 text-sm text-fg-muted">{obs.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </PublicShell>
  );
}
