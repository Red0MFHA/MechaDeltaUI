"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { PageHeader, Section } from "@/components/page-header";
import { Note } from "@/components/provenance";
import { policyName } from "@/components/research/policy-color";
import { ErrorState, LoadingState } from "@/components/states";
import { JobBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { metricDefinitions } from "@/lib/contracts/catalog";
import { formatMetric } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

export function ReportDetail({ id }: { id: string }) {
  const reportQuery = useQuery({
    queryKey: qk.report(id),
    queryFn: () => getServices().reports.get(id),
  });
  const runsQuery = useQuery({
    queryKey: qk.experiments(),
    queryFn: () => getServices().experiments.list(),
  });

  if (reportQuery.isPending) return <LoadingState label="Loading report" />;
  if (reportQuery.error || !reportQuery.data) {
    return <ErrorState error={reportQuery.error} onRetry={() => void reportQuery.refetch()} />;
  }
  const report = reportQuery.data;
  const runs = (runsQuery.data ?? []).filter((r) => report.runIds.includes(r.id));
  const status =
    report.status === "generating"
      ? "running"
      : report.status === "queued"
        ? "queued"
        : report.status === "failed"
          ? "failed"
          : "completed";

  function downloadJson() {
    const blob = new Blob([JSON.stringify({ report, runs }, null, 2)], {
      type: "application/json",
    });
    triggerDownload(blob, `${report.id}.json`);
  }

  function downloadCsv() {
    const header = ["runId", "name", "policy", "status", ...metricDefinitions.map((m) => m.key)];
    const lines = [
      header.join(","),
      ...runs.map((r) =>
        [
          r.id,
          csv(r.name),
          csv(policyName(r.config.policyId)),
          r.status,
          ...metricDefinitions.map((m) => r.metricsSummary[m.key]?.value ?? ""),
        ].join(","),
      ),
    ];
    triggerDownload(new Blob([lines.join("\n")], { type: "text/csv" }), `${report.id}.csv`);
  }

  return (
    <>
      <PageHeader
        title={report.title}
        crumbs={[{ label: "Reports", href: "/app/research/reports" }, { label: report.id }]}
        meta={<JobBadge status={status} />}
        actions={
          <>
            <Button variant="secondary" onClick={downloadJson}>
              JSON
            </Button>
            <Button variant="secondary" onClick={downloadCsv}>
              CSV
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
          </>
        }
      />
      <Card className="mb-6">
        <CardContent>
          <p className="text-sm">{report.methodology}</p>
        </CardContent>
      </Card>
      <Section title="Runs">
        <ul className="flex flex-col gap-2">
          {runs.map((r) => (
            <li key={r.id}>
              <Link
                href={`/app/research/experiments/${r.id}`}
                className="text-sm text-primary hover:underline"
              >
                {r.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {" "}
                · {policyName(r.config.policyId)} · accuracy{" "}
                {formatMetric(r.metricsSummary.historyAccuracy?.value ?? null, "ratio")}
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Limitations" className="mt-6">
        <div className="flex flex-col gap-1">
          {report.limitations.map((line) => (
            <Note key={line}>{line}</Note>
          ))}
        </div>
      </Section>
    </>
  );
}

function csv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
