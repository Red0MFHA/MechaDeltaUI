"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { NeedSource } from "@/components/need-source";
import { PageHeader, Section } from "@/components/page-header";
import { ProvenanceBadge } from "@/components/provenance";
import { EmptyState, ErrorState, QueryView, UnsupportedState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LidarPlot, SpatialMap } from "@/components/spatial-map";
import { displayName } from "@/lib/domain/objects";
import { formatClock } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

export function PatrolPage() {
  return (
    <NeedSource>
      {(source) => (
        <PatrolBody
          sourceId={source.id}
          origin={source.origin}
          video={source.capabilities.video || source.capabilities.recordedMedia}
          map={source.capabilities.map}
          lidar={source.capabilities.lidar}
        />
      )}
    </NeedSource>
  );
}

function PatrolBody({
  sourceId,
  origin,
  video,
  map,
  lidar,
}: {
  sourceId: string;
  origin: "live" | "recorded" | "simulated" | "mock";
  video: boolean;
  map: boolean;
  lidar: boolean;
}) {
  const media = useQuery({
    queryKey: qk.media(sourceId),
    queryFn: () => getServices().media.get(sourceId),
    enabled: video,
  });
  const detections = useQuery({
    queryKey: qk.detections(sourceId),
    queryFn: () => getServices().media.detections(sourceId),
    enabled: video,
  });
  const objects = useQuery({
    queryKey: qk.objects(sourceId),
    queryFn: () => getServices().objects.list(sourceId),
  });
  const mapQuery = useQuery({
    queryKey: qk.map(sourceId),
    queryFn: () => getServices().media.map(sourceId),
    enabled: map,
    retry: false,
  });
  const poseQuery = useQuery({
    queryKey: qk.pose(sourceId),
    queryFn: () => getServices().media.pose(sourceId),
    enabled: map,
    retry: false,
  });
  const lidarQuery = useQuery({
    queryKey: qk.lidar(sourceId),
    queryFn: () => getServices().media.lidar(sourceId),
    enabled: lidar,
    retry: false,
  });

  const [tMs, setTMs] = useState(0);
  const [mediaMissing, setMediaMissing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const duration = media.data?.durationMs ?? 200_000;
  const boxes = useMemo(
    () => (detections.data ?? []).filter((d) => Math.abs((d.mediaTimestampMs ?? 0) - tMs) < 600),
    [detections.data, tMs],
  );
  const pose = useMemo(() => {
    const samples = poseQuery.data ?? [];
    if (!samples.length) return undefined;
    return samples.reduce((best, s) =>
      Math.abs(Date.parse(s.observedAt) - Date.parse(samples[0].observedAt) - tMs) <
      Math.abs(Date.parse(best.observedAt) - Date.parse(samples[0].observedAt) - tMs)
        ? s
        : best,
    );
  }, [poseQuery.data, tMs]);

  return (
    <>
      <PageHeader
        title="Patrol"
        description="Camera or recording, detections, map, and LiDAR for the selected source."
        crumbs={[{ label: "Patrol" }]}
        meta={
          <>
            <ProvenanceBadge origin={origin} />
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <div className="flex flex-col gap-4">
          {!video ? (
            <UnsupportedState capability="video" />
          ) : (
            <Card>
              <CardContent>
                <div className="relative aspect-video overflow-hidden rounded-md bg-black">
                  {media.data?.url && !mediaMissing ? (
                    <video
                      ref={videoRef}
                      className="h-full w-full"
                      src={media.data.url}
                      controls
                      onTimeUpdate={() =>
                        setTMs(Math.round((videoRef.current?.currentTime ?? 0) * 1000))
                      }
                      onError={() => setMediaMissing(true)}
                    >
                      Patrol recording
                    </video>
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/80">
                      {mediaMissing || !media.data?.url
                        ? "No patrol video in public/demo/patrol.mp4. The timeline and detections below still play from the mock run."
                        : "Loading media"}
                    </div>
                  )}
                  {boxes.map((d) =>
                    d.bbox ? (
                      <div
                        key={d.id}
                        className="pointer-events-none absolute border-2 border-emerald-400"
                        style={{
                          left: `${d.bbox.x * 100}%`,
                          top: `${d.bbox.y * 100}%`,
                          width: `${d.bbox.width * 100}%`,
                          height: `${d.bbox.height * 100}%`,
                        }}
                      >
                        <span className="bg-emerald-400 px-1 text-[10px] text-black">
                          {d.label} {d.confidence?.toFixed(2)}
                        </span>
                      </div>
                    ) : null,
                  )}
                </div>
                <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                  Timeline {formatClock(tMs)} / {formatClock(duration)}
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    value={tMs}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setTMs(next);
                      if (videoRef.current) videoRef.current.currentTime = next / 1000;
                    }}
                    aria-label="Patrol timeline"
                  />
                </label>
              </CardContent>
            </Card>
          )}

          <Section title="Map">
            {!map ? (
              <UnsupportedState capability="map" sourceName="This recording" />
            ) : mapQuery.error ? (
              <ErrorState error={mapQuery.error} onRetry={() => void mapQuery.refetch()} />
            ) : mapQuery.data ? (
              <Card>
                <CardContent>
                  <SpatialMap
                    map={mapQuery.data}
                    pose={pose}
                    markers={(objects.data ?? [])
                      .filter((o) => o.lastKnownLocation?.x !== undefined)
                      .map((o) => ({
                        x: o.lastKnownLocation!.x!,
                        y: o.lastKnownLocation!.y!,
                        label: displayName(o),
                        href: `/app/operations/objects/${o.id}`,
                      }))}
                  />
                </CardContent>
              </Card>
            ) : (
              <EmptyState title="No map yet" />
            )}
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          <Section title="Objects in this run">
            <QueryView
              query={objects}
              empty={<EmptyState title="No identities yet" className="py-6" />}
            >
              {(list) => (
                <ul className="flex flex-col gap-2">
                  {list.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/app/operations/objects/${o.id}`}
                        className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm hover:border-primary/40"
                      >
                        <span>{displayName(o)}</span>
                        <Badge tone="outline">{o.lastKnownLocation?.support ?? "unknown"}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </QueryView>
          </Section>
          <Section title="LiDAR">
            {!lidar ? (
              <UnsupportedState capability="lidar" sourceName="This recording" />
            ) : lidarQuery.error ? (
              <ErrorState error={lidarQuery.error} />
            ) : lidarQuery.data ? (
              <Card>
                <CardContent>
                  <LidarPlot ranges={lidarQuery.data.ranges} rangeMax={lidarQuery.data.rangeMax} />
                </CardContent>
              </Card>
            ) : (
              <EmptyState title="No scan yet" className="py-6" />
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
