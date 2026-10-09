import { createHttpServices } from "./http";
import { createMockServices } from "./mock";
import type { Services } from "./types";

export type DataMode = "mock" | "http";

export const dataMode: DataMode = process.env.NEXT_PUBLIC_DATA_MODE === "http" ? "http" : "mock";

let instance: Services | null = null;

/** Client-side service registry. Mock services read browser storage, so call this only in the browser. */
export function getServices(): Services {
  instance ??=
    dataMode === "http"
      ? createHttpServices(process.env.NEXT_PUBLIC_API_BASE_URL)
      : createMockServices();
  return instance;
}

export type { Services } from "./types";
