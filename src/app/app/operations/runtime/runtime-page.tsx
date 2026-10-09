"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { NeedSource } from "@/components/need-source";
import { PageHeader, Section } from "@/components/page-header";
import { Note, ProvenanceBadge } from "@/components/provenance";
import { QueryView } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { displayName } from "@/lib/domain/objects";
import { formatBytes, formatDateTime } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";
import { usePreferences } from "@/lib/stores/preferences";

export function RuntimePage() {
  return <NeedSource>{(source) => <RuntimeBody sourceId={source.id} />}</NeedSource>;
}

function RuntimeBody({ sourceId }: { sourceId: string }) {
  const tz = usePreferences((s) => s.timezone);
  const objects = useQuery({
    queryKey: qk.objects(sourceId),
    queryFn: () => getServices().objects.list(sourceId),
  });
  const names = new Map((objects.data ?? []).map((o) => [o.id, displayName(o)]));
  const query = useQuery({
    queryKey: qk.runtime(sourceId),
    queryFn: () => getServices().runtime.snapshot(sourceId),
    retry: false,
  });
  const ledger = useQuery({
    queryKey: qk.ledger({ sourceId }),
    queryFn: () => getServices().runtime.ledger({ sourceId }),
  });

  return (
    <>
      <PageHeader
        title="RAM & disk"
        description="What the engine kept in RAM, released to disk, and folded into an interval. Payload budget is not total process RSS."
        crumbs={[{ label: "RAM & disk" }]}
      />
      <QueryView query={query}>
        {(snap) => (
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap gap-2">
              <ProvenanceBadge origin={snap.origin} />
              <Badge tone="outline">{snap.live ? "Live samples" : "From the completed run"}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Payload budget" value={formatBytes(snap.ramBudgetBytes)} />
              <Metric label="Resident payloads" value={formatBytes(snap.residentPayloadBytes)} />
              <Metric label="Disk payloads" value={formatBytes(snap.diskPayloadBytes)} />
              <Metric
                label="Process RSS"
                value={snap.processRssBytes ? formatBytes(snap.processRssBytes) : "—"}
              />
            </div>
            <Note>
              Perception floor{" "}
              {snap.perceptionFloorBytes ? formatBytes(snap.perceptionFloorBytes) : "unknown"} is
              reserved for the detector and tracker. History uses memory above that floor. Measured{" "}
              {formatDateTime(snap.measuredAt, tz)}.
            </Note>

            <Section
              title="Kept in RAM"
              description="FR-50. Perception floor, anchors, and any decoded payload still resident."
            >
              <ul className="flex flex-col gap-2">
                {snap.kept.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border bg-surface p-3">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.kind} · {item.bytes !== undefined ? formatBytes(item.bytes) : "—"}
                      {item.objectId && names.has(item.objectId)
                        ? ` · ${names.get(item.objectId)}`
                        : ""}
                    </p>
                    {item.note && <p className="mt-1 text-sm text-warning">{item.note}</p>}
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              title="Released to disk"
              description="Evicted payloads. They remain on disk and may have been reloaded later."
            >
              {snap.released.length === 0 ? (
                <p className="text-sm text-muted-foreground">No evictions in this run.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {snap.released.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-border bg-surface p-3 text-sm"
                    >
                      <Link
                        href={`/app/operations/memory/${item.memoryId}`}
                        className="font-medium hover:underline"
                      >
                        {names.get(item.objectId) ?? item.objectId}
                      </Link>
                      <p className="text-muted-foreground">
                        {formatBytes(item.bytes)} · released {formatDateTime(item.releasedAt, tz)}
                        {item.reloadedAt
                          ? ` · reloaded ${formatDateTime(item.reloadedAt, tz)}`
                          : " · still on disk"}
                        {item.stale ? " · stale" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="Ledger"
              description="Load, evict, reload, and consolidate events for this run."
            >
              <ol className="max-h-80 overflow-auto rounded-lg border border-border bg-surface">
                {(ledger.data ?? [])
                  .slice()
                  .reverse()
                  .map((e) => (
                    <li
                      key={e.id}
                      className="border-b border-border px-3 py-2 text-sm last:border-0"
                    >
                      <span className="font-medium">{e.eventType}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {e.category} · {formatDateTime(e.occurredAt, tz)}
                      </span>
                    </li>
                  ))}
              </ol>
            </Section>

            <Section
              title="Folded into intervals"
              description="Repeated sightings extended one interval instead of writing a new event each frame."
            >
              <ul className="flex flex-col gap-2">
                {snap.folded.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border bg-surface p-3 text-sm"
                  >
                    {names.get(item.objectId) ?? item.objectId} at {item.support}:{" "}
                    {item.sightingCount} sightings
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}
      </QueryView>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
