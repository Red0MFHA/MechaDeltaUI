import type { ExperimentRun, MetricDefinition, MetricValue } from "@/lib/contracts/types";

export interface Alignment {
  comparable: boolean;
  warnings: string[];
}

export function checkAlignment(runs: ExperimentRun[]): Alignment {
  const warnings: string[] = [];
  if (runs.length < 2) {
    return { comparable: false, warnings: ["Select at least two runs to compare."] };
  }
  const distinct = <T>(pick: (r: ExperimentRun) => T) => new Set(runs.map(pick)).size > 1;

  if (distinct((r) => r.config.workloadId)) {
    warnings.push("Workloads differ. Results are not a controlled comparison.");
  }
  if (distinct((r) => r.config.ramBudgetBytes)) {
    warnings.push("RAM budgets differ. Resident-byte and accuracy results are not comparable.");
  }
  if (distinct((r) => r.config.sourceId)) {
    warnings.push("Sources differ. Perception input may not be identical.");
  }
  const byPolicy = new Map<string, Set<string>>();
  for (const r of runs) {
    const set = byPolicy.get(r.config.policyId) ?? new Set<string>();
    set.add(r.config.policyVersion);
    byPolicy.set(r.config.policyId, set);
  }
  for (const [policyId, versions] of byPolicy) {
    if (versions.size > 1) warnings.push(`Policy ${policyId} appears with different versions.`);
  }
  const incomplete = runs.filter((r) => r.status !== "completed");
  if (incomplete.length) {
    warnings.push(
      `${incomplete.map((r) => r.name).join(", ")} ${incomplete.length === 1 ? "has" : "have"} not completed; values may be partial or missing.`,
    );
  }
  return { comparable: warnings.length === 0, warnings };
}

export interface Delta {
  /** Signed relative change in percent, candidate vs baseline. */
  percent: number;
  better: boolean;
}

/** Returns null when a relative change is not mathematically meaningful. */
export function relativeChange(
  baseline: MetricValue | undefined,
  candidate: MetricValue | undefined,
  definition: Pick<MetricDefinition, "direction">,
): Delta | null {
  if (!baseline || !candidate) return null;
  if (baseline.value === null || candidate.value === null) return null;
  if (baseline.value === 0) return null;
  const percent = ((candidate.value - baseline.value) / Math.abs(baseline.value)) * 100;
  const better = definition.direction === "lower_is_better" ? percent < 0 : percent > 0;
  return { percent, better };
}
