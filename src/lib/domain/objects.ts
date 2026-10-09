import type { ObjectTrack } from "@/lib/contracts/types";

const synonyms: Record<string, string> = {
  mug: "cup",
  cups: "cup",
  mugs: "cup",
  cup: "cup",
};

export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function displayName(object: Pick<ObjectTrack, "systemId" | "slug">) {
  return object.slug ? `${object.slug} (${object.systemId})` : object.systemId;
}

export type ObjectResolution =
  | { status: "resolved"; object: ObjectTrack }
  | { status: "ambiguous"; candidates: ObjectTrack[] }
  | { status: "not_found" };

/** Resolve a free-text reference such as "my mug", "my-mug", or "cup-001". */
export function resolveObject(query: string, objects: ObjectTrack[]): ObjectResolution {
  const raw = normalize(query);
  const q = raw.replace(/^(the|my|a|an|our)\s+/, "");
  if (!q) return { status: "not_found" };

  const bySlug = objects.filter((o) => {
    if (!o.slug) return false;
    const slug = normalize(o.slug);
    return slug === raw || slug === q || slug === `my ${q}`;
  });
  if (bySlug.length === 1) return { status: "resolved", object: bySlug[0] };

  const byId = objects.filter((o) => normalize(o.systemId) === q || normalize(o.systemId) === raw);
  if (byId.length === 1) return { status: "resolved", object: byId[0] };

  const tokens = q.split(" ");
  const bySlugTokens = objects.filter((o) => {
    if (!o.slug) return false;
    const slugTokens = normalize(o.slug).split(" ");
    return tokens.every((t) => slugTokens.includes(t));
  });
  if (bySlugTokens.length === 1) return { status: "resolved", object: bySlugTokens[0] };
  if (bySlugTokens.length > 1) return { status: "ambiguous", candidates: bySlugTokens };

  const labelKey = synonyms[q] ?? q;
  const byLabel = objects.filter((o) => (synonyms[o.label] ?? o.label) === labelKey);
  if (byLabel.length === 1) return { status: "resolved", object: byLabel[0] };
  if (byLabel.length > 1) return { status: "ambiguous", candidates: byLabel };

  return { status: "not_found" };
}

/** Find an object mentioned anywhere in a sentence. */
export function findMentionedObject(text: string, objects: ObjectTrack[]): ObjectResolution {
  const n = ` ${normalize(text)} `;
  const bySlug = objects.filter((o) => o.slug && n.includes(` ${normalize(o.slug)} `));
  if (bySlug.length === 1) return { status: "resolved", object: bySlug[0] };
  if (bySlug.length > 1) return { status: "ambiguous", candidates: bySlug };

  const byId = objects.filter((o) => n.includes(` ${normalize(o.systemId)} `));
  if (byId.length === 1) return { status: "resolved", object: byId[0] };
  if (byId.length > 1) return { status: "ambiguous", candidates: byId };

  const words = n.trim().split(" ");
  const labels = new Set(words.map((w) => synonyms[w]).filter(Boolean));
  if (labels.size > 0) {
    const byLabel = objects.filter((o) => labels.has(synonyms[o.label] ?? o.label));
    if (byLabel.length === 1) return { status: "resolved", object: byLabel[0] };
    if (byLabel.length > 1) return { status: "ambiguous", candidates: byLabel };
  }
  return { status: "not_found" };
}
