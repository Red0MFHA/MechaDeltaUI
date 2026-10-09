import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { JobStatus, RunStatus, TaskStatus } from "@/lib/contracts/types";

const jobTone: Record<JobStatus, BadgeTone> = {
  queued: "neutral",
  running: "info",
  completed: "success",
  failed: "danger",
  cancelled: "outline",
};

export function JobBadge({ status }: { status: JobStatus }) {
  return <Badge tone={jobTone[status]}>{status}</Badge>;
}

const taskTone: Record<TaskStatus, BadgeTone> = {
  queued: "neutral",
  accepted: "info",
  running: "info",
  succeeded: "success",
  failed: "danger",
  rejected: "warning",
  cancelled: "outline",
  unknown: "outline",
};

export function TaskBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={taskTone[status]}>{status}</Badge>;
}

const runTone: Record<RunStatus, BadgeTone> = {
  draft: "outline",
  queued: "neutral",
  running: "info",
  completed: "success",
  failed: "danger",
  cancelled: "outline",
};

export function RunBadge({ status }: { status: RunStatus }) {
  return <Badge tone={runTone[status]}>{status}</Badge>;
}
