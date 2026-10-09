"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Note } from "@/components/provenance";
import { SeriesChart } from "@/components/research/series-chart";
import { EmptyState, QueryView } from "@/components/states";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

export function ResourceHistory() {
  const runs = useQuery({
    queryKey: qk.experiments(),
    queryFn: () => getServices().experiments.list(),
  });
  const [runId, setRunId] = useState<string>("");

  return (
    <>
      <PageHeader
        title="Resource history"
        description="Resident payload and disk over a selected experiment run. Gaps in the series are shown as breaks, not zeros."
        crumbs={[{ label: "Resource history" }]}
      />
      <QueryView query={runs} empty={<EmptyState title="No experiment runs" />}>
        {(items) => {
          const selected = runId || items.find((r) => r.status === "completed")?.id || items[0]?.id;
          return <HistoryBody runs={items} selected={selected} onSelect={setRunId} />;
        }}
      </QueryView>
    </>
  );
}

function HistoryBody({
  runs,
  selected,
  onSelect,
}: {
  runs: { id: string; name: string; startedAt?: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const series = useQuery({
    queryKey: qk.experimentSeries(selected),
    queryFn: () => getServices().experiments.series(selected),
    enabled: !!selected,
  });

  return (
    <div className="flex flex-col gap-4">
      <NativeSelect
        className="max-w-md"
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="Experiment run"
      >
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </NativeSelect>
      <Note>Null samples are telemetry gaps. They are not plotted as zero resident bytes.</Note>
      <Card>
        <CardContent>
          {series.isPending ? (
            <p className="text-sm text-muted-foreground">Loading series…</p>
          ) : (
            <SeriesChart
              series={series.data ?? []}
              metric="resident_payload_bytes"
              unit="bytes"
              label="Resident payload"
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <SeriesChart
            series={series.data ?? []}
            metric="disk_bytes"
            unit="bytes"
            label="Disk bytes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
