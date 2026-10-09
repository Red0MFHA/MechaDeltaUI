import type {
  CapabilityKey,
  MetricDefinition,
  PolicyDefinition,
  SourceCapabilities,
  SourceKind,
  WorkloadDefinition,
} from "./types";

export const sourceKindLabel: Record<SourceKind, string> = {
  recorded_video: "Recording",
  live_camera: "Live camera",
  ros2_simulation: "Simulation",
  physical_robot: "Physical robot",
};

export const capabilityLabel: Record<CapabilityKey, string> = {
  video: "Video",
  recordedMedia: "Recorded media",
  detections: "Detections",
  objectTracking: "Object tracking",
  pose: "Pose",
  map: "Map",
  lidar: "LiDAR",
  driveControl: "Drive control",
  navigation: "Navigation",
  telemetry: "Telemetry",
};

export const capabilityOrder: CapabilityKey[] = [
  "video",
  "recordedMedia",
  "detections",
  "objectTracking",
  "pose",
  "map",
  "lidar",
  "driveControl",
  "navigation",
  "telemetry",
];

/** What each source kind can provide when its adapter reports it. */
export const defaultCapabilities: Record<SourceKind, SourceCapabilities> = {
  recorded_video: {
    video: true,
    recordedMedia: true,
    detections: true,
    objectTracking: true,
    pose: false,
    map: false,
    lidar: false,
    driveControl: false,
    navigation: false,
    telemetry: true,
  },
  live_camera: {
    video: true,
    recordedMedia: false,
    detections: true,
    objectTracking: true,
    pose: false,
    map: false,
    lidar: false,
    driveControl: false,
    navigation: false,
    telemetry: true,
  },
  ros2_simulation: {
    video: true,
    recordedMedia: false,
    detections: true,
    objectTracking: true,
    pose: true,
    map: true,
    lidar: true,
    driveControl: true,
    navigation: true,
    telemetry: true,
  },
  physical_robot: {
    video: true,
    recordedMedia: false,
    detections: true,
    objectTracking: true,
    pose: true,
    map: true,
    lidar: true,
    driveControl: true,
    navigation: true,
    telemetry: true,
  },
};

export const policies: PolicyDefinition[] = [
  {
    id: "proposed",
    name: "Checked transitions + loss-per-byte residency",
    version: "0.1",
    role: "proposed",
    description:
      "Writes a transition only after supported evidence, keeps anchors resident, and evicts payloads by loss per byte with push and pull to disk.",
    colorVar: "--policy-proposed",
  },
  {
    id: "current-map",
    name: "Current map, no event log",
    version: "1",
    role: "baseline",
    description: "Keeps only the latest state of each object. Cannot answer history questions.",
    colorVar: "--policy-current-map",
  },
  {
    id: "keep-all",
    name: "Keep all payloads resident",
    version: "1",
    role: "baseline",
    description: "Keeps every payload in RAM. Reference for accuracy and peak RAM.",
    colorVar: "--policy-keep-all",
  },
  {
    id: "largest-first",
    name: "Largest-first eviction",
    version: "1",
    role: "baseline",
    description: "Evicts the largest resident payload first when over budget.",
    colorVar: "--policy-largest-first",
  },
  {
    id: "lru",
    name: "Least-recently-used eviction",
    version: "1",
    role: "baseline",
    description: "Evicts the payload that was used least recently.",
    colorVar: "--policy-lru",
  },
  {
    id: "relevance-per-byte",
    name: "Relevance-per-byte eviction",
    version: "1",
    role: "baseline",
    description: "Evicts the payload with the lowest estimated relevance per byte.",
    colorVar: "--policy-relevance",
  },
];

