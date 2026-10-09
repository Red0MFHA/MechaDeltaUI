import { SOFTWARE_VERSION } from "@/lib/contracts/catalog";
import type {
  ExperimentRun,
  MemoryLedgerEvent,
  MetricSample,
  MetricValue,
  ResearchReport,
} from "@/lib/contracts/types";

const BUDGET = 2_457_600;
const day = (d: number, h = 9, m = 0) => new Date(Date.UTC(2026, 9, d, h, m, 0)).toISOString();

type Metrics = Record<string, number | null>;

const m = (values: Metrics, samples: Record<string, number> = {}): Record<string, MetricValue> => {
  const units: Record<string, string> = {
    historyAccuracy: "ratio",
    peakResidentBytes: "bytes",
    avgResidentBytes: "bytes",
    diskBytes: "bytes",
    answerLatencyMs: "ms",
    reloadLatencyMs: "ms",
    reloadCount: "count",
    falseGoneRate: "ratio",
    staleAnswerRate: "ratio",
    floorCrossings: "count",
  };
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      {
        value,
        unit: units[key] ?? "",
        sampleCount: samples[key] ?? (key.endsWith("Rate") || key === "historyAccuracy" ? 10 : 48),
      },
    ]),
  );
};

function run(
  id: string,
  name: string,
  policyId: string,
  workloadId: string,
  ramBudgetBytes: number,
  createdAt: string,
  metrics: Metrics,
  extra: Partial<ExperimentRun> = {},
): ExperimentRun {
  const created = Date.parse(createdAt);
  return {
    id,
    name,
    status: "completed",
    config: {
      policyId,
      policyVersion: policyId === "proposed" ? "0.1" : "1",
      workloadId,
      sourceId: "src-sim-01",
      ramBudgetBytes,
      durationSeconds: workloadId === "wl-lab-patrol-b" ? 600 : 240,
      workloadSize: workloadId === "wl-lab-patrol-b" ? 20 : 10,
      parameters:
        policyId === "proposed" ? { visibilityGate: true, minVotes: 3, minDwellSeconds: 0.6 } : {},
    },
    createdAt,
    startedAt: new Date(created + 30_000).toISOString(),
    completedAt: new Date(created + 300_000).toISOString(),
    progress: 100,
    metricsSummary: m(metrics),
    partialResults: false,
    softwareVersion: SOFTWARE_VERSION,
    origin: "mock",
    ...extra,
  };
}

