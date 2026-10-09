import type {
  DataOrigin,
  Detection,
  MapInfo,
  MediaInfo,
  MemoryLedgerEvent,
  MetricSample,
  ObjectTrack,
  ObservationEvent,
  ObservationInterval,
  PoseSample,
  Transition,
} from "@/lib/contracts/types";

/** Scenario clock: seconds after the patrol started. */
export const PATROL_START = Date.parse("2026-10-08T10:20:00.000Z");
export const at = (seconds: number) => new Date(PATROL_START + seconds * 1000).toISOString();

export interface PayloadRow {
  memoryId: string;
  objectId: string;
  support: string;
  captureTime: string;
  stateVersion: number;
  decodedBytes: number;
  storageBytes: number;
  views: number;
  contentHash: string;
  fileHash: string;
  geometry: string;
}

export interface RunData {
  runId: string;
  sourceId: string;
  origin: DataOrigin;
  media?: MediaInfo;
  detections: Detection[];
  events: ObservationEvent[];
  objects: ObjectTrack[];
  transitions: Transition[];
  intervals: ObservationInterval[];
  payloads: PayloadRow[];
  ledger: MemoryLedgerEvent[];
  ramBudgetBytes: number;
  perceptionFloorBytes: number;
  anchorBytesPerObject: number;
  processRssBytes: number;
  databaseBytes: number;
  evidenceBytes: number;
  series: MetricSample[];
  map?: MapInfo;
  pose?: PoseSample[];
}

export const LAB_MAP_REGIONS: MapInfo["regions"] = [
  { id: "room-a", label: "Room A", x: 0, y: 0, width: 6, height: 5, kind: "room" },
  { id: "room-b", label: "Room B", x: 6, y: 0, width: 5, height: 5, kind: "room" },
  { id: "wall-n", label: "Wall", x: 0, y: 4.9, width: 11, height: 0.1, kind: "wall" },
  { id: "wall-s", label: "Wall", x: 0, y: 0, width: 11, height: 0.1, kind: "wall" },
  { id: "wall-w", label: "Wall", x: 0, y: 0, width: 0.1, height: 5, kind: "wall" },
  { id: "wall-e", label: "Wall", x: 10.9, y: 0, width: 0.1, height: 5, kind: "wall" },
  { id: "divider", label: "Divider wall", x: 5.85, y: 0, width: 0.3, height: 2.6, kind: "wall" },
  { id: "table-a", label: "Table-A", x: 2.1, y: 2.2, width: 1.1, height: 0.6, kind: "furniture" },
  { id: "table-b", label: "Table-B", x: 8.3, y: 2.2, width: 1.1, height: 0.6, kind: "furniture" },
  { id: "shelf", label: "Shelf", x: 0.2, y: 3.8, width: 1.6, height: 0.4, kind: "furniture" },
];

export const LAB_WAYPOINTS: MapInfo["waypoints"] = [
  { id: "wp-dock", label: "Dock", x: 0.8, y: 0.8, yaw: 0 },
  { id: "wp-table-a", label: "Table-A", x: 2.65, y: 1.4, yaw: 1.32 },
  { id: "wp-corridor", label: "Corridor", x: 6.0, y: 3.4, yaw: 0 },
  { id: "wp-room-b", label: "Room B", x: 8.0, y: 3.6, yaw: 0 },
  { id: "wp-table-b", label: "Table-B", x: 8.85, y: 1.4, yaw: 1.57 },
];

const ROUTE: [number, number, number, number][] = [
  // [seconds, x, y, yaw]
  [0, 0.8, 0.8, 0],
  [8, 2.65, 1.4, 1.32],
  [44, 3.55, 1.45, 1.98],
  [56, 4.9, 1.4, 0],
  [64, 5.1, 3.0, 0],
  [76, 6.9, 3.0, 0],
  [84, 7.1, 1.4, 0],
  [96, 8.85, 1.4, 1.57],
  [128, 8.85, 1.4, 1.57],
  [140, 9.35, 1.45, 1.9],
  [190, 9.1, 1.8, 1.7],
  [200, 8.85, 1.85, 1.47],
];

