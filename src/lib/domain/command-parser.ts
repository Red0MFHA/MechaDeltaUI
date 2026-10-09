import type { JogDirection, ObjectTrack, Waypoint } from "@/lib/contracts/types";

import { displayName, normalize, resolveObject } from "./objects";

export type UnsupportedReason =
  | "manipulation"
  | "unknown_waypoint"
  | "unknown_object"
  | "ambiguous_object"
  | "no_location"
  | "unrecognized";

export type ParsedCommand =
  | { kind: "jog"; direction: JogDirection; display: string }
  | { kind: "stop"; display: string }
  | { kind: "navigate_waypoint"; waypoint: Waypoint; display: string }
  | { kind: "navigate_last_known"; object: ObjectTrack; display: string }
  | { kind: "unsupported"; reason: UnsupportedReason; message: string };

const MANIPULATION =
  /\b(pick|picks|grab|grasp|lift|place|put|set|bring|carry|fetch|hand|open|close|clean|wipe|pour|push|pull|throw|drop)\b/;

const LAST_SEEN = [
  /\b(?:go|navigate|drive|head|move|return|take me)\s+(?:back\s+)?to\s+(?:the\s+)?(?:place|spot|location|position)?\s*where\s+(?:you\s+)?(?:last\s+)?(?:saw|seen|spotted|observed)\s+(.+)$/,
  /\b(?:go|navigate|drive|head|move)\s+to\s+(?:the\s+)?last\s+(?:known|seen)\s+(?:location|place|position|spot)\s+of\s+(.+)$/,
  /\b(?:go|navigate|drive|head|move)\s+to\s+(?:the\s+)?(?:place|spot|location)\s+(?:of|for)\s+(.+)$/,
];

const JOG: { pattern: RegExp; direction: JogDirection; display: string }[] = [
  {
    pattern: /^(?:(?:move|go|drive|step)\s+)?(?:forward|forwards|ahead|straight)$/,
    direction: "forward",
    display: "Move forward",
  },
  {
    pattern: /^(?:(?:move|go|drive|step)\s+)?(?:back|backward|backwards|reverse)$/,
    direction: "back",
    display: "Move back",
  },
  { pattern: /^(?:look|tilt|camera)\s+up$/, direction: "look_up", display: "Look up" },
  { pattern: /^(?:look|tilt|camera)\s+down$/, direction: "look_down", display: "Look down" },
  { pattern: /^(?:turn|rotate)\s+left$/, direction: "turn_left", display: "Turn left" },
  { pattern: /^(?:turn|rotate)\s+right$/, direction: "turn_right", display: "Turn right" },
];

export interface CommandContext {
  waypoints: Waypoint[];
  objects: ObjectTrack[];
}

export function parseCommand(input: string, context: CommandContext): ParsedCommand {
  const text = normalize(input)
    .replace(/^(please|robot|hey robot|can you|could you)\s+/, "")
    .replace(/\s+please$/, "");

  if (!text) {
    return { kind: "unsupported", reason: "unrecognized", message: "Type a command." };
  }

  if (MANIPULATION.test(text)) {
    return {
      kind: "unsupported",
      reason: "manipulation",
      message:
        "This robot has a camera and memory but no arm. Picking up, placing, or carrying objects is not supported.",
    };
  }

  if (/^(stop|halt|cancel|abort)\b/.test(text)) {
    return { kind: "stop", display: "Stop" };
  }

  for (const jog of JOG) {
    if (jog.pattern.test(text))
      return { kind: "jog", direction: jog.direction, display: jog.display };
  }

  for (const pattern of LAST_SEEN) {
    const match = text.match(pattern);
    if (!match) continue;
    const reference = match[1].trim();
    const resolution = resolveObject(reference, context.objects);
    if (resolution.status === "not_found") {
      return {
        kind: "unsupported",
        reason: "unknown_object",
        message: `No remembered object matches “${reference}”. Use its name or id, for example ${exampleObject(context.objects)}.`,
      };
    }
    if (resolution.status === "ambiguous") {
      return {
        kind: "unsupported",
        reason: "ambiguous_object",
        message: `More than one object matches “${reference}”: ${resolution.candidates
          .map(displayName)
          .join(", ")}. Name one of them.`,
      };
    }
    if (!resolution.object.lastKnownLocation) {
      return {
        kind: "unsupported",
        reason: "no_location",
        message: `There is no verified location stored for ${displayName(resolution.object)}.`,
      };
    }
    return {
      kind: "navigate_last_known",
      object: resolution.object,
      display: `Go to where ${displayName(resolution.object)} was last seen (${resolution.object.lastKnownLocation.support})`,
    };
  }

  const goTo = text.match(
    /\b(?:go|navigate|drive|head|move|return)\s+(?:back\s+)?to\s+(?:the\s+)?(.+)$/,
  );
  if (goTo) {
    const target = goTo[1].trim();
    const waypoint = context.waypoints.find(
      (w) => normalize(w.label) === target || normalize(w.id) === target,
    );
    if (waypoint) {
      return { kind: "navigate_waypoint", waypoint, display: `Go to ${waypoint.label}` };
    }
    return {
      kind: "unsupported",
      reason: "unknown_waypoint",
      message: `“${target}” is not a known waypoint on this robot.${
        context.waypoints.length
          ? ` Known waypoints: ${context.waypoints.map((w) => w.label).join(", ")}.`
          : " This robot has no waypoints."
      }`,
    };
  }

  return {
    kind: "unsupported",
    reason: "unrecognized",
    message:
      "This command is not supported. Try “move forward”, “look down”, “go to Table-A”, or “go to where you last saw my-mug”.",
  };
}

function exampleObject(objects: ObjectTrack[]) {
  const first = objects[0];
  if (!first) return "CUP-001";
  return first.slug ?? first.systemId;
}