export function seedExperiments(now: number): ExperimentRun[] {
  const runs: ExperimentRun[] = [
    run("run-0101", "Proposed policy, patrol A", "proposed", "wl-lab-patrol-a", BUDGET, day(6, 9), {
      historyAccuracy: 0.9,
      peakResidentBytes: 2_457_600,
      avgResidentBytes: 1_105_920,
      diskBytes: 4_223_249,
      answerLatencyMs: 4.1,
      reloadLatencyMs: 40.2,
      reloadCount: 2,
      falseGoneRate: 0,
      staleAnswerRate: 0,
      floorCrossings: 0,
    }),
    run(
      "run-0102",
      "Current map only, patrol A",
      "current-map",
      "wl-lab-patrol-a",
      BUDGET,
      day(6, 10),
      {
        historyAccuracy: 0.3,
        peakResidentBytes: 0,
        avgResidentBytes: 0,
        diskBytes: 262_144,
        answerLatencyMs: 1.2,
        reloadLatencyMs: null,
        reloadCount: 0,
        falseGoneRate: 0.25,
        staleAnswerRate: null,
        floorCrossings: 0,
      },
    ),
    run("run-0103", "Keep all, patrol A", "keep-all", "wl-lab-patrol-a", BUDGET, day(6, 11), {
      historyAccuracy: 0.9,
      peakResidentBytes: 4_669_440,
      avgResidentBytes: 3_604_480,
      diskBytes: 4_223_249,
      answerLatencyMs: 3.9,
      reloadLatencyMs: null,
      reloadCount: 0,
      falseGoneRate: 0,
      staleAnswerRate: 0,
      floorCrossings: 3,
    }),
    run(
      "run-0104",
      "Largest-first, patrol A",
      "largest-first",
      "wl-lab-patrol-a",
      BUDGET,
      day(6, 12),
      {
        historyAccuracy: 0.8,
        peakResidentBytes: 2_457_600,
        avgResidentBytes: 1_290_240,
        diskBytes: 4_223_249,
        answerLatencyMs: 18.6,
        reloadLatencyMs: 41,
        reloadCount: 4,
        falseGoneRate: 0,
        staleAnswerRate: 0.1,
        floorCrossings: 0,
      },
    ),
    run("run-0105", "LRU, patrol A", "lru", "wl-lab-patrol-a", BUDGET, day(6, 13), {
      historyAccuracy: 0.8,
      peakResidentBytes: 2_457_600,
      avgResidentBytes: 1_228_800,
      diskBytes: 4_223_249,
      answerLatencyMs: 15.2,
      reloadLatencyMs: 39.8,
      reloadCount: 3,
      falseGoneRate: 0,
      staleAnswerRate: 0.1,
      floorCrossings: 0,
    }),
    run(
      "run-0106",
      "Relevance per byte, patrol A",
      "relevance-per-byte",
      "wl-lab-patrol-a",
      BUDGET,
      day(6, 14),
      {
        historyAccuracy: 0.9,
        peakResidentBytes: 2_457_600,
        avgResidentBytes: 1_167_360,
        diskBytes: 4_223_249,
        answerLatencyMs: 9.8,
        reloadLatencyMs: 40.5,
        reloadCount: 2,
        falseGoneRate: 0,
        staleAnswerRate: 0.1,
        floorCrossings: 0,
      },
    ),
    run(
      "run-0107",
      "LRU, patrol A, 8 MiB budget",
      "lru",
      "wl-lab-patrol-a",
      8 * 1024 * 1024,
      day(7, 9),
      {
        historyAccuracy: 0.9,
        peakResidentBytes: 4_669_440,
        avgResidentBytes: 3_604_480,
        diskBytes: 4_223_249,
        answerLatencyMs: 4,
        reloadLatencyMs: null,
        reloadCount: 0,
        falseGoneRate: 0,
        staleAnswerRate: 0,
        floorCrossings: 0,
      },
    ),
    run(
      "run-0108",
      "Keep all, patrol B",
      "keep-all",
      "wl-lab-patrol-b",
      BUDGET,
      day(7, 15),
      {
        historyAccuracy: null,
        peakResidentBytes: 7_127_040,
        avgResidentBytes: 5_324_800,
        diskBytes: 7_864_320,
        answerLatencyMs: null,
        reloadLatencyMs: null,
        reloadCount: 0,
        falseGoneRate: null,
        staleAnswerRate: null,
        floorCrossings: 1,
      },
      {
        status: "failed",
        progress: 53,
        completedAt: day(7, 15, 4),
        failureReason: "Stopped at 00:05:12: resident payloads crossed the perception floor.",
        partialResults: true,
      },
    ),
    {
      id: "run-0110",
      name: "Proposed policy, patrol B",
      status: "running",
      config: {
        policyId: "proposed",
        policyVersion: "0.1",
        workloadId: "wl-lab-patrol-b",
        sourceId: "src-sim-01",
        ramBudgetBytes: BUDGET,
        durationSeconds: 600,
        workloadSize: 20,
        parameters: { visibilityGate: true, minVotes: 3, minDwellSeconds: 0.6 },
      },
      createdAt: new Date(now - 60_000).toISOString(),
      startedAt: new Date(now - 45_000).toISOString(),
      progress: 0,
      metricsSummary: {},
      partialResults: false,
      softwareVersion: SOFTWARE_VERSION,
      origin: "mock",
    },
    {
      id: "run-0111",
      name: "Relevance per byte, patrol B (draft)",
      status: "draft",
      config: {
        policyId: "relevance-per-byte",
        policyVersion: "1",
        workloadId: "wl-lab-patrol-b",
        sourceId: "src-sim-01",
        ramBudgetBytes: BUDGET,
        durationSeconds: 600,
        workloadSize: 20,
        parameters: {},
      },
      createdAt: day(8, 8),
      metricsSummary: {},
      partialResults: false,
      softwareVersion: SOFTWARE_VERSION,
      origin: "mock",
      notes: "Waiting for patrol B labels to be finalised.",
    },
  ];
  return runs;
}

