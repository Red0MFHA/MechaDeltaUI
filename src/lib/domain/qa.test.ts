import { describe, expect, it } from "vitest";

import { buildRun } from "@/lib/services/mock/storyline";

import { answerQuestion, detectIntent } from "./qa";

const run = buildRun({
  sourceId: "src-test",
  runId: "run-test",
  prefix: "t",
  origin: "simulated",
  mediaTitle: "test",
  withSpatial: false,
});
const base = {
  sourceId: "src-test",
  objects: run.objects,
  transitions: run.transitions,
  intervals: run.intervals,
};

describe("detectIntent", () => {
  it.each([
    ["Where was CUP-001 before it reached Table-B?", "previous"],
    ["When did CUP-001 move?", "when"],
    ["Who moved CUP-001?", "cause"],
    ["Did you see who moved it?", "cause"],
    ["Where is CUP-002 now?", "current"],
    ["How many times did CUP-001 move?", "count"],
  ])("%s → %s", (question, intent) => {
    expect(detectIntent(question)).toBe(intent);
  });
});

describe("answerQuestion", () => {
  it("answers the previous place from the transition, without a payload read", () => {
    const out = answerQuestion({
      ...base,
      question: "Where was CUP-001 before it reached Table-B?",
    });
    expect(out.status).toBe("completed");
    expect(out.answerKind).toBe("from_transition");
    expect(out.previousPlace).toBe("Table-A");
    expect(out.currentPlace).toBe("Table-B");
    expect(out.answeredWithoutPayload).toBe(true);
    expect(out.evidence.map((e) => e.kind)).toEqual(["transition", "crop", "memory"]);
    expect(out.evidence.find((e) => e.kind === "crop")?.imageUrl).toMatch(/\.svg$/);
  });

  it("gives observation bounds for when-questions", () => {
    const out = answerQuestion({ ...base, question: "When did CUP-001 move?" });
    expect(out.answer).toContain("10:20:48 UTC");
    expect(out.answer).toContain("10:22:11 UTC");
    expect(out.answer).toContain("not observed");
  });

  it("never invents a cause", () => {
    const out = answerQuestion({ ...base, question: "Who moved CUP-001?" });
    expect(out.answerKind).toBe("cause_unknown");
    expect(out.answer).toContain("cause is unknown");
  });

  it("returns insufficient evidence for history questions without a transition", () => {
    const out = answerQuestion({ ...base, question: "Where was CUP-002 before?" });
    expect(out.status).toBe("insufficient_evidence");
    expect(out.currentPlace).toBe("Table-B");
  });

  it("asks for clarification when the object is ambiguous", () => {
    const out = answerQuestion({ ...base, question: "Where was the cup before?" });
    expect(out.status).toBe("insufficient_evidence");
    expect(out.answer).toContain("More than one object");
  });

  it("uses the context filter when exactly one object is selected", () => {
    const cup1 = run.objects.find((o) => o.systemId === "CUP-001")!;
    const out = answerQuestion({
      ...base,
      question: "Where was it before?",
      contextObjectIds: [cup1.id],
    });
    expect(out.previousPlace).toBe("Table-A");
  });

  it("respects the time range", () => {
    const out = answerQuestion({
      ...base,
      question: "Where was CUP-001 before?",
      timeRange: { to: "2026-10-08T10:21:00.000Z" },
    });
    expect(out.status).toBe("insufficient_evidence");
  });
});
