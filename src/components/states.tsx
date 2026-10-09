"use client";

import {
  AlertTriangleIcon,
  InboxIcon,
  PlugZapIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { capabilityLabel } from "@/lib/contracts/catalog";
import { describeError, isServiceError } from "@/lib/contracts/errors";
import type { CapabilityKey } from "@/lib/contracts/types";
import { cn } from "@/lib/utils";

function Frame({
  icon,
  title,
  children,
  action,
  tone = "neutral",
  className,
  role,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "neutral" | "danger" | "warning";
  className?: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      role={role}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "mb-1 flex size-10 items-center justify-center rounded-full bg-surface-muted text-muted-foreground [&_svg]:size-5",
          tone === "danger" && "bg-danger-soft text-danger",
          tone === "warning" && "bg-warning-soft text-warning",
        )}
        aria-hidden="true"
      >
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function LoadingState({
  rows = 3,
  label = "Loading",
  className,
}: {
  rows?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-busy="true" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  icon,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Frame
      icon={icon ?? <InboxIcon />}
      title={title}
      action={action}
      className={className}
      role="status"
    >
      {children}
    </Frame>
  );
}

export function UnsupportedState({
  capability,
  sourceName,
  children,
  className,
}: {
  capability: CapabilityKey;
  sourceName?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Frame
      icon={<PlugZapIcon />}
      title={`${capabilityLabel[capability]} is not available`}
      tone="warning"
      className={className}
      role="status"
    >
      {children ??
        `${sourceName ?? "The selected source"} does not provide ${capabilityLabel[capability].toLowerCase()}.`}
    </Frame>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  if (isServiceError(error) && error.code === "unsupported" && error.capability) {
    return (
      <UnsupportedState capability={error.capability} className={className}>
        {error.message}
      </UnsupportedState>
    );
  }
  const { title, detail, requestId } = describeError(error);
  const notFound = isServiceError(error) && error.code === "not_found";
  const forbidden =
    isServiceError(error) && (error.code === "forbidden" || error.code === "unauthorized");
  return (
    <Frame
      icon={forbidden ? <ShieldAlertIcon /> : <AlertTriangleIcon />}
      title={title}
      tone={notFound ? "neutral" : "danger"}
      className={className}
      role="alert"
      action={
        <>
          {onRetry && !notFound && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <RefreshCwIcon /> Try again
            </Button>
          )}
          {notFound && (
            <Button variant="secondary" size="sm" asChild>
              <Link href="/app/operations/overview">Go to overview</Link>
            </Button>
          )}
        </>
      }
    >
      {detail && <p>{detail}</p>}
      {requestId && <p className="mt-1 font-mono text-xs">Request {requestId}</p>}
    </Frame>
  );
}

/** Renders loading, error, or empty states for a query and the content otherwise. */
export function QueryView<T>({
  query,
  empty,
  isEmpty,
  loading,
  children,
}: {
  query: { data: T | undefined; isPending: boolean; error: unknown; refetch: () => unknown };
  empty?: React.ReactNode;
  isEmpty?: (data: T) => boolean;
  loading?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isPending) return <>{loading ?? <LoadingState />}</>;
  if (query.error || query.data === undefined)
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const data = query.data;
  const emptyByDefault = Array.isArray(data) && data.length === 0;
  if (empty && (isEmpty ? isEmpty(data) : emptyByDefault)) return <>{empty}</>;
  return <>{children(data)}</>;
}
