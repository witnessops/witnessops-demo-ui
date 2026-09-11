import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckPicker } from "@/components/check-picker";
import { RunningCheck } from "@/components/running-check";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  cadenceLabel,
  profileCountLabel,
  type Cadence,
} from "@/lib/checks";
import {
  isOwner,
  useAppStore,
  useMembership,
  useWorkspace,
} from "@/lib/store";

type Search = {
  edit?: boolean;
};

export const Route = createFileRoute("/w/$slug/exposure_/new")({
  validateSearch: (search: Record<string, unknown>): Search => {
    if (search.edit === true || search.edit === "1" || search.edit === "true") {
      return { edit: true };
    }
    return {};
  },
  component: NewExposurePage,
});

function NewExposurePage() {
  const { slug } = Route.useParams();
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const workspace = useWorkspace(slug);
  const membership = useMembership(workspace?.id);
  const owner = isOwner(membership?.role);
  const startRun = useAppStore((state) => state.startRun);
  const completeRun = useAppStore((state) => state.completeRun);
  const updateCheckProfile = useAppStore((state) => state.updateCheckProfile);
  const updateWorkspace = useAppStore((state) => state.updateWorkspace);
  const running = useAppStore((state) => state.running);
  const [editing, setEditing] = useState(Boolean(edit));
  const [domain, setDomain] = useState(workspace?.primaryDomain ?? "");
  const [selected, setSelected] = useState<string[]>(
    workspace?.checkProfile.checkIds ?? [],
  );
  const [cadence, setCadence] = useState<Cadence>(
    workspace?.checkProfile.cadence ?? "manual",
  );

  useEffect(() => {
    if (!workspace) return;
    setDomain(workspace.primaryDomain);
    setSelected(workspace.checkProfile.checkIds);
    setCadence(workspace.checkProfile.cadence);
  }, [workspace?.id]);

  useEffect(() => {
    if (edit) setEditing(true);
  }, [edit]);

  if (!workspace) return null;

  if (running?.workspaceId === workspace.id) {
    return (
      <RunningCheck
        domain={running.domain}
        checkIds={running.checkIds}
        onDone={() => {
          const run = completeRun();
          if (run) {
            void navigate({
              to: "/w/$slug/exposure/$runId",
              params: { slug, runId: run.id },
            });
          }
        }}
      />
    );
  }

  if (!workspace.exposureActive) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <h1 className="text-2xl font-medium tracking-tight">
          Activate External Exposure to choose checks.
        </h1>
        <p className="mt-3 text-sm text-fg-muted">
          Check selection is part of the workspace product. Your saved snapshot
          stays as it is.
        </p>
        <Button asChild className="mt-8">
          <Link to="/w/$slug" params={{ slug }}>
            Back to workspace
          </Link>
        </Button>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <h1 className="text-2xl font-medium tracking-tight">
          Only an owner can run checks.
        </h1>
        <Button asChild className="mt-8" variant="secondary">
          <Link to="/w/$slug" params={{ slug }}>
            Back to workspace
          </Link>
        </Button>
      </div>
    );
  }

  const ws = workspace;

  function persistProfile(nextIds = selected, nextCadence = cadence) {
    updateCheckProfile(ws.id, {
      checkIds: nextIds,
      cadence: nextCadence,
    });
  }

  function run() {
    const host = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (!host || selected.length === 0) return;
    persistProfile();
    if (host !== ws.primaryDomain) {
      updateWorkspace(ws.id, { primaryDomain: host });
    }
    startRun({
      domain: host,
      workspaceId: ws.id,
      checkIds: selected,
      source: "workspace",
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs text-fg-subtle">External Exposure</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">
        {domain.trim() || "Add a domain"}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        Observe what is publicly visible about your domain and track how it
        changes over time.
      </p>

      {editing ? (
        <div className="mt-8 grid gap-2">
          <Label htmlFor="run-domain">Hostname</Label>
          <Input
            id="run-domain"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-border bg-surface p-5">
        <p className="text-sm text-fg">
          {profileCountLabel(selected.length)}
        </p>
        <p className="mt-1 text-xs text-fg-muted">
          Future runs use this profile unless you change it. Repeat:{" "}
          {cadenceLabel(cadence)}.
        </p>
        {!editing ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={run}>Run now</Button>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit checks
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/w/$slug" params={{ slug }}>
                Cancel
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-8">
          <CheckPicker
            selected={selected}
            onChange={(ids) => {
              setSelected(ids);
              persistProfile(ids);
            }}
          />
          <div className="mt-8">
            <p className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
              Repeat
            </p>
            <RadioGroup
              className="mt-3 grid gap-2 sm:grid-cols-3"
              value={cadence}
              onValueChange={(value) => {
                const next = value as Cadence;
                setCadence(next);
                persistProfile(selected, next);
              }}
            >
              {(["manual", "weekly", "daily"] as const).map((value) => (
                <label
                  key={value}
                  className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm hover:bg-surface"
                >
                  <RadioGroupItem value={value} />
                  {cadenceLabel(value)}
                </label>
              ))}
            </RadioGroup>
            <p className="mt-2 text-xs text-fg-subtle">
              Scheduling is mocked in this prototype. It does not send
              notifications.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            <Button onClick={run}>Run selected checks</Button>
            <Button
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
