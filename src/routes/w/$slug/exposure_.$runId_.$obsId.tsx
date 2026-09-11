import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
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
      <p className="font-mono text-[11px] tracking-wide text-fg-subtle uppercase">
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

  if (!workspace || !run || !observation) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <h1 className="text-xl font-medium">Observation not found</h1>
        <ButtonBack slug={slug} runId={runId} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/w/$slug/exposure/$runId"
        params={{ slug, runId }}
        className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Back to review
      </Link>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <p className="font-mono text-xs text-fg-subtle">{observation.category}</p>
        <StatusPill status={observation.status} />
      </div>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">
        {observation.name}
      </h1>
      <p className="mt-2 font-mono text-xs text-fg-subtle">
        {run.domain} · {observation.method}
      </p>

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
        <Section kicker="Method" title="How this was produced">
          <p>{observation.method}</p>
          <p className="mt-2 font-mono text-xs text-fg-subtle">
            Observed at {formatDateTime(observation.observedAt)}
          </p>
        </Section>
      </div>
    </div>
  );
}

function ButtonBack({ slug, runId }: { slug: string; runId: string }) {
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
