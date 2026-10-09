import { defaultCapabilities } from "@/lib/contracts/catalog";
import type {
  DataOrigin,
  EvidenceReport,
  ExperimentRun,
  HistoricalQuestionResult,
  IngestionJob,
  ObjectLabelInput,
  ResearchReport,
  RobotSource,
  RobotTask,
  TaskStatus,
} from "@/lib/contracts/types";
import { answerQuestion } from "@/lib/domain/qa";

import { metricsForPolicy, RUN_DURATION_MS, seedExperiments, seedReports } from "./research";
import { getScenario } from "./scenario";
import { at, buildRun, type RunData } from "./storyline";

export interface RunSpec {
  runId: string;
  sourceId: string;
  prefix: string;
  origin: DataOrigin;
  mediaTitle: string;
  withSpatial: boolean;
}

export interface TaskPlan {
  runAt: number;
  doneAt: number;
  final: TaskStatus;
  summary?: string;
  errorCode?: string;
  errorMessage?: string;
}

export type StoredTask = RobotTask & { plan?: TaskPlan };

export interface MockState {
  version: number;
  createdAt: string;
  counter: number;
  sources: RobotSource[];
  runSpecs: RunSpec[];
  labels: Record<string, ObjectLabelInput>;
  tasks: StoredTask[];
  questions: HistoricalQuestionResult[];
  evidenceReports: EvidenceReport[];
  ingestion: IngestionJob[];
  experiments: ExperimentRun[];
  reports: ResearchReport[];
}

const VERSION = 1;
const BASE_KEY = "md-mock-db-v1";

export const INGEST_DURATION_MS = 20_000;
export const REPORT_DURATION_MS = 3_000;

const TERMINAL_TASK: TaskStatus[] = ["succeeded", "failed", "rejected", "cancelled"];
export const isTerminalTask = (status: TaskStatus) => TERMINAL_TASK.includes(status);

function storageKey() {
  return getScenario() === "empty" ? `${BASE_KEY}-empty` : BASE_KEY;
}

function source(
  partial: Pick<RobotSource, "id" | "name" | "kind" | "connectionState" | "origin"> &
    Partial<RobotSource>,
): RobotSource {
  return {
    capabilities: { ...defaultCapabilities[partial.kind] },
    config: [],
    createdAt: at(-86_400 * 3),
    updatedAt: at(-3_600),
    ...partial,
  };
}

function seedSources(): RobotSource[] {
  return [
    source({
      id: "src-sim-01",
      name: "Lab simulation",
      kind: "ros2_simulation",
      connectionState: "online",
      origin: "simulated",
      description: "Gazebo lab world with Table-A and Table-B, TurtleBot 4 model, Nav2.",
      config: [
        {
          key: "rosbridgeUrl",
          label: "ROS bridge URL",
          value: "ws://localhost:9090",
          secret: false,
        },
        { key: "namespace", label: "Namespace", value: "/tb4_sim", secret: false },
      ],
      activeRunId: "run-sim-0001",
      lastSeenAt: at(200),
    }),
    source({
      id: "src-rec-01",
      name: "Patrol recording, 8 Oct",
      kind: "recorded_video",
      connectionState: "online",
      origin: "recorded",
      description: "RGB-D patrol recording processed by the YOLOE pipeline.",
      config: [{ key: "file", label: "File", value: "patrol_2026-10-08.mp4", secret: false }],
      activeRunId: "run-rec-0001",
      lastSeenAt: at(210),
    }),
    source({
      id: "src-bot-01",
      name: "TurtleBot 4 (lab)",
      kind: "physical_robot",
      connectionState: "offline",
      origin: "live",
      description: "Physical robot. Not connected to this console yet.",
      config: [
        {
          key: "rosbridgeUrl",
          label: "ROS bridge URL",
          value: "wss://tb4.lab.local:9090",
          secret: false,
        },
        { key: "namespace", label: "Namespace", value: "/tb4", secret: false },
        { key: "apiToken", label: "API token", value: "••••••••", secret: true },
      ],
    }),
  ];
}

