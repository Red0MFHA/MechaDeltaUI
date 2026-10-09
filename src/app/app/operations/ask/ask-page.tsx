"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useForm } from "react-hook-form";

import { Field, applyFieldErrors } from "@/components/form-field";
import { ListFilters, listEmpty } from "@/components/list-filters";
import { NeedSource } from "@/components/need-source";
import { PageHeader } from "@/components/page-header";
import { Note } from "@/components/provenance";
import { EmptyState, QueryView } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { isServiceError } from "@/lib/contracts/errors";
import { questionSchema } from "@/lib/contracts/schemas";
import { z } from "zod";
import { displayName } from "@/lib/domain/objects";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

export function AskPage() {
  return <NeedSource>{(source) => <AskBody sourceId={source.id} />}</NeedSource>;
}

function AskBody({ sourceId }: { sourceId: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const objects = useQuery({
    queryKey: qk.objects(sourceId),
    queryFn: () => getServices().objects.list(sourceId),
  });
  const history = useQuery({
    queryKey: qk.questions(sourceId),
    queryFn: () => getServices().questions.list(sourceId),
  });
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const askSchema = questionSchema.extend({ objectId: z.string().optional() });
  type AskValues = z.infer<typeof askSchema>;
  const form = useForm<AskValues>({
    resolver: zodResolver(askSchema),
    defaultValues: { question: "", objectId: "" },
  });

  const ask = useMutation({
    mutationFn: (values: AskValues) =>
      getServices().questions.ask({
        sourceId,
        question: values.question,
        objectIds: values.objectId ? [values.objectId] : undefined,
      }),
    meta: { silent: true },
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: qk.questions(sourceId) });
      void client.invalidateQueries({ queryKey: qk.overview(sourceId) });
      router.push(`/app/operations/ask/${result.id}`);
    },
    onError: (error) => {
      if (isServiceError(error) && applyFieldErrors(error.fieldErrors, form.setError)) return;
      form.setError("question", {
        type: "server",
        message: isServiceError(error) ? error.message : "The question failed.",
      });
    },
  });

  return (
    <>
      <PageHeader
        title="Ask history"
        description="Answers come from stored transitions and current state. The console never invents a mover."
        crumbs={[{ label: "Ask history" }]}
      />
      <Card className="mb-8">
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((v) => ask.mutate(v))}
            noValidate
          >
            <Field
              label="Question"
              hint="Try “Where was my-mug before it reached Table-B?”"
              error={form.formState.errors.question?.message}
              required
            >
              {(props) => <Textarea {...props} {...form.register("question")} rows={3} />}
            </Field>
            <Field
              label="Context object (optional)"
              hint="Use this when the question says “it” or when two cups share a label."
            >
              {(props) => (
                <NativeSelect {...props} {...form.register("objectId")}>
                  <option value="">None — parse the question</option>
                  {(objects.data ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {displayName(o)}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Note>
              Place-history answers use the transition log. They do not load a payload from disk.
            </Note>
            <div>
              <Button type="submit" disabled={ask.isPending}>
                {ask.isPending ? "Asking…" : "Ask"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <h2 className="mb-3 text-base font-semibold">Earlier questions</h2>
      <ListFilters
        search={search}
        onSearch={(value) => void setSearch(value || null)}
        placeholder="Search questions"
        searchLabel="Search questions"
        active={Boolean(search)}
        onClear={() => void setSearch(null)}
      />
      <QueryView
        query={history}
        empty={
          <EmptyState title="No questions yet">
            Ask one above. The demo seed includes one about my-mug.
          </EmptyState>
        }
      >
        {(items) => {
          const q = search.trim().toLowerCase();
          const filtered = q
            ? items.filter(
                (item) =>
                  item.question.toLowerCase().includes(q) ||
                  (item.answer ?? "").toLowerCase().includes(q),
              )
            : items;
          if (filtered.length === 0) return listEmpty(true, "questions");
          return (
            <ul className="flex flex-col gap-2">
              {filtered.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/app/operations/ask/${q.id}`}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-3 hover:border-primary/40"
                  >
                    <span>
                      <span className="block font-medium">{q.question}</span>
                      <span className="text-sm text-muted-foreground">{q.answer}</span>
                    </span>
                    <Badge tone={q.status === "completed" ? "success" : "warning"}>
                      {q.status.replaceAll("_", " ")}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          );
        }}
      </QueryView>
    </>
  );
}
