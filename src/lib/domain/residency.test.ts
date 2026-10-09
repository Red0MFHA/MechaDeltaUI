import { describe, expect, it } from "vitest";

import { buildRun } from "@/lib/services/mock/storyline";

import { deriveResidency } from "./residency";

const run = buildRun({
  sourceId: "src-test",
  runId: "run-test",
  prefix: "t",
  origin: "simulated",
  mediaTitle: "test",
  withSpatial: false,
});

const out = deriveResidency({
  ledger: run.ledger,
  payloads: run.payloads,
  objects: run.objects,
  intervals: run.intervals,
  perceptionFloorBytes: run.perceptionFloorBytes,
  anchorBytesPerObject: run.anchorBytesPerObject,
});

describe("deriveResidency", () => {
  it("replays the A, B, A payload sequence", () => {
    expect(out.payloadState["t-pl-cup1"]).toBe("resident");
    expect(out.payloadState["t-pl-cup2"]).toBe("evicted");
    expect(out.residentPayloadBytes).toBe(2_457_600);
    expect(out.residentPayloadBytes).toBeLessThanOrEqual(run.ramBudgetBytes);
  });

  it("records releases and the reload of CUP-001", () => {
    expect(out.released).toHaveLength(2);
    const first = out.released[0];
    expect(first.memoryId).toBe("t-pl-cup1");
    expect(first.reloadedAt).toBeDefined();
    expect(first.stillOnDisk).toBe(true);
    expect(out.released[1].memoryId).toBe("t-pl-cup2");
    expect(out.released[1].reloadedAt).toBeUndefined();
  });

  it("marks the CUP-001 payload stale because the cup moved", () => {
    expect(out.stalePayloads.has("t-pl-cup1")).toBe(true);
    expect(out.stalePayloads.has("t-pl-cup2")).toBe(false);
    expect(out.kept.find((k) => k.id === "kept-t-pl-cup1")?.note).toMatch(/Stale/);
  });

  it("keeps the perception floor and one anchor per object", () => {
    expect(out.kept.filter((k) => k.kind === "perception_floor")).toHaveLength(1);
    expect(out.kept.filter((k) => k.kind === "anchor")).toHaveLength(run.objects.length);
  });

  it("lists folded intervals with their sighting counts", () => {
    expect(out.folded.map((f) => f.sightingCount).sort((a, b) => a - b)).toEqual([22, 36, 41]);
  });
});
