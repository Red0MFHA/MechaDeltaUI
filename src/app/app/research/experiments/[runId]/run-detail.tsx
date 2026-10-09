"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";

import { PageHeader, Section } from "@/components/page-header";
import { Note, ProvenanceBadge } from "@/components/provenance";
import { RelatedLinks } from "@/components/related";
import { policyName } from "@/components/research/policy-color";
import { SeriesChart } from "@/components/research/series-chart";
import { ErrorState, LoadingState } from "@/components/states";
import { RunBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/switch";
import { metricDefinitions, policyById, workloadById } from "@/lib/contracts/catalog";
import { formatBytes, formatDateTime, formatMetric } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";
import { usePreferences } from "@/lib/stores/preferences";

export function RunDetail({ id }: { id: string }) {
  const tz = usePreferences((s) => s.timezone);
  const compare = usePreferences((s) => s.compareRunIds);
  const setCompare = usePreferences((s) => s.setCompareRunIds);
  const client = useQueryClient();
  const runQuery = useQuery({
    queryKey: qk.experiment(id),
    queryFn: () => getServices().experiments.get(id),
    refetchInterval: (q) =>
      q.state.data && (q.state.data.status === "queued" || q.state.data.status === "running")
        ? 1500
        : false,
  });
  const series = useQuery({
    queryKey: qk.experimentSeries(id),
    queryFn: () => getServices().experiments.series(id),
    enabled: !!runQuery.data?.startedAt,
    refetchInterval: () => (runQuery.data?.status === "running" ? 1500 : false),
  });
  const ledger = useQuery({
    queryKey: qk.experimentLedger(id),
    queryFn: () => getServices().experiments.ledger(id),
    enabled: !!runQuery.data?.startedAt,
  });
  const manifest = useQuery({
    queryKey: qk.manifest(id),
    queryFn: () => getServices().experiments.manifest(id),
  });

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: qk.experiment(id) });
    void client.invalidateQueries({ queryKey: ["experiments"] });
  };

  const start = useMutation({
    mutationFn: () => getServices().experiments.start(id),
    onSuccess: () => {
      invalidate();
      toast.success("Run queued.");
    },
  });
  const cancel = useMutation({
    mutationFn: () => getServices().experiments.cancel(id),
    onSuccess: () => {
      invalidate();
      toast.message("Run cancelled.");
    },
  });

  if (runQuery.isPending) return <LoadingState label="Loading run" />;
  if (runQuery.error || !runQuery.data) {
    return <ErrorState error={runQuery.error} onRetry={() => void runQuery.refetch()} />;
  }
  const run = runQuery.data;
  const inCompare = compare.includes(run.id);

  function downloadManifest() {
    if (!manifest.data) return;
    const blob = new Blob([JSON.stringify(manifest.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${run.id}-manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title={run.name}
        description={`${policyName(run.config.policyId)} on ${workloadById[run.config.workloadId]?.name ?? run.config.workloadId}.`}
        crumbs={[{ label: "Experiments", href: "/app/research/experiments" }, { label: run.id }]}
        meta={
          <>
            <RunBadge status={run.status} />
            <ProvenanceBadge origin={run.origin} />
            {run.partialResults && <span className="text-xs text-warning">Partial results</span>}
          </>
        }
        actions={
          <>
            {(run.status === "draft" || run.status === "failed" || run.status === "cancelled") && (
              <Button onClick={() => start.mutate()} disabled={start.isPending}>
                {start.isPending ? "Starting…" : "Start"}
              </Button>
            )}
            {(run.status === "queued" || run.status === "running") && (
              <Button variant="danger" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                Cancel
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() =>
                setCompare(inCompare ? compare.filter((x) => x !== run.id) : [...compare, run.id])
              }
            >
              {inCompare ? "Remove from compare" : "Add to compare"}
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/app/research/compare">Compare</Link>
            </Button>
            <Button variant="secondary" onClick={downloadManifest} disabled={!manifest.data}>
              Manifest JSON
            </Button>
          </>
        }
      />

      {(run.status === "running" || run.status === "queued") && (
        <Progress className="mb-6" value={run.progress ?? 0} label="Run progress" />
      )}
      {run.failureReason && <p className="mb-4 text-sm text-danger">{run.failureReason}</p>}
      {run.notes && <Note>{run.notes}</Note>}

      <Section title="Related" className="mt-6">
        <RelatedLinks
          items={[
            {
              href: `/app/operations/robots/${run.config.sourceId}`,
              label: "Source used for this run",
              hint: run.config.sourceId,
            },
            { href: "/app/research/runtime", label: "Resource history" },
            { href: "/app/research/compare", label: "Compare policies" },
            { href: "/app/research/reports", label: "Export in a report" },
          ]}
        />
      </Section>

      <Section title="Configuration" className="mt-6">
        <Card>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Item
              label="Policy"
              value={`${policyById[run.config.policyId]?.name ?? run.config.policyId} v${run.config.policyVersion}`}
            />
            <Item
              label="Workload"
              value={workloadById[run.config.workloadId]?.name ?? run.config.workloadId}
            />
            <Item label="Budget" value={formatBytes(run.config.ramBudgetBytes)} />
            <Item label="Questions" value={String(run.config.workloadSize ?? "—")} />
            <Item label="Software" value={run.softwareVersion} />
            <Item label="Created" value={formatDateTime(run.createdAt, tz)} />
          </CardContent>
        </Card>
      </Section>

      <Section
        title="Metrics"
        description="Null means the metric does not apply or was not measured."
        className="mt-8"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {metricDefinitions.map((def) => {
            const value = run.metricsSummary[def.key];
            return (
              <Card key={def.key}>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{def.label}</p>
                  <p className="font-mono text-lg font-semibold">
                    {formatMetric(value?.value ?? null, def.unit)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title="Resident payload over time" className="mt-8">
        {series.data && series.data.length > 0 ? (
          <Card>
            <CardContent>
              <SeriesChart
                series={series.data}
                metric="resident_payload_bytes"
                unit="bytes"
                label="Resident payload"
              />
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Series appear after the run starts.</p>
        )}
      </Section>

      <Section title="Ledger" className="mt-8">
        <ol className="max-h-80 overflow-auto rounded-lg border border-border bg-surface">
          {(ledger.data ?? []).map((e) => (
            <li key={e.id} className="border-b border-border px-3 py-2 text-sm last:border-0">
              <span className="font-medium">{e.eventType}</span>
              <span className="text-muted-foreground">
                {" "}
                ·{" "}
                {e.memoryId ? (
                  <Link
                    href={`/app/operations/memory/${e.memoryId}`}
                    className="text-primary hover:underline"
                  >
                    {e.memoryId}
                  </Link>
                ) : (
                  "—"
                )}{" "}
                · {formatDateTime(e.occurredAt, tz)}
              </span>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
