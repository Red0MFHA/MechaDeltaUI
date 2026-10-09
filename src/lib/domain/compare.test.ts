import { describe, expect, it } from "vitest";

import { seedExperiments } from "@/lib/services/mock/research";

import { checkAlignment, relativeChange } from "./compare";

const runs = seedExperiments(Date.parse("2026-10-09T12:00:00Z"));
const byId = (id: string) => runs.find((r) => r.id === id)!;

describe("checkAlignment", () => {
  it("accepts runs with the same workload, budget, and source", () => {
    const result = checkAlignment([byId("run-0101"), byId("run-0105")]);
    expect(result).toEqual({ comparable: true, warnings: [] });
  });

  it("warns when budgets differ", () => {
    const result = checkAlignment([byId("run-0101"), byId("run-0107")]);
    expect(result.comparable).toBe(false);
    expect(result.warnings.join(" ")).toMatch(/RAM budgets differ/);
  });

  it("warns about incomplete runs and differing workloads", () => {
    const result = checkAlignment([byId("run-0101"), byId("run-0108")]);
    expect(result.warnings.join(" ")).toMatch(/Workloads differ/);
    expect(result.warnings.join(" ")).toMatch(/not completed/);
  });

  it("needs at least two runs", () => {
    expect(checkAlignment([byId("run-0101")]).comparable).toBe(false);
  });
});

describe("relativeChange", () => {
  const lower = { direction: "lower_is_better" as const };
  it("computes a signed change and direction", () => {
    expect(relativeChange({ value: 10, unit: "ms" }, { value: 5, unit: "ms" }, lower)).toEqual({
      percent: -50,
      better: true,
    });
  });

  it("returns null for zero or missing baselines", () => {
    expect(
      relativeChange({ value: 0, unit: "bytes" }, { value: 5, unit: "bytes" }, lower),
    ).toBeNull();
    expect(relativeChange({ value: null, unit: "ms" }, { value: 5, unit: "ms" }, lower)).toBeNull();
    expect(relativeChange(undefined, { value: 5, unit: "ms" }, lower)).toBeNull();
  });
});
