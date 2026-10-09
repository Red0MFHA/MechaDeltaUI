"use client";

import type { MapInfo, PoseSample } from "@/lib/contracts/types";

const fill: Record<MapInfo["regions"][number]["kind"], string> = {
  room: "color-mix(in oklch, var(--color-surface-muted) 80%, transparent)",
  wall: "var(--color-foreground)",
  furniture: "color-mix(in oklch, var(--color-primary) 35%, var(--color-surface-muted))",
};

export function SpatialMap({
  map,
  pose,
  markers = [],
}: {
  map: MapInfo;
  pose?: PoseSample;
  markers?: { x: number; y: number; label: string; href?: string }[];
}) {
  const pad = 0.4;
  const vb = `${-pad} ${-pad} ${map.widthMeters + pad * 2} ${map.heightMeters + pad * 2}`;
  return (
    <svg
      viewBox={vb}
      className="h-64 w-full"
      role="img"
      aria-label={`Map ${map.frameId}, ${map.widthMeters} by ${map.heightMeters} metres`}
    >
      {map.regions.map((r) => (
        <g key={r.id}>
          <rect
            x={r.x}
            y={map.heightMeters - r.y - r.height}
            width={r.width}
            height={r.height}
            fill={fill[r.kind]}
            stroke="var(--color-border)"
            strokeWidth={0.02}
          />
          {r.kind !== "wall" && (
            <text
              x={r.x + r.width / 2}
              y={map.heightMeters - r.y - r.height / 2}
              textAnchor="middle"
              fontSize={0.22}
              fill="var(--color-muted-foreground)"
            >
              {r.label}
            </text>
          )}
        </g>
      ))}
      {map.waypoints.map((w) => (
        <g key={w.id}>
          <circle cx={w.x} cy={map.heightMeters - w.y} r={0.08} fill="var(--color-info)" />
          <text
            x={w.x + 0.12}
            y={map.heightMeters - w.y - 0.12}
            fontSize={0.2}
            fill="var(--color-foreground)"
          >
            {w.label}
          </text>
        </g>
      ))}
      {markers.map((m) => (
        <g key={m.label}>
          <circle cx={m.x} cy={map.heightMeters - m.y} r={0.1} fill="var(--color-warning)" />
          <text
            x={m.x + 0.14}
            y={map.heightMeters - m.y + 0.06}
            fontSize={0.18}
            fill="var(--color-foreground)"
          >
            {m.label}
          </text>
        </g>
      ))}
      {pose && (
        <g
          transform={`translate(${pose.x} ${map.heightMeters - pose.y}) rotate(${(-pose.yaw * 180) / Math.PI})`}
        >
          <polygon points="0.22,0 -0.14,0.1 -0.14,-0.1" fill="var(--color-primary)" />
        </g>
      )}
    </svg>
  );
}

export function LidarPlot({ ranges, rangeMax }: { ranges: number[]; rangeMax: number }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const scale = (cx - 8) / rangeMax;
  const points = ranges
    .map((r, i) => {
      const a = -Math.PI + (i * 2 * Math.PI) / ranges.length;
      const d = Math.min(r, rangeMax) * scale;
      return `${cx + Math.cos(a) * d},${cy + Math.sin(a) * d}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto h-56 w-56"
      role="img"
      aria-label="LiDAR scan"
    >
      <circle
        cx={cx}
        cy={cy}
        r={cx - 8}
        fill="var(--color-surface-muted)"
        stroke="var(--color-border)"
      />
      <polygon
        points={points}
        fill="color-mix(in oklch, var(--color-primary) 25%, transparent)"
        stroke="var(--color-primary)"
        strokeWidth={1}
      />
      <circle cx={cx} cy={cy} r={3} fill="var(--color-primary)" />
    </svg>
  );
}
