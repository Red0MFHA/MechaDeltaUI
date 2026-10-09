"use client";

import { useId } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MetricSample } from "@/lib/contracts/types";
import { formatBytes, formatClock, formatMetric } from "@/lib/format";

import { policyCssColor, policyName } from "./policy-color";

export function SeriesChart({
  series,
  metric,
  unit,
  label,
}: {
  series: MetricSample[];
  metric: string;
  unit: string;
  label: string;
}) {
  const id = useId();
  const rows = new Map<number, Record<string, number | string | null>>();
  const keys = new Set<string>();
  const t0 = series[0] ? Date.parse(series[0].measuredAt) : 0;
  for (const sample of series.filter((s) => s.metric === metric)) {
    const t = Date.parse(sample.measuredAt) - t0;
    const key = sample.policyId ?? sample.runId ?? "series";
    keys.add(key);
    const row = rows.get(t) ?? { t };
    row[key] = sample.value;
    rows.set(t, row);
  }
  const data = [...rows.values()].sort((a, b) => Number(a.t) - Number(b.t));
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No samples for {label}.</p>;
  }

  return (
    <div className="h-64 w-full" role="img" aria-label={`${label} over the run`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            tickFormatter={(v) => formatClock(Number(v))}
            stroke="var(--color-muted-foreground)"
            fontSize={11}
          />
          <YAxis
            tickFormatter={(v) =>
              unit === "bytes" ? formatBytes(Number(v), 0) : formatMetric(Number(v), unit)
            }
            stroke="var(--color-muted-foreground)"
            fontSize={11}
            width={72}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              fontSize: 12,
            }}
            labelFormatter={(v) => formatClock(Number(v))}
            formatter={(value, name) => [
              formatMetric(typeof value === "number" ? value : null, unit),
              policyName(String(name)),
            ]}
          />
          {keys.size > 1 && <Legend formatter={(v) => policyName(String(v))} />}
          {[...keys].map((key) => (
            <Line
              key={`${id}-${key}`}
              type="monotone"
              dataKey={key}
              stroke={policyCssColor(key)}
              dot={false}
              connectNulls={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
