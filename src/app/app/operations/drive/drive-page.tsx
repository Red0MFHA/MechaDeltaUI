"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { NeedSource } from "@/components/need-source";
import { PageHeader, Section } from "@/components/page-header";
import { Note } from "@/components/provenance";
import { SpatialMap } from "@/components/spatial-map";
import { EmptyState, QueryView, UnsupportedState } from "@/components/states";
import { TaskBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { JogDirection, NavigateRequest, RobotSource } from "@/lib/contracts/types";
import { parseCommand } from "@/lib/domain/command-parser";
import { displayName } from "@/lib/domain/objects";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

const jogs: { direction: JogDirection; label: string }[] = [
  { direction: "forward", label: "Forward" },
  { direction: "back", label: "Back" },
  { direction: "turn_left", label: "Turn left" },
  { direction: "turn_right", label: "Turn right" },
  { direction: "look_up", label: "Look up" },
  { direction: "look_down", label: "Look down" },
];

export function DrivePage() {
  return <NeedSource>{(source) => <DriveBody source={source} />}</NeedSource>;
}

function DriveBody({ source }: { source: RobotSource }) {
  const client = useQueryClient();
  const [text, setText] = useState("");
  const [pendingNav, setPendingNav] = useState<{
    request: NavigateRequest;
    display: string;
  } | null>(null);
  const mapQuery = useQuery({
    queryKey: qk.map(source.id),
    queryFn: () => getServices().media.map(source.id),
    enabled: source.capabilities.map,
    retry: false,
  });
  const poseQuery = useQuery({
    queryKey: qk.pose(source.id),
    queryFn: () => getServices().media.pose(source.id),
    enabled: source.capabilities.pose,
    retry: false,
  });
  const objects = useQuery({
    queryKey: qk.objects(source.id),
    queryFn: () => getServices().objects.list(source.id),
  });
  const tasks = useQuery({
    queryKey: qk.tasks({ sourceId: source.id }),
    queryFn: () => getServices().tasks.list({ sourceId: source.id }),
    refetchInterval: 1500,
  });

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: qk.tasks({ sourceId: source.id }) });
    void client.invalidateQueries({ queryKey: qk.overview(source.id) });
  };

  const jog = useMutation({
    mutationFn: (direction: JogDirection) =>
      getServices().tasks.jog({
        sourceId: source.id,
        direction,
        command: jogs.find((j) => j.direction === direction)!.label,
      }),
    onSuccess: (task) => {
      invalidate();
      toast.success(task.resultSummary ?? "Jog accepted.");
    },
  });

  const navigate = useMutation({
    mutationFn: (request: NavigateRequest) => getServices().tasks.navigate(request),
    onSuccess: (task) => {
      invalidate();
      setPendingNav(null);
      toast.success(`Goal accepted: ${task.target?.label ?? task.command}`);
    },
  });

  const unsupported = useMutation({
    mutationFn: (command: string) => {
      const parsed = parseCommand(command, {
        waypoints: mapQuery.data?.waypoints ?? [],
        objects: objects.data ?? [],
      });
      const message = parsed.kind === "unsupported" ? parsed.message : "Unsupported.";
      return getServices().tasks.logUnsupported({ sourceId: source.id, command, reason: message });
    },
    onSuccess: (task) => {
      invalidate();
      toast.message(task.errorMessage ?? "Not supported.");
    },
  });

  function submitCommand(command: string) {
    const parsed = parseCommand(command, {
      waypoints: mapQuery.data?.waypoints ?? [],
      objects: objects.data ?? [],
    });
    if (parsed.kind === "jog") {
      jog.mutate(parsed.direction);
      return;
    }
    if (parsed.kind === "stop") {
      const running = (tasks.data ?? []).find(
        (t) => t.status === "running" || t.status === "accepted",
      );
      if (running) {
        void getServices()
          .tasks.cancel(running.id)
          .then(() => {
            invalidate();
            toast.message("Cancelled.");
          });
      } else toast.message("Nothing to stop.");
      return;
    }
    if (parsed.kind === "navigate_waypoint") {
      setPendingNav({
        display: parsed.display,
        request: {
          sourceId: source.id,
          target: { waypointId: parsed.waypoint.id },
          reason: "navigate_to_waypoint",
          command,
          confirmation: true,
        },
      });
      return;
    }
    if (parsed.kind === "navigate_last_known") {
      setPendingNav({
        display: parsed.display,
        request: {
          sourceId: source.id,
          target: { objectId: parsed.object.id },
          reason: "navigate_to_last_known_object_location",
          command,
          confirmation: true,
        },
      });
      return;
    }
    unsupported.mutate(command);
  }

  return (
    <>
      <PageHeader
        title="Drive & navigate"
        description="Jog, go to a named waypoint, or go to where an object was last seen. Picking and placing is answered as unavailable."
        crumbs={[{ label: "Drive" }]}
      />
      {!source.capabilities.driveControl && !source.capabilities.navigation ? (
        <UnsupportedState capability="driveControl" sourceName={source.name} />
      ) : source.connectionState !== "online" ? (
        <EmptyState title={`${source.name} is ${source.connectionState}`}>
          Connect it from the source page first.
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-6">
            {source.capabilities.driveControl && (
              <Section title="Jog">
                <div className="flex flex-wrap gap-2">
                  {jogs.map((j) => (
                    <Button
                      key={j.direction}
                      variant="secondary"
                      onClick={() => jog.mutate(j.direction)}
                      disabled={jog.isPending}
                    >
                      {j.label}
                    </Button>
                  ))}
                </div>
              </Section>
            )}
            <Section
              title="Text command"
              description="Examples: “move forward”, “go to Table-A”, “go to where you last saw my mug”, “pick up the cup”."
            >
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (text.trim()) submitCommand(text.trim());
                }}
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="go to where you last saw my mug"
                  aria-label="Robot command"
                />
                <Button type="submit">Send</Button>
              </form>
              <Note>
                Navigation needs a confirmation. Manipulation is logged as rejected, not executed.
              </Note>
            </Section>
            {source.capabilities.map && mapQuery.data && (
              <Section title="Map">
                <Card>
                  <CardContent>
                    <SpatialMap
                      map={mapQuery.data}
                      pose={poseQuery.data?.at(-1)}
                      markers={(objects.data ?? [])
                        .filter((o) => o.lastKnownLocation?.x !== undefined)
                        .map((o) => ({
                          x: o.lastKnownLocation!.x!,
                          y: o.lastKnownLocation!.y!,
                          label: displayName(o),
                        }))}
                    />
                  </CardContent>
                </Card>
              </Section>
            )}
          </div>
          <Section title="Recent tasks">
            <QueryView query={tasks} empty={<EmptyState title="No tasks yet" className="py-6" />}>
              {(list) => (
                <ul className="flex flex-col gap-2">
                  {list.slice(0, 8).map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/app/operations/tasks/${t.id}`}
                        className="flex flex-col gap-1 rounded-md border border-border bg-surface p-2 text-sm hover:border-primary/40"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate">{t.command}</span>
                          <TaskBadge status={t.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </QueryView>
            <Button variant="link" asChild className="mt-2 px-0">
              <Link href="/app/operations/tasks">All tasks</Link>
            </Button>
          </Section>
        </div>
      )}

      <AlertDialog open={!!pendingNav} onOpenChange={(open) => !open && setPendingNav(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Send this navigation goal?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingNav?.display}. The robot will move in the simulated world. Last-known object
            locations are from memory, not a live confirmation.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingNav && navigate.mutate(pendingNav.request)}
              disabled={navigate.isPending}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
