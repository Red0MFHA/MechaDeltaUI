"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { DriveJoystick } from "@/components/drive-joystick";
import { LiveKitRobotStreams } from "@/components/livekit-streams";
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
import { dataMode, getServices } from "@/lib/services";

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
    enabled: source.capabilities.pose && dataMode !== "http",
    retry: false,
    refetchInterval: dataMode !== "http" ? 500 : false,
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

  const twistInFlight = useRef(false);
  const pendingTwist = useRef<{ linearX: number; angularZ: number } | null>(null);
  const sendTwist = useCallback(
    (twist: { linearX: number; angularZ: number }) => {
      pendingTwist.current = twist;
      if (twistInFlight.current) return;
      twistInFlight.current = true;
      const pump = () => {
        const next = pendingTwist.current;
        pendingTwist.current = null;
        if (!next) {
          twistInFlight.current = false;
          return;
        }
        void getServices()
          .tasks.cmdVel({ sourceId: source.id, ...next })
          .catch(() => {
            /* keep stick responsive even if one packet drops */
          })
          .finally(() => {
            if (pendingTwist.current) pump();
            else twistInFlight.current = false;
          });
      };
      pump();
    },
    [source.id],
  );

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

  const controlRail = (
    <div className="flex flex-col gap-5">
      {source.capabilities.driveControl && (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-medium">Joystick</h3>
            <p className="text-xs text-muted-foreground">
              Hold to drive. Stick stays beside the feeds.
            </p>
          </div>
          <DriveJoystick
            disabled={source.connectionState !== "online"}
            onTwist={sendTwist}
          />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">One-shot jog</p>
            <div className="flex flex-wrap gap-2">
              {jogs.map((j) => (
                <Button
                  key={j.direction}
                  variant="secondary"
                  size="sm"
                  onClick={() => jog.mutate(j.direction)}
                  disabled={jog.isPending}
                >
                  {j.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div>
          <h3 className="text-sm font-medium">Text command</h3>
          <p className="text-xs text-muted-foreground">
            “go to Table-A”, “go to where you last saw my mug”.
          </p>
        </div>
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
            placeholder="go to Table-A"
            aria-label="Robot command"
          />
          <Button type="submit">Send</Button>
        </form>
        <Note>
          Navigation needs confirmation. Manipulation is logged as rejected, not executed.
        </Note>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Drive & navigate"
        description="Drive with the joystick beside live camera and RViz. Go to a named waypoint or where an object was last seen."
        crumbs={[{ label: "Drive" }]}
      />
      {!source.capabilities.driveControl && !source.capabilities.navigation ? (
        <UnsupportedState capability="driveControl" sourceName={source.name} />
      ) : source.connectionState !== "online" ? (
        <EmptyState title={`${source.name} is ${source.connectionState}`}>
          Connect it from the source page first.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {dataMode === "http" ? (
            <Section
              title="Cockpit"
              description="Camera, YOLO, and live RViz (SLAM map from LiDAR). Controls stay sticky on the right."
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)]">
                <Card>
                  <CardContent className="pt-4">
                    <LiveKitRobotStreams sourceId={source.id} variant="drive" />
                  </CardContent>
                </Card>
                <Card className="h-fit xl:sticky xl:top-[calc(3.5rem+1rem)]">
                  <CardContent className="pt-4">{controlRail}</CardContent>
                </Card>
              </div>
            </Section>
          ) : (
            <>
              {source.capabilities.driveControl && (
                <Section title="Controls">{controlRail}</Section>
              )}
              {source.capabilities.map && mapQuery.data && (
                <Section
                  title="Map"
                  description="Schematic lab layout (mock mode). Live RViz appears when connected over HTTP."
                >
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
            </>
          )}

          <Section title="Recent tasks">
            <QueryView query={tasks} empty={<EmptyState title="No tasks yet" className="py-6" />}>
              {(list) => (
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
