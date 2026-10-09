import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().min(1, "Enter your email.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const sourceKinds = [
  "recorded_video",
  "live_camera",
  "ros2_simulation",
  "physical_robot",
] as const;

export const registerSourceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Use at least 2 characters.")
      .max(60, "Use at most 60 characters."),
    kind: z.enum(sourceKinds),
    description: z.string().trim().max(200, "Use at most 200 characters.").optional(),
    streamUrl: z.string().trim().optional(),
    rosbridgeUrl: z.string().trim().optional(),
    namespace: z.string().trim().optional(),
    apiToken: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const requireUrl = (
      field: "streamUrl" | "rosbridgeUrl",
      label: string,
      protocols: string[],
    ) => {
      const raw = value[field];
      if (!raw) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${label} is required.`,
        });
        return;
      }
      try {
        const url = new URL(raw);
        if (!protocols.includes(url.protocol)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `Use ${protocols.map((p) => p.replace(":", "://")).join(" or ")}.`,
          });
        }
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Enter a valid URL." });
      }
    };
    if (value.kind === "live_camera")
      requireUrl("streamUrl", "Stream URL", ["http:", "https:", "rtsp:"]);
    if (value.kind === "ros2_simulation" || value.kind === "physical_robot") {
      requireUrl("rosbridgeUrl", "ROS bridge URL", ["ws:", "wss:"]);
    }
  });
export type RegisterSourceValues = z.infer<typeof registerSourceSchema>;

export const editSourceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(60, "Use at most 60 characters."),
  description: z.string().trim().max(200, "Use at most 200 characters.").optional(),
});
export type EditSourceValues = z.infer<typeof editSourceSchema>;

export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;

export const ingestionSchema = z.object({
  sourceId: z.string().min(1, "Choose a recording source."),
  frameRate: z.coerce.number().int().min(1, "At least 1 FPS.").max(30, "At most 30 FPS."),
  detector: z.enum(["yoloe-11s", "yolo11n"]),
  reidThreshold: z.coerce
    .number()
    .min(0.5, "Use a value between 0.50 and 0.95.")
    .max(0.95, "Use a value between 0.50 and 0.95."),
});
export type IngestionValues = z.infer<typeof ingestionSchema>;

export function validateVideoFile(file: { name: string; size: number; type: string }) {
  if (!ACCEPTED_VIDEO_TYPES.includes(file.type as (typeof ACCEPTED_VIDEO_TYPES)[number])) {
    return "Unsupported file type. Use MP4, WebM, or MOV.";
  }
  if (file.size <= 0) return "The file is empty.";
  if (file.size > MAX_VIDEO_BYTES) return "The file is larger than the 2 GiB limit.";
  return null;
}

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const objectLabelSchema = z.object({
  slug: z
    .string()
    .trim()
    .max(32, "Use at most 32 characters.")
    .refine(
      (v) => v === "" || slugPattern.test(v),
      "Use lowercase letters, digits, and single hyphens.",
    ),
});
export type ObjectLabelValues = z.infer<typeof objectLabelSchema>;

export const questionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Ask a longer question.")
    .max(300, "Use at most 300 characters."),
});
export type QuestionValues = z.infer<typeof questionSchema>;

export const commandSchema = z.object({
  command: z.string().trim().min(2, "Type a command.").max(200, "Use at most 200 characters."),
});
export type CommandValues = z.infer<typeof commandSchema>;

export const experimentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(80, "Use at most 80 characters."),
  policyId: z.string().min(1, "Choose a policy."),
  workloadId: z.string().min(1, "Choose a workload."),
  sourceId: z.string().min(1, "Choose a source."),
  ramBudgetMiB: z.coerce
    .number()
    .min(0.5, "Use a budget between 0.5 and 4096 MiB.")
    .max(4096, "Use a budget between 0.5 and 4096 MiB."),
  workloadSize: z.coerce
    .number()
    .int()
    .min(1, "At least 1 question.")
    .max(500, "At most 500 questions."),
  notes: z.string().trim().max(500, "Use at most 500 characters.").optional(),
});
export type ExperimentValues = z.infer<typeof experimentSchema>;

export const reportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(100, "Use at most 100 characters."),
  runIds: z.array(z.string()).min(1, "Select at least one run."),
});
export type ReportValues = z.infer<typeof reportSchema>;
