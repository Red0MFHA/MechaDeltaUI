"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader, Section } from "@/components/page-header";
import { Note } from "@/components/provenance";
import { policyCssColor, policyName } from "@/components/research/policy-color";
import { EmptyState, QueryView } from "@/components/states";
import { Card, CardContent } from "@/components/ui/card";
import { policies } from "@/lib/contracts/catalog";
import { formatBytes, formatRatio } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

export function AnalyticsPage() {
  const query = useQuery({
    queryKey: qk.experiments(),
    queryFn: () => getServices().experiments.list(),
  });

  return (
    <>
      <PageHeader
        title="Research analytics"
        description="Completed runs only. Incomplete and failed runs are listed, not averaged into a finding."
        crumbs={[{ label: "Analytics" }]}
      />
      <QueryView query={query} empty={<EmptyState title="No runs yet" />}>
        {(runs) => {
          const completed = runs.filter((r) => r.status === "completed");
          const incomplete = runs.filter((r) => r.status !== "completed");
          const byPolicy = policies
            .map((p) => {
              const group = completed.filter((r) => r.config.policyId === p.id);
              const mean = (key: string) => {
                const vals = group
                  .map((r) => r.metricsSummary[key]?.value)
                  .filter((v): v is number => v !== null && v !== undefined);
                return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
              };
              return {
                policy: p.id,
                n: group.length,
                historyAccuracy: mean("historyAccuracy"),
                peakResidentBytes: mean("peakResidentBytes"),
                reloadCount: mean("reloadCount"),
                floorCrossings: mean("floorCrossings"),
              };
            })
            .filter((row) => row.n > 0);

          return (
            <div className="flex flex-col gap-8">
              <Note>
                Mock data. Means over completed mock runs on mixed workloads are for the interface,
                not a paper result.
              </Note>
              <Section title="History accuracy by policy">
                <Card>
                  <CardContent className="h-72">
                    {byPolicy.length === 0 ? (
                      <EmptyState title="No completed runs" className="py-10" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byPolicy} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                          <XAxis
                            dataKey="policy"
                            tickFormatter={(v) => policyName(String(v)).split(" ")[0] ?? String(v)}
                            fontSize={11}
                          />
                          <YAxis tickFormatter={(v) => formatRatio(Number(v), 0)} fontSize={11} />
                          <Tooltip
                            formatter={(v) => formatRatio(typeof v === "number" ? v : null)}
                            labelFormatter={(v) => policyName(String(v))}
                            contentStyle={{
                              background: "var(--color-surface)",
                              border: "1px solid var(--color-border)",
                            }}
                          />
                          <Bar dataKey="historyAccuracy" name="Accuracy" isAnimationActive={false}>
                            {byPolicy.map((row) => (
                              <Cell key={row.policy} fill={policyCssColor(row.policy)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </Section>
              {/* Colour each bar via fill on Bar using a cell-like map */}
              <Section title="Summary table">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead className="bg-surface-muted">
                      <tr>
                        <th className="px-3 py-2">Policy</th>
                        <th className="px-3 py-2">Completed runs</th>
                        <th className="px-3 py-2">Mean accuracy</th>
                        <th className="px-3 py-2">Mean peak resident</th>
                        <th className="px-3 py-2">Mean reloads</th>
                        <th className="px-3 py-2">Mean floor crossings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byPolicy.map((row) => (
                        <tr key={row.policy} className="border-t border-border">
                          <td className="px-3 py-2">
                            <span
                              className="mr-2 inline-block size-2 rounded-full"
                              style={{ background: policyCssColor(row.policy) }}
                            />
                            {policyName(row.policy)}
                          </td>
                          <td className="px-3 py-2 font-mono">{row.n}</td>
                          <td className="px-3 py-2 font-mono">
                            {formatRatio(row.historyAccuracy)}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {row.peakResidentBytes === null
                              ? "—"
                              : formatBytes(row.peakResidentBytes)}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {row.reloadCount === null ? "—" : row.reloadCount.toFixed(1)}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {row.floorCrossings === null ? "—" : row.floorCrossings.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
              {incomplete.length > 0 && (
                <Section title="Excluded from means">
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {incomplete.map((r) => (
                      <li key={r.id}>
                        {r.name} ({r.status})
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
