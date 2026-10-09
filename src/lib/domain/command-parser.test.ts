import { describe, expect, it } from "vitest";

import { buildRun } from "@/lib/services/mock/storyline";

import { parseCommand } from "./command-parser";

const run = buildRun({
  sourceId: "src-test",
  runId: "run-test",
  prefix: "t",
  origin: "simulated",
  mediaTitle: "test",
  withSpatial: true,
});
const objects = run.objects.map((o) => (o.systemId === "CUP-001" ? { ...o, slug: "my-mug" } : o));
const context = { waypoints: run.map!.waypoints, objects };

describe("parseCommand", () => {
  it("parses jog commands", () => {
    expect(parseCommand("move forward", context)).toMatchObject({
      kind: "jog",
      direction: "forward",
    });
    expect(parseCommand("Look down please", context)).toMatchObject({
      kind: "jog",
      direction: "look_down",
    });
    expect(parseCommand("turn left", context)).toMatchObject({
      kind: "jog",
      direction: "turn_left",
    });
  });

  it("parses stop", () => {
    expect(parseCommand("stop", context)).toMatchObject({ kind: "stop" });
  });

  it("resolves waypoints by label", () => {
    const parsed = parseCommand("go to Table-B", context);
    expect(parsed).toMatchObject({ kind: "navigate_waypoint", waypoint: { id: "wp-table-b" } });
    expect(parseCommand("go to room b", context)).toMatchObject({ kind: "navigate_waypoint" });
  });

  it("rejects unknown waypoints and lists the known ones", () => {
    const parsed = parseCommand("go to the kitchen", context);
    expect(parsed).toMatchObject({ kind: "unsupported", reason: "unknown_waypoint" });
    if (parsed.kind === "unsupported") expect(parsed.message).toContain("Table-A");
  });

  it("navigates to where an object was last seen by slug", () => {
    const parsed = parseCommand("go to where you last saw my mug", context);
    expect(parsed.kind).toBe("navigate_last_known");
    if (parsed.kind === "navigate_last_known") {
      expect(parsed.object.systemId).toBe("CUP-001");
      expect(parsed.display).toContain("Table-B");
    }
  });

  it("navigates to an object by system id", () => {
    expect(parseCommand("go to where you last saw cup-002", context)).toMatchObject({
      kind: "navigate_last_known",
      object: { systemId: "CUP-002" },
    });
  });

  it("reports ambiguity instead of guessing", () => {
    expect(parseCommand("go to where you last saw the cup", context)).toMatchObject({
      kind: "unsupported",
      reason: "ambiguous_object",
    });
  });

  it("rejects manipulation before anything else", () => {
    expect(
      parseCommand("pick the plates from kitchen and set them on table C", context),
    ).toMatchObject({
      kind: "unsupported",
      reason: "manipulation",
    });
    expect(parseCommand("bring my mug to Table-A", context)).toMatchObject({
      reason: "manipulation",
    });
  });

  it("rejects unrecognised text", () => {
    expect(parseCommand("sing a song", context)).toMatchObject({
      kind: "unsupported",
      reason: "unrecognized",
    });
    expect(parseCommand("   ", context)).toMatchObject({
      kind: "unsupported",
      reason: "unrecognized",
    });
  });
});
