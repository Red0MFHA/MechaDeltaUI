"use client";

import { FlaskConicalIcon, InfoIcon } from "lucide-react";
import Link from "next/link";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import type { ConnectionState, DataOrigin } from "@/lib/contracts/types";
import { formatAge, formatDateTime } from "@/lib/format";
import { dataMode } from "@/lib/services";
import { usePreferences } from "@/lib/stores/preferences";
import { cn } from "@/lib/utils";

const originLabel: Record<DataOrigin, string> = {
  live: "Live",
  recorded: "Recorded",
  simulated: "Simulated",
  mock: "Mock",
};

const originTone: Record<DataOrigin, BadgeTone> = {
  live: "success",
  recorded: "info",
  simulated: "primary",
  mock: "warning",
};

/** Shows where a value came from. In mock mode every badge says so. */
export function ProvenanceBadge({ origin, className }: { origin: DataOrigin; className?: string }) {
  const mock = dataMode === "mock" && origin !== "mock";
  const label = mock ? `${originLabel[origin]} · mock` : originLabel[origin];
  return (
    <Badge tone={mock || origin === "mock" ? "warning" : originTone[origin]} className={className}>
      {label}
    </Badge>
  );
}

const connectionTone: Record<ConnectionState, BadgeTone> = {
  online: "success",
  offline: "neutral",
  connecting: "info",
  degraded: "warning",
  unknown: "outline",
};

export function ConnectionBadge({
  state,
  className,
}: {
  state: ConnectionState;
  className?: string;
}) {
  return (
    <Badge tone={connectionTone[state]} className={className}>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full bg-current",
          state === "online" && "animate-pulse motion-reduce:animate-none",
        )}
      />
      {state[0].toUpperCase() + state.slice(1)}
    </Badge>
  );
}

/** Measured or observed time with age. Uses the user's timezone preference. */
export function Freshness({
  at,
  label = "Updated",
  className,
}: {
  at?: string;
  label?: string;
  className?: string;
}) {
  const timezone = usePreferences((s) => s.timezone);
  if (!at)
    return <span className={cn("text-xs text-muted-foreground", className)}>{label}: unknown</span>;
  return (
    <Tooltip content={formatDateTime(at, timezone)}>
      <span className={cn("text-xs text-muted-foreground", className)} tabIndex={0}>
        {label} <time dateTime={at}>{formatAge(at)}</time>
      </span>
    </Tooltip>
  );
}

export function MockBanner() {
  if (dataMode !== "mock") return null;
  return (
    <div className="no-print flex items-center justify-center gap-2 border-b border-warning/30 bg-warning-soft px-4 py-1.5 text-center text-xs text-warning">
      <FlaskConicalIcon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-semibold">Mock data.</strong> Values show how the console behaves;
        they are not measurements or research findings.
      </span>
      <Link href="/app/settings#demo" className="font-medium underline underline-offset-2">
        Demo settings
      </Link>
    </div>
  );
}

export function Note({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-1.5 text-xs text-muted-foreground", className)}>
      <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