function seedRunSpecs(): RunSpec[] {
  return [
    {
      runId: "run-sim-0001",
      sourceId: "src-sim-01",
      prefix: "sim",
      origin: "simulated",
      mediaTitle: "Simulated camera, patrol A",
      withSpatial: true,
    },
    {
      runId: "run-rec-0001",
      sourceId: "src-rec-01",
      prefix: "rec",
      origin: "recorded",
      mediaTitle: "patrol_2026-10-08.mp4",
      withSpatial: false,
    },
  ];
}

function history(entries: [TaskStatus, number, string?][]) {
  return entries.map(([status, seconds, note]) => ({ status, at: at(seconds), note }));
}

function seedTasks(): StoredTask[] {
  return [
    {
      id: "task-0001",
      sourceId: "src-sim-01",
      type: "navigate_waypoint",
      status: "succeeded",
      command: "go to Table-A",
      createdAt: at(1),
      startedAt: at(2),
      completedAt: at(8),
      target: { waypointId: "wp-table-a", label: "Table-A", x: 2.65, y: 1.4, frameId: "map" },
      history: history([
        ["accepted", 1],
        ["running", 2],
        ["succeeded", 8, "Goal reached within 0.12 m."],
      ]),
      resultSummary: "Reached Table-A.",
      simulated: true,
    },
    {
      id: "task-0002",
      sourceId: "src-sim-01",
      type: "jog",
      status: "succeeded",
      command: "look down",
      jog: "look_down",
      createdAt: at(9),
      startedAt: at(9.2),
      completedAt: at(10),
      history: history([
        ["accepted", 9],
        ["running", 9.2],
        ["succeeded", 10],
      ]),
      resultSummary: "Camera tilted down 10°.",
      simulated: true,
    },
    {
      id: "task-0003",
      sourceId: "src-sim-01",
      type: "unsupported",
      status: "rejected",
      command: "pick the cup from Table-A and put it on Table-B",
      createdAt: at(52),
      history: history([["rejected", 52, "Manipulation is not supported on this robot."]]),
      errorCode: "unsupported",
      errorMessage: "This robot has a camera and memory but no arm.",
      simulated: true,
    },
    {
      id: "task-0004",
      sourceId: "src-sim-01",
      type: "navigate_waypoint",
      status: "failed",
      command: "go to Corridor",
      createdAt: at(56),
      startedAt: at(57),
      completedAt: at(70),
      target: { waypointId: "wp-corridor", label: "Corridor", x: 6, y: 3.4, frameId: "map" },
      history: history([
        ["accepted", 56],
        ["running", 57],
        ["failed", 70, "Nav2 aborted: no valid path within tolerance."],
      ]),
      errorCode: "nav_aborted",
      errorMessage: "Nav2 aborted: no valid path within tolerance.",
      simulated: true,
    },
  ];
}

function seedIngestion(): IngestionJob[] {
  return [
    {
      id: "ing-0001",
      sourceId: "src-rec-01",
      fileName: "patrol_2026-10-08.mp4",
      fileSizeBytes: 184_549_376,
      mimeType: "video/mp4",
      status: "completed",
      progress: 100,
      createdAt: at(205),
      startedAt: at(207),
      completedAt: at(290),
      settings: { frameRate: 10, detector: "yoloe-11s", reidThreshold: 0.75 },
      producedRunId: "run-rec-0001",
      producedEventCount: 11,
    },
    {
      id: "ing-0002",
      sourceId: "src-rec-01",
      fileName: "patrol_2026-10-07_corrupt.mov",
      fileSizeBytes: 96_468_992,
      mimeType: "video/quicktime",
      status: "failed",
      progress: 37,
      createdAt: at(-80_000),
      startedAt: at(-79_990),
      completedAt: at(-79_950),
      failureReason: "Frame 1,214 could not be decoded. The file may be truncated.",
      settings: { frameRate: 10, detector: "yoloe-11s", reidThreshold: 0.75 },
    },
  ];
}

