export const mockScenarios = [
  { id: "normal", label: "Normal", description: "Seeded demo data with realistic delays." },
  { id: "empty", label: "Empty account", description: "No sources, runs, or history yet." },
  { id: "offline", label: "Backend offline", description: "Every request fails as unavailable." },
  { id: "failing", label: "Failing writes", description: "Reads work; every change fails." },
  { id: "slow", label: "Slow network", description: "Every request takes about 2.5 seconds." },
  {
    id: "session_expired",
    label: "Session expired",
    description: "Every request returns unauthorized.",
  },
] as const;

export type MockScenario = (typeof mockScenarios)[number]["id"];

const KEY = "md-mock-scenario";
const EVENT = "md-mock-scenario-change";

export function getScenario(): MockScenario {
  if (typeof window === "undefined") return "normal";
  const value = window.localStorage.getItem(KEY);
  return mockScenarios.some((s) => s.id === value) ? (value as MockScenario) : "normal";
}

export function setScenario(scenario: MockScenario) {
  window.localStorage.setItem(KEY, scenario);
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeScenario(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) callback();
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
