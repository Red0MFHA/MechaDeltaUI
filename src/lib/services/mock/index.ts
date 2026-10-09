import {
  defaultCapabilities,
  policyById,
  SOFTWARE_VERSION,
  workloadById,
} from "@/lib/contracts/catalog";
import { ServiceError } from "@/lib/contracts/errors";
import {
  editSourceSchema,
  objectLabelSchema,
  questionSchema,
  registerSourceSchema,
  reportSchema,
  validateVideoFile,
} from "@/lib/contracts/schemas";
import type {
  CapabilityKey,
  EvidenceReference,
  EvidenceReport,
  ExperimentRun,
  MemoryRecord,
  ObjectTrack,
  ObservationEvent,
  RobotSource,
  RobotTask,
  RunManifest,
  Session,
  SourceConfigField,
} from "@/lib/contracts/types";
import { checkAlignment } from "@/lib/domain/compare";
import { displayName } from "@/lib/domain/objects";
import { answerQuestion } from "@/lib/domain/qa";
import { deriveResidency } from "@/lib/domain/residency";
import { formatDateTime } from "@/lib/format";

import type { Services } from "../types";
import {
  activeRun,
  allRuns,
  isTerminalTask,
  loadState,
  nextId,
  resetState,
  runFor,
  save,
  setMockUser,
  type MockState,
  type StoredTask,
  type TaskPlan as TaskPlanLike,
} from "./db";
import { ledgerForRun, seriesForRun } from "./research";
import { getScenario, setScenario } from "./scenario";
import { raycastScan, type RunData } from "./storyline";

type Kind = "read" | "write";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call<T>(kind: Kind, fn: (state: MockState, now: number) => T): Promise<T> {
  const scenario = getScenario();
  await sleep(scenario === "slow" ? 2_500 : kind === "write" ? 350 : 120 + Math.random() * 180);
  if (scenario === "offline") {
    throw new ServiceError(
      "unavailable",
      "The MechaDelta backend did not respond (mock offline scenario).",
    );
  }
  if (scenario === "session_expired") {
    throw new ServiceError("unauthorized", "The session token is no longer valid (mock scenario).");
  }
  if (scenario === "failing" && kind === "write") {
    throw new ServiceError("failed", "The change was not saved (mock failing scenario).");
  }
  const now = Date.now();
  const state = loadState(now);
  const result = fn(state, now);
  if (kind === "write") save();
  return structuredClone(result);
}

// ---------- Guards ----------

function requireSource(state: MockState, id: string) {
  const src = state.sources.find((s) => s.id === id);
  if (!src) throw new ServiceError("not_found", `Source ${id} was not found.`);
  return src;
}

function requireCapability(src: RobotSource, capability: CapabilityKey, what: string) {
  if (!src.capabilities[capability]) {
    throw new ServiceError("unsupported", `${src.name} does not provide ${what}.`, { capability });
  }
}

function requireOnline(src: RobotSource) {
  if (src.connectionState !== "online") {
    throw new ServiceError(
      "disconnected",
      `${src.name} is ${src.connectionState}. Connect it first.`,
    );
  }
}

function requireRun(state: MockState, sourceId: string) {
  const run = activeRun(state, sourceId);
  if (!run) throw new ServiceError("unavailable", "This source has no processed run yet.");
  return run;
}

function fieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

function invalid(issues: { path: (string | number)[]; message: string }[]): never {
  throw new ServiceError("validation_error", "Some fields need attention.", {
    fieldErrors: fieldErrors(issues),
  });
}

function findObject(state: MockState, id: string): { run: RunData; object: ObjectTrack } {
  for (const run of allRuns(state)) {
    const object = run.objects.find((o) => o.id === id);
    if (object) return { run, object };
  }
  throw new ServiceError("not_found", `Object ${id} was not found.`);
}

// ---------- Memory records ----------