function seedState(now: number): MockState {
  const runSpecs = seedRunSpecs();
  const labels: Record<string, ObjectLabelInput> = {
    "sim-cup-001": { slug: "my-mug", photoUrl: "/demo/evidence/ev-cup1-registered.svg" },
  };
  const state: MockState = {
    version: VERSION,
    createdAt: new Date(now).toISOString(),
    counter: 100,
    sources: seedSources(),
    runSpecs,
    labels,
    tasks: seedTasks(),
    questions: [],
    evidenceReports: [],
    ingestion: seedIngestion(),
    experiments: seedExperiments(now),
    reports: seedReports(),
  };
  const sim = runFor(state, "run-sim-0001")!;
  const question = "Where was my-mug before it reached Table-B?";
  const qa = answerQuestion({
    question,
    sourceId: "src-sim-01",
    objects: sim.objects,
    transitions: sim.transitions,
    intervals: sim.intervals,
  });
  state.questions.push({
    id: "q-0001",
    sourceId: "src-sim-01",
    runId: "run-sim-0001",
    question,
    answer: qa.answer,
    answerKind: qa.answerKind,
    status: qa.status,
    createdAt: at(162),
    completedAt: at(162.003),
    context: { objectIds: [] },
    resolvedObjectId: qa.resolvedObjectId,
    currentPlace: qa.currentPlace,
    previousPlace: qa.previousPlace,
    answeredWithoutPayload: qa.answeredWithoutPayload,
    evidence: qa.evidence,
    confidence: qa.confidence,
    limitations: qa.limitations,
    retrievalMs: 3.2,
  });
  return state;
}

function emptyState(now: number): MockState {
  return {
    version: VERSION,
    createdAt: new Date(now).toISOString(),
    counter: 100,
    sources: [],
    runSpecs: [],
    labels: {},
    tasks: [],
    questions: [],
    evidenceReports: [],
    ingestion: [],
    experiments: [],
    reports: [],
  };
}

// ---------- Run cache ----------

const runCache = new Map<string, RunData>();

export function runFor(state: MockState, runId: string | undefined): RunData | undefined {
  if (!runId) return undefined;
  const spec = state.runSpecs.find((s) => s.runId === runId);
  if (!spec) return undefined;
  let run = runCache.get(runId);
  if (!run) {
    run = buildRun(spec);
    runCache.set(runId, run);
  }
  const objects = run.objects.map((o) => ({ ...o, ...state.labels[o.id] }));
  return { ...run, objects };
}

export function activeRun(state: MockState, sourceId: string) {
  const src = state.sources.find((s) => s.id === sourceId);
  return runFor(state, src?.activeRunId);
}

export function allRuns(state: MockState) {
  return state.runSpecs.map((s) => runFor(state, s.runId)!).filter(Boolean);
}

// ---------- Persistence ----------

let memory: { key: string; state: MockState } | null = null;

function read(key: string): MockState | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockState;
    return parsed.version === VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function write(key: string, state: MockState) {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Quota errors leave the in-memory state usable for this session.
  }
}

export function loadState(now = Date.now()): MockState {
  const key = storageKey();
  if (memory?.key !== key) {
    const stored = typeof window === "undefined" ? null : read(key);
    const state = stored ?? (key.endsWith("-empty") ? emptyState(now) : seedState(now));
    memory = { key, state };
    if (!stored && typeof window !== "undefined") write(key, state);
  }
  if (tick(memory.state, now)) save();
  return memory.state;
}

export function save() {
  if (memory && typeof window !== "undefined") write(memory.key, memory.state);
}

export function resetState() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(BASE_KEY);
    window.localStorage.removeItem(`${BASE_KEY}-empty`);
  }
  memory = null;
  runCache.clear();
}

export function nextId(state: MockState, prefix: string) {
  state.counter += 1;
  return `${prefix}-${String(state.counter).padStart(4, "0")}`;
}

