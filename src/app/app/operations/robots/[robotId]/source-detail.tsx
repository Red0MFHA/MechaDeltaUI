"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useActiveSource } from "@/components/active-source";
import { CapabilityPills } from "@/components/capabilities";
import { Field, applyFieldErrors } from "@/components/form-field";
import { PageHeader, Section } from "@/components/page-header";
import { ConnectionBadge, Freshness, ProvenanceBadge } from "@/components/provenance";
import { ErrorState, LoadingState } from "@/components/states";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { sourceKindLabel } from "@/lib/contracts/catalog";
import { isServiceError } from "@/lib/contracts/errors";
import { editSourceSchema, type EditSourceValues } from "@/lib/contracts/schemas";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

import { IngestPanel } from "./ingest-panel";

export function SourceDetail({ id }: { id: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const { select } = useActiveSource();
  const [removeOpen, setRemoveOpen] = useState(false);
  const query = useQuery({ queryKey: qk.source(id), queryFn: () => getServices().sources.get(id) });

  const form = useForm<EditSourceValues>({
    resolver: zodResolver(editSourceSchema),
    values: query.data
      ? { name: query.data.name, description: query.data.description ?? "" }
      : undefined,
  });

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: qk.sources });
    void client.invalidateQueries({ queryKey: qk.source(id) });
  };

  const update = useMutation({
    mutationFn: (values: EditSourceValues) => getServices().sources.update(id, values),
    meta: { silent: true },
    onSuccess: (source) => {
      invalidate();
      toast.success(`${source.name} updated.`);
    },
    onError: (error) => {
      if (isServiceError(error) && applyFieldErrors(error.fieldErrors, form.setError)) return;
      toast.error(isServiceError(error) ? error.message : "The source could not be updated.");
    },
  });

  const connect = useMutation({
    mutationFn: () => getServices().sources.connect(id),
    onSuccess: (source) => {
      invalidate();
      toast.success(`${source.name} is ${source.connectionState}.`);
    },
  });

  const disconnect = useMutation({
    mutationFn: () => getServices().sources.disconnect(id),
    onSuccess: (source) => {
      invalidate();
      toast.message(`${source.name} disconnected. In-flight tasks were cancelled.`);
    },
  });

  const remove = useMutation({
    mutationFn: () => getServices().sources.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Source removed.");
      router.replace("/app/operations/robots");
    },
  });

  if (query.isPending) return <LoadingState label="Loading source" />;
  if (query.error || !query.data)
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const source = query.data;
  const canConnect = source.kind !== "recorded_video";

  return (
    <>
      <PageHeader
        title={source.name}
        description={source.description ?? sourceKindLabel[source.kind]}
        crumbs={[
          { label: "Robots & sources", href: "/app/operations/robots" },
          { label: source.name },
        ]}
        meta={
          <>
            <ConnectionBadge state={source.connectionState} />
            <ProvenanceBadge origin={source.origin} />
            <Freshness at={source.lastSeenAt ?? source.updatedAt} label="Last seen" />
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => select(source.id)}>
              Use in console
            </Button>
            {canConnect && source.connectionState !== "online" && (
              <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
                {connect.isPending ? "Connecting…" : "Connect"}
              </Button>
            )}
            {canConnect && source.connectionState === "online" && (
              <Button
                variant="secondary"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                Disconnect
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-8">
        <Section
          title="Capabilities"
          description="Controls that this source cannot provide stay disabled in the console."
        >
          <CapabilityPills capabilities={source.capabilities} />
        </Section>

        <Section title="Connection">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Kind</dt>
                  <dd>{sourceKindLabel[source.kind]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Active run</dt>
                  <dd className="font-mono text-sm">{source.activeRunId ?? "None"}</dd>
                </div>
                {source.config.map((field) => (
                  <div key={field.key}>
                    <dt className="text-xs text-muted-foreground">{field.label}</dt>
                    <dd className="font-mono text-sm">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </Section>

        <Section title="Name and notes">
          <Card>
            <CardContent>
              <form
                className="flex flex-col gap-4"
                onSubmit={form.handleSubmit((v) => update.mutate(v))}
                noValidate
              >
                <Field label="Name" error={form.formState.errors.name?.message} required>
                  {(props) => <Input {...props} {...form.register("name")} />}
                </Field>
                <Field label="Description" error={form.formState.errors.description?.message}>
                  {(props) => <Textarea {...props} {...form.register("description")} rows={2} />}
                </Field>
                <div>
                  <Button type="submit" disabled={update.isPending}>
                    {update.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Section>

        {source.kind === "recorded_video" && <IngestPanel sourceId={source.id} />}

        <Section title="Danger zone">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Removing this source also removes its tasks, questions, and ingestion jobs in this
                console.
              </p>
              <Button variant="danger" onClick={() => setRemoveOpen(true)}>
                Remove source
              </Button>
            </CardContent>
          </Card>
        </Section>
      </div>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Remove {source.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. History tied to this source in this browser will be deleted.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep source</AlertDialogCancel>
            <AlertDialogAction
              tone="danger"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
