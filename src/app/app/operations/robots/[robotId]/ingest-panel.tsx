"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Field, applyFieldErrors } from "@/components/form-field";
import { Section } from "@/components/page-header";
import { Freshness } from "@/components/provenance";
import { EmptyState, QueryView } from "@/components/states";
import { JobBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Progress } from "@/components/ui/switch";
import { isServiceError } from "@/lib/contracts/errors";
import {
  ACCEPTED_VIDEO_TYPES,
  ingestionSchema,
  validateVideoFile,
  type IngestionValues,
} from "@/lib/contracts/schemas";
import { formatBytes } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

export function IngestPanel({ sourceId }: { sourceId: string }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: qk.ingestion(sourceId),
    queryFn: () => getServices().ingest.list(sourceId),
    refetchInterval: (q) =>
      q.state.data?.some((j) => j.status === "queued" || j.status === "running") ? 1500 : false,
  });

  const form = useForm<IngestionValues & { file?: FileList }>({
    resolver: zodResolver(ingestionSchema),
    defaultValues: { sourceId, frameRate: 10, detector: "yoloe-11s", reidThreshold: 0.75 },
  });

  const create = useMutation({
    mutationFn: async (values: IngestionValues) => {
      const file = form.getValues("file")?.[0];
      const fileError = file ? validateVideoFile(file) : "Choose an MP4, WebM, or MOV file.";
      if (fileError) throw Object.assign(new Error(fileError), { field: "file" });
      return getServices().ingest.create({
        sourceId,
        fileName: file!.name,
        fileSizeBytes: file!.size,
        mimeType: file!.type,
        settings: {
          frameRate: values.frameRate,
          detector: values.detector,
          reidThreshold: values.reidThreshold,
        },
      });
    },
    meta: { silent: true },
    onSuccess: (job) => {
      void client.invalidateQueries({ queryKey: qk.ingestion(sourceId) });
      toast.success(`Queued ${job.fileName}.`);
      form.reset({ sourceId, frameRate: 10, detector: "yoloe-11s", reidThreshold: 0.75 });
    },
    onError: (error) => {
      if (error && typeof error === "object" && "field" in error) {
        form.setError("file" as never, { type: "validate", message: (error as Error).message });
        return;
      }
      if (isServiceError(error) && applyFieldErrors(error.fieldErrors, form.setError)) return;
      toast.error(isServiceError(error) ? error.message : "The file could not be queued.");
    },
  });

  const retry = useMutation({
    mutationFn: (id: string) => getServices().ingest.retry(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.ingestion(sourceId) }),
  });

  return (
    <Section
      title="Process a recording"
      description="The file stays in this browser for the demo. The mock pipeline produces the same two-cup storyline."
    >
      <Card>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit((v) => create.mutate(v))}
            noValidate
          >
            <Field
              className="sm:col-span-2"
              label="Video file"
              hint="MP4, WebM, or MOV. At most 2 GiB."
              error={form.formState.errors.file?.message as string | undefined}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  type="file"
                  accept={ACCEPTED_VIDEO_TYPES.join(",")}
                  {...form.register("file")}
                />
              )}
            </Field>
            <Field label="Sample rate (FPS)" error={form.formState.errors.frameRate?.message}>
              {(props) => (
                <Input {...props} type="number" min={1} max={30} {...form.register("frameRate")} />
              )}
            </Field>
            <Field label="Detector" error={form.formState.errors.detector?.message}>
              {(props) => (
                <NativeSelect {...props} {...form.register("detector")}>
                  <option value="yoloe-11s">YOLOE-11s</option>
                  <option value="yolo11n">YOLO11n</option>
                </NativeSelect>
              )}
            </Field>
            <Field
              label="Re-ID threshold"
              hint="0.50–0.95. Higher is stricter."
              error={form.formState.errors.reidThreshold?.message}
            >
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={0.5}
                  max={0.95}
                  step={0.01}
                  {...form.register("reidThreshold")}
                />
              )}
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Queuing…" : "Start processing"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <QueryView
        query={query}
        empty={
          <EmptyState title="No ingestion jobs yet">
            Choose a video to process this recording source.
          </EmptyState>
        }
      >
        {(jobs) => (
          <ul className="flex flex-col gap-2">
            {jobs.map((job) => (
              <li key={job.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{job.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(job.fileSizeBytes)} · {job.settings.detector} ·{" "}
                        {job.settings.frameRate} FPS
                      </p>
                      {job.failureReason && (
                        <p className="mt-1 text-sm text-danger">{job.failureReason}</p>
                      )}
                      {job.producedRunId && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Produced run {job.producedRunId} ({job.producedEventCount ?? 0} events)
                        </p>
                      )}
                    </div>
                    <div className="flex min-w-40 flex-col items-start gap-2 sm:items-end">
                      <JobBadge status={job.status} />
                      {(job.status === "running" || job.status === "queued") && (
                        <Progress value={job.progress ?? 0} label={`Processing ${job.fileName}`} />
                      )}
                      <Freshness
                        at={job.completedAt ?? job.startedAt ?? job.createdAt}
                        label="Updated"
                      />
                      {(job.status === "failed" || job.status === "cancelled") && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => retry.mutate(job.id)}
                          disabled={retry.isPending}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </Section>
  );
}
