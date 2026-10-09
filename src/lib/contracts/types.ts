/**
 * Frontend contracts. Field names follow the MechaDelta run outputs
 * (memory.db, payload_index.sqlite, transition_answers.json, ram_results.json)
 * so the http adapter can map them without reshaping pages.
 */

export type ISODateString = string;

// ---------- Provenance and status ----------

export type DataOrigin = "live" | "recorded" | "simulated" | "mock";

export type ConnectionState = "online" | "offline" | "connecting" | "degraded" | "unknown";

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

// ---------- Auth ----------

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface Session {
  user: User;
  expiresAt: ISODateString;
}

// ---------- Sources ----------

export type SourceKind = "recorded_video" | "live_camera" | "ros2_simulation" | "physical_robot";

export interface SourceCapabilities {
  video: boolean;
  recordedMedia: boolean;
  detections: boolean;
  objectTracking: boolean;
  pose: boolean;
  map: boolean;
  lidar: boolean;
  driveControl: boolean;
  navigation: boolean;
  telemetry: boolean;
}

export type CapabilityKey = keyof SourceCapabilities;

export interface SourceConfigField {
  key: string;
  label: string;
  value: string;
  secret: boolean;
}

export interface RobotSource {
  id: string;
  name: string;
  kind: SourceKind;
  connectionState: ConnectionState;
  origin: DataOrigin;
  capabilities: SourceCapabilities;
  description?: string;
  /** Secrets are masked by the service before they reach the UI. */
  config: SourceConfigField[];
  activeRunId?: string;
  lastSeenAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface RegisterSourceInput {
  name: string;
  kind: SourceKind;
  description?: string;
  config: Record<string, string>;
}

export interface UpdateSourceInput {
  name?: string;
  description?: string;
}

// ---------- Spatial ----------

export interface Waypoint {
  id: string;
  label: string;
  x: number;
  y: number;
  yaw?: number;
}

export interface MapRegion {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "wall" | "furniture" | "room";
}

export interface MapInfo {
  sourceId: string;
  frameId: string;
  widthMeters: number;
  heightMeters: number;
  regions: MapRegion[];
  waypoints: Waypoint[];
  updatedAt: ISODateString;
}

export interface PoseSample {
  x: number;
  y: number;
  yaw: number;
  frameId: string;
  observedAt: ISODateString;
}

export interface LidarScan {
  sourceId: string;
  frameId: string;
  observedAt: ISODateString;
  angleMin: number;
  angleIncrement: number;
  rangeMax: number;
  ranges: number[];
}

// ---------- Media and perception ----------

export interface MediaInfo {
  id: string;
  sourceId: string;
  origin: DataOrigin;
  url?: string;
  title: string;
  durationMs: number;
  recordedAt?: ISODateString;
  frameRate?: number;
}

export type EventType =
  | "identity_registered"
  | "observation_interval_extended"
  | "transition_confirmed"
  | "association_unresolved"
  | "detection"
  | "payload_captured";

export interface ObservationEvent {
  id: string;
  sourceId: string;
  runId: string;
  type: EventType;
  observedAt: ISODateString;
  ingestedAt?: ISODateString;
  processedAt?: ISODateString;
  origin: DataOrigin;
  objectIds: string[];
  detectionIds: string[];
  mediaId?: string;
  mediaTimestampMs?: number;
  support?: string;
  confidence?: number;
  summary: string;
  evidenceId?: string;
}

export interface BoundingBox {
  /** Normalised 0..1 image coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  id: string;
  eventId: string;
  sourceId: string;
  label: string;
  confidence?: number;
  bbox?: BoundingBox;
  observedAt: ISODateString;
  mediaTimestampMs?: number;
  trackId?: string;
  objectId?: string;
}

// ---------- Objects and transitions ----------

export type IdentityStatus = "confirmed" | "ambiguous" | "uncertain";

export interface LastKnownLocation {
  support: string;
  x?: number;
  y?: number;
  frameId?: string;
  observedAt: ISODateString;
  confidence?: number;
  /** State version from the authoritative states table. */
  stateVersion: number;
}

export interface Transition {
  id: string;
  objectId: string;
  runId: string;
  previousSupport: string;
  newSupport: string;
  /** Last supported observation at the old place. */
  tLower: ISODateString;
  /** First supported observation at the new place. */
  tUpper: ISODateString;
  confirmedAt: ISODateString;
  /** Uncalibrated appearance similarity. */
  associationScore: number;
  cause: "unknown" | string;
  evidenceId?: string;
}

export interface ObservationInterval {
  id: string;
  objectId: string;
  support: string;
  firstSeenAt: ISODateString;
  lastSeenAt: ISODateString;
  /** Sightings folded into this interval instead of written as new events. */
  sightingCount: number;
  open: boolean;
}

export interface ObjectTrack {
  /** Unique across sources and runs. */
  id: string;
  /** Identity assigned by the pipeline inside one run, for example CUP-001. */
  systemId: string;
  sourceId: string;
  runId: string;
  label: string;
  /** User-given name (FR-48). Never replaces the system id. */
  slug?: string;
  photoUrl?: string;
  identityStatus: IdentityStatus;
  associationScore?: number;
  firstSeenAt?: ISODateString;
  lastSeenAt?: ISODateString;
  sightingCount: number;
  lastKnownLocation?: LastKnownLocation;
  eventIds: string[];
  transitionIds: string[];
  intervalIds: string[];
}

export interface ObjectLabelInput {
  slug?: string;
  photoUrl?: string;
}

// ---------- Evidence ----------

export type EvidenceKind = "event" | "memory" | "object" | "media" | "task" | "transition" | "crop";

export interface EvidenceReference {
  id: string;
  kind: EvidenceKind;
  label: string;
  sourceId: string;
  occurredAt?: ISODateString;
  href?: string;
  excerpt?: string;
  imageUrl?: string;
  available: boolean;
}

export interface EvidenceReport {
  id: string;
  sourceId: string;
  title: string;
  subject: { kind: "question" | "object" | "event" | "task"; id: string };
  summary: string;
  generatedSummary: boolean;
  createdAt: ISODateString;
  evidence: EvidenceReference[];
  limitations: string[];
}

// ---------- Historical Q&A ----------

export interface HistoricalQuestionRequest {
  sourceId: string;
  question: string;
  timeRange?: { from?: ISODateString; to?: ISODateString };
  objectIds?: string[];
  eventTypes?: string[];
}

export type AnswerKind =
  "from_transition" | "from_current_state" | "cause_unknown" | "insufficient_evidence";

export interface HistoricalQuestionResult {
  id: string;
  sourceId: string;
  runId?: string;
  question: string;
  answer?: string;
  answerKind?: AnswerKind;
  status: "pending" | "completed" | "insufficient_evidence" | "failed";
  createdAt: ISODateString;
  completedAt?: ISODateString;
  context: {
    timeRange?: { from?: ISODateString; to?: ISODateString };
    objectIds: string[];
  };
  resolvedObjectId?: string;
  currentPlace?: string;
  previousPlace?: string;
  /** True when the answer did not need a payload read (transition was enough). */
  answeredWithoutPayload?: boolean;
  evidence: EvidenceReference[];
  confidence?: number;
  limitations: string[];
  retrievalMs?: number;
}

// ---------- Memory and residency ----------

export type ResidencyState =
  "resident" | "persistent_only" | "evicted" | "loading" | "unavailable" | "unknown";

export type MemoryType = "anchor" | "transition" | "interval" | "payload" | "perception_floor";

export interface MemoryRecord {
  id: string;
  sourceId: string;
  runId: string;
  type: MemoryType;
  summary: string;
  observedAt?: ISODateString;
  createdAt: ISODateString;
  persistent: boolean;
  residencyState: ResidencyState;
  bytes?: number;
  relatedEventIds: string[];
  relatedObjectIds: string[];
  policyId?: string;
  policyVersion?: string;
  stale?: boolean;
  contentHash?: string;
  metadata: Record<string, string | number | boolean>;
}

export type LedgerEventType =
  | "created"
  | "loaded"
  | "evicted"
  | "reloaded"
  | "consolidated"
  | "retrieved"
  | "deleted"
  | "other";

export interface MemoryLedgerEvent {
  id: string;
  sequence: number;
  sourceId: string;
  runId?: string;
  memoryId?: string;
  objectId?: string;
  category: "perception" | "memory" | "retrieval" | "task";
  eventType: LedgerEventType;
  occurredAt: ISODateString;
  ramBytes?: number;
  storageBytes?: number;
  durationMs?: number;
  hashVerified?: boolean;
  details: Record<string, string | number | boolean>;
}

export interface MetricSample {
  metric: string;
  value: number | null;
  unit: string;
  measuredAt: ISODateString;
  sourceId?: string;
  runId?: string;
  policyId?: string;
  scope: "process" | "engine" | "system" | "unknown";
}

export interface KeptItem {
  id: string;
  kind: "perception_floor" | "anchor" | "payload";
  label: string;
  objectId?: string;
  bytes?: number;
  since?: ISODateString;
  note?: string;
}

export interface ReleasedItem {
  id: string;
  objectId: string;
  memoryId: string;
  bytes: number;
  releasedAt: ISODateString;
  stillOnDisk: boolean;
  reloadedAt?: ISODateString;
  stale: boolean;
  note?: string;
}

export interface FoldedItem {
  id: string;
  objectId: string;
  support: string;
  intervalId: string;
  sightingCount: number;
  firstSeenAt: ISODateString;
  lastSeenAt: ISODateString;
}

export interface RuntimeSnapshot {
  sourceId: string;
  runId: string;
  measuredAt: ISODateString;
  origin: DataOrigin;
  live: boolean;
  ramBudgetBytes: number;
  residentPayloadBytes: number;
  perceptionFloorBytes?: number;
  processRssBytes?: number;
  diskPayloadBytes: number;
  databaseBytes: number;
  evidenceBytes: number;
  floorCrossings: number;
  kept: KeptItem[];
  released: ReleasedItem[];
  folded: FoldedItem[];
  series: MetricSample[];
}

// ---------- Tasks ----------

export type TaskStatus =
  "queued" | "accepted" | "running" | "succeeded" | "failed" | "rejected" | "cancelled" | "unknown";

export type TaskType = "jog" | "navigate_waypoint" | "navigate_last_known" | "stop" | "unsupported";

export type JogDirection =
  "forward" | "back" | "look_up" | "look_down" | "turn_left" | "turn_right";

export interface TaskTarget {
  x?: number;
  y?: number;
  frameId?: string;
  label?: string;
  waypointId?: string;
  objectId?: string;
  locationObservedAt?: ISODateString;
}

export interface TaskStatusChange {
  status: TaskStatus;
  at: ISODateString;
  note?: string;
}

export interface RobotTask {
  id: string;
  sourceId: string;
  type: TaskType;
  status: TaskStatus;
  command: string;
  createdAt: ISODateString;
  startedAt?: ISODateString;
  completedAt?: ISODateString;
  target?: TaskTarget;
  jog?: JogDirection;
  history: TaskStatusChange[];
  resultSummary?: string;
  errorCode?: string;
  errorMessage?: string;
  simulated: boolean;
}

export interface JogRequest {
  sourceId: string;
  direction: JogDirection;
  command: string;
}

export interface NavigateRequest {
  sourceId: string;
  target: TaskTarget;
  reason: "navigate_to_waypoint" | "navigate_to_last_known_object_location";
  command: string;
  confirmation: true;
}

export interface UnsupportedCommandRequest {
  sourceId: string;
  command: string;
  reason: string;
}

// ---------- Ingestion ----------

export interface IngestionJob {
  id: string;
  sourceId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  status: JobStatus;
  progress?: number;
  createdAt: ISODateString;
  startedAt?: ISODateString;
  completedAt?: ISODateString;
  failureReason?: string;
  settings: { frameRate: number; detector: string; reidThreshold: number };
  producedRunId?: string;
  producedEventCount?: number;
}

export interface CreateIngestionInput {
  sourceId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  settings: { frameRate: number; detector: string; reidThreshold: number };
}

// ---------- Research ----------

export type RunStatus = "draft" | "queued" | "running" | "completed" | "failed" | "cancelled";

export interface PolicyDefinition {
  id: string;
  name: string;
  version: string;
  role: "proposed" | "baseline";
  description: string;
  colorVar: string;
}

export interface WorkloadDefinition {
  id: string;
  name: string;
  description: string;
  sourceKind: SourceKind;
  questionCount: number;
  durationSeconds: number;
}

export interface ExperimentConfig {
  policyId: string;
  policyVersion: string;
  workloadId: string;
  sourceId: string;
  ramBudgetBytes: number;
  durationSeconds?: number;
  workloadSize?: number;
  parameters: Record<string, string | number | boolean>;
}

export interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  direction: "lower_is_better" | "higher_is_better";
  scope: "process" | "engine" | "system" | "evaluation";
  definition: string;
  aggregation: string;
}

