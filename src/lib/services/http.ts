import { ServiceError } from "@/lib/contracts/errors";

import type { Services } from "./types";

/**
 * Placeholder for the MechaDelta backend adapter. Every call fails as
 * "unavailable" until the backend API exists, so pages show their error
 * state instead of invented data.
 */
export function createHttpServices(baseUrl: string | undefined): Services {
  const fail = () =>
    Promise.reject(
      new ServiceError(
        "unavailable",
        baseUrl
          ? `The backend adapter for ${baseUrl} is not implemented yet.`
          : "NEXT_PUBLIC_API_BASE_URL is not set.",
      ),
    );
  const api = <T extends object>() =>
    new Proxy({} as T, {
      get: () => fail,
    });
  return {
    mode: "http",
    auth: {
      getSession: async () => null,
      signIn: fail,
      signOut: async () => undefined,
    },
    sources: api(),
    ingest: api(),
    overview: api(),
    media: api(),
    events: api(),
    objects: api(),
    questions: api(),
    evidence: api(),
    memory: api(),
    runtime: api(),
    tasks: api(),
    experiments: api(),
    reports: api(),
  };
}
