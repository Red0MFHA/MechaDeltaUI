import type {
  CreateExperimentInput,
  CreateIngestionInput,
  Detection,
  EventQuery,
  EvidenceReport,
  ExperimentQuery,
  ExperimentRun,
  HistoricalQuestionRequest,
  HistoricalQuestionResult,
  IngestionJob,
  JogRequest,
  LedgerQuery,
  LidarScan,
  MapInfo,
  MediaInfo,
  MemoryLedgerEvent,
  MemoryQuery,
  MemoryRecord,
  MetricSample,
  NavigateRequest,
  ObjectLabelInput,
  ObjectTrack,
  ObservationEvent,
  ObservationInterval,
  OverviewSummary,
  Page,
  PoseSample,
  RegisterSourceInput,
  ResearchReport,
  RobotSource,
  RobotTask,
  RunManifest,
  RuntimeSnapshot,
  Session,
  TaskQuery,
  Transition,
  UnsupportedCommandRequest,
  UpdateSourceInput,
} from "@/lib/contracts/types";

export interface AuthApi {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<Session>;
  signUp(name: string, email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
}

export interface SourcesApi {
  list(): Promise<RobotSource[]>;
  get(id: string): Promise<RobotSource>;
  register(input: RegisterSourceInput): Promise<RobotSource>;
  update(id: string, input: UpdateSourceInput): Promise<RobotSource>;
  connect(id: string): Promise<RobotSource>;
  disconnect(id: string): Promise<RobotSource>;
  remove(id: string): Promise<void>;
}

export interface IngestApi {
  list(sourceId?: string): Promise<IngestionJob[]>;
  get(id: string): Promise<IngestionJob>;
  create(input: CreateIngestionInput): Promise<IngestionJob>;
  retry(id: string): Promise<IngestionJob>;
}

export interface OverviewApi {
  get(sourceId: string): Promise<OverviewSummary>;
}

export interface MediaApi {
  get(sourceId: string): Promise<MediaInfo | null>;
  detections(sourceId: string): Promise<Detection[]>;
  map(sourceId: string): Promise<MapInfo>;
  pose(sourceId: string): Promise<PoseSample[]>;
  lidar(sourceId: string): Promise<LidarScan>;
}

export interface EventsApi {
  list(query: EventQuery): Promise<Page<ObservationEvent>>;
  get(id: string): Promise<ObservationEvent>;
}

export interface ObjectsApi {
  list(sourceId: string): Promise<ObjectTrack[]>;
  get(id: string): Promise<ObjectTrack>;
  transitions(objectId: string): Promise<Transition[]>;
  intervals(objectId: string): Promise<ObservationInterval[]>;
  setLabel(id: string, input: ObjectLabelInput): Promise<ObjectTrack>;
}

export interface QuestionsApi {
  ask(request: HistoricalQuestionRequest): Promise<HistoricalQuestionResult>;
  list(sourceId: string): Promise<HistoricalQuestionResult[]>;
  get(id: string): Promise<HistoricalQuestionResult>;
}

export interface EvidenceApi {
  get(id: string): Promise<EvidenceReport>;
  createFromQuestion(questionId: string): Promise<EvidenceReport>;
  createFromObject(objectId: string): Promise<EvidenceReport>;
}

export interface MemoryApi {
  list(query: MemoryQuery): Promise<MemoryRecord[]>;
  get(id: string): Promise<MemoryRecord>;
  history(id: string): Promise<MemoryLedgerEvent[]>;
}

export interface RuntimeApi {
  snapshot(sourceId: string): Promise<RuntimeSnapshot>;
  ledger(query: LedgerQuery): Promise<MemoryLedgerEvent[]>;
  series(sourceId: string, runId?: string): Promise<MetricSample[]>;
}

export interface TasksApi {
  list(query: TaskQuery): Promise<RobotTask[]>;
  get(id: string): Promise<RobotTask>;
  jog(request: JogRequest): Promise<RobotTask>;
  navigate(request: NavigateRequest): Promise<RobotTask>;
  logUnsupported(request: UnsupportedCommandRequest): Promise<RobotTask>;
  cancel(id: string): Promise<RobotTask>;
}

export interface ExperimentsApi {
  list(query?: ExperimentQuery): Promise<ExperimentRun[]>;
  get(id: string): Promise<ExperimentRun>;
  create(input: CreateExperimentInput): Promise<ExperimentRun>;
  start(id: string): Promise<ExperimentRun>;
  cancel(id: string): Promise<ExperimentRun>;
  series(id: string): Promise<MetricSample[]>;
  ledger(id: string): Promise<MemoryLedgerEvent[]>;
  manifest(id: string): Promise<RunManifest>;
}

export interface ReportsApi {
  list(): Promise<ResearchReport[]>;
  get(id: string): Promise<ResearchReport>;
  create(input: { title: string; runIds: string[] }): Promise<ResearchReport>;
}

export interface Services {
  mode: "mock" | "http";
  auth: AuthApi;
  sources: SourcesApi;
  ingest: IngestApi;
  overview: OverviewApi;
  media: MediaApi;
  events: EventsApi;
  objects: ObjectsApi;
  questions: QuestionsApi;
  evidence: EvidenceApi;
  memory: MemoryApi;
  runtime: RuntimeApi;
  tasks: TasksApi;
  experiments: ExperimentsApi;
  reports: ReportsApi;
}