export interface MetricValue {
  value: number | null;
  unit: string;
  sampleCount?: number;
}

export interface ExperimentRun {
  id: string;
  name: string;
  status: RunStatus;
  config: ExperimentConfig;
  notes?: string;
  createdAt: ISODateString;
  startedAt?: ISODateString;
  completedAt?: ISODateString;
  progress?: number;
  metricsSummary: Record<string, MetricValue>;
  failureReason?: string;
  partialResults: boolean;
  softwareVersion: string;
  origin: DataOrigin;
}

export interface CreateExperimentInput {
  name: string;
  notes?: string;
  config: ExperimentConfig;
}

export interface RunManifest {
  runId: string;
  name: string;
  generatedAt: ISODateString;
  config: ExperimentConfig;
  policy?: PolicyDefinition;
  workload?: WorkloadDefinition;
  source?: Pick<RobotSource, "id" | "name" | "kind">;
  softwareVersion: string;
  status: RunStatus;
  timestamps: { createdAt: ISODateString; startedAt?: ISODateString; completedAt?: ISODateString };
  metrics: Record<string, MetricValue>;
  unavailableFields: string[];
  origin: DataOrigin;
}

export interface ResearchReport {
  id: string;
  title: string;
  runIds: string[];
  status: "queued" | "generating" | "completed" | "failed";
  createdAt: ISODateString;
  completedAt?: ISODateString;
  methodology: string;
  limitations: string[];
  formats: ("json" | "csv" | "print")[];
}

