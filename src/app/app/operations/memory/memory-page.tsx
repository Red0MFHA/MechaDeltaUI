"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

import { ListFilters, listEmpty } from "@/components/list-filters";
import { NeedSource } from "@/components/need-source";
import { PageHeader } from "@/components/page-header";
import { QueryView } from "@/components/states";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/input";
import type { MemoryType, ResidencyState } from "@/lib/contracts/types";
import { formatBytes } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

const types = [
  "anchor",
  "transition",
  "interval",
  "payload",
  "perception_floor",
] as const satisfies MemoryType[];
const residencies = [
  "resident",
  "persistent_only",
  "evicted",
  "loading",
  "unavailable",
  "unknown",
] as const satisfies ResidencyState[];

const residencyTone: Record<ResidencyState, BadgeTone> = {
  resident: "success",
  persistent_only: "info",
  evicted: "warning",
  loading: "neutral",
  unavailable: "danger",
  unknown: "outline",
};

export function MemoryPage() {
  return <NeedSource>{(source) => <MemoryBody sourceId={source.id} />}</NeedSource>;
}

function MemoryBody({ sourceId }: { sourceId: string }) {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [type, setType] = useQueryState("type", parseAsStringLiteral(types));
  const [residency, setResidency] = useQueryState("residency", parseAsStringLiteral(residencies));
  const query = useQuery({
    queryKey: qk.memory({
      sourceId,
      search: search || undefined,
      types: type ? [type] : undefined,
      residency: residency ? [residency] : undefined,
    }),
    queryFn: () =>
      getServices().memory.list({
        sourceId,
        search: search || undefined,
        types: type ? [type] : undefined,
        residency: residency ? [residency] : undefined,
      }),
  });

  return (
    <>
      <PageHeader
        title="Memory"
        description="Anchors stay in RAM. Payloads may be resident, on disk, or evicted. Intervals fold repeated sightings."
        crumbs={[{ label: "Memory" }]}
      />
      <ListFilters
        search={search}
        onSearch={(value) => void setSearch(value || null)}
        placeholder="Search"
        searchLabel="Search memory"
        active={Boolean(search || type || residency)}
        onClear={() => {
          void setSearch(null);
          void setType(null);
          void setResidency(null);
        }}
      >
        <NativeSelect
          value={type ?? ""}
          onChange={(e) => void setType((e.target.value || null) as typeof type)}
          aria-label="Type"
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={residency ?? ""}
          onChange={(e) => void setResidency((e.target.value || null) as typeof residency)}
          aria-label="Residency"
        >
          <option value="">All residency</option>
          {residencies.map((r) => (
            <option key={r} value={r}>
              {r.replaceAll("_", " ")}
            </option>
          ))}
        </NativeSelect>
      </ListFilters>
      <QueryView
        query={query}
        empty={listEmpty(
          Boolean(search || type || residency),
          "memory records",
          "Process a run on this source first.",
        )}
      >
        {(items) => (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/app/operations/memory/${item.id}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-3 hover:border-primary/40"
                >
                  <span>
                    <span className="block font-medium">{item.summary}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.type} ·{" "}
                      {item.bytes !== undefined ? formatBytes(item.bytes) : "size not applicable"}
                      {item.stale ? " · stale" : ""}
                    </span>
                  </span>
                  <Badge tone={residencyTone[item.residencyState]}>
                    {item.residencyState.replaceAll("_", " ")}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </>
  );
}
