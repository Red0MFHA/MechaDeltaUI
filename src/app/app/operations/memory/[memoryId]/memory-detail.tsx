"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { PageHeader, Section } from "@/components/page-header";
import { Freshness } from "@/components/provenance";
import { ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatBytes, formatDateTime, formatMs } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";
import { usePreferences } from "@/lib/stores/preferences";

export function MemoryDetail({ id }: { id: string }) {
  const tz = usePreferences((s) => s.timezone);
  const record = useQuery({
    queryKey: qk.memoryItem(id),
    queryFn: () => getServices().memory.get(id),
  });
  const history = useQuery({
    queryKey: qk.memoryHistory(id),
    queryFn: () => getServices().memory.history(id),
  });

  if (record.isPending) return <LoadingState label="Loading memory item" />;
  if (record.error || !record.data)
    return <ErrorState error={record.error} onRetry={() => void record.refetch()} />;
  const item = record.data;

  return (
    <>
      <PageHeader
        title={item.summary}
        crumbs={[{ label: "Memory", href: "/app/operations/memory" }, { label: item.type }]}
        meta={
          <>
            <Badge>{item.residencyState.replaceAll("_", " ")}</Badge>
            {item.stale && <Badge tone="warning">Stale</Badge>}
            <Freshness at={item.observedAt ?? item.createdAt} label="Observed" />
          </>
        }
      />
      <Card className="mb-6">
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Type" value={item.type} />
          <Field label="Bytes" value={item.bytes !== undefined ? formatBytes(item.bytes) : "—"} />
          <Field label="Persistent" value={item.persistent ? "Yes" : "No"} />
          <Field label="Hash" value={item.contentHash ?? "—"} />
          <p className="text-sm sm:col-span-2">
            Source:{" "}
            <Link
              href={`/app/operations/robots/${item.sourceId}`}
              className="text-primary hover:underline"
            >
              {item.sourceId}
            </Link>
          </p>
          {item.relatedObjectIds.map((oid) => (
            <p key={oid} className="text-sm sm:col-span-2">
              Object:{" "}
              <Link
                href={`/app/operations/objects/${oid}`}
                className="text-primary hover:underline"
              >
                {oid}
              </Link>
            </p>
          ))}
          {item.relatedEventIds.length > 0 && (
            <p className="text-sm sm:col-span-2">
              Events:{" "}
              {item.relatedEventIds.map((eid, i) => (
                <span key={eid}>
                  {i > 0 ? ", " : ""}
                  <Link
                    href={`/app/operations/events?event=${eid}`}
                    className="text-primary hover:underline"
                  >
                    {eid}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </CardContent>
      </Card>
      <Section title="Ledger">
        <ol className="flex flex-col gap-2">
          {(history.data ?? []).map((e) => (
            <li key={e.id} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <span className="font-medium">{e.eventType}</span>
              <span className="text-muted-foreground">
                {" "}
                · {formatDateTime(e.occurredAt, tz)}
                {e.durationMs !== undefined ? ` · ${formatMs(e.durationMs)}` : ""}
                {e.hashVerified !== undefined ? ` · hash ${e.hashVerified ? "ok" : "failed"}` : ""}
              </span>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm break-all">{value}</p>
    </div>
  );
}
