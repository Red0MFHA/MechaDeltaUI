"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
}

type StreamId = "raw" | "yolo" | "rviz";
type Slot = "large" | "left" | "right";
type StreamLayout = Record<Slot, StreamId>;

const STREAM_META: Record<
  StreamId,
  { title: string; caption?: string; fit: "contain" | "cover" }
> = {
  raw: { title: "Camera (raw)", fit: "contain" },
  yolo: { title: "YOLO annotated", fit: "contain" },
  rviz: {
    title: "RViz / LiDAR map",
    caption: "SLAM map builds from LiDAR as the robot moves; scan and pose stay aligned.",
    fit: "cover",
  },
};

const DEFAULT_LAYOUT: StreamLayout = { large: "raw", left: "yolo", right: "rviz" };
const LAYOUT_KEY = "mechadelta.drive.streamLayout.v1";

const PRESETS: { id: string; label: string; layout: StreamLayout }[] = [
  { id: "cam", label: "Camera large", layout: { large: "raw", left: "yolo", right: "rviz" } },
  { id: "yolo", label: "YOLO large", layout: { large: "yolo", left: "raw", right: "rviz" } },
  { id: "lidar", label: "LiDAR large", layout: { large: "rviz", left: "raw", right: "yolo" } },
];

function isStreamId(v: unknown): v is StreamId {
  return v === "raw" || v === "yolo" || v === "rviz";
}

function isLayout(v: unknown): v is StreamLayout {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const ids = [o.large, o.left, o.right];
  if (!ids.every(isStreamId)) return false;
  return new Set(ids as StreamId[]).size === 3;
}

