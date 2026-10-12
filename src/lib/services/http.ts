import { ServiceError } from "@/lib/contracts/errors";
import type {
  CreateIngestionInput,
  EventQuery,
  HistoricalQuestionRequest,
  CmdVelRequest,
  JogRequest,
  LedgerQuery,
  MemoryQuery,
  NavigateRequest,
  ObjectLabelInput,
  RegisterSourceInput,
  TaskQuery,
  UnsupportedCommandRequest,
  UpdateSourceInput,
} from "@/lib/contracts/types";

import type { Services } from "./types";

type ErrBody = { code?: string; message?: string; details?: Record<string, unknown> };

function unavailable(message: string): never {
  throw new ServiceError("unavailable", message);
}

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ServiceError("unavailable", `Could not reach the MechaDelta API at ${baseUrl}.`);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const body = (data ?? {}) as ErrBody;
    const code = (body.code as ServiceError["code"]) || "failed";
    throw new ServiceError(code, body.message || res.statusText || "Request failed", body.details);
  }
  return data as T;
}

function qs(params: Record<string, string | number | undefined | null | string[]>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) sp.append(key, item);
    } else {
      sp.set(key, String(value));
    }
  }
  const out = sp.toString();
  return out ? `?${out}` : "";
}

/**
 * HTTP adapter for Operations workspace APIs.
 * Auth stays on the Next.js mock-session routes so screens do not change.
 * Research Lab methods remain unavailable.
 */