// ---------- Overview ----------

export interface OverviewSummary {
  sourceId: string;
  generatedAt: ISODateString;
  recentEvents: ObservationEvent[];
  recentTasks: RobotTask[];
  recentQuestions: HistoricalQuestionResult[];
  objectCount: number;
  transitionCount: number;
  runtime?: Pick<
    RuntimeSnapshot,
    "ramBudgetBytes" | "residentPayloadBytes" | "diskPayloadBytes" | "measuredAt" | "live"
  >;
}

// ---------- Lists ----------

export interface Page<T> {
  items: T[];
  total: number;
  nextCursor?: string;
}

export interface EventQuery {
  sourceId: string;
  search?: string;
  types?: EventType[];
  objectId?: string;
  from?: ISODateString;
  to?: ISODateString;
  cursor?: string;
  limit?: number;
}

export interface MemoryQuery {
  sourceId: string;
  search?: string;
  types?: MemoryType[];
  residency?: ResidencyState[];
  objectId?: string;
}

export interface LedgerQuery {
  sourceId: string;
  runId?: string;
  categories?: MemoryLedgerEvent["category"][];
  eventTypes?: LedgerEventType[];
  objectId?: string;
  from?: ISODateString;
  to?: ISODateString;
}

export interface TaskQuery {
  sourceId?: string;
  status?: TaskStatus[];
  search?: string;
}

export interface ExperimentQuery {
  search?: string;
  status?: RunStatus[];
  policyId?: string;
  workloadId?: string;
}
