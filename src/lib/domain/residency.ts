import type {
  FoldedItem,
  KeptItem,
  MemoryLedgerEvent,
  ObjectTrack,
  ObservationInterval,
  ReleasedItem,
  ResidencyState,
} from "@/lib/contracts/types";

import { displayName } from "./objects";

const nameOf = (object: ObjectTrack | undefined, fallback: string) =>
  object ? displayName(object) : fallback;

export interface PayloadInfo {
  memoryId: string;
  objectId: string;
  decodedBytes: number;
  support: string;
  stateVersion: number;
}

export interface ResidencyInput {
  ledger: MemoryLedgerEvent[];
  payloads: PayloadInfo[];
  objects: ObjectTrack[];
  intervals: ObservationInterval[];
  perceptionFloorBytes?: number;
  anchorBytesPerObject?: number;
}

export interface ResidencyOutput {
  kept: KeptItem[];
  released: ReleasedItem[];
  folded: FoldedItem[];
  residentPayloadBytes: number;
  payloadState: Record<string, ResidencyState>;
  stalePayloads: Set<string>;
}

/** A saved payload is stale when its place or state version no longer matches the verified state. */
export function isStale(payload: PayloadInfo, object: ObjectTrack | undefined) {
  const loc = object?.lastKnownLocation;
  if (!loc) return false;
  return loc.stateVersion !== payload.stateVersion || loc.support !== payload.support;
}

export function deriveResidency(input: ResidencyInput): ResidencyOutput {
  const objectsById = new Map(input.objects.map((o) => [o.id, o]));
  const payloadsById = new Map(input.payloads.map((p) => [p.memoryId, p]));
  const resident = new Map<string, { bytes: number; since: string }>();
  const released: ReleasedItem[] = [];
  const everEvicted = new Set<string>();

  const events = [...input.ledger]
    .filter((e) => e.memoryId && payloadsById.has(e.memoryId))
    .sort((a, b) => a.sequence - b.sequence);

  for (const event of events) {
    const payload = payloadsById.get(event.memoryId!)!;
    if (event.eventType === "loaded" || event.eventType === "reloaded") {
      resident.set(payload.memoryId, {
        bytes: event.ramBytes ?? payload.decodedBytes,
        since: event.occurredAt,
      });
      const open = [...released]
        .reverse()
        .find((r) => r.memoryId === payload.memoryId && !r.reloadedAt);
      if (open) open.reloadedAt = event.occurredAt;
    }
    if (event.eventType === "evicted") {
      const entry = resident.get(payload.memoryId);
      resident.delete(payload.memoryId);
      everEvicted.add(payload.memoryId);
      released.push({
        id: `rel-${event.id}`,
        objectId: payload.objectId,
        memoryId: payload.memoryId,
        bytes: event.ramBytes ?? entry?.bytes ?? payload.decodedBytes,
        releasedAt: event.occurredAt,
        stillOnDisk: true,
        stale: isStale(payload, objectsById.get(payload.objectId)),
      });
    }
  }

  const stalePayloads = new Set(
    input.payloads.filter((p) => isStale(p, objectsById.get(p.objectId))).map((p) => p.memoryId),
  );

  const kept: KeptItem[] = [];
  if (input.perceptionFloorBytes !== undefined) {
    kept.push({
      id: "kept-floor",
      kind: "perception_floor",
      label: "Perception floor: detector, tracker, embeddings, live frame",
      bytes: input.perceptionFloorBytes,
      note: "Reserved. History and payloads may only use memory above this floor.",
    });
  }
  for (const object of input.objects) {
    kept.push({
      id: `kept-anchor-${object.id}`,
      kind: "anchor",
      label: `Anchor for ${displayName(object)}: identity, embedding, latest transition`,
      objectId: object.id,
      bytes: input.anchorBytesPerObject,
      since: object.firstSeenAt,
    });
  }
  for (const [memoryId, entry] of resident) {
    const payload = payloadsById.get(memoryId)!;
    kept.push({
      id: `kept-${memoryId}`,
      kind: "payload",
      label: `Decoded payload for ${nameOf(objectsById.get(payload.objectId), payload.objectId)} (saved at ${payload.support})`,
      objectId: payload.objectId,
      bytes: entry.bytes,
      since: entry.since,
      note: stalePayloads.has(memoryId)
        ? "Stale: the object moved after this payload was saved."
        : undefined,
    });
  }

  const payloadState: Record<string, ResidencyState> = {};
  for (const p of input.payloads) {
    payloadState[p.memoryId] = resident.has(p.memoryId)
      ? "resident"
      : everEvicted.has(p.memoryId)
        ? "evicted"
        : "persistent_only";
  }

  const folded: FoldedItem[] = input.intervals
    .filter((i) => i.sightingCount > 1)
    .map((i) => ({
      id: `fold-${i.id}`,
      objectId: i.objectId,
      support: i.support,
      intervalId: i.id,
      sightingCount: i.sightingCount,
      firstSeenAt: i.firstSeenAt,
      lastSeenAt: i.lastSeenAt,
    }));

  return {
    kept,
    released,
    folded,
    residentPayloadBytes: [...resident.values()].reduce((sum, e) => sum + e.bytes, 0),
    payloadState,
    stalePayloads,
  };
}
