"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Note } from "@/components/provenance";
import { ErrorState, LoadingState } from "@/components/states";
import { Card, CardContent } from "@/components/ui/card";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

export function EvidencePage({ id }: { id: string }) {
  const query = useQuery({
    queryKey: qk.evidence(id),
    queryFn: () => getServices().evidence.get(id),
  });
  if (query.isPending) return <LoadingState label="Loading evidence" />;
  if (query.error || !query.data)
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const report = query.data;

  return (
    <>
      <PageHeader
        title={report.title}
        description={report.summary}
        crumbs={[{ label: "Evidence" }]}
      />
      <ol className="flex flex-col gap-3">
        {report.evidence.map((e) => (
          <li key={e.id}>
            <Card>
              <CardContent className="flex gap-4">
                {e.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.imageUrl} alt="" className="h-28 w-36 rounded-md object-cover" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground">{e.kind}</p>
                  <p className="font-medium">{e.label}</p>
                  {e.excerpt && <p className="text-sm text-muted-foreground">{e.excerpt}</p>}
                  {e.href && (
                    <Link href={e.href} className="text-sm text-primary hover:underline">
                      Open
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-col gap-1">
        {report.limitations.map((line) => (
          <Note key={line}>{line}</Note>
        ))}
      </div>
    </>
  );
}