/** Mock run duration used to advance queued and running runs. */
export const RUN_DURATION_MS = 90_000;

export function metricsForPolicy(policyId: string, budget: number): Record<string, MetricValue> {
  const tight = budget < 4_669_440;
  const table: Record<string, Metrics> = {
    proposed: {
      historyAccuracy: 0.9,
      peakResidentBytes: Math.min(budget, 2_457_600),
      avgResidentBytes: 1_120_000,
      diskBytes: 4_310_000,
      answerLatencyMs: 4.4,
      reloadLatencyMs: 40.6,
      reloadCount: 2,
      falseGoneRate: 0,
      staleAnswerRate: 0,
      floorCrossings: 0,
    },
    "current-map": {
      historyAccuracy: 0.3,
      peakResidentBytes: 0,
      avgResidentBytes: 0,
      diskBytes: 262_144,
      answerLatencyMs: 1.3,
      reloadLatencyMs: null,
      reloadCount: 0,
      falseGoneRate: 0.25,
      staleAnswerRate: null,
      floorCrossings: 0,
    },
    "keep-all": {
      historyAccuracy: 0.9,
      peakResidentBytes: 4_669_440,
      avgResidentBytes: 3_604_480,
      diskBytes: 4_310_000,
      answerLatencyMs: 3.9,
      reloadLatencyMs: null,
      reloadCount: 0,
      falseGoneRate: 0,
      staleAnswerRate: 0,
      floorCrossings: tight ? 3 : 0,
    },
    "largest-first": {
      historyAccuracy: 0.8,
      peakResidentBytes: Math.min(budget, 2_457_600),
      avgResidentBytes: 1_300_000,
      diskBytes: 4_310_000,
      answerLatencyMs: 18.1,
      reloadLatencyMs: 41.2,
      reloadCount: 4,
      falseGoneRate: 0,
      staleAnswerRate: 0.1,
      floorCrossings: 0,
    },
    lru: {
      historyAccuracy: 0.8,
      peakResidentBytes: Math.min(budget, 2_457_600),
      avgResidentBytes: 1_240_000,
      diskBytes: 4_310_000,
      answerLatencyMs: 15.4,
      reloadLatencyMs: 39.9,
      reloadCount: 3,
      falseGoneRate: 0,
      staleAnswerRate: 0.1,
      floorCrossings: 0,
    },
    "relevance-per-byte": {
      historyAccuracy: 0.9,
      peakResidentBytes: Math.min(budget, 2_457_600),
      avgResidentBytes: 1_180_000,
      diskBytes: 4_310_000,
      answerLatencyMs: 9.6,
      reloadLatencyMs: 40.4,
      reloadCount: 2,
      falseGoneRate: 0,
      staleAnswerRate: 0.1,
      floorCrossings: 0,
    },
  };
  return m(table[policyId] ?? table.lru);
}

function residentPattern(policyId: string, f: number, budget: number) {
  if (policyId === "current-map") return 0;
  if (policyId === "keep-all")
    return f < 0.2 ? 2_457_600 * (f / 0.2) : f < 0.6 ? 2_457_600 : 4_669_440;
  const cap = Math.min(budget, 2_457_600);
  if (f < 0.6) return 0;
  const phase = Math.floor((f - 0.6) / 0.08);
  const swap =
    policyId === "proposed" || policyId === "relevance-per-byte"
      ? phase % 3 !== 1
      : phase % 2 === 0;
  return swap ? cap : 2_211_840;
}

