"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Note } from "@/components/provenance";
import { policyCssColor, policyName } from "@/components/research/policy-color";
import { EmptyState, QueryView } from "@/components/states";
import { RunBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { metricDefinitions, metricByKey } from "@/lib/contracts/catalog";
import { checkAlignment, relativeChange } from "@/lib/domain/compare";
import { formatBytes, formatMetric } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";
import { usePreferences } from "@/lib/stores/preferences";
import { cn } from "@/lib/utils";

export function ComparePage() {
  const selected = usePreferences((s) => s.compareRunIds);
  const setSelected = usePreferences((s) => s.setCompareRunIds);
  const query = useQuery({
    queryKey: qk.experiments(),
    queryFn: () => getServices().experiments.list(),
  });

  return (
    <>
      <PageHeader
        title="Compare policies"
        description="Select two or more runs. Alignment warnings appear when workload, budget, or source differ."
        crumbs={[{ label: "Compare" }]}
      />
      <QueryView
        query={query}
        empty={<EmptyState title="No runs yet">Create an experiment first.</EmptyState>}
      >
        {(runs) => {
          const picked = runs.filter((r) => selected.includes(r.id));
          const alignment = checkAlignment(picked);
          const baseline = picked[0];
          return (
            <div className="flex flex-col gap-6">
              <Card>
                <CardContent>
                  <p className="mb-2 text-sm font-medium">Runs in the comparison</p>
                  <ul className="flex flex-col gap-2">
                    {runs.map((run) => {
                      const on = selected.includes(run.id);
                      return (
                        <li key={run.id} className="flex items-center gap-2 text-sm">
                          <input
                            id={`cmp-${run.id}`}
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              setSelected(
                                on ? selected.filter((id) => id !== run.id) : [...selected, run.id],
                              )
                            }
                          />
                          <label
                            htmlFor={`cmp-${run.id}`}
                            className="flex min-w-0 flex-1 items-center gap-2"
                          >
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ background: policyCssColor(run.config.policyId) }}
                              aria-hidden="true"
                            />
                            <span className="truncate">{run.name}</span>
                            <RunBadge status={run.status} />
                          </label>
                          <Link
                            href={`/app/research/experiments/${run.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            Open
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  {selected.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => setSelected([])}
                    >
                      Clear selection
                    </Button>
                  )}
                </CardContent>
              </Card>

              {picked.length < 2 ? (
                <EmptyState title="Select at least two runs" />
              ) : (
                <>
                  {!alignment.comparable && (
                    <div
                      className="flex flex-col gap-1 rounded-md border border-warning/40 bg-warning-soft p-3"
                      role="status"
                    >
                      {alignment.warnings.map((w) => (
                        <Note key={w}>{w}</Note>
                      ))}
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[40rem] text-left text-sm">
                      <caption className="sr-only">Metric comparison</caption>
                      <thead className="bg-surface-muted">
                        <tr>
                          <th className="px-3 py-2 font-medium">Metric</th>
                          {picked.map((run) => (
                            <th key={run.id} className="px-3 py-2 font-medium">
                              {policyName(run.config.policyId)}
                              <span className="block text-xs font-normal text-muted-foreground">
                                {formatBytes(run.config.ramBudgetBytes)}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metricDefinitions.map((def) => (
                          <tr key={def.key} className="border-t border-border">
                            <th className="px-3 py-2 font-normal">
                              {def.label}
                              <span className="block text-xs text-muted-foreground">
                                {def.direction.replaceAll("_", " ")}
                              </span>
                            </th>
                            {picked.map((run, i) => {
                              const value = run.metricsSummary[def.key];
                              const delta =
                                i > 0 && baseline
                                  ? relativeChange(
                                      baseline.metricsSummary[def.key],
                                      value,
                                      metricByKey[def.key],
                                    )
                                  : null;
                              return (
                                <td key={run.id} className="px-3 py-2 font-mono">
                                  {formatMetric(value?.value ?? null, def.unit)}
                                  {delta && (
                                    <span
                                      className={cn(
                                        "ml-1 text-xs",
                                        delta.better ? "text-success" : "text-danger",
                                      )}
                                    >
                                      {delta.percent > 0 ? "+" : ""}
                                      {delta.percent.toFixed(0)}%
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Relative change is versus the first selected run. Null and zero baselines are
                    omitted.
                  </p>
                </>
              )}
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