function poseTrail(): PoseSample[] {
  const samples: PoseSample[] = [];
  for (let i = 0; i < ROUTE.length - 1; i += 1) {
    const [t0, x0, y0, yaw0] = ROUTE[i];
    const [t1, x1, y1, yaw1] = ROUTE[i + 1];
    for (let t = t0; t < t1; t += 2) {
      const f = (t - t0) / (t1 - t0);
      samples.push({
        x: +(x0 + (x1 - x0) * f).toFixed(3),
        y: +(y0 + (y1 - y0) * f).toFixed(3),
        yaw: +(yaw0 + (yaw1 - yaw0) * f).toFixed(3),
        frameId: "map",
        observedAt: at(t),
      });
    }
  }
  const [t, x, y, yaw] = ROUTE[ROUTE.length - 1];
  samples.push({ x, y, yaw, frameId: "map", observedAt: at(t) });
  return samples;
}

interface Visibility {
  objectId: string;
  label: string;
  from: number;
  to: number;
  box: { x: number; y: number; width: number; height: number };
  confidence: number;
}

function detectionsFor(sourceId: string, prefix: string, visibility: Visibility[]): Detection[] {
  const out: Detection[] = [];
  for (const v of visibility) {
    for (let t = v.from; t <= v.to; t += 1) {
      const wobble = Math.sin(t * 0.7) * 0.004;
      out.push({
        id: `${prefix}-det-${v.objectId}-${t}`,
        eventId: `${prefix}-frame-${t}`,
        sourceId,
        label: v.label,
        confidence: +(v.confidence + Math.sin(t) * 0.02).toFixed(3),
        bbox: {
          x: +(v.box.x + wobble).toFixed(4),
          y: +(v.box.y - wobble).toFixed(4),
          width: v.box.width,
          height: v.box.height,
        },
        observedAt: at(t),
        mediaTimestampMs: t * 1000,
        trackId: `trk-${v.objectId}`,
        objectId: v.objectId,
      });
    }
  }
  return out.sort((a, b) => (a.mediaTimestampMs ?? 0) - (b.mediaTimestampMs ?? 0));
}

function hash(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `sha256:${hex.repeat(8)}`;
}

