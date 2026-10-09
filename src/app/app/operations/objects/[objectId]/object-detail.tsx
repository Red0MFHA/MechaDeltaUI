"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Field, applyFieldErrors } from "@/components/form-field";
import { PageHeader, Section } from "@/components/page-header";
import { Freshness } from "@/components/provenance";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isServiceError } from "@/lib/contracts/errors";
import { objectLabelSchema, type ObjectLabelValues } from "@/lib/contracts/schemas";
import { displayName } from "@/lib/domain/objects";
import { formatDateTime, formatScore } from "@/lib/format";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";
import { usePreferences } from "@/lib/stores/preferences";

export function ObjectDetail({ id }: { id: string }) {
  const tz = usePreferences((s) => s.timezone);
  const router = useRouter();
  const client = useQueryClient();
  const objectQuery = useQuery({
    queryKey: qk.object(id),
    queryFn: () => getServices().objects.get(id),
  });
  const transitions = useQuery({
    queryKey: qk.transitions(id),
    queryFn: () => getServices().objects.transitions(id),
  });
  const intervals = useQuery({
    queryKey: qk.intervals(id),
    queryFn: () => getServices().objects.intervals(id),
  });
  const events = useQuery({
    queryKey: ["object-events", id],
    queryFn: async () => {
      const object = await getServices().objects.get(id);
      const page = await getServices().events.list({
        sourceId: object.sourceId,
        objectId: id,
        limit: 50,
      });
      return page.items;
    },
  });

  const form = useForm<ObjectLabelValues>({
    resolver: zodResolver(objectLabelSchema),
    values: { slug: objectQuery.data?.slug ?? "" },
  });

  const save = useMutation({
    mutationFn: async (values: ObjectLabelValues) => {
      const photo = (document.getElementById("object-photo") as HTMLInputElement | null)
        ?.files?.[0];
      let photoUrl = objectQuery.data?.photoUrl;
      if (photo) {
        if (photo.size > 300_000)
          throw new Error("The photo is too large. Use an image under 300 KB.");
        photoUrl = await fileToDataUrl(photo);
      }
      return getServices().objects.setLabel(id, { slug: values.slug, photoUrl });
    },
    meta: { silent: true },
    onSuccess: (object) => {
      void client.invalidateQueries({ queryKey: qk.object(id) });
      void client.invalidateQueries({ queryKey: qk.objects(object.sourceId) });
      toast.success(`Name saved as ${displayName(object)}.`);
    },
    onError: (error) => {
      if (isServiceError(error) && applyFieldErrors(error.fieldErrors, form.setError)) return;
      toast.error(error instanceof Error ? error.message : "The name could not be saved.");
    },
  });

  const report = useMutation({
    mutationFn: () => getServices().evidence.createFromObject(id),
    onSuccess: (created) => router.push(`/app/operations/evidence/${created.id}`),
  });

  if (objectQuery.isPending) return <LoadingState label="Loading object" />;
  if (objectQuery.error || !objectQuery.data) {
    return <ErrorState error={objectQuery.error} onRetry={() => void objectQuery.refetch()} />;
  }
  const object = objectQuery.data;
  const loc = object.lastKnownLocation;

  return (
    <>
      <PageHeader
        title={displayName(object)}
        description={`${object.label} · ${object.systemId} is assigned by the pipeline and never replaced.`}
        crumbs={[
          { label: "Events", href: "/app/operations/events" },
          { label: displayName(object) },
        ]}
        meta={
          <>
            <Badge tone={object.identityStatus === "confirmed" ? "success" : "warning"}>
              {object.identityStatus}
            </Badge>
            <Freshness at={object.lastSeenAt} label="Last seen" />
          </>
        }
        actions={
          <Button onClick={() => report.mutate()} disabled={report.isPending}>
            {report.isPending ? "Building report…" : "Evidence report"}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-3">
            {object.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={object.photoUrl} alt="" className="size-40 rounded-md object-cover" />
            ) : (
              <div className="flex size-40 items-center justify-center rounded-md bg-surface-muted text-sm text-muted-foreground">
                No photo
              </div>
            )}
            <form
              className="flex w-full flex-col gap-3"
              onSubmit={form.handleSubmit((v) => save.mutate(v))}
              noValidate
            >
              <Field
                label="Your name (slug)"
                hint="Lowercase, digits, hyphens. Shown next to the system id."
                error={form.formState.errors.slug?.message}
              >
                {(props) => <Input {...props} {...form.register("slug")} placeholder="my-mug" />}
              </Field>
              <Field label="Photo">
                {(props) => <Input {...props} id="object-photo" type="file" accept="image/*" />}
              </Field>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save name"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Section title="Last known place">
            <Card>
              <CardContent>
                {loc ? (
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <Item label="Support" value={loc.support} />
                    <Item label="State version" value={String(loc.stateVersion)} />
                    <Item label="Confidence" value={formatScore(loc.confidence)} />
                    <Item label="Observed" value={formatDateTime(loc.observedAt, tz)} />
                    {loc.x !== undefined && loc.y !== undefined && (
                      <Item
                        label="Map"
                        value={`${loc.x.toFixed(2)}, ${loc.y.toFixed(2)} (${loc.frameId ?? "map"})`}
                      />
                    )}
                    <Item label="Sightings" value={String(object.sightingCount)} />
                  </dl>
                ) : (
                  <EmptyState title="No verified location" className="py-6" />
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Last-seen place is an observation, not a guarantee the object is still there.
                </p>
              </CardContent>
            </Card>
          </Section>

          <Section title="Place changes">
            {(transitions.data ?? []).length === 0 ? (
              <EmptyState title="No confirmed transitions" className="py-6">
                CUP-002 in the demo never changed table. History questions about a previous place
                return insufficient evidence.
              </EmptyState>
            ) : (
              <ul className="flex flex-col gap-2">
                {(transitions.data ?? []).map((t) => (
                  <li key={t.id} id={t.id}>
                    <Card>
                      <CardContent>
                        <p className="font-medium">
                          {t.previousSupport} → {t.newSupport}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Between {formatDateTime(t.tLower, tz)} and {formatDateTime(t.tUpper, tz)}.
                          Cause {t.cause}. Association {formatScore(t.associationScore)}{" "}
                          (uncalibrated).
                        </p>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Observation intervals">
            <ul className="flex flex-col gap-2">
              {(intervals.data ?? []).map((i) => (
                <li key={i.id} id={i.id}>
                  <Card>
                    <CardContent>
                      <p className="font-medium">
                        {i.support} {i.open ? "(open)" : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {i.sightingCount} sightings folded into one interval ·{" "}
                        {formatDateTime(i.firstSeenAt, tz)} – {formatDateTime(i.lastSeenAt, tz)}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Events">
            <ul className="flex flex-col gap-2">
              {(events.data ?? []).map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/app/operations/events?event=${e.id}`}
                    className="text-sm hover:underline"
                  >
                    {e.summary}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The photo could not be read."));
    reader.readAsDataURL(file);
  });
}
