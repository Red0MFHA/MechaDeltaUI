"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Field, applyFieldErrors } from "@/components/form-field";
import { PageHeader, Section } from "@/components/page-header";
import { EmptyState, QueryView } from "@/components/states";
import { JobBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isServiceError } from "@/lib/contracts/errors";
import { reportSchema, type ReportValues } from "@/lib/contracts/schemas";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";
import { usePreferences } from "@/lib/stores/preferences";

export function ReportsPage() {
  const client = useQueryClient();
  const compare = usePreferences((s) => s.compareRunIds);
  const reports = useQuery({
    queryKey: qk.reports,
    queryFn: () => getServices().reports.list(),
    refetchInterval: (q) =>
      q.state.data?.some((r) => r.status === "queued" || r.status === "generating") ? 1000 : false,
  });
  const runs = useQuery({
    queryKey: qk.experiments(),
    queryFn: () => getServices().experiments.list(),
  });
  const form = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { title: "Patrol A comparison (mock)", runIds: compare.length ? compare : [] },
  });

  const create = useMutation({
    mutationFn: (values: ReportValues) => getServices().reports.create(values),
    meta: { silent: true },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.reports });
      toast.success("Report queued.");
      form.reset({ title: "", runIds: [] });
    },
    onError: (error) => {
      if (isServiceError(error) && applyFieldErrors(error.fieldErrors, form.setError)) return;
    },
  });

  const selected = useWatch({ control: form.control, name: "runIds" }) ?? [];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Export a selected set of runs with methodology and limitations. Mock reports stay labelled as mock."
        crumbs={[{ label: "Reports" }]}
      />
      <Section title="New report">
        <Card>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={form.handleSubmit((v) => create.mutate(v))}
              noValidate
            >
              <Field label="Title" error={form.formState.errors.title?.message} required>
                {(props) => <Input {...props} {...form.register("title")} />}
              </Field>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Runs</legend>
                <ul className="flex max-h-56 flex-col gap-1 overflow-auto rounded-md border border-border p-2">
                  {(runs.data ?? []).map((run) => (
                    <li key={run.id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.includes(run.id)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...selected, run.id]
                              : selected.filter((id) => id !== run.id);
                            form.setValue("runIds", next, { shouldValidate: true });
                          }}
                        />
                        {run.name}
                      </label>
                    </li>
                  ))}
                </ul>
                {form.formState.errors.runIds && (
                  <p className="mt-1 text-xs text-danger" role="alert">
                    {form.formState.errors.runIds.message}
                  </p>
                )}
              </fieldset>
              <div>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Creating…" : "Create report"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Section>
      <Section title="Existing reports" className="mt-8">
        <QueryView query={reports} empty={<EmptyState title="No reports yet" />}>
          {(items) => (
            <ul className="flex flex-col gap-2">
              {items.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/app/research/reports/${r.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 hover:border-primary/40"
                  >
                    <span>
                      <span className="block font-medium">{r.title}</span>
                      <span className="text-xs text-muted-foreground">{r.runIds.length} runs</span>
                    </span>
                    <JobBadge
                      status={
                        r.status === "generating"
                          ? "running"
                          : r.status === "queued"
                            ? "queued"
                            : r.status === "failed"
                              ? "failed"
                              : "completed"
                      }
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </QueryView>
      </Section>
    </>
  );
}
