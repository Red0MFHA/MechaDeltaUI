"use client";

import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

import { PageHeader } from "@/components/page-header";
import { ProvenanceBadge } from "@/components/provenance";
import { EmptyState, QueryView } from "@/components/states";
import { RunBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Progress } from "@/components/ui/switch";
import { policies, policyById, workloadById } from "@/lib/contracts/catalog";
import type { RunStatus } from "@/lib/contracts/types";
import { formatBytes, formatMetric } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

const statuses = [
  "draft",
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const satisfies RunStatus[];

export function ExperimentsPage() {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [status, setStatus] = useQueryState("status", parseAsStringLiteral(statuses));
  const [policyId, setPolicyId] = useQueryState("policy", parseAsString);
  const query = useQuery({
    queryKey: qk.experiments({
      search: search || undefined,
      status: status ? [status] : undefined,
      policyId: policyId || undefined,
    }),
    queryFn: () =>
      getServices().experiments.list({
        search: search || undefined,
        status: status ? [status] : undefined,
        policyId: policyId || undefined,
      }),
    refetchInterval: (q) =>
      q.state.data?.some((r) => r.status === "queued" || r.status === "running") ? 1500 : false,
  });

  return (
    <>
      <PageHeader
        title="Experiments"
        description="Replay a workload under a memory policy and a payload RAM budget. Mock values demonstrate the interface; they are not findings."
        crumbs={[{ label: "Experiments" }]}
        actions={
          <Button asChild>
            <Link href="/app/research/experiments/new">
              <PlusIcon /> New experiment
            </Link>
          </Button>
        }
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Input
          value={search}
          onChange={(e) => void setSearch(e.target.value || null)}
          placeholder="Search name or id"
          aria-label="Search experiments"
        />
        <NativeSelect
          value={status ?? ""}
          onChange={(e) => void setStatus((e.target.value || null) as typeof status)}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={policyId ?? ""}
          onChange={(e) => void setPolicyId(e.target.value || null)}
          aria-label="Policy"
        >
          <option value="">All policies</option>
          {policies.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <QueryView
        query={query}
        empty={
          <EmptyState title="No experiments match">Clear the filters, or create a run.</EmptyState>
        }
      >
        {(runs) => (
          <ul className="flex flex-col gap-2">
            {runs.map((run) => {
              const accuracy = run.metricsSummary.historyAccuracy;
              const peak = run.metricsSummary.peakResidentBytes;
              return (
                <li key={run.id}>
                  <Link
                    href={`/app/research/experiments/${run.id}`}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{run.name}</span>
                        <RunBadge status={run.status} />
                        <ProvenanceBadge origin={run.origin} />
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {policyById[run.config.policyId]?.name ?? run.config.policyId} ·{" "}
                        {workloadById[run.config.workloadId]?.name ?? run.config.workloadId} ·
                        budget {formatBytes(run.config.ramBudgetBytes)}
                      </span>
                      {(run.status === "running" || run.status === "queued") && (
                        <Progress
                          className="mt-2 max-w-xs"
                          value={run.progress ?? 0}
                          label={`${run.name} progress`}
                        />
                      )}
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted-foreground">
                      {accuracy ? (
                        <>Accuracy {formatMetric(accuracy.value, accuracy.unit)}</>
                      ) : null}
                      {peak ? (
                        <>
                          <br />
                          Peak {formatMetric(peak.value, peak.unit)}
                        </>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </QueryView>
    </>
  );
}
