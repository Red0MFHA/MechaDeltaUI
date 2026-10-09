"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { parseAsBoolean, useQueryState } from "nuqs";

import { useSources } from "@/components/active-source";
import { CapabilityPills } from "@/components/capabilities";
import { PageHeader } from "@/components/page-header";
import { ConnectionBadge, Freshness, ProvenanceBadge } from "@/components/provenance";
import { EmptyState, QueryView } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sourceKindLabel } from "@/lib/contracts/catalog";

import { RegisterDialog } from "./register-dialog";

export function RobotsPage() {
  const query = useSources();
  const [register, setRegister] = useQueryState("register", parseAsBoolean.withDefault(false));

  return (
    <>
      <PageHeader
        title="Robots & sources"
        description="Simulations, physical robots, live cameras, and recorded patrols. The rest of the console uses the source you pick in the top bar."
        crumbs={[{ label: "Robots & sources" }]}
        actions={
          <Button onClick={() => void setRegister(true)}>
            <PlusIcon /> Register source
          </Button>
        }
      />
      <QueryView
        query={query}
        empty={
          <EmptyState
            title="No robots or sources yet"
            action={
              <Button onClick={() => void setRegister(true)}>
                <PlusIcon /> Register the first source
              </Button>
            }
          >
            Register a simulation, a physical robot, a camera, or a recording to start.
          </EmptyState>
        }
      >
        {(sources) => (
          <ul className="grid gap-3 md:grid-cols-2">
            {sources.map((source) => (
              <li key={source.id}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/app/operations/robots/${source.id}`}
                          className="font-semibold hover:underline"
                        >
                          {source.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {sourceKindLabel[source.kind]}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        <ConnectionBadge state={source.connectionState} />
                        <ProvenanceBadge origin={source.origin} />
                      </div>
                    </div>
                    {source.description && (
                      <p className="text-sm text-muted-foreground">{source.description}</p>
                    )}
                    <CapabilityPills capabilities={source.capabilities} />
                    <div className="mt-auto flex items-center justify-between pt-1">
                      <Freshness at={source.lastSeenAt ?? source.updatedAt} label="Last seen" />
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={`/app/operations/robots/${source.id}`}>Open</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
      <RegisterDialog open={register} onOpenChange={(open) => void setRegister(open || null)} />
    </>
  );
}
