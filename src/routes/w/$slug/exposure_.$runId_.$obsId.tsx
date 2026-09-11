import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { observationChangeLabel } from "@/lib/asset-status";
import { diffRuns, previousRunFor } from "@/lib/diff";
import { contractStatusLabel, implementationLabel } from "@/lib/checks";
import { formatDateTime } from "@/lib/format";
import { useWorkspace, useWorkspaceRuns } from "@/lib/store";

export const Route = createFileRoute("/w/$slug/exposure_/$runId_/$obsId")({
  component: ObservationPage,
});

function Section({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <p className="font-mono text-xs tracking-wide text-fg-subtle uppercase">
        {kicker}
      </p>
      <h2 className="mt-1 text-sm font-medium text-fg">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-fg-muted">{children}</div>
    </section>
  );
}

function ObservationPage() {
  const { slug, runId, obsId } = Route.useParams();
  const workspace = useWorkspace(slug);
  const runs = useWorkspaceRuns(workspace?.id);
  const run = runs.find((item) => item.id === runId);
  const observation = run?.observations.find((item) => item.id === obsId);
  const previous = run ? previousRunFor(run, runs) : undefined;
  const diffs = run ? diffRuns(run, previous) : [];
  const change =
    observation && previous
      ? observationChangeLabel(observation.id, diffs)
      : undefined;

  if (!workspace || !run || !observation) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <h1 className="text-xl font-medium">Observation not found</h1>
        <ButtonBack slug={slug} runId={runId} assetId={run?.assetId} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {run.assetId ? (
        <Link
          to="/w/$slug/assets/$assetId"
          params={{ slug, assetId: run.assetId }}
          className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Back to asset
        </Link>
      ) : (
        <Link
          to="/w/$slug/exposure/$runId"
          params={{ slug, runId }}
          className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Back to review
        </Link>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <p className="font-mono text-xs text-fg-subtle">{observation.category}</p>
        <StatusPill status={observation.status} label={observation.statusLabel} />
        {change ? (
          <span className="text-xs font-medium text-attention">{change}</span>
        ) : null}
      </div>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">
        {observation.name}
      </h1>
      <p className="mt-2 font-mono text-xs text-fg-subtle">
        {run.domain} · {observation.method}
      </p>
      <Link
        to="/w/$slug/exposure/$runId"
        params={{ slug, runId }}
        className="mt-2 inline-block text-xs text-fg-muted hover:text-fg"
      >
        Open this run
      </Link>

      <div className="mt-8 grid gap-3">
        <Section kicker="Scope" title="What we checked">
          {observation.checked}
        </Section>
        <Section kicker="Observation" title="What we observed">
          <p className="text-fg">{observation.observed}</p>
        </Section>
        <Section kicker="Evidence" title="Evidence">
          <dl className="grid gap-2">
            {observation.evidence.map((item) => (
              <div
                key={item.label}
                className="grid gap-1 border-b border-border py-2 last:border-b-0 sm:grid-cols-[11rem_1fr]"
              >
                <dt className="text-xs text-fg-subtle">{item.label}</dt>
                <dd className="font-mono text-xs text-fg break-all">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section kicker="Interpretation" title="Why it matters">
          {observation.whyItMatters}
        </Section>
        <Section kicker="Unknown" title="What remains unknown">
          {observation.remainsUnknown}
        </Section>
        {observation.recommendation ? (
          <Section kicker="Follow-up" title="Recorded follow-up">
            {observation.recommendation}
          </Section>
        ) : null}
        <Section kicker="Method" title="How this was produced">
          <p>{observation.method}</p>
          <p className="mt-2 font-mono text-xs text-fg-subtle">
            Observed at {formatDateTime(observation.observedAt)}
          </p>
          {observation.contractStatus ? (
            <p className="mt-2 font-mono text-xs text-fg-subtle">
              Recorded status · {contractStatusLabel(observation.contractStatus)} ·{" "}
              {observation.contractStatus}
              {observation.collected === false ? " · not collected" : null}
            </p>
          ) : null}
          {observation.checkId ? (
            <p className="mt-1 font-mono text-xs text-fg-subtle">
              {observation.checkId}
              {observation.checkVersion ? ` · ${observation.checkVersion}` : null}
            </p>
          ) : null}
          {observation.implementation ? (
            <p className="mt-2 text-xs text-fg-subtle">
              {implementationLabel(observation.implementation)}
            </p>
          ) : null}
          {observation.sourceEvidenceRefs && observation.sourceEvidenceRefs.length > 0 ? (
            <ul className="mt-2 grid gap-1 font-mono text-xs text-fg-subtle">
              {observation.sourceEvidenceRefs.map((ref) => (
                <li key={ref}>{ref}</li>
              ))}
            </ul>
          ) : null}
        </Section>
      </div>
    </div>
  );
}

function ButtonBack({
  slug,
  runId,
  assetId,
}: {
  slug: string;
  runId: string;
  assetId?: string;
}) {
  if (assetId) {
    return (
      <Link
        to="/w/$slug/assets/$assetId"
        params={{ slug, assetId }}
        className="mt-6 inline-flex text-sm text-fg-muted hover:text-fg"
      >
        Back to asset
      </Link>
    );
  }
  return (
    <Link
      to="/w/$slug/exposure/$runId"
      params={{ slug, runId }}
      className="mt-6 inline-flex text-sm text-fg-muted hover:text-fg"
    >
      Back to review
    </Link>
  );
}
