"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

import { NeedSource } from "@/components/need-source";
import { PageHeader } from "@/components/page-header";
import { Freshness, ProvenanceBadge } from "@/components/provenance";
import { EmptyState, QueryView } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import type { DataOrigin, EventType } from "@/lib/contracts/types";
import { displayName } from "@/lib/domain/objects";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

const eventTypes = [
  "identity_registered",
  "observation_interval_extended",
  "transition_confirmed",
  "association_unresolved",
  "detection",
  "payload_captured",
] as const satisfies EventType[];

export function EventsPage() {
  return (
    <NeedSource>
      {(source) => <EventsBody sourceId={source.id} origin={source.origin} />}
    </NeedSource>
  );
}

function EventsBody({ sourceId, origin }: { sourceId: string; origin: DataOrigin }) {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [type, setType] = useQueryState("type", parseAsStringLiteral(eventTypes));
  const [focus] = useQueryState("event", parseAsString);
  const [cursor, setCursor] = useQueryState("cursor", parseAsString);

  const objects = useQuery({
    queryKey: qk.objects(sourceId),
    queryFn: () => getServices().objects.list(sourceId),
  });
  const names = new Map((objects.data ?? []).map((o) => [o.id, displayName(o)]));
  const query = useQuery({
    queryKey: qk.events({
      sourceId,
      search: search || undefined,
      types: type ? [type] : undefined,
      cursor: cursor ?? undefined,
      limit: 25,
    }),
    queryFn: () =>
      getServices().events.list({
        sourceId,
        search: search || undefined,
        types: type ? [type] : undefined,
        cursor: cursor ?? undefined,
        limit: 25,
      }),
  });

  return (
    <>
      <PageHeader
        title="Events"
        description="Observation history for the selected source. Times are observation times unless labelled otherwise."
        crumbs={[{ label: "Events" }]}
        meta={<ProvenanceBadge origin={origin} />}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => void setSearch(e.target.value || null)}
          placeholder="Search summaries, places, or names"
          aria-label="Search events"
        />
        <NativeSelect
          className="sm:w-64"
          value={type ?? ""}
          onChange={(e) => void setType((e.target.value || null) as typeof type)}
          aria-label="Event type"
        >
          <option value="">All types</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </NativeSelect>
      </div>
      <QueryView
        query={query}
        isEmpty={(page) => page.items.length === 0}
        empty={
          <EmptyState title="No events match these filters">
            Clear the search, or process a recording first.
          </EmptyState>
        }
      >
        {(page) => (
          <>
            <p className="mb-2 text-xs text-muted-foreground">{page.total} events</p>
            <ol className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
              {page.items.map((event) => (
                <li
                  key={event.id}
                  id={event.id}
                  className={focus === event.id ? "bg-primary-soft/40 p-4" : "p-4"}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{event.summary}</p>
                      <p className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge tone="outline">{event.type.replaceAll("_", " ")}</Badge>
                        {event.support && <span>at {event.support}</span>}
                        {event.objectIds.map((id) => (
                          <Link
                            key={id}
                            href={`/app/operations/objects/${id}`}
                            className="text-primary hover:underline"
                          >
                            {names.get(id) ?? id}
                          </Link>
                        ))}
                      </p>
                    </div>
                    <Freshness at={event.observedAt} label="Observed" />
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex justify-end gap-2">
              {cursor && (
                <Button variant="secondary" size="sm" onClick={() => void setCursor(null)}>
                  First page
                </Button>
              )}
              {page.nextCursor && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void setCursor(page.nextCursor!)}
                >
                  Next
                </Button>
              )}
            </div>
          </>
        )}
      </QueryView>
    </>
  );
}
