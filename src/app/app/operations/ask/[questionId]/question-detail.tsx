"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PageHeader, Section } from "@/components/page-header";
import { Note } from "@/components/provenance";
import { ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMs } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

export function QuestionDetail({ id }: { id: string }) {
  const router = useRouter();
  const query = useQuery({
    queryKey: qk.question(id),
    queryFn: () => getServices().questions.get(id),
  });
  const report = useMutation({
    mutationFn: () => getServices().evidence.createFromQuestion(id),
    onSuccess: (created) => router.push(`/app/operations/evidence/${created.id}`),
  });

  if (query.isPending) return <LoadingState label="Loading question" />;
  if (query.error || !query.data)
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const q = query.data;

  return (
    <>
      <PageHeader
        title={q.question}
        crumbs={[{ label: "Ask history", href: "/app/operations/ask" }, { label: "Question" }]}
        meta={
          <>
            <Badge tone={q.status === "completed" ? "success" : "warning"}>
              {q.status.replaceAll("_", " ")}
            </Badge>
            {q.answeredWithoutPayload && <Badge tone="info">No payload read</Badge>}
            {q.retrievalMs !== undefined && (
              <span className="text-xs text-muted-foreground">{formatMs(q.retrievalMs)}</span>
            )}
          </>
        }
        actions={
          <Button onClick={() => report.mutate()} disabled={report.isPending}>
            Evidence report
          </Button>
        }
      />
      <Card className="mb-6">
        <CardContent>
          <p className="text-base">{q.answer}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {q.previousPlace && <>Previous place: {q.previousPlace}. </>}
            {q.currentPlace && <>Current place: {q.currentPlace}. </>}
            {q.resolvedObjectId && (
              <Link
                href={`/app/operations/objects/${q.resolvedObjectId}`}
                className="text-primary hover:underline"
              >
                Open object
              </Link>
            )}
          </p>
        </CardContent>
      </Card>
      <Section title="Evidence">
        {q.evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No citations. The stored history did not support this answer.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {q.evidence.map((e) => (
              <li key={e.id}>
                <Card>
                  <CardContent className="flex gap-4">
                    {e.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.imageUrl} alt="" className="h-24 w-32 rounded-md object-cover" />
                    )}
                    <div>
                      <p className="font-medium">{e.label}</p>
                      {e.excerpt && <p className="text-sm text-muted-foreground">{e.excerpt}</p>}
                      {e.href && (
                        <Link href={e.href} className="text-sm text-primary hover:underline">
                          Open source
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {q.limitations.length > 0 && (
        <div className="mt-6 flex flex-col gap-1">
          {q.limitations.map((line) => (
            <Note key={line}>{line}</Note>
          ))}
        </div>
      )}
    </>
  );
}
