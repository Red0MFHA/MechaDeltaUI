"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";

import { ListFilters, listEmpty } from "@/components/list-filters";
import { NeedSource } from "@/components/need-source";
import { PageHeader } from "@/components/page-header";
import { QueryView } from "@/components/states";
import { TaskBadge } from "@/components/status-badge";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

export function TasksPage() {
  return <NeedSource>{(source) => <TasksBody sourceId={source.id} />}</NeedSource>;
}

function TasksBody({ sourceId }: { sourceId: string }) {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const query = useQuery({
    queryKey: qk.tasks({ sourceId, search: search || undefined }),
    queryFn: () => getServices().tasks.list({ sourceId, search: search || undefined }),
    refetchInterval: 2000,
  });

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Every command, including rejected pick-and-place requests."
        crumbs={[{ label: "Tasks" }]}
      />
      <ListFilters
        search={search}
        onSearch={(value) => void setSearch(value || null)}
        placeholder="Search commands"
        searchLabel="Search tasks"
        active={Boolean(search)}
        onClear={() => void setSearch(null)}
      />
      <QueryView
        query={query}
        empty={listEmpty(
          Boolean(search),
          "tasks",
          "Send a jog or a navigation command from Drive.",
        )}
      >
        {(items) => (
          <ul className="flex flex-col gap-2">
            {items.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/app/operations/tasks/${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 hover:border-primary/40"
                >
                  <span>
                    <span className="block font-medium">{t.command}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.type.replaceAll("_", " ")}
                    </span>
                  </span>
                  <TaskBadge status={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </>
  );
}
