import type {
  AnswerKind,
  EvidenceReference,
  ObjectTrack,
  ObservationInterval,
  Transition,
} from "@/lib/contracts/types";
import { formatTime } from "@/lib/format";

import { displayName as name, findMentionedObject, normalize } from "./objects";

export type QuestionIntent = "previous" | "when" | "cause" | "current" | "count" | "unknown";

export function detectIntent(question: string): QuestionIntent {
  const q = ` ${normalize(question)} `;
  if (
    / (who|why|cause|caused|somebody|someone|anybody|anyone|person) /.test(q) ||
    / see .* mov/.test(q)
  ) {
    return "cause";
  }
  if (/ how many times | how often | count /.test(q)) return "count";
  if (/ when | what time /.test(q)) return "when";
  if (/ (before|previous|previously|originally|earlier|used to|was it|where was) /.test(q))
    return "previous";
  if (/ (now|currently|current|where is|last seen|last saw|right now) /.test(q)) return "current";
  return "unknown";
}

export interface QaInput {
  question: string;
  sourceId: string;
  objects: ObjectTrack[];
  transitions: Transition[];
  intervals: ObservationInterval[];
  contextObjectIds?: string[];
  timeRange?: { from?: string; to?: string };
}

export interface QaOutput {
  status: "completed" | "insufficient_evidence";
  answerKind: AnswerKind;
  answer: string;
  resolvedObjectId?: string;
  currentPlace?: string;
  previousPlace?: string;
  answeredWithoutPayload: boolean;
  evidence: EvidenceReference[];
  confidence?: number;
  limitations: string[];
}

function within(iso: string, range?: { from?: string; to?: string }) {
  if (!range) return true;
  const t = new Date(iso).getTime();
  if (range.from && t < new Date(range.from).getTime()) return false;
  if (range.to && t > new Date(range.to).getTime()) return false;
  return true;
}

function transitionRef(t: Transition, sourceId: string): EvidenceReference {
  return {
    id: t.id,
    kind: "transition",
    label: `Transition ${t.previousSupport} → ${t.newSupport}`,
    sourceId,
    occurredAt: t.confirmedAt,
    href: `/app/operations/objects/${t.objectId}#${t.id}`,
    excerpt: `Observed between ${formatTime(t.tLower, "utc")} and ${formatTime(t.tUpper, "utc")}; association ${t.associationScore.toFixed(3)} (uncalibrated).`,
    available: true,
  };
}

function intervalRef(i: ObservationInterval, sourceId: string): EvidenceReference {
  return {
    id: i.id,
    kind: "memory",
    label: `Interval at ${i.support}${i.open ? " (open)" : ""}`,
    sourceId,
    occurredAt: i.lastSeenAt,
    href: `/app/operations/objects/${i.objectId}#${i.id}`,
    excerpt: `${i.sightingCount} sightings folded into one interval, ${formatTime(i.firstSeenAt, "utc")}–${formatTime(i.lastSeenAt, "utc")}.`,
    available: true,
  };
}

function cropRef(t: Transition, sourceId: string): EvidenceReference | null {
  if (!t.evidenceId) return null;
  return {
    id: t.evidenceId,
    kind: "crop",
    label: "Evidence crop at confirmation",
    sourceId,
    occurredAt: t.confirmedAt,
    imageUrl: `/demo/evidence/${t.evidenceId}.svg`,
    available: true,
  };
}

