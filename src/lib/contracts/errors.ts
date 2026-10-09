import type { CapabilityKey } from "./types";

export type ServiceErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "unsupported"
  | "disconnected"
  | "conflict"
  | "unavailable"
  | "failed";

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly requestId: string;
  readonly capability?: CapabilityKey;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: ServiceErrorCode,
    message: string,
    options: {
      requestId?: string;
      capability?: CapabilityKey;
      fieldErrors?: Record<string, string>;
    } = {},
  ) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.requestId = options.requestId ?? createRequestId();
    this.capability = options.capability;
    this.fieldErrors = options.fieldErrors;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

export function createRequestId() {
  return `req-${Math.random().toString(36).slice(2, 10)}`;
}

const friendly: Record<ServiceErrorCode, string> = {
  unauthorized: "Your session has expired. Sign in again to continue.",
  forbidden: "You do not have access to this resource.",
  not_found: "This record could not be found. It may have been removed.",
  validation_error: "Some fields need attention.",
  unsupported: "The selected source does not support this action.",
  disconnected: "The source is disconnected.",
  conflict: "This action conflicts with the current state.",
  unavailable: "The service is temporarily unavailable.",
  failed: "Something went wrong. Try again.",
};

/** User-facing message. Never exposes stack traces or internal details. */
export function describeError(error: unknown): {
  title: string;
  detail?: string;
  requestId?: string;
} {
  if (isServiceError(error)) {
    return { title: friendly[error.code], detail: error.message, requestId: error.requestId };
  }
  return { title: friendly.failed };
}