function memoryRecords(run: RunData): MemoryRecord[] {
  const residency = deriveResidency({
    ledger: run.ledger,
    payloads: run.payloads,
    objects: run.objects,
    intervals: run.intervals,
    perceptionFloorBytes: run.perceptionFloorBytes,
    anchorBytesPerObject: run.anchorBytesPerObject,
  });
  const base = {
    sourceId: run.sourceId,
    runId: run.runId,
    policyId: "proposed",
    policyVersion: "0.1",
  };
  const objectName = (id: string) => {
    const object = run.objects.find((o) => o.id === id);
    return object ? displayName(object) : id;
  };

  const records: MemoryRecord[] = [
    {
      ...base,
      id: `floor-${run.runId}`,
      type: "perception_floor",
      summary: "Perception floor: detector, tracker, embeddings, and the live frame.",
      createdAt: run.ledger[0]?.occurredAt ?? new Date().toISOString(),
      persistent: false,
      residencyState: "resident",
      bytes: run.perceptionFloorBytes,
      relatedEventIds: [],
      relatedObjectIds: [],
      metadata: { reserved: true, measured: false },
    },
  ];

  for (const object of run.objects) {
    records.push({
      ...base,
      id: `anchor-${object.id}`,
      type: "anchor",
      summary: `Anchor for ${displayName(object)}: identity, appearance embedding, latest place ${object.lastKnownLocation?.support ?? "unknown"}.`,
      observedAt: object.lastSeenAt,
      createdAt: object.firstSeenAt ?? run.ledger[0].occurredAt,
      persistent: true,
      residencyState: "resident",
      bytes: run.anchorBytesPerObject,
      relatedEventIds: object.eventIds,
      relatedObjectIds: [object.id],
      metadata: {
        systemId: object.systemId,
        stateVersion: object.lastKnownLocation?.stateVersion ?? 0,
        sightings: object.sightingCount,
      },
    });
  }

  for (const interval of run.intervals) {
    records.push({
      ...base,
      id: interval.id,
      type: "interval",
      summary: `${objectName(interval.objectId)} at ${interval.support}: ${interval.sightingCount} sightings folded into one interval${interval.open ? " (still open)" : ""}.`,
      observedAt: interval.lastSeenAt,
      createdAt: interval.firstSeenAt,
      persistent: true,
      residencyState: "persistent_only",
      bytes: 96,
      relatedEventIds: run.events
        .filter((e) => e.objectIds.includes(interval.objectId) && e.support === interval.support)
        .map((e) => e.id),
      relatedObjectIds: [interval.objectId],
      metadata: {
        support: interval.support,
        sightings: interval.sightingCount,
        open: interval.open,
      },
    });
  }

  for (const transition of run.transitions) {
    records.push({
      ...base,
      id: transition.id,
      type: "transition",
      summary: `${objectName(transition.objectId)} moved ${transition.previousSupport} → ${transition.newSupport}. Cause ${transition.cause}.`,
      observedAt: transition.tUpper,
      createdAt: transition.confirmedAt,
      persistent: true,
      residencyState: "persistent_only",
      bytes: 160,
      relatedEventIds: run.events
        .filter(
          (e) => e.type === "transition_confirmed" && e.objectIds.includes(transition.objectId),
        )
        .map((e) => e.id),
      relatedObjectIds: [transition.objectId],
      metadata: {
        from: transition.previousSupport,
        to: transition.newSupport,
        associationScore: transition.associationScore,
        cause: transition.cause,
      },
    });
  }

  for (const payload of run.payloads) {
    records.push({
      ...base,
      id: payload.memoryId,
      type: "payload",
      summary: `Payload for ${objectName(payload.objectId)} saved at ${payload.support}: ${payload.views} RGB-D views and ${payload.geometry}.`,
      observedAt: payload.captureTime,
      createdAt: payload.captureTime,
      persistent: true,
      residencyState: residency.payloadState[payload.memoryId] ?? "unknown",
      bytes: payload.decodedBytes,
      relatedEventIds: run.events
        .filter((e) => e.type === "payload_captured" && e.objectIds.includes(payload.objectId))
        .map((e) => e.id),
      relatedObjectIds: [payload.objectId],
      stale: residency.stalePayloads.has(payload.memoryId),
      contentHash: payload.contentHash,
      metadata: {
        support: payload.support,
        stateVersion: payload.stateVersion,
        views: payload.views,
        storageBytes: payload.storageBytes,
        fileHash: payload.fileHash,
      },
    });
  }
  return records;
}

// ---------- Evidence references ----------

function eventRef(event: ObservationEvent): EvidenceReference {
  return {
    id: event.id,
    kind: "event",
    label: event.summary,
    sourceId: event.sourceId,
    occurredAt: event.observedAt,
    href: `/app/operations/events?event=${event.id}`,
    available: true,
  };
}

function cropRefs(events: ObservationEvent[]): EvidenceReference[] {
  return events
    .filter((e) => e.evidenceId)
    .map((e) => ({
      id: e.evidenceId!,
      kind: "crop" as const,
      label: `Crop: ${e.summary}`,
      sourceId: e.sourceId,
      occurredAt: e.observedAt,
      imageUrl: `/demo/evidence/${e.evidenceId}.svg`,
      available: true,
    }));
}

// ---------- Tasks ----------

function taskBase(
  src: RobotSource,
  now: number,
  command: string,
): Omit<RobotTask, "type" | "status"> {
  return {
    id: "",
    sourceId: src.id,
    command,
    createdAt: new Date(now).toISOString(),
    history: [],
    simulated: src.kind === "ros2_simulation",
  };
}

function addTask(state: MockState, task: StoredTask) {
  task.id = nextId(state, "task");
  state.tasks.push(task);
  return task;
}

const jogResult: Record<string, string> = {
  forward: "Moved forward 0.25 m.",
  back: "Moved back 0.25 m.",
  look_up: "Camera tilted up 10°.",
  look_down: "Camera tilted down 10°.",
  turn_left: "Turned left 15°.",
  turn_right: "Turned right 15°.",
};

function stripPlan(stored: StoredTask): RobotTask {
  const task: StoredTask = { ...stored };
  delete task.plan;
  return task;
}

// ---------- Factory ----------