function loadLayout(): StreamLayout {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed: unknown = JSON.parse(raw);
    return isLayout(parsed) ? parsed : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return expanded ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function JpegPanel({
  title,
  url,
  size = "side",
  caption,
  fit = "contain",
  headerExtra,
}: {
  title: string;
  url: string;
  size?: "hero" | "heroCompact" | "side" | "map";
  caption?: string;
  fit?: "contain" | "cover";
  headerExtra?: ReactNode;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    let timer: number | undefined;

    const pull = async () => {
      try {
        const sep = url.includes("?") ? "&" : "?";
        const res = await fetch(`${url}${sep}t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        const next = URL.createObjectURL(blob);
        setSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return next;
        });
        objectUrl = next;
        setErr(null);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message || "frame failed");
      } finally {
        if (!cancelled) timer = window.setTimeout(pull, 500);
      }
    };

    void pull();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const frame =
    size === "hero"
      ? "relative min-h-[22rem] w-full overflow-hidden rounded-md bg-black aspect-video lg:min-h-[28rem]"
      : size === "heroCompact"
        ? "relative min-h-[16rem] w-full overflow-hidden rounded-md bg-black aspect-video lg:min-h-[22rem]"
        : size === "map"
          ? "relative min-h-[18rem] w-full overflow-hidden rounded-md bg-black aspect-[4/3] lg:min-h-[22rem]"
          : "relative aspect-video w-full overflow-hidden rounded-md bg-black";

  const objectFit = fit === "cover" ? "object-cover" : "object-contain";

  const media = (
    <>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- live JPEG poll from FastAPI bridge
        <img src={src} alt={title} className={`h-full w-full ${objectFit}`} />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-white/60">
          Loading…
        </div>
      )}
      {err ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-3 text-center text-xs text-red-300">
          {err}
        </div>
      ) : null}
    </>
  );

  return (
    <div className="flex flex-col gap-1.5" ref={shellRef}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
        <div className="flex items-center gap-1">
          {headerExtra}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Open fullscreen"
          >
            <ExpandIcon expanded={false} />
            Expand
          </button>
        </div>
      </div>
      <div className={frame}>{media}</div>
      {caption ? <p className="text-[11px] leading-snug text-muted-foreground">{caption}</p> : null}

      {expanded ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} fullscreen`}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
            <div className="text-sm font-medium">{title}</div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
            >
              <ExpandIcon expanded />
              Exit fullscreen
            </button>
          </div>
          <div className="relative min-h-0 flex-1 px-3 pb-3">{media}</div>
        </div>
      ) : null}
    </div>
  );
}

function StreamSelect({
  label,
  value,
  layout,
  onChange,
}: {
  label: string;
  value: StreamId;
  layout: StreamLayout;
  onChange: (next: StreamLayout) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="shrink-0">{label}</span>
      <select
        className="max-w-[10rem] rounded-md border border-border bg-background px-1.5 py-1 text-xs text-foreground"
        value={value}
        aria-label={`${label} stream`}
        onChange={(e) => {
          const nextId = e.target.value as StreamId;
          if (nextId === value) return;
          const slot = (Object.keys(layout) as Slot[]).find((s) => layout[s] === value)!;
          const other = (Object.keys(layout) as Slot[]).find((s) => layout[s] === nextId)!;
          onChange({ ...layout, [slot]: nextId, [other]: value });
        }}
      >
        <option value="raw">Camera (raw)</option>
        <option value="yolo">YOLO annotated</option>
        <option value="rviz">RViz / LiDAR</option>
      </select>
    </label>
  );
}

/** Live camera / YOLO / RViz via HTTP JPEG polling (no LiveKit). */
export function LiveKitRobotStreams({
  sourceId,
  className,
  variant = "default",
}: {
  sourceId: string;
  className?: string;
  /** Drive cockpit: compact camera + large live RViz beside YOLO. */
  variant?: "default" | "drive";
}) {
  const health = useQuery({
    queryKey: ["bridge-via-api-cam", sourceId],
    queryFn: async () => {
      const res = await fetch(
        `${apiBase()}/sources/${encodeURIComponent(sourceId)}/camera.jpg?view=raw&ping=1`,
        { cache: "no-store" },
      );
      return { ok: res.ok, bytes: Number(res.headers.get("content-length") || 0) };
    },
    refetchInterval: 5000,
  });

  const [layout, setLayout] = useState<StreamLayout>(DEFAULT_LAYOUT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLayout(loadLayout());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  }, [layout, hydrated]);

  const urls = useMemo(
    () => ({
      raw: `${apiBase()}/sources/${encodeURIComponent(sourceId)}/camera.jpg?view=raw`,
      yolo: `${apiBase()}/sources/${encodeURIComponent(sourceId)}/camera.jpg?view=annotated`,
      rviz: `${apiBase()}/sources/${encodeURIComponent(sourceId)}/rviz.jpg`,
    }),
    [sourceId],
  );

  const promote = (id: StreamId) => {
    if (layout.large === id) return;
    const from = (Object.keys(layout) as Slot[]).find((s) => layout[s] === id)!;
    setLayout({ ...layout, large: id, [from]: layout.large });
  };

  const swapBottom = () => setLayout({ ...layout, left: layout.right, right: layout.left });

  const activePreset = PRESETS.find(
    (p) =>
      p.layout.large === layout.large &&
      p.layout.left === layout.left &&
      p.layout.right === layout.right,
  )?.id;

  const renderStream = (id: StreamId, size: "heroCompact" | "side" | "map", slot: Slot) => {
    const meta = STREAM_META[id];
    const panelSize = size === "side" && id === "rviz" ? "map" : size;
    return (
      <JpegPanel
        key={`${slot}-${id}`}
        title={meta.title}
        url={urls[id]}
        size={panelSize}
        caption={slot === "large" || id === "rviz" ? meta.caption : undefined}
        fit={meta.fit}
        headerExtra={
          slot !== "large" ? (
            <button
              type="button"
              onClick={() => promote(id)}
              className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Move this stream to the large panel"
            >
              Make large
            </button>
          ) : null
        }
      />
    );
  };

  return (
    <div className={cn(className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          Live JPEG bridge · {sourceId}
          {health.data?.ok ? " · frames OK" : " · waiting for frames…"}
        </div>
        {variant === "drive" ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLayout(p.layout)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px]",
                    activePreset === p.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={swapBottom}
              className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Swap the two smaller panels"
            >
              Swap bottom
            </button>
          </div>
        ) : null}
      </div>

      {variant === "drive" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
            <StreamSelect
              label="Large"
              value={layout.large}
              layout={layout}
              onChange={setLayout}
            />
            <StreamSelect label="Left" value={layout.left} layout={layout} onChange={setLayout} />
            <StreamSelect
              label="Right"
              value={layout.right}
              layout={layout}
              onChange={setLayout}
            />
          </div>
          {renderStream(layout.large, "heroCompact", "large")}
          <div className="grid gap-4 md:grid-cols-2">
            {renderStream(layout.left, "side", "left")}
            {renderStream(layout.right, "side", "right")}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(17rem,0.85fr)]">
          <JpegPanel title="Camera (raw)" url={urls.raw} size="hero" />
          <div className="flex flex-col gap-4">
            <JpegPanel title="YOLO annotated" url={urls.yolo} size="side" />
            <JpegPanel
              title="RViz / LiDAR map"
              url={urls.rviz}
              size="side"
              caption={STREAM_META.rviz.caption}
              fit="cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}
