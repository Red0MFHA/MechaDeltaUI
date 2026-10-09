import { describe, expect, it } from "vitest";

import type { ObjectTrack } from "@/lib/contracts/types";

import { displayName, findMentionedObject, resolveObject } from "./objects";

const track = (id: string, systemId: string, label: string, slug?: string): ObjectTrack => ({
  id,
  systemId,
  sourceId: "s",
  runId: "r",
  label,
  slug,
  identityStatus: "confirmed",
  sightingCount: 1,
  eventIds: [],
  transitionIds: [],
  intervalIds: [],
});

const objects = [
  track("a", "CUP-001", "cup", "my-mug"),
  track("b", "CUP-002", "cup"),
  track("c", "BOTTLE-001", "bottle", "blue-bottle"),
];

describe("displayName", () => {
  it("keeps the system id next to the slug", () => {
    expect(displayName(objects[0])).toBe("my-mug (CUP-001)");
    expect(displayName(objects[1])).toBe("CUP-002");
  });
});

describe("resolveObject", () => {
  it("matches slugs with or without hyphens and articles", () => {
    expect(resolveObject("my mug", objects)).toMatchObject({
      status: "resolved",
      object: { id: "a" },
    });
    expect(resolveObject("the blue-bottle", objects)).toMatchObject({ object: { id: "c" } });
  });

  it("matches system ids case-insensitively", () => {
    expect(resolveObject("cup-002", objects)).toMatchObject({ object: { id: "b" } });
  });

  it("reports ambiguity for shared labels", () => {
    expect(resolveObject("cup", objects)).toMatchObject({ status: "ambiguous" });
  });

  it("returns not_found for unknown names", () => {
    expect(resolveObject("laptop", objects)).toEqual({ status: "not_found" });
  });
});

describe("findMentionedObject", () => {
  it("finds a slug inside a sentence", () => {
    expect(findMentionedObject("where was my-mug before?", objects)).toMatchObject({
      object: { id: "a" },
    });
  });

  it("finds a system id inside a sentence", () => {
    expect(findMentionedObject("when did CUP-002 arrive", objects)).toMatchObject({
      object: { id: "b" },
    });
  });
});