// ---------- Time-based progression ----------

/** Advances queued and running work by wall-clock time. Returns true when anything changed. */
export function tick(state: MockState, now: number): boolean {
  let changed = false;
  const iso = (ms: number) => new Date(ms).toISOString();

  for (const task of state.tasks) {
    const plan = task.plan;
    if (!plan || isTerminalTask(task.status)) continue;
    if (task.status === "accepted" && now >= plan.runAt) {
      task.status = "running";
      task.startedAt = iso(plan.runAt);
      task.history.push({ status: "running", at: task.startedAt });
      changed = true;
    }
    if (task.status === "running" && now >= plan.doneAt) {
      task.status = plan.final;
      task.completedAt = iso(plan.doneAt);
      task.history.push({
        status: plan.final,
        at: task.completedAt,
        note: plan.errorMessage ?? plan.summary,
      });
      task.resultSummary = plan.summary;
      task.errorCode = plan.errorCode;
      task.errorMessage = plan.errorMessage;
      delete task.plan;
      changed = true;
    }
  }

  for (const job of state.ingestion) {
    if (job.status === "queued" && now >= Date.parse(job.createdAt) + 2_000) {
      job.status = "running";
      job.startedAt = iso(Date.parse(job.createdAt) + 2_000);
      job.progress = 0;
      changed = true;
    }
    if (job.status === "running" && job.startedAt) {
      const elapsed = now - Date.parse(job.startedAt);
      const willFail = /corrupt|broken/i.test(job.fileName);
      const progress = Math.min(100, Math.round((elapsed / INGEST_DURATION_MS) * 100));
      if (willFail && progress >= 40) {
        job.status = "failed";
        job.progress = 40;
        job.completedAt = iso(now);
        job.failureReason = "A frame could not be decoded. The file may be truncated.";
      } else if (progress >= 100) {
        const runId = `run-${job.id}`;
        if (!state.runSpecs.some((s) => s.runId === runId)) {
          state.runSpecs.push({
            runId,
            sourceId: job.sourceId,
            prefix: job.id,
            origin: "recorded",
            mediaTitle: job.fileName,
            withSpatial: false,
          });
        }
        const src = state.sources.find((s) => s.id === job.sourceId);
        if (src) {
          src.activeRunId = runId;
          src.updatedAt = iso(now);
          src.lastSeenAt = iso(now);
        }
        job.status = "completed";
        job.progress = 100;
        job.completedAt = iso(Date.parse(job.startedAt) + INGEST_DURATION_MS);
        job.producedRunId = runId;
        job.producedEventCount = runFor(state, runId)?.events.length ?? 0;
      } else if (progress !== job.progress) {
        job.progress = progress;
      }
      changed = true;
    }
  }

  for (const run of state.experiments) {
    if (run.status === "queued" && now >= Date.parse(run.createdAt) + 3_000) {
      run.status = "running";
      run.startedAt = iso(Math.max(Date.parse(run.createdAt) + 3_000, now - 1));
      run.progress = 0;
      changed = true;
    }
    if (run.status === "running" && run.startedAt) {
      const progress = Math.min(
        100,
        Math.round(((now - Date.parse(run.startedAt)) / RUN_DURATION_MS) * 100),
      );
      if (progress >= 100) {
        run.status = "completed";
        run.progress = 100;
        run.completedAt = iso(Date.parse(run.startedAt) + RUN_DURATION_MS);
        run.metricsSummary = metricsForPolicy(run.config.policyId, run.config.ramBudgetBytes);
      } else {
        run.progress = progress;
      }
      changed = true;
    }
  }

  for (const report of state.reports) {
    if (report.status === "queued" || report.status === "generating") {
      const created = Date.parse(report.createdAt);
      const next = now >= created + REPORT_DURATION_MS ? "completed" : "generating";
      if (next !== report.status) {
        report.status = next;
        if (next === "completed") report.completedAt = iso(created + REPORT_DURATION_MS);
        changed = true;
      }
    }
  }

  return changed;
}