export function answerQuestion(input: QaInput): QaOutput {
  const intent = detectIntent(input.question);

  let object: ObjectTrack | undefined;
  if (input.contextObjectIds?.length === 1) {
    object = input.objects.find((o) => o.id === input.contextObjectIds![0]);
  }
  if (!object) {
    const mention = findMentionedObject(input.question, input.objects);
    if (mention.status === "resolved") object = mention.object;
    if (mention.status === "ambiguous") {
      return insufficient(
        `More than one object matches: ${mention.candidates.map(name).join(", ")}. Name one, or pick it in the context filter.`,
      );
    }
  }
  if (!object) {
    return insufficient(
      "The question does not name an object the memory knows. Use its name or id, for example CUP-001.",
    );
  }

  const transitions = input.transitions
    .filter((t) => t.objectId === object.id && within(t.confirmedAt, input.timeRange))
    .sort((a, b) => a.confirmedAt.localeCompare(b.confirmedAt));
  const latest = transitions.at(-1);
  const intervals = input.intervals.filter((i) => i.objectId === object.id);
  const openInterval = intervals.find((i) => i.open);
  const current = object.lastKnownLocation?.support;
  const base = {
    resolvedObjectId: object.id,
    currentPlace: current,
    answeredWithoutPayload: true,
  };

  if (intent === "cause") {
    const evidence = latest ? [transitionRef(latest, input.sourceId)] : [];
    return {
      ...base,
      status: "completed",
      answerKind: "cause_unknown",
      previousPlace: latest?.previousSupport,
      answer: latest
        ? `No mover was observed. The memory recorded that ${name(object)} changed place from ${latest.previousSupport} to ${latest.newSupport}, but the cause is unknown.`
        : `No change was recorded for ${name(object)}, and no mover was observed.`,
      evidence,
      limitations: ["The cause field stays unknown unless an observation supports it."],
    };
  }

  if (intent === "current" || intent === "unknown") {
    if (!current)
      return {
        ...insufficient(`No verified location is stored for ${name(object)}.`),
        resolvedObjectId: object.id,
      };
    return {
      ...base,
      status: "completed",
      answerKind: "from_current_state",
      previousPlace: latest?.previousSupport,
      answer: `${name(object)} was last seen at ${current} (${formatTime(object.lastKnownLocation!.observedAt, "utc")}).`,
      evidence: openInterval ? [intervalRef(openInterval, input.sourceId)] : [],
      confidence: object.lastKnownLocation?.confidence,
      limitations: ["Last-seen place is an observation, not a guarantee it is still there."],
    };
  }

  if (!latest) {
    return {
      ...insufficient(
        `No confirmed transition is stored for ${name(object)}${input.timeRange ? " in the selected time range" : ""}. The memory can say where it is now (${current ?? "unknown"}), not where it was before.`,
      ),
      resolvedObjectId: object.id,
      currentPlace: current,
    };
  }

  const evidence = [transitionRef(latest, input.sourceId)];
  const crop = cropRef(latest, input.sourceId);
  if (crop) evidence.push(crop);
  const before = intervals.find((i) => i.support === latest.previousSupport && !i.open);
  if (before) evidence.push(intervalRef(before, input.sourceId));

  if (intent === "count") {
    return {
      ...base,
      status: "completed",
      answerKind: "from_transition",
      previousPlace: latest.previousSupport,
      answer: `${name(object)} changed place ${transitions.length} time${transitions.length === 1 ? "" : "s"} in the stored history.`,
      evidence,
      confidence: latest.associationScore,
      limitations: ["Counts only confirmed transitions; unconfirmed sightings are excluded."],
    };
  }

  if (intent === "when") {
    return {
      ...base,
      status: "completed",
      answerKind: "from_transition",
      previousPlace: latest.previousSupport,
      answer: `Between ${formatTime(latest.tLower, "utc")} and ${formatTime(latest.tUpper, "utc")}. That is the last sighting at ${latest.previousSupport} and the first at ${latest.newSupport}; the exact moment of the move was not observed.`,
      evidence,
      confidence: latest.associationScore,
      limitations: ["Bounds are observation times, not the exact movement time."],
    };
  }

  return {
    ...base,
    status: "completed",
    answerKind: "from_transition",
    previousPlace: latest.previousSupport,
    answer: `${name(object)} was at ${latest.previousSupport} before it moved to ${latest.newSupport}.`,
    evidence,
    confidence: latest.associationScore,
    limitations: ["Association score is an uncalibrated similarity."],
  };
}

function insufficient(answer: string): QaOutput {
  return {
    status: "insufficient_evidence",
    answerKind: "insufficient_evidence",
    answer,
    answeredWithoutPayload: true,
    evidence: [],
    limitations: ["The stored history does not support an answer."],
  };
}