export function buildRun(options: {
  sourceId: string;
  runId: string;
  prefix: string;
  origin: DataOrigin;
  mediaTitle: string;
  withSpatial: boolean;
}): RunData {
  const { sourceId, runId, prefix, origin } = options;
  const cup1 = `${prefix}-cup-001`;
  const cup2 = `${prefix}-cup-002`;
  const mediaId = `${prefix}-media`;

  const intervals: ObservationInterval[] = [
    {
      id: `${prefix}-int-cup1-a`,
      objectId: cup1,
      support: "Table-A",
      firstSeenAt: at(12),
      lastSeenAt: at(48.2),
      sightingCount: 36,
      open: false,
    },
    {
      id: `${prefix}-int-cup1-b`,
      objectId: cup1,
      support: "Table-B",
      firstSeenAt: at(131),
      lastSeenAt: at(188),
      sightingCount: 22,
      open: true,
    },
    {
      id: `${prefix}-int-cup2-b`,
      objectId: cup2,
      support: "Table-B",
      firstSeenAt: at(20),
      lastSeenAt: at(186),
      sightingCount: 41,
      open: true,
    },
  ];

  const transitions: Transition[] = [
    {
      id: `${prefix}-tr-cup1-1`,
      objectId: cup1,
      runId,
      previousSupport: "Table-A",
      newSupport: "Table-B",
      tLower: at(48.2),
      tUpper: at(131),
      confirmedAt: at(133.4),
      associationScore: 0.872,
      cause: "unknown",
      evidenceId: "ev-cup1-transition",
    },
  ];

  const ev = (
    id: string,
    seconds: number,
    type: ObservationEvent["type"],
    objectIds: string[],
    summary: string,
    extra: Partial<ObservationEvent> = {},
  ): ObservationEvent => ({
    id: `${prefix}-ev-${id}`,
    sourceId,
    runId,
    type,
    observedAt: at(seconds),
    processedAt: at(seconds + 0.4),
    ingestedAt: at(seconds + 0.6),
    origin,
    objectIds,
    detectionIds: [],
    mediaId,
    mediaTimestampMs: Math.round(seconds * 1000),
    ...extra,
    summary,
  });

  const events: ObservationEvent[] = [
    ev(
      "reg-cup1",
      12,
      "identity_registered",
      [cup1],
      "New identity CUP-001 registered at Table-A.",
      {
        support: "Table-A",
        confidence: 0.94,
        evidenceId: "ev-cup1-registered",
      },
    ),
    ev(
      "reg-cup2",
      20,
      "identity_registered",
      [cup2],
      "New identity CUP-002 registered at Table-B.",
      {
        support: "Table-B",
        confidence: 0.91,
        evidenceId: "ev-cup2-registered",
      },
    ),
    ev(
      "ext-cup1-a1",
      30,
      "observation_interval_extended",
      [cup1],
      "CUP-001 still at Table-A. Interval extended (18 sightings).",
      {
        support: "Table-A",
      },
    ),
    ev(
      "cap-cup1",
      40,
      "payload_captured",
      [cup1],
      "Payload captured for CUP-001: 5 RGB-D views and partial geometry.",
      {
        support: "Table-A",
      },
    ),
    ev(
      "ext-cup1-a2",
      48.2,
      "observation_interval_extended",
      [cup1],
      "Last supported sighting of CUP-001 at Table-A (36 sightings in one interval).",
      {
        support: "Table-A",
      },
    ),
    ev(
      "det-cup1-b",
      131,
      "detection",
      [cup1],
      "Cup detected at Table-B. Appearance matches CUP-001; confirmation pending.",
      {
        support: "Table-B",
        confidence: 0.87,
      },
    ),
    ev(
      "tr-cup1",
      133.4,
      "transition_confirmed",
      [cup1],
      "Transition confirmed: CUP-001 Table-A → Table-B. Cause unknown.",
      {
        support: "Table-B",
        confidence: 0.872,
        evidenceId: "ev-cup1-transition",
      },
    ),
    ev(
      "cap-cup2",
      135,
      "payload_captured",
      [cup2],
      "Payload captured for CUP-002: 4 RGB-D views and partial geometry.",
      {
        support: "Table-B",
      },
    ),
    ev(
      "unres",
      140,
      "association_unresolved",
      [cup2, cup1],
      "Ambiguous cup sighting at Table-B: CUP-002 0.791 vs CUP-001 0.768. Margin below 0.055; no identity forced.",
      {
        support: "Table-B",
        confidence: 0.791,
        evidenceId: "ev-unresolved",
      },
    ),
    ev(
      "ext-cup2",
      186,
      "observation_interval_extended",
      [cup2],
      "CUP-002 still at Table-B (41 sightings in one interval).",
      {
        support: "Table-B",
      },
    ),
    ev(
      "ext-cup1-b",
      188,
      "observation_interval_extended",
      [cup1],
      "CUP-001 still at Table-B (22 sightings in one interval).",
      {
        support: "Table-B",
      },
    ),
  ];

  const objects: ObjectTrack[] = [
    {
      id: cup1,
      systemId: "CUP-001",
      sourceId,
      runId,
      label: "cup",
      identityStatus: "confirmed",
      associationScore: 0.872,
      firstSeenAt: at(12),
      lastSeenAt: at(188),
      sightingCount: 58,
      lastKnownLocation: {
        support: "Table-B",
        x: 8.85,
        y: 2.5,
        frameId: "map",
        observedAt: at(188),
        confidence: 0.872,
        stateVersion: 2,
      },
      eventIds: events.filter((e) => e.objectIds.includes(cup1)).map((e) => e.id),
      transitionIds: [`${prefix}-tr-cup1-1`],
      intervalIds: [`${prefix}-int-cup1-a`, `${prefix}-int-cup1-b`],
    },
    {
      id: cup2,
      systemId: "CUP-002",
      sourceId,
      runId,
      label: "cup",
      identityStatus: "confirmed",
      associationScore: 0.91,
      firstSeenAt: at(20),
      lastSeenAt: at(186),
      sightingCount: 41,
      lastKnownLocation: {
        support: "Table-B",
        x: 8.6,
        y: 2.45,
        frameId: "map",
        observedAt: at(186),
        confidence: 0.91,
        stateVersion: 1,
      },
      eventIds: events.filter((e) => e.objectIds.includes(cup2)).map((e) => e.id),
      transitionIds: [],
      intervalIds: [`${prefix}-int-cup2-b`],
    },
  ];

  const payloads: PayloadRow[] = [
    {
      memoryId: `${prefix}-pl-cup1`,
      objectId: cup1,
      support: "Table-A",
      captureTime: at(40),
      stateVersion: 1,
      decodedBytes: 2_457_600,
      storageBytes: 1_310_722,
      views: 5,
      contentHash: hash(`${prefix}-content-cup1`),
      fileHash: hash(`${prefix}-file-cup1`),
      geometry: "partial ROI-derived reconstruction",
    },
    {
      memoryId: `${prefix}-pl-cup2`,
      objectId: cup2,
      support: "Table-B",
      captureTime: at(135),
      stateVersion: 1,
      decodedBytes: 2_211_840,
      storageBytes: 1_180_431,
      views: 4,
      contentHash: hash(`${prefix}-content-cup2`),
      fileHash: hash(`${prefix}-file-cup2`),
      geometry: "partial ROI-derived reconstruction",
    },
  ];

  let seq = 0;
  const led = (
    seconds: number,
    category: MemoryLedgerEvent["category"],
    eventType: MemoryLedgerEvent["eventType"],
    extra: Partial<MemoryLedgerEvent>,
  ): MemoryLedgerEvent => {
    seq += 1;
    return {
      id: `${prefix}-led-${seq}`,
      sequence: seq,
      sourceId,
      runId,
      category,
      eventType,
      occurredAt: at(seconds),
      details: {},
      ...extra,
    };
  };

  const ledger: MemoryLedgerEvent[] = [
    led(12, "perception", "created", {
      memoryId: `anchor-${cup1}`,
      objectId: cup1,
      details: { what: "anchor", note: "Identity registered" },
    }),
    led(12.5, "memory", "created", {
      memoryId: `${prefix}-int-cup1-a`,
      objectId: cup1,
      details: { what: "interval", support: "Table-A" },
    }),
    led(20, "perception", "created", {
      memoryId: `anchor-${cup2}`,
      objectId: cup2,
      details: { what: "anchor", note: "Identity registered" },
    }),
    led(20.5, "memory", "created", {
      memoryId: `${prefix}-int-cup2-b`,
      objectId: cup2,
      details: { what: "interval", support: "Table-B" },
    }),
    led(40, "memory", "created", {
      memoryId: `${prefix}-pl-cup1`,
      objectId: cup1,
      storageBytes: 1_310_722,
      details: { what: "payload", views: 5, persisted: true },
    }),
    led(48.2, "memory", "consolidated", {
      memoryId: `${prefix}-int-cup1-a`,
      objectId: cup1,
      details: { sightingsFolded: 36, note: "Repeated sightings extended one interval" },
    }),
    led(131.2, "memory", "created", {
      memoryId: `${prefix}-int-cup1-b`,
      objectId: cup1,
      details: { what: "interval", support: "Table-B" },
    }),
    led(133.4, "memory", "created", {
      memoryId: `${prefix}-tr-cup1-1`,
      objectId: cup1,
      details: { what: "transition", from: "Table-A", to: "Table-B", cause: "unknown" },
    }),
    led(135, "memory", "created", {
      memoryId: `${prefix}-pl-cup2`,
      objectId: cup2,
      storageBytes: 1_180_431,
      details: { what: "payload", views: 4, persisted: true },
    }),
    led(160, "memory", "loaded", {
      memoryId: `${prefix}-pl-cup1`,
      objectId: cup1,
      ramBytes: 2_457_600,
      durationMs: 41.7,
      hashVerified: true,
      details: { request: "Show me the cup on Table-A, including saved views and 3D shape." },
    }),
    led(162, "retrieval", "retrieved", {
      memoryId: `${prefix}-tr-cup1-1`,
      objectId: cup1,
      durationMs: 3.2,
      details: { question: "Where was CUP-001 before it reached Table-B?", payloadRead: false },
    }),
    led(175, "memory", "evicted", {
      memoryId: `${prefix}-pl-cup1`,
      objectId: cup1,
      ramBytes: 2_457_600,
      hashVerified: true,
      details: { reason: "Budget: next request needs CUP-002" },
    }),
    led(175.05, "memory", "loaded", {
      memoryId: `${prefix}-pl-cup2`,
      objectId: cup2,
      ramBytes: 2_211_840,
      durationMs: 38.9,
      hashVerified: true,
      details: { request: "Check the cup on Table-B instead." },
    }),
    led(186, "memory", "consolidated", {
      memoryId: `${prefix}-int-cup2-b`,
      objectId: cup2,
      details: { sightingsFolded: 41 },
    }),
    led(188, "memory", "consolidated", {
      memoryId: `${prefix}-int-cup1-b`,
      objectId: cup1,
      details: { sightingsFolded: 22 },
    }),
    led(190, "memory", "evicted", {
      memoryId: `${prefix}-pl-cup2`,
      objectId: cup2,
      ramBytes: 2_211_840,
      hashVerified: true,
      details: { reason: "Budget: next request needs CUP-001" },
    }),
    led(190.05, "memory", "reloaded", {
      memoryId: `${prefix}-pl-cup1`,
      objectId: cup1,
      ramBytes: 2_457_600,
      durationMs: 40.2,
      hashVerified: true,
      details: {
        request: "Show me the first cup again.",
        freshness: "historical/stale: fresh observation required",
      },
    }),
  ];

  const series: MetricSample[] = [];
  for (let t = 0; t <= 200; t += 5) {
    const resident = t < 160 ? 0 : t < 175 ? 2_457_600 : t < 190 ? 2_211_840 : 2_457_600;
    const gap = t >= 95 && t <= 105;
    series.push({
      metric: "resident_payload_bytes",
      value: gap ? null : resident,
      unit: "bytes",
      measuredAt: at(t),
      sourceId,
      runId,
      scope: "engine",
    });
    series.push({
      metric: "process_rss_bytes",
      value: gap ? null : 402_653_184 + Math.round(t * 140_000) + (resident > 0 ? 3_145_728 : 0),
      unit: "bytes",
      measuredAt: at(t),
      sourceId,
      runId,
      scope: "process",
    });
    series.push({
      metric: "disk_bytes",
      value: gap
        ? null
        : 262_144 + (t >= 40 ? 1_310_722 : 0) + (t >= 135 ? 1_180_431 : 0) + Math.round(t * 4_000),
      unit: "bytes",
      measuredAt: at(t),
      sourceId,
      runId,
      scope: "engine",
    });
  }

  const visibility: Visibility[] = [
    {
      objectId: cup1,
      label: "cup",
      from: 10,
      to: 48,
      box: { x: 0.42, y: 0.46, width: 0.11, height: 0.17 },
      confidence: 0.92,
    },
    {
      objectId: cup2,
      label: "cup",
      from: 18,
      to: 32,
      box: { x: 0.71, y: 0.44, width: 0.09, height: 0.15 },
      confidence: 0.89,
    },
    {
      objectId: cup1,
      label: "cup",
      from: 129,
      to: 190,
      box: { x: 0.36, y: 0.48, width: 0.12, height: 0.18 },
      confidence: 0.88,
    },
    {
      objectId: cup2,
      label: "cup",
      from: 130,
      to: 190,
      box: { x: 0.58, y: 0.47, width: 0.1, height: 0.16 },
      confidence: 0.9,
    },
  ];

  return {
    runId,
    sourceId,
    origin,
    media: {
      id: mediaId,
      sourceId,
      origin,
      url: "/demo/patrol.mp4",
      title: options.mediaTitle,
      durationMs: 200_000,
      recordedAt: at(0),
      frameRate: 10,
    },
    detections: detectionsFor(sourceId, prefix, visibility),
    events,
    objects,
    transitions,
    intervals,
    payloads,
    ledger,
    ramBudgetBytes: 2_457_600,
    perceptionFloorBytes: 1_717_986_918,
    anchorBytesPerObject: 6_144,
    processRssBytes: 432_013_312,
    databaseBytes: 1_245_184,
    evidenceBytes: 486_912,
    series,
    map: options.withSpatial
      ? {
          sourceId,
          frameId: "map",
          widthMeters: 11,
          heightMeters: 5,
          regions: LAB_MAP_REGIONS,
          waypoints: LAB_WAYPOINTS,
          updatedAt: at(0),
        }
      : undefined,
    pose: options.withSpatial ? poseTrail() : undefined,
  };
}

/** Simple 2D raycast against map rectangles for a mock LiDAR scan. */
export function raycastScan(map: MapInfo, pose: PoseSample, beams = 180, rangeMax = 6): number[] {
  const obstacles = map.regions.filter((r) => r.kind !== "room");
  const ranges: number[] = [];
  for (let i = 0; i < beams; i += 1) {
    const angle = pose.yaw - Math.PI + (i * 2 * Math.PI) / beams;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let hit = rangeMax;
    for (let d = 0.05; d < rangeMax; d += 0.03) {
      const x = pose.x + dx * d;
      const y = pose.y + dy * d;
      if (
        obstacles.some((r) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height)
      ) {
        hit = d;
        break;
      }
    }
    ranges.push(+hit.toFixed(3));
  }
  return ranges;
}