export function createMockServices(): Services {
  return {
    mode: "mock",

    auth: {
      async getSession() {
        if (getScenario() === "session_expired") return null;
        const res = await fetch("/api/mock-session", { cache: "no-store" });
        if (!res.ok) return null;
        const session = ((await res.json()) as { session: Session | null }).session;
        if (session) setMockUser(session.user.id);
        return session;
      },
      async signIn(email, password) {
        const res = await fetch("/api/mock-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode: "signin", email, password }),
        });
        if (res.status === 401)
          throw new ServiceError("unauthorized", "Email or password is incorrect.");
        if (!res.ok) throw new ServiceError("failed", "Sign-in failed. Try again.");
        const session = ((await res.json()) as { session: Session }).session;
        setMockUser(session.user.id);
        if (getScenario() === "session_expired") setScenario("normal");
        return session;
      },
      async signUp(name, email, password) {
        const res = await fetch("/api/mock-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode: "signup", name, email, password }),
        });
        if (res.status === 409) {
          throw new ServiceError("conflict", "An account with this email already exists.", {
            fieldErrors: { email: "An account with this email already exists." },
          });
        }
        if (!res.ok)
          throw new ServiceError("failed", "The account could not be created. Try again.");
        const session = ((await res.json()) as { session: Session }).session;
        setMockUser(session.user.id);
        return session;
      },
      async signOut() {
        await fetch("/api/mock-session", { method: "DELETE" });
      },
    },

    sources: {
      list: () => call("read", (s) => s.sources),
      get: (id) => call("read", (s) => requireSource(s, id)),
      register: (input) =>
        call("write", (s, now) => {
          const parsed = registerSourceSchema.safeParse({
            name: input.name,
            kind: input.kind,
            description: input.description,
            ...input.config,
          });
          if (!parsed.success) invalid(parsed.error.issues);
          const v = parsed.data;
          if (s.sources.some((x) => x.name.toLowerCase() === v.name.toLowerCase())) {
            invalid([{ path: ["name"], message: "A source with this name already exists." }]);
          }
          const config: SourceConfigField[] = [];
          if (v.streamUrl)
            config.push({
              key: "streamUrl",
              label: "Stream URL",
              value: v.streamUrl,
              secret: false,
            });
          if (v.rosbridgeUrl)
            config.push({
              key: "rosbridgeUrl",
              label: "ROS bridge URL",
              value: v.rosbridgeUrl,
              secret: false,
            });
          if (v.namespace)
            config.push({
              key: "namespace",
              label: "Namespace",
              value: v.namespace,
              secret: false,
            });
          if (v.apiToken)
            config.push({ key: "apiToken", label: "API token", value: "••••••••", secret: true });
          const iso = new Date(now).toISOString();
          const created: RobotSource = {
            id: nextId(s, "src"),
            name: v.name,
            kind: v.kind,
            description: v.description || undefined,
            connectionState: v.kind === "recorded_video" ? "online" : "offline",
            origin:
              v.kind === "recorded_video"
                ? "recorded"
                : v.kind === "ros2_simulation"
                  ? "simulated"
                  : "live",
            capabilities: { ...defaultCapabilities[v.kind] },
            config,
            createdAt: iso,
            updatedAt: iso,
          };
          s.sources.push(created);
          return created;
        }),
      update: (id, input) =>
        call("write", (s, now) => {
          const src = requireSource(s, id);
          const parsed = editSourceSchema.safeParse({
            name: input.name ?? src.name,
            description: input.description,
          });
          if (!parsed.success) invalid(parsed.error.issues);
          if (
            s.sources.some(
              (x) => x.id !== id && x.name.toLowerCase() === parsed.data.name.toLowerCase(),
            )
          ) {
            invalid([{ path: ["name"], message: "A source with this name already exists." }]);
          }
          src.name = parsed.data.name;
          src.description = parsed.data.description || undefined;
          src.updatedAt = new Date(now).toISOString();
          return src;
        }),
      connect: (id) =>
        call("write", (s, now) => {
          const src = requireSource(s, id);
          if (src.kind === "physical_robot") {
            src.connectionState = "offline";
            const url = src.config.find((c) => c.key === "rosbridgeUrl")?.value ?? "the ROS bridge";
            save();
            throw new ServiceError(
              "disconnected",
              `No response from ${url} within 5 s. Check that the robot is on the lab network.`,
            );
          }
          src.connectionState = "online";
          src.lastSeenAt = new Date(now).toISOString();
          src.updatedAt = src.lastSeenAt;
          return src;
        }),
      disconnect: (id) =>
        call("write", (s, now) => {
          const src = requireSource(s, id);
          if (src.kind === "recorded_video") {
            throw new ServiceError("unsupported", "Recordings do not hold a connection.");
          }
          src.connectionState = "offline";
          src.updatedAt = new Date(now).toISOString();
          s.tasks
            .filter((t) => t.sourceId === id && !isTerminalTask(t.status))
            .forEach((t) => {
              t.status = "cancelled";
              t.completedAt = src.updatedAt;
              t.history.push({
                status: "cancelled",
                at: src.updatedAt,
                note: "Source disconnected.",
              });
              delete t.plan;
            });
          return src;
        }),
      remove: (id) =>
        call("write", (s) => {
          requireSource(s, id);
          s.sources = s.sources.filter((x) => x.id !== id);
          s.tasks = s.tasks.filter((t) => t.sourceId !== id);
          s.questions = s.questions.filter((q) => q.sourceId !== id);
          s.ingestion = s.ingestion.filter((j) => j.sourceId !== id);
          s.evidenceReports = s.evidenceReports.filter((r) => r.sourceId !== id);
          s.runSpecs = s.runSpecs.filter((r) => r.sourceId !== id);
        }),
    },

    ingest: {
      list: (sourceId) =>
        call("read", (s) =>
          s.ingestion
            .filter((j) => !sourceId || j.sourceId === sourceId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      get: (id) =>
        call("read", (s) => {
          const job = s.ingestion.find((j) => j.id === id);
          if (!job) throw new ServiceError("not_found", `Ingestion job ${id} was not found.`);
          return job;
        }),
      create: (input) =>
        call("write", (s, now) => {
          const src = requireSource(s, input.sourceId);
          if (src.kind !== "recorded_video") {
            invalid([{ path: ["sourceId"], message: "Choose a recording source." }]);
          }
          const fileError = validateVideoFile({
            name: input.fileName,
            size: input.fileSizeBytes,
            type: input.mimeType,
          });
          if (fileError) invalid([{ path: ["file"], message: fileError }]);
          const job = {
            id: nextId(s, "ing"),
            sourceId: input.sourceId,
            fileName: input.fileName,
            fileSizeBytes: input.fileSizeBytes,
            mimeType: input.mimeType,
            status: "queued" as const,
            progress: 0,
            createdAt: new Date(now).toISOString(),
            settings: input.settings,
          };
          s.ingestion.push(job);
          return job;
        }),
      retry: (id) =>
        call("write", (s, now) => {
          const job = s.ingestion.find((j) => j.id === id);
          if (!job) throw new ServiceError("not_found", `Ingestion job ${id} was not found.`);
          if (job.status !== "failed" && job.status !== "cancelled") {
            throw new ServiceError("conflict", "Only failed or cancelled jobs can be retried.");
          }
          Object.assign(job, {
            status: "queued",
            progress: 0,
            createdAt: new Date(now).toISOString(),
            startedAt: undefined,
            completedAt: undefined,
            failureReason: undefined,
          });
          return job;
        }),
    },

    overview: {
      get: (sourceId) =>
        call("read", (s, now) => {
          const src = requireSource(s, sourceId);
          const run = activeRun(s, sourceId);
          const residency = run
            ? deriveResidency({
                ledger: run.ledger,
                payloads: run.payloads,
                objects: run.objects,
                intervals: run.intervals,
              })
            : undefined;
          return {
            sourceId,
            generatedAt: new Date(now).toISOString(),
            recentEvents: run
              ? [...run.events].sort((a, b) => b.observedAt.localeCompare(a.observedAt)).slice(0, 6)
              : [],
            recentTasks: s.tasks
              .filter((t) => t.sourceId === sourceId)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 5)
              .map(stripPlan),
            recentQuestions: s.questions
              .filter((q) => q.sourceId === sourceId)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 5),
            objectCount: run?.objects.length ?? 0,
            transitionCount: run?.transitions.length ?? 0,
            runtime:
              run && residency && src.capabilities.telemetry
                ? {
                    ramBudgetBytes: run.ramBudgetBytes,
                    residentPayloadBytes: residency.residentPayloadBytes,
                    diskPayloadBytes: run.payloads.reduce((sum, p) => sum + p.storageBytes, 0),
                    measuredAt: run.series.at(-1)?.measuredAt ?? run.ledger.at(-1)!.occurredAt,
                    live: false,
                  }
                : undefined,
          };
        }),
    },

    media: {
      get: (sourceId) =>
        call("read", (s) => {
          const src = requireSource(s, sourceId);
          if (!src.capabilities.video && !src.capabilities.recordedMedia) return null;
          return activeRun(s, sourceId)?.media ?? null;
        }),
      detections: (sourceId) =>
        call("read", (s) => {
          requireCapability(requireSource(s, sourceId), "detections", "detections");
          return activeRun(s, sourceId)?.detections ?? [];
        }),
      map: (sourceId) =>
        call("read", (s) => {
          requireCapability(requireSource(s, sourceId), "map", "a map");
          const map = activeRun(s, sourceId)?.map;
          if (!map)
            throw new ServiceError("unavailable", "No map has been received from this source yet.");
          return map;
        }),
      pose: (sourceId) =>
        call("read", (s) => {
          requireCapability(requireSource(s, sourceId), "pose", "robot pose");
          return activeRun(s, sourceId)?.pose ?? [];
        }),
      lidar: (sourceId) =>
        call("read", (s) => {
          requireCapability(requireSource(s, sourceId), "lidar", "LiDAR");
          const run = activeRun(s, sourceId);
          const pose = run?.pose?.at(-1);
          if (!run?.map || !pose)
            throw new ServiceError("unavailable", "No LiDAR scan has been received yet.");
          const beams = 180;
          return {
            sourceId,
            frameId: "base_scan",
            observedAt: pose.observedAt,
            angleMin: -Math.PI,
            angleIncrement: (2 * Math.PI) / beams,
            rangeMax: 6,
            ranges: raycastScan(run.map, pose, beams, 6),
          };
        }),
    },

    events: {
      list: (query) =>
        call("read", (s) => {
          requireSource(s, query.sourceId);
          const run = activeRun(s, query.sourceId);
          const search = query.search?.trim().toLowerCase();
          const names = new Map(run?.objects.map((o) => [o.id, displayName(o).toLowerCase()]));
          const filtered = (run?.events ?? [])
            .filter((e) => !query.types?.length || query.types.includes(e.type))
            .filter((e) => !query.objectId || e.objectIds.includes(query.objectId))
            .filter((e) => !query.from || e.observedAt >= query.from)
            .filter((e) => !query.to || e.observedAt <= query.to)
            .filter(
              (e) =>
                !search ||
                e.summary.toLowerCase().includes(search) ||
                e.support?.toLowerCase().includes(search) ||
                e.objectIds.some((id) => names.get(id)?.includes(search)),
            )
            .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
          const offset = Number(query.cursor ?? 0) || 0;
          const limit = query.limit ?? 50;
          const items = filtered.slice(offset, offset + limit);
          return {
            items,
            total: filtered.length,
            nextCursor: offset + limit < filtered.length ? String(offset + limit) : undefined,
          };
        }),
      get: (id) =>
        call("read", (s) => {
          for (const run of allRuns(s)) {
            const event = run.events.find((e) => e.id === id);
            if (event) return event;
          }
          throw new ServiceError("not_found", `Event ${id} was not found.`);
        }),
    },

    objects: {
      list: (sourceId) =>
        call("read", (s) => {
          requireSource(s, sourceId);
          return activeRun(s, sourceId)?.objects ?? [];
        }),
      get: (id) => call("read", (s) => findObject(s, id).object),
      transitions: (objectId) =>
        call("read", (s) =>
          findObject(s, objectId).run.transitions.filter((t) => t.objectId === objectId),
        ),
      intervals: (objectId) =>
        call("read", (s) =>
          findObject(s, objectId).run.intervals.filter((i) => i.objectId === objectId),
        ),
      setLabel: (id, input) =>
        call("write", (s) => {
          const { run, object } = findObject(s, id);
          const parsed = objectLabelSchema.safeParse({ slug: input.slug ?? "" });
          if (!parsed.success) invalid(parsed.error.issues);
          const slug = parsed.data.slug || undefined;
          if (slug && run.objects.some((o) => o.id !== id && o.slug === slug)) {
            invalid([
              { path: ["slug"], message: "Another object in this run already uses this name." },
            ]);
          }
          const photoUrl = input.photoUrl || undefined;
          if (photoUrl && !photoUrl.startsWith("/demo/") && !photoUrl.startsWith("data:image/")) {
            invalid([{ path: ["photo"], message: "Use an uploaded image." }]);
          }
          if (photoUrl && photoUrl.length > 400_000) {
            invalid([
              { path: ["photo"], message: "The photo is too large. Use an image under 300 KB." },
            ]);
          }
          s.labels[id] = { slug, photoUrl };
          return { ...object, slug, photoUrl };
        }),
    },

    questions: {
      ask: (request) =>
        call("write", (s, now) => {
          const parsed = questionSchema.safeParse({ question: request.question });
          if (!parsed.success) invalid(parsed.error.issues);
          requireSource(s, request.sourceId);
          const run = activeRun(s, request.sourceId);
          const iso = new Date(now).toISOString();
          const id = nextId(s, "q");
          const base = {
            id,
            sourceId: request.sourceId,
            runId: run?.runId,
            question: parsed.data.question,
            createdAt: iso,
            context: { timeRange: request.timeRange, objectIds: request.objectIds ?? [] },
          };
          const result = run
            ? (() => {
                const qa = answerQuestion({
                  question: parsed.data.question,
                  sourceId: request.sourceId,
                  objects: run.objects,
                  transitions: run.transitions,
                  intervals: run.intervals,
                  contextObjectIds: request.objectIds,
                  timeRange: request.timeRange,
                });
                const retrievalMs = +(2.6 + Math.random() * 2.2).toFixed(1);
                return {
                  ...base,
                  answer: qa.answer,
                  answerKind: qa.answerKind,
                  status: qa.status,
                  completedAt: new Date(now + retrievalMs).toISOString(),
                  resolvedObjectId: qa.resolvedObjectId,
                  currentPlace: qa.currentPlace,
                  previousPlace: qa.previousPlace,
                  answeredWithoutPayload: qa.answeredWithoutPayload,
                  evidence: qa.evidence,
                  confidence: qa.confidence,
                  limitations: qa.limitations,
                  retrievalMs,
                };
              })()
            : {
                ...base,
                answer:
                  "This source has no processed history yet. Process a recording or connect the source first.",
                answerKind: "insufficient_evidence" as const,
                status: "insufficient_evidence" as const,
                completedAt: iso,
                evidence: [],
                limitations: ["No stored history for this source."],
              };
          s.questions.push(result);
          return result;
        }),
      list: (sourceId) =>
        call("read", (s) =>
          s.questions
            .filter((q) => q.sourceId === sourceId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      get: (id) =>
        call("read", (s) => {
          const q = s.questions.find((x) => x.id === id);
          if (!q) throw new ServiceError("not_found", `Question ${id} was not found.`);
          return q;
        }),
    },

    evidence: {
      get: (id) =>
        call("read", (s) => {
          const report = s.evidenceReports.find((r) => r.id === id);
          if (!report) throw new ServiceError("not_found", `Evidence report ${id} was not found.`);
          return report;
        }),
      createFromQuestion: (questionId) =>
        call("write", (s, now) => {
          const q = s.questions.find((x) => x.id === questionId);
          if (!q) throw new ServiceError("not_found", `Question ${questionId} was not found.`);
          const run = runFor(s, q.runId);
          const events =
            run && q.resolvedObjectId
              ? run.events.filter((e) => e.objectIds.includes(q.resolvedObjectId!))
              : [];
          const seen = new Set(q.evidence.map((e) => e.id));
          const report: EvidenceReport = {
            id: nextId(s, "evr"),
            sourceId: q.sourceId,
            title: `Evidence for “${q.question}”`,
            subject: { kind: "question", id: q.id },
            summary: q.answer ?? "No answer was produced.",
            generatedSummary: false,
            createdAt: new Date(now).toISOString(),
            evidence: [
              ...q.evidence,
              ...events.map(eventRef).filter((e) => !seen.has(e.id)),
              ...cropRefs(events).filter((e) => !seen.has(e.id)),
            ],
            limitations: q.limitations,
          };
          s.evidenceReports.push(report);
          return report;
        }),
      createFromObject: (objectId) =>
        call("write", (s, now) => {
          const { run, object } = findObject(s, objectId);
          const events = run.events.filter((e) => e.objectIds.includes(objectId));
          const transitions = run.transitions.filter((t) => t.objectId === objectId);
          const intervals = run.intervals.filter((i) => i.objectId === objectId);
          const report: EvidenceReport = {
            id: nextId(s, "evr"),
            sourceId: run.sourceId,
            title: `Evidence report: ${displayName(object)}`,
            subject: { kind: "object", id: objectId },
            summary: `${displayName(object)} (${object.label}) was seen ${object.sightingCount} times between ${formatDateTime(object.firstSeenAt!, "utc")} and ${formatDateTime(object.lastSeenAt!, "utc")}. ${transitions.length} confirmed place change${transitions.length === 1 ? "" : "s"}; last seen at ${object.lastKnownLocation?.support ?? "an unknown place"}.`,
            generatedSummary: false,
            createdAt: new Date(now).toISOString(),
            evidence: [
              ...transitions.map((t) => ({
                id: t.id,
                kind: "transition" as const,
                label: `Transition ${t.previousSupport} → ${t.newSupport} (cause ${t.cause})`,
                sourceId: run.sourceId,
                occurredAt: t.confirmedAt,
                href: `/app/operations/objects/${objectId}#${t.id}`,
                excerpt: `Association ${t.associationScore.toFixed(3)} (uncalibrated).`,
                available: true,
              })),
              ...intervals.map((i) => ({
                id: i.id,
                kind: "memory" as const,
                label: `Interval at ${i.support}: ${i.sightingCount} sightings${i.open ? " (open)" : ""}`,
                sourceId: run.sourceId,
                occurredAt: i.lastSeenAt,
                href: `/app/operations/memory/${i.id}`,
                available: true,
              })),
              ...events.map(eventRef),
              ...cropRefs(events),
            ],
            limitations: [
              "Association scores are uncalibrated similarities.",
              "Causes of moves are unknown unless an observation supports them.",
            ],
          };
          s.evidenceReports.push(report);
          return report;
        }),
    },

    memory: {
      list: (query) =>
        call("read", (s) => {
          requireSource(s, query.sourceId);
          const run = activeRun(s, query.sourceId);
          if (!run) return [];
          const search = query.search?.trim().toLowerCase();
          return memoryRecords(run)
            .filter((r) => !query.types?.length || query.types.includes(r.type))
            .filter((r) => !query.residency?.length || query.residency.includes(r.residencyState))
            .filter((r) => !query.objectId || r.relatedObjectIds.includes(query.objectId))
            .filter(
              (r) =>
                !search ||
                r.summary.toLowerCase().includes(search) ||
                r.id.toLowerCase().includes(search),
            );
        }),
      get: (id) =>
        call("read", (s) => {
          for (const run of allRuns(s)) {
            const record = memoryRecords(run).find((r) => r.id === id);
            if (record) return record;
          }
          throw new ServiceError("not_found", `Memory record ${id} was not found.`);
        }),
      history: (id) =>
        call("read", (s) => {
          for (const run of allRuns(s)) {
            if (memoryRecords(run).some((r) => r.id === id)) {
              return run.ledger.filter((e) => e.memoryId === id);
            }
          }
          throw new ServiceError("not_found", `Memory record ${id} was not found.`);
        }),
    },

    runtime: {
      snapshot: (sourceId) =>
        call("read", (s) => {
          const src = requireSource(s, sourceId);
          requireCapability(src, "telemetry", "runtime telemetry");
          const run = requireRun(s, sourceId);
          const residency = deriveResidency({
            ledger: run.ledger,
            payloads: run.payloads,
            objects: run.objects,
            intervals: run.intervals,
            perceptionFloorBytes: run.perceptionFloorBytes,
            anchorBytesPerObject: run.anchorBytesPerObject,
          });
          return {
            sourceId,
            runId: run.runId,
            measuredAt: run.series.at(-1)?.measuredAt ?? run.ledger.at(-1)!.occurredAt,
            origin: run.origin,
            live: false,
            ramBudgetBytes: run.ramBudgetBytes,
            residentPayloadBytes: residency.residentPayloadBytes,
            perceptionFloorBytes: run.perceptionFloorBytes,
            processRssBytes: run.processRssBytes,
            diskPayloadBytes: run.payloads.reduce((sum, p) => sum + p.storageBytes, 0),
            databaseBytes: run.databaseBytes,
            evidenceBytes: run.evidenceBytes,
            floorCrossings: 0,
            kept: residency.kept,
            released: residency.released,
            folded: residency.folded,
            series: run.series,
          };
        }),
      ledger: (query) =>
        call("read", (s) => {
          requireSource(s, query.sourceId);
          const run = query.runId ? runFor(s, query.runId) : activeRun(s, query.sourceId);
          if (!run || run.sourceId !== query.sourceId) return [];
          return run.ledger
            .filter((e) => !query.categories?.length || query.categories.includes(e.category))
            .filter((e) => !query.eventTypes?.length || query.eventTypes.includes(e.eventType))
            .filter((e) => !query.objectId || e.objectId === query.objectId)
            .filter((e) => !query.from || e.occurredAt >= query.from)
            .filter((e) => !query.to || e.occurredAt <= query.to);
        }),
      series: (sourceId, runId) =>
        call("read", (s) => {
          requireSource(s, sourceId);
          const run = runId ? runFor(s, runId) : activeRun(s, sourceId);
          return run && run.sourceId === sourceId ? run.series : [];
        }),
    },

    tasks: {
      list: (query) =>
        call("read", (s) => {
          const search = query.search?.trim().toLowerCase();
          return s.tasks
            .filter((t) => !query.sourceId || t.sourceId === query.sourceId)
            .filter((t) => !query.status?.length || query.status.includes(t.status))
            .filter((t) => !search || t.command.toLowerCase().includes(search))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map(stripPlan);
        }),
      get: (id) =>
        call("read", (s) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task) throw new ServiceError("not_found", `Task ${id} was not found.`);
          return stripPlan(task);
        }),
      jog: (request) =>
        call("write", (s, now) => {
          const src = requireSource(s, request.sourceId);
          requireCapability(src, "driveControl", "drive control");
          requireOnline(src);
          const plan: TaskPlanLike = {
            runAt: now + 300,
            doneAt: now + 1_500,
            final: "succeeded",
            summary: jogResult[request.direction],
          };
          const task = addTask(s, {
            ...taskBase(src, now, request.command),
            type: "jog",
            status: "accepted",
            jog: request.direction,
            history: [{ status: "accepted", at: new Date(now).toISOString() }],
            plan,
          });
          return stripPlan(task);
        }),
      navigate: (request) =>
        call("write", (s, now) => {
          if (request.confirmation !== true) {
            invalid([{ path: ["confirmation"], message: "Navigation must be confirmed." }]);
          }
          const src = requireSource(s, request.sourceId);
          requireCapability(src, "navigation", "navigation");
          requireOnline(src);
          const run = requireRun(s, request.sourceId);
          let target = request.target;
          let summary: string;
          if (request.reason === "navigate_to_waypoint") {
            const wp = run.map?.waypoints.find((w) => w.id === request.target.waypointId);
            if (!wp) invalid([{ path: ["target"], message: "Unknown waypoint." }]);
            target = {
              waypointId: wp.id,
              label: wp.label,
              x: wp.x,
              y: wp.y,
              frameId: run.map?.frameId,
            };
            summary = `Reached ${wp.label}.`;
          } else {
            const object = run.objects.find((o) => o.id === request.target.objectId);
            const loc = object?.lastKnownLocation;
            if (!object || !loc)
              invalid([{ path: ["target"], message: "No verified location for this object." }]);
            target = {
              objectId: object.id,
              label: `${displayName(object)} at ${loc.support}`,
              x: loc.x,
              y: loc.y,
              frameId: loc.frameId,
              locationObservedAt: loc.observedAt,
            };
            summary = `Arrived near where ${displayName(object)} was last seen (${loc.support}, ${formatDateTime(loc.observedAt, "utc")}). That location is from memory; look again to confirm it is still there.`;
          }
          const pose = run.pose?.at(-1);
          const distance =
            pose && target.x !== undefined && target.y !== undefined
              ? Math.hypot(target.x - pose.x, target.y - pose.y)
              : 3;
          const plan: TaskPlanLike = {
            runAt: now + 800,
            doneAt: now + 800 + Math.round(1_500 + distance * 900),
            final: "succeeded",
            summary,
          };
          const task = addTask(s, {
            ...taskBase(src, now, request.command),
            type:
              request.reason === "navigate_to_waypoint"
                ? "navigate_waypoint"
                : "navigate_last_known",
            status: "accepted",
            target,
            history: [
              { status: "accepted", at: new Date(now).toISOString(), note: "Goal sent to Nav2." },
            ],
            plan,
          });
          return stripPlan(task);
        }),
      logUnsupported: (request) =>
        call("write", (s, now) => {
          const src = requireSource(s, request.sourceId);
          const iso = new Date(now).toISOString();
          const task = addTask(s, {
            ...taskBase(src, now, request.command),
            type: "unsupported",
            status: "rejected",
            history: [{ status: "rejected", at: iso, note: request.reason }],
            errorCode: "unsupported",
            errorMessage: request.reason,
          });
          return stripPlan(task);
        }),
      cancel: (id) =>
        call("write", (s, now) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task) throw new ServiceError("not_found", `Task ${id} was not found.`);
          if (isTerminalTask(task.status))
            throw new ServiceError("conflict", `The task is already ${task.status}.`);
          const iso = new Date(now).toISOString();
          task.status = "cancelled";
          task.completedAt = iso;
          task.history.push({ status: "cancelled", at: iso, note: "Cancelled by operator." });
          delete task.plan;
          return stripPlan(task);
        }),
    },

    experiments: {
      list: (query = {}) =>
        call("read", (s) => {
          const search = query.search?.trim().toLowerCase();
          return s.experiments
            .filter((r) => !query.status?.length || query.status.includes(r.status))
            .filter((r) => !query.policyId || r.config.policyId === query.policyId)
            .filter((r) => !query.workloadId || r.config.workloadId === query.workloadId)
            .filter(
              (r) => !search || r.name.toLowerCase().includes(search) || r.id.includes(search),
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }),
      get: (id) => call("read", (s) => requireExperiment(s, id)),
      create: (input) =>
        call("write", (s, now) => {
          const issues: { path: string[]; message: string }[] = [];
          if (input.name.trim().length < 3)
            issues.push({ path: ["name"], message: "Use at least 3 characters." });
          if (!policyById[input.config.policyId])
            issues.push({ path: ["policyId"], message: "Choose a policy." });
          if (!workloadById[input.config.workloadId])
            issues.push({ path: ["workloadId"], message: "Choose a workload." });
          if (!s.sources.some((x) => x.id === input.config.sourceId))
            issues.push({ path: ["sourceId"], message: "Choose a source." });
          if (!(input.config.ramBudgetBytes > 0))
            issues.push({ path: ["ramBudgetMiB"], message: "Use a positive budget." });
          if (issues.length) invalid(issues);
          const run: ExperimentRun = {
            id: nextId(s, "run"),
            name: input.name.trim(),
            notes: input.notes?.trim() || undefined,
            status: "draft",
            config: input.config,
            createdAt: new Date(now).toISOString(),
            metricsSummary: {},
            partialResults: false,
            softwareVersion: SOFTWARE_VERSION,
            origin: "mock",
          };
          s.experiments.push(run);
          return run;
        }),
      start: (id) =>
        call("write", (s, now) => {
          const run = requireExperiment(s, id);
          if (run.status === "queued" || run.status === "running") {
            throw new ServiceError("conflict", "The run is already in progress.");
          }
          if (run.status === "completed")
            throw new ServiceError(
              "conflict",
              "Completed runs cannot be restarted. Duplicate it instead.",
            );
          Object.assign(run, {
            status: "queued",
            createdAt: run.status === "draft" ? run.createdAt : new Date(now).toISOString(),
            startedAt: undefined,
            completedAt: undefined,
            progress: 0,
            metricsSummary: {},
            failureReason: undefined,
            partialResults: false,
          });
          if (Date.parse(run.createdAt) + 3_000 < now) run.createdAt = new Date(now).toISOString();
          return run;
        }),
      cancel: (id) =>
        call("write", (s, now) => {
          const run = requireExperiment(s, id);
          if (run.status !== "queued" && run.status !== "running") {
            throw new ServiceError("conflict", `The run is ${run.status} and cannot be cancelled.`);
          }
          run.status = "cancelled";
          run.completedAt = new Date(now).toISOString();
          run.partialResults = (run.progress ?? 0) > 0;
          return run;
        }),
      series: (id) =>
        call("read", (s) => {
          const run = requireExperiment(s, id);
          if (!run.startedAt) return [];
          return seriesForRun(
            run.id,
            run.config.policyId,
            run.config.durationSeconds ?? 240,
            run.config.ramBudgetBytes,
            run.startedAt,
            run.progress ?? 0,
          );
        }),
      ledger: (id) =>
        call("read", (s) => {
          const run = requireExperiment(s, id);
          if (!run.startedAt || (run.progress ?? 0) === 0) return [];
          const reloads = run.metricsSummary.reloadCount?.value ?? 0;
          return ledgerForRun(run.id, run.config.policyId, run.startedAt, reloads);
        }),
      manifest: (id) =>
        call("read", (s, now) => {
          const run = requireExperiment(s, id);
          const src = s.sources.find((x) => x.id === run.config.sourceId);
          const unavailableFields = Object.entries(run.metricsSummary)
            .filter(([, v]) => v.value === null)
            .map(([k]) => `metrics.${k}`);
          if (!run.startedAt) unavailableFields.push("timestamps.startedAt");
          if (!run.completedAt) unavailableFields.push("timestamps.completedAt");
          if (!src) unavailableFields.push("source");
          const manifest: RunManifest = {
            runId: run.id,
            name: run.name,
            generatedAt: new Date(now).toISOString(),
            config: run.config,
            policy: policyById[run.config.policyId],
            workload: workloadById[run.config.workloadId],
            source: src ? { id: src.id, name: src.name, kind: src.kind } : undefined,
            softwareVersion: run.softwareVersion,
            status: run.status,
            timestamps: {
              createdAt: run.createdAt,
              startedAt: run.startedAt,
              completedAt: run.completedAt,
            },
            metrics: run.metricsSummary,
            unavailableFields,
            origin: run.origin,
          };
          return manifest;
        }),
    },

    reports: {
      list: () =>
        call("read", (s) => [...s.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      get: (id) =>
        call("read", (s) => {
          const report = s.reports.find((r) => r.id === id);
          if (!report) throw new ServiceError("not_found", `Report ${id} was not found.`);
          return report;
        }),
      create: (input) =>
        call("write", (s, now) => {
          const parsed = reportSchema.safeParse(input);
          if (!parsed.success) invalid(parsed.error.issues);
          const runs = parsed.data.runIds.map((id) => requireExperiment(s, id));
          const alignment = checkAlignment(runs);
          const describe = (values: string[]) => [...new Set(values)].join(", ");
          const report = {
            id: nextId(s, "rep"),
            title: parsed.data.title,
            runIds: parsed.data.runIds,
            status: "queued" as const,
            createdAt: new Date(now).toISOString(),
            methodology: `${runs.length} run${runs.length === 1 ? "" : "s"} using ${describe(
              runs.map((r) => policyById[r.config.policyId]?.name ?? r.config.policyId),
            )} on ${describe(runs.map((r) => r.config.workloadId))}. Metrics follow the definitions in the metric catalogue.`,
            limitations: [
              "Mock data. These values demonstrate the interface and are not experimental results.",
              ...(runs.length >= 2 ? alignment.warnings : []),
            ],
            formats: ["json", "csv", "print"] as ("json" | "csv" | "print")[],
          };
          s.reports.push(report);
          return report;
        }),
    },
  };
}

function requireExperiment(state: MockState, id: string) {
  const run = state.experiments.find((r) => r.id === id);
  if (!run) throw new ServiceError("not_found", `Run ${id} was not found.`);
  return run;
}

export { resetState as resetMockData };
