"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";

import { CapabilityPills } from "@/components/capabilities";
import { NeedSource } from "@/components/need-source";
import { PageHeader, Section } from "@/components/page-header";
import { ConnectionBadge, Freshness, ProvenanceBadge } from "@/components/provenance";
import { EmptyState, QueryView } from "@/components/states";
import { TaskBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sourceKindLabel } from "@/lib/contracts/catalog";
import { formatBytes } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

export function OverviewPage() {
  return <NeedSource>{(source) => <OverviewBody sourceId={source.id} />}</NeedSource>;
}

function OverviewBody({ sourceId }: { sourceId: string }) {
  const sourceQuery = useQuery({
    queryKey: qk.source(sourceId),
    queryFn: () => getServices().sources.get(sourceId),
  });
  const overview = useQuery({
    queryKey: qk.overview(sourceId),
    queryFn: () => getServices().overview.get(sourceId),
  });
  const source = sourceQuery.data;

  return (
    <>
      <PageHeader
        title="Overview"
        description={
          source ? `${source.name} · ${sourceKindLabel[source.kind]}` : "Selected source"
        }
        crumbs={[{ label: "Overview" }]}
        meta={
          source && (
            <>
              <ConnectionBadge state={source.connectionState} />
              <ProvenanceBadge origin={source.origin} />
              <Freshness at={source.lastSeenAt ?? source.updatedAt} label="Last seen" />
            </>
          )
        }
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/app/operations/robots/${sourceId}`}>Source details</Link>
          </Button>
        }
      />

      {source && (
        <Section
          title="Health"
          description="What this source can provide. Missing capabilities stay disabled elsewhere."
        >
          <Card>
            <CardContent className="flex flex-col gap-3">
              <CapabilityPills capabilities={source.capabilities} />
              {source.connectionState !== "online" && source.kind !== "recorded_video" && (
                <p className="text-sm text-warning">
                  Disconnected. Drive, pose, and live video wait until you connect it.
                </p>
              )}
            </CardContent>
          </Card>
        </Section>
      )}

      <div className="mt-8">
        <QueryView query={overview}>
          {(data) => (
            <div className="flex flex-col gap-8">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Identities"
                  value={String(data.objectCount)}
                  href="/app/operations/events"
                />
                <Stat
                  label="Transitions"
                  value={String(data.transitionCount)}
                  href="/app/operations/memory"
                />
                <Stat
                  label="Resident payload"
                  value={data.runtime ? formatBytes(data.runtime.residentPayloadBytes) : "—"}
                  href="/app/operations/runtime"
                />
                <Stat
                  label="Disk payloads"
                  value={data.runtime ? formatBytes(data.runtime.diskPayloadBytes) : "—"}
                  href="/app/operations/runtime"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Feed
                  title="Recent events"
                  description="Observation timeline"
                  href="/app/operations/events"
                  empty="No events on this source yet."
                  items={data.recentEvents.map((e) => ({
                    id: e.id,
                    title: e.summary,
                    meta: e.type.replaceAll("_", " "),
                    href: `/app/operations/events?event=${e.id}`,
                  }))}
                />
                <Feed
                  title="Recent tasks"
                  description="Drive and navigation"
                  href="/app/operations/tasks"
                  empty="No tasks sent yet."
                  items={data.recentTasks.map((t) => ({
                    id: t.id,
                    title: t.command,
                    meta: t.status,
                    href: `/app/operations/tasks/${t.id}`,
                    badge: <TaskBadge status={t.status} />,
                  }))}
                />
                <Feed
                  title="Recent questions"
                  description="Historical answers"
                  href="/app/operations/ask"
                  empty="No questions asked yet."
                  items={data.recentQuestions.map((q) => ({
                    id: q.id,
                    title: q.question,
                    meta: q.status.replaceAll("_", " "),
                    href: `/app/operations/ask/${q.id}`,
                    badge: (
                      <Badge
                        tone={
                          q.status === "completed"
                            ? "success"
                            : q.status === "insufficient_evidence"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {q.status.replaceAll("_", " ")}
                      </Badge>
                    ),
                  }))}
                />
              </div>
            </div>
          )}
        </QueryView>
      </div>
    </>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-surface p-4 hover:border-primary/40"
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
    </Link>
  );
}

function Feed({
  title,
  description,
  href,
  empty,
  items,
}: {
  title: string;
  description: string;
  href: string;
  empty: string;
  items: { id: string; title: string; meta: string; href: string; badge?: ReactNode }[];
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="link" size="sm" asChild>
          <Link href={href}>View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState title={empty} className="py-6" />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-2">
                <Link href={item.href} className="min-w-0 hover:underline">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.meta}</p>
                </Link>
                {item.badge}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
