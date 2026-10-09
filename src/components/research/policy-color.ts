import { policyById } from "@/lib/contracts/catalog";

export function policyCssColor(policyId: string) {
  return `var(${policyById[policyId]?.colorVar ?? "--policy-proposed"})`;
}

export function policyName(policyId: string) {
  return policyById[policyId]?.name ?? policyId;
}
