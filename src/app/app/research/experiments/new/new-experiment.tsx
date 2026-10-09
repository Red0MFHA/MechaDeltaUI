"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";

import { Field, applyFieldErrors } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { Note } from "@/components/provenance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { policies, policyById, workloadById, workloads } from "@/lib/contracts/catalog";
import { isServiceError } from "@/lib/contracts/errors";
import { experimentSchema, type ExperimentValues } from "@/lib/contracts/schemas";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

export function NewExperiment() {
  const router = useRouter();
  const sources = useQuery({ queryKey: qk.sources, queryFn: () => getServices().sources.list() });
  const form = useForm<ExperimentValues>({
    resolver: zodResolver(experimentSchema),
    defaultValues: {
      name: "Proposed policy, patrol A",
      policyId: "proposed",
      workloadId: "wl-lab-patrol-a",
      sourceId: sources.data?.[0]?.id ?? "src-sim-01",
      ramBudgetMiB: 2.34,
      workloadSize: 10,
      notes: "",
    },
  });
  const policyId = useWatch({ control: form.control, name: "policyId" });
  const workloadId = useWatch({ control: form.control, name: "workloadId" });

  const create = useMutation({
    mutationFn: (values: ExperimentValues) => {
      const policy = policyById[values.policyId];
      const workload = workloadById[values.workloadId];
      return getServices().experiments.create({
        name: values.name,
        notes: values.notes,
        config: {
          policyId: values.policyId,
          policyVersion: policy?.version ?? "1",
          workloadId: values.workloadId,
          sourceId: values.sourceId,
          ramBudgetBytes: Math.round(values.ramBudgetMiB * 1024 * 1024),
          durationSeconds: workload?.durationSeconds,
          workloadSize: values.workloadSize,
          parameters:
            values.policyId === "proposed"
              ? { visibilityGate: true, minVotes: 3, minDwellSeconds: 0.6 }
              : {},
        },
      });
    },
    meta: { silent: true },
    onSuccess: (run) => router.push(`/app/research/experiments/${run.id}`),
    onError: (error) => {
      if (isServiceError(error) && applyFieldErrors(error.fieldErrors, form.setError)) return;
    },
  });

  return (
    <>
      <PageHeader
        title="New experiment"
        description="The run starts as a draft. Open it and press Start to queue the mock replay."
        crumbs={[{ label: "Experiments", href: "/app/research/experiments" }, { label: "New" }]}
      />
      <Card>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit((v) => create.mutate(v))}
            noValidate
          >
            <Field
              className="sm:col-span-2"
              label="Name"
              error={form.formState.errors.name?.message}
              required
            >
              {(props) => <Input {...props} {...form.register("name")} />}
            </Field>
            <Field
              label="Policy"
              hint={policyById[policyId]?.description}
              error={form.formState.errors.policyId?.message}
              required
            >
              {(props) => (
                <NativeSelect {...props} {...form.register("policyId")}>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.role === "proposed" ? "Proposed · " : "Baseline · "}
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Field
              label="Workload"
              hint={workloadById[workloadId]?.description}
              error={form.formState.errors.workloadId?.message}
              required
            >
              {(props) => (
                <NativeSelect
                  {...props}
                  {...form.register("workloadId", {
                    onChange: (e) => {
                      const wl = workloadById[e.target.value];
                      if (wl) form.setValue("workloadSize", wl.questionCount);
                    },
                  })}
                >
                  {workloads.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Field label="Source" error={form.formState.errors.sourceId?.message} required>
              {(props) => (
                <NativeSelect {...props} {...form.register("sourceId")}>
                  {(sources.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Field
              label="Payload RAM budget (MiB)"
              hint="Decoded payload arrays only, not process RSS. 2.34 MiB is 2,457,600 bytes."
              error={form.formState.errors.ramBudgetMiB?.message}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={0.5}
                  max={4096}
                  step={0.01}
                  {...form.register("ramBudgetMiB")}
                />
              )}
            </Field>
            <Field
              label="Labelled questions"
              error={form.formState.errors.workloadSize?.message}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={1}
                  max={500}
                  {...form.register("workloadSize")}
                />
              )}
            </Field>
            <Field
              className="sm:col-span-2"
              label="Notes"
              error={form.formState.errors.notes?.message}
            >
              {(props) => <Textarea {...props} rows={3} {...form.register("notes")} />}
            </Field>
            <div className="sm:col-span-2">
              <Note>
                Mock data. Starting a run advances a seeded replay; it does not execute the research
                pipeline.
              </Note>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Save draft"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
