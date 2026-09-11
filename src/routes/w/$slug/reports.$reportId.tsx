import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { StatusPill, SummaryCounts } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { formatDateTime, runIdForReport, summarize } from "@/lib/format";
import { useWorkspace, useWorkspaceRuns } from "@/lib/store";

export const Route = createFileRoute("/w/$slug/reports/$reportId")({
  component: ReportPage,
});

function ReportPage() {
  const { slug, reportId } = Route.useParams();
  const workspace = useWorkspace(slug);
  const runs = useWorkspaceRuns(workspace?.id);
  const run = runs.find((item) => item.id === runIdForReport(reportId));

  if (!workspace || !run) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <h1 className="text-xl font-medium">Report not found</h1>
        <Button asChild className="mt-6" variant="secondary">
          <Link to="/w/$slug" params={{ slug }}>
            Back to workspace
          </Link>
        </Button>
      </div>
    );
  }

  const summary = summarize(run.observations);
  const attention = run.observations.filter((obs) => obs.status === "needs_attention");
  const informational = run.observations.filter((obs) => obs.status === "informational");

  function share() {
    const url = window.location.href;
    void navigator.clipboard.writeText(url);
    toast("Link copied. Share it with people who already have access to this workspace.");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            window.print();
          }}
        >
          Download PDF
        </Button>
        <Button variant="secondary" onClick={share}>
          Share
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/w/$slug" params={{ slug }}>
            Back to workspace
          </Link>
        </Button>
      </div>

      <article className="print-paper rounded-xl border border-border bg-paper px-6 py-8 text-paper-fg sm:px-10 sm:py-10">
        <p className="font-mono text-[11px] tracking-wide text-paper-muted uppercase">
          WitnessOps · External Exposure
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          {workspace.name}
        </h1>
        <p className="mt-1 text-lg text-paper-muted">External Exposure Review</p>
        <p className="mt-2 font-mono text-xs text-paper-muted">
          {run.domain} · Observed {formatDateTime(run.observedAt)} · {run.checkset}{" "}
          · {run.checksetVersion} · Observations completed: {summary.completed}/
          {summary.total}
        </p>

        <div className="mt-8 border-t border-paper-fg/10 pt-6">
          <div className="text-paper-fg">
            <SummaryCounts summary={summary} onPaper />
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper-muted">
            This report summarizes publicly observable conditions at the time of
            the review. What these public checks observed about this hostname.
            Individual observations are not an overall security grade.
          </p>
        </div>

        {attention.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-sm font-medium">Needs attention</h2>
            <ul className="mt-3 grid gap-3">
              {attention.map((obs) => (
                <li
                  key={obs.id}
                  className="rounded-lg border border-paper-fg/10 bg-paper p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{obs.name}</p>
                    <StatusPill status={obs.status} onPaper />
                  </div>
                  <p className="mt-2 text-sm text-paper-muted">{obs.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {informational.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-sm font-medium">Informational</h2>
            <ul className="mt-3 grid gap-3">
              {informational.map((obs) => (
                <li
                  key={obs.id}
                  className="rounded-lg border border-paper-fg/10 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{obs.name}</p>
                    <StatusPill status={obs.status} onPaper />
                  </div>
                  <p className="mt-2 text-sm text-paper-muted">{obs.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="text-sm font-medium">All observations</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-paper-fg/10 text-xs text-paper-muted">
                <th className="py-2 pr-3 font-medium">Check</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Observation</th>
              </tr>
            </thead>
            <tbody>
              {run.observations.map((obs) => (
                <tr key={obs.id} className="border-b border-paper-fg/10 align-top">
                  <td className="py-3 pr-3">
                    <span className="block font-medium">{obs.name}</span>
                    <span className="block text-xs text-paper-muted">
                      {obs.category}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <StatusPill status={obs.status} onPaper />
                  </td>
                  <td className="py-3 text-paper-muted">{obs.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 border-t border-paper-fg/10 pt-6">
          <h2 className="text-sm font-medium">Limits</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-paper-muted">
            <li>Unauthenticated, outside-in observations of one hostname.</li>
            <li>Not a penetration test, certification, or security guarantee.</li>
            <li>
              Observed at {formatDateTime(run.observedAt)}. Conditions may have
              changed since.
            </li>
            <li>
              Prepared for {workspace.name}. A workspace does not prove legal
              identity or ownership of {run.domain}.
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}