export function createHttpServices(baseUrl: string | undefined): Services {
  if (!baseUrl) {
    const fail = () => unavailable("NEXT_PUBLIC_API_BASE_URL is not set.");
    const api = <T extends object>() =>
      new Proxy({} as T, {
        get: () => fail,
      });
    return {
      mode: "http",
      auth: {
        getSession: async () => null,
        signIn: fail,
        signUp: fail,
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

  const root = baseUrl.replace(/\/$/, "");
  const get = <T>(path: string) => request<T>(root, path);
  const send = <T>(path: string, method: string, body?: unknown) =>
    request<T>(root, path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

  const researchUnavailable = () =>
    unavailable("Research Lab APIs are not enabled in this backend build yet.");

  return {
    mode: "http",
    auth: {
      async getSession() {
        const res = await fetch("/api/mock-session", { cache: "no-store" });
        if (!res.ok) return null;
        const data = (await res.json()) as { session: Services["auth"] extends never ? never : import("@/lib/contracts/types").Session };
        return data.session ?? null;
      },
      async signIn(email, password) {
        const res = await fetch("/api/mock-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "signin", email, password }),
        });
        if (!res.ok) {
          throw new ServiceError("unauthorized", "Invalid email or password.");
        }
        const data = (await res.json()) as { session: import("@/lib/contracts/types").Session };
        return data.session;
      },
      async signUp(name, email, password) {
        const res = await fetch("/api/mock-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "signup", name, email, password }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null;
          if (err?.error === "email_taken") {
            throw new ServiceError("conflict", "That email is already registered.");
          }
          throw new ServiceError("failed", "Could not create the account.");
        }
        const data = (await res.json()) as { session: import("@/lib/contracts/types").Session };
        return data.session;
      },
      async signOut() {
        await fetch("/api/mock-session", { method: "DELETE" });
      },
    },
    sources: {
      list: () => get("/sources"),
      get: (id) => get(`/sources/${id}`),
      register: (input: RegisterSourceInput) => send("/sources", "POST", input),
      update: (id, input: UpdateSourceInput) => send(`/sources/${id}`, "PATCH", input),
      connect: (id) => send(`/sources/${id}/connect`, "POST"),
      disconnect: (id) => send(`/sources/${id}/disconnect`, "POST"),
      remove: async (id) => {
        await send(`/sources/${id}`, "DELETE");
      },
    },
    ingest: {
      list: (sourceId?: string) => get(`/ingest${qs({ sourceId })}`),
      get: (id) => get(`/ingest/${id}`),
      create: (input: CreateIngestionInput) => send("/ingest", "POST", input),
      retry: (id) => send(`/ingest/${id}/retry`, "POST"),
    },
    overview: {
      get: (sourceId) => get(`/sources/${sourceId}/overview`),
    },
    media: {
      get: (sourceId) => get(`/sources/${sourceId}/media`),
      detections: (sourceId) => get(`/sources/${sourceId}/detections`),
      map: (sourceId) => get(`/sources/${sourceId}/map`),
      pose: (sourceId) => get(`/sources/${sourceId}/pose`),
      lidar: (sourceId) => get(`/sources/${sourceId}/lidar`),
    },
    events: {
      list: (query: EventQuery) =>
        get(
          `/events${qs({
            sourceId: query.sourceId,
            search: query.search,
            objectId: query.objectId,
            cursor: query.cursor,
            limit: query.limit,
            types: query.types,
          })}`,
        ),
      get: (id) => get(`/events/${id}`),
    },
    objects: {
      list: (sourceId) => get(`/sources/${sourceId}/objects`),
      get: (id) => get(`/objects/${encodeURIComponent(id)}`),
      transitions: (objectId) => get(`/objects/${encodeURIComponent(objectId)}/transitions`),
      intervals: (objectId) => get(`/objects/${encodeURIComponent(objectId)}/intervals`),
      setLabel: (id, input: ObjectLabelInput) =>
        send(`/objects/${encodeURIComponent(id)}/label`, "PATCH", input),
    },
    questions: {
      ask: (request: HistoricalQuestionRequest) => send("/questions", "POST", request),
      list: (sourceId) => get(`/questions${qs({ sourceId })}`),
      get: (id) => get(`/questions/${id}`),
    },
    evidence: {
      get: (id) => get(`/evidence/${id}`),
      createFromQuestion: (questionId) => send(`/evidence/from-question/${questionId}`, "POST"),
      createFromObject: (objectId) =>
        send(`/evidence/from-object/${encodeURIComponent(objectId)}`, "POST"),
    },
    memory: {
      list: (query: MemoryQuery) =>
        get(
          `/memory${qs({
            sourceId: query.sourceId,
            search: query.search,
            objectId: query.objectId,
            types: query.types,
          })}`,
        ),
      get: (id) => get(`/memory/${id}`),
      history: (id) => get(`/memory/${id}/history`),
    },
    runtime: {
      snapshot: (sourceId) => get(`/sources/${sourceId}/runtime`),
      ledger: (query: LedgerQuery) =>
        get(`/runtime/ledger${qs({ sourceId: query.sourceId, runId: query.runId })}`),
      series: (sourceId, runId) =>
        get(`/sources/${sourceId}/runtime/series${qs({ runId })}`),
    },
    tasks: {
      list: (query: TaskQuery) =>
        get(
          `/tasks${qs({
            sourceId: query.sourceId,
            search: query.search,
            status: query.status,
          })}`,
        ),
      get: (id) => get(`/tasks/${id}`),
      jog: (request: JogRequest) => send("/tasks/jog", "POST", request),
      cmdVel: (request: CmdVelRequest) => send("/tasks/cmd_vel", "POST", request),
      navigate: (request: NavigateRequest) => send("/tasks/navigate", "POST", request),
      logUnsupported: (request: UnsupportedCommandRequest) =>
        send("/tasks/unsupported", "POST", request),
      cancel: (id) => send(`/tasks/${id}/cancel`, "POST"),
    },
    experiments: {
      list: researchUnavailable,
      get: researchUnavailable,
      create: researchUnavailable,
      start: researchUnavailable,
      cancel: researchUnavailable,
      series: researchUnavailable,
      ledger: researchUnavailable,
      manifest: researchUnavailable,
    },
    reports: {
      list: researchUnavailable,
      get: researchUnavailable,
      create: researchUnavailable,
    },
  };
}