export function seriesForRun(
  runId: string,
  policyId: string,
  durationSeconds: number,
  budget: number,
  startIso: string,
  progress = 100,
): MetricSample[] {
  const start = Date.parse(startIso);
  const samples: MetricSample[] = [];
  const steps = 48;
  const lastStep = Math.floor((steps * progress) / 100);
  for (let i = 0; i <= lastStep; i += 1) {
    const f = i / steps;
    const measuredAt = new Date(start + f * durationSeconds * 1000).toISOString();
    const gap = runId === "run-0105" && i >= 20 && i <= 22;
    samples.push({
      metric: "resident_payload_bytes",
      value: gap ? null : Math.round(residentPattern(policyId, f, budget)),
      unit: "bytes",
      measuredAt,
      runId,
      policyId,
      scope: "engine",
    });
    samples.push({
      metric: "disk_bytes",
      value: gap ? null : Math.round(262_144 + f * 4_000_000),
      unit: "bytes",
      measuredAt,
      runId,
      policyId,
      scope: "engine",
    });
  }
  return samples;
}

export function ledgerForRun(
  runId: string,
  policyId: string,
  startIso: string,
  reloads: number,
): MemoryLedgerEvent[] {
  const start = Date.parse(startIso);
  const events: MemoryLedgerEvent[] = [];
  let seq = 0;
  const push = (
    offsetS: number,
    eventType: MemoryLedgerEvent["eventType"],
    memoryId: string,
    extra: Partial<MemoryLedgerEvent> = {},
  ) => {
    seq += 1;
    events.push({
      id: `${runId}-led-${seq}`,
      sequence: seq,
      sourceId: "src-sim-01",
      runId,
      memoryId,
      category: eventType === "retrieved" ? "retrieval" : "memory",
      eventType,
      occurredAt: new Date(start + offsetS * 1000).toISOString(),
      details: { policy: policyId },
      ...extra,
    });
  };
  push(12, "created", "anchor-CUP-001");
  push(20, "created", "anchor-CUP-002");
  push(40, "created", "payload-CUP-001", { storageBytes: 1_310_722 });
  push(48, "consolidated", "interval-CUP-001-a", {
    details: { policy: policyId, sightingsFolded: 36 },
  });
  if (policyId !== "current-map") push(133, "created", "transition-CUP-001-1");
  push(135, "created", "payload-CUP-002", { storageBytes: 1_180_431 });
  if (policyId !== "current-map") {
    push(150, "loaded", "payload-CUP-001", {
      ramBytes: 2_457_600,
      durationMs: 41.3,
      hashVerified: true,
    });
    push(152, "retrieved", "transition-CUP-001-1", {
      durationMs: 3.4,
      details: { policy: policyId, payloadRead: false },
    });
    for (let i = 0; i < reloads; i += 1) {
      const target = i % 2 === 0 ? "payload-CUP-002" : "payload-CUP-001";
      const other = i % 2 === 0 ? "payload-CUP-001" : "payload-CUP-002";
      if (policyId !== "keep-all")
        push(160 + i * 15, "evicted", other, {
          ramBytes: other.endsWith("001") ? 2_457_600 : 2_211_840,
          hashVerified: true,
        });
      push(160.05 + i * 15, "reloaded", target, {
        ramBytes: target.endsWith("001") ? 2_457_600 : 2_211_840,
        durationMs: 39 + i,
        hashVerified: true,
      });
    }
  }
  return events;
}

export function seedReports(): ResearchReport[] {
  return [
    {
      id: "rep-0001",
      title: "Patrol A: proposed policy against five baselines (mock)",
      runIds: ["run-0101", "run-0102", "run-0103", "run-0104", "run-0105", "run-0106"],
      status: "completed",
      createdAt: day(7, 10),
      completedAt: day(7, 10, 1),
      methodology:
        "Each policy replayed workload wl-lab-patrol-a at a 2,457,600-byte payload budget on the same source. History accuracy is exact match over ten labelled questions (protocol v0, draft).",
      limitations: [
        "Mock data. These values demonstrate the interface and are not experimental results.",
        "Ten questions per run; differences of one answer change accuracy by 10 percentage points.",
        "Payload budget controls decoded payload arrays only, not total process memory.",
      ],
      formats: ["json", "csv", "print"],
    },
  ];
}
