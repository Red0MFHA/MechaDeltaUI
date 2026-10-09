import { beforeEach, describe, expect, it } from "vitest";

import { isServiceError } from "@/lib/contracts/errors";

import { createMockServices, resetMockData } from ".";
import { setScenario } from "./scenario";

const services = createMockServices();

async function errorOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (isServiceError(error)) return error;
    throw error;
  }
  throw new Error("Expected the call to fail.");
}

describe("mock services", { timeout: 20_000 }, () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetMockData();
    setScenario("normal");
  });

  it("seeds three sources with capability sets per kind", async () => {
    const sources = await services.sources.list();
    expect(sources.map((s) => s.id)).toEqual(["src-sim-01", "src-rec-01", "src-bot-01"]);
    expect(sources.find((s) => s.id === "src-rec-01")?.capabilities.driveControl).toBe(false);
  });

  it("answers history questions from stored transitions", async () => {
    const result = await services.questions.ask({
      sourceId: "src-sim-01",
      question: "Where was my-mug before it reached Table-B?",
    });
    expect(result.previousPlace).toBe("Table-A");
    expect(result.answeredWithoutPayload).toBe(true);
    const listed = await services.questions.list("src-sim-01");
    expect(listed[0].id).toBe(result.id);
  });

  it("rejects drive control on a recording and on an offline robot", async () => {
    const unsupported = await errorOf(
      services.tasks.jog({ sourceId: "src-rec-01", direction: "forward", command: "move forward" }),
    );
    expect(unsupported.code).toBe("unsupported");
    expect(unsupported.capability).toBe("driveControl");

    const offline = await errorOf(
      services.tasks.jog({ sourceId: "src-bot-01", direction: "forward", command: "move forward" }),
    );
    expect(offline.code).toBe("disconnected");
  });

  it("navigates to the last known location of an object", async () => {
    const task = await services.tasks.navigate({
      sourceId: "src-sim-01",
      target: { objectId: "sim-cup-001" },
      reason: "navigate_to_last_known_object_location",
      command: "go to where you last saw my mug",
      confirmation: true,
    });
    expect(task.status).toBe("accepted");
    expect(task.target?.label).toContain("Table-B");
    expect(task.target?.locationObservedAt).toBeDefined();
  });

  it("validates registration and masks secrets", async () => {
    const bad = await errorOf(
      services.sources.register({
        name: "Bot",
        kind: "physical_robot",
        config: { rosbridgeUrl: "http://x" },
      }),
    );
    expect(bad.code).toBe("validation_error");
    expect(bad.fieldErrors?.rosbridgeUrl).toBeDefined();

    const created = await services.sources.register({
      name: "Second bot",
      kind: "physical_robot",
      config: { rosbridgeUrl: "ws://robot:9090", apiToken: "super-secret" },
    });
    expect(JSON.stringify(created)).not.toContain("super-secret");
    expect(created.connectionState).toBe("offline");
  });

  it("enforces unique slugs within a run", async () => {
    const conflict = await errorOf(services.objects.setLabel("sim-cup-002", { slug: "my-mug" }));
    expect(conflict.code).toBe("validation_error");
    const renamed = await services.objects.setLabel("sim-cup-002", { slug: "blue-cup" });
    expect(renamed.slug).toBe("blue-cup");
    expect((await services.objects.get("sim-cup-002")).slug).toBe("blue-cup");
  });

  it("returns not_found for unknown ids", async () => {
    expect((await errorOf(services.objects.get("other-user-object"))).code).toBe("not_found");
    expect((await errorOf(services.experiments.get("run-9999"))).code).toBe("not_found");
  });

  it("reports runtime kept, released, and folded lists", async () => {
    const snapshot = await services.runtime.snapshot("src-sim-01");
    expect(snapshot.residentPayloadBytes).toBe(2_457_600);
    expect(snapshot.diskPayloadBytes).toBe(2_491_153);
    expect(snapshot.released).toHaveLength(2);
    expect(snapshot.folded).toHaveLength(3);
  });

  it("applies the offline and failing scenarios", async () => {
    setScenario("offline");
    expect((await errorOf(services.sources.list())).code).toBe("unavailable");
    setScenario("failing");
    await expect(services.sources.list()).resolves.toHaveLength(3);
    expect((await errorOf(services.sources.update("src-sim-01", { name: "Renamed" }))).code).toBe(
      "failed",
    );
  });

  it("starts the empty scenario with no data", async () => {
    setScenario("empty");
    expect(await services.sources.list()).toEqual([]);
    expect(await services.experiments.list()).toEqual([]);
  });
});