export const workloads: WorkloadDefinition[] = [
  {
    id: "wl-lab-patrol-a",
    name: "Lab patrol A: two cups, one relocation",
    description:
      "Gazebo lab with Table-A and Table-B. One cup moves off camera. Ten labelled history questions.",
    sourceKind: "ros2_simulation",
    questionCount: 10,
    durationSeconds: 240,
  },
  {
    id: "wl-lab-patrol-b",
    name: "Lab patrol B: repeated revisits",
    description: "Longer patrol with three revisits and an occlusion. Twenty labelled questions.",
    sourceKind: "ros2_simulation",
    questionCount: 20,
    durationSeconds: 600,
  },
  {
    id: "wl-recording-1",
    name: "Recorded patrol 1",
    description: "Replay of the processed patrol recording. Ten labelled questions.",
    sourceKind: "recorded_video",
    questionCount: 10,
    durationSeconds: 200,
  },
];

export const metricDefinitions: MetricDefinition[] = [
  {
    key: "historyAccuracy",
    label: "History-answer accuracy",
    unit: "ratio",
    direction: "higher_is_better",
    scope: "evaluation",
    definition:
      "Exact-match answers over the labelled history questions of the workload (protocol v0, draft).",
    aggregation: "correct / asked",
  },
  {
    key: "peakResidentBytes",
    label: "Peak resident payload",
    unit: "bytes",
    direction: "lower_is_better",
    scope: "engine",
    definition: "Maximum decoded payload bytes resident above the perception floor.",
    aggregation: "max over samples",
  },
  {
    key: "avgResidentBytes",
    label: "Average resident payload",
    unit: "bytes",
    direction: "lower_is_better",
    scope: "engine",
    definition: "Mean decoded payload bytes resident above the perception floor.",
    aggregation: "mean over samples",
  },
  {
    key: "diskBytes",
    label: "Disk bytes",
    unit: "bytes",
    direction: "lower_is_better",
    scope: "engine",
    definition: "Database, WAL/SHM, evidence, and payload backing files at run end.",
    aggregation: "final value",
  },
  {
    key: "answerLatencyMs",
    label: "Answer delay",
    unit: "ms",
    direction: "lower_is_better",
    scope: "engine",
    definition: "Time from question submission to answer, including any payload read.",
    aggregation: "median",
  },
  {
    key: "reloadLatencyMs",
    label: "Reload latency",
    unit: "ms",
    direction: "lower_is_better",
    scope: "engine",
    definition: "Time to read, hash-verify, and decode one payload from disk.",
    aggregation: "median",
  },
  {
    key: "reloadCount",
    label: "Payload reloads",
    unit: "count",
    direction: "lower_is_better",
    scope: "engine",
    definition: "Number of payload loads from disk after an eviction.",
    aggregation: "sum",
  },
  {
    key: "falseGoneRate",
    label: "False “gone” rate",
    unit: "ratio",
    direction: "lower_is_better",
    scope: "evaluation",
    definition: "Objects recorded as removed while ground truth says they were present.",
    aggregation: "false gone / gone events",
  },
  {
    key: "staleAnswerRate",
    label: "Stale-answer rate",
    unit: "ratio",
    direction: "lower_is_better",
    scope: "evaluation",
    definition: "Answers that used a payload made stale by a move while it was on disk.",
    aggregation: "stale / payload answers",
  },
  {
    key: "floorCrossings",
    label: "Perception-floor crossings",
    unit: "count",
    direction: "lower_is_better",
    scope: "engine",
    definition: "Times history and payloads used memory reserved for perception.",
    aggregation: "sum",
  },
];

export const metricByKey = Object.fromEntries(metricDefinitions.map((m) => [m.key, m])) as Record<
  string,
  MetricDefinition
>;

export const policyById = Object.fromEntries(policies.map((p) => [p.id, p])) as Record<
  string,
  PolicyDefinition
>;

export const workloadById = Object.fromEntries(workloads.map((w) => [w.id, w])) as Record<
  string,
  WorkloadDefinition
>;

export const SOFTWARE_VERSION = "mechadelta-ui 0.1.0 / engine poc-2026.10";
