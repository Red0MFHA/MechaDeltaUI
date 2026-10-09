"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";

import { PageHeader, Section } from "@/components/page-header";
import { Freshness } from "@/components/provenance";
import { ErrorState, LoadingState } from "@/components/states";
import { TaskBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";
import { usePreferences } from "@/lib/stores/preferences";

export function TaskDetail({ id }: { id: string }) {
  const tz = usePreferences((s) => s.timezone);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: qk.task(id),
    queryFn: () => getServices().tasks.get(id),
    refetchInterval: (q) =>
      q.state.data && ["queued", "accepted", "running"].includes(q.state.data.status)
        ? 1000
        : false,
  });
  const cancel = useMutation({
    mutationFn: () => getServices().tasks.cancel(id),
    onSuccess: (task) => {
      void client.invalidateQueries({ queryKey: qk.task(id) });
      toast.message("Cancelled.");
      query.refetch();
      void task;
    },
  });

  if (query.isPending) return <LoadingState label="Loading task" />;
  if (query.error || !query.data)
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const task = query.data;
  const active = ["queued", "accepted", "running"].includes(task.status);

  return (
    <>
      <PageHeader
        title={task.command}
        crumbs={[
          { label: "Tasks", href: "/app/operations/tasks" },
          { label: task.type.replaceAll("_", " ") },
        ]}
        meta={
          <>
            <TaskBadge status={task.status} />
            {task.simulated && <span className="text-xs text-muted-foreground">Simulated</span>}
            <Freshness at={task.completedAt ?? task.startedAt ?? task.createdAt} label="Updated" />
          </>
        }
        actions={
          active ? (
            <Button variant="danger" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              Cancel
            </Button>
          ) : undefined
        }
      />
      <Card className="mb-6">
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p>{task.type.replaceAll("_", " ")}</p>
          </div>
          {task.target?.label && (
            <div>
              <p className="text-xs text-muted-foreground">Target</p>
              <p>
                {task.target.objectId ? (
                  <Link
                    href={`/app/operations/objects/${task.target.objectId}`}
                    className="text-primary hover:underline"
                  >
                    {task.target.label}
                  </Link>
                ) : (
                  task.target.label
                )}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Source</p>
            <p>
              <Link
                href={`/app/operations/robots/${task.sourceId}`}
                className="text-primary hover:underline"
              >
                {task.sourceId}
              </Link>
            </p>
          </div>
          {task.resultSummary && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Result</p>
              <p>{task.resultSummary}</p>
            </div>
          )}
          {task.errorMessage && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Error</p>
              <p className="text-danger">{task.errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <Section title="Status history">
        <ol className="flex flex-col gap-2">
          {task.history.map((h, i) => (
            <li
              key={`${h.at}-${i}`}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              <TaskBadge status={h.status} /> {formatDateTime(h.at, tz)}
              {h.note ? ` — ${h.note}` : ""}
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
