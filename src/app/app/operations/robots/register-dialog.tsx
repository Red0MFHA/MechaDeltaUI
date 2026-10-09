"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Field, applyFieldErrors } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { sourceKindLabel } from "@/lib/contracts/catalog";
import { isServiceError } from "@/lib/contracts/errors";
import {
  registerSourceSchema,
  sourceKinds,
  type RegisterSourceValues,
} from "@/lib/contracts/schemas";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

const kindHint: Record<(typeof sourceKinds)[number], string> = {
  recorded_video: "Upload a patrol video after the source is created.",
  live_camera: "HTTP, HTTPS, or RTSP stream URL.",
  ros2_simulation: "ROS bridge WebSocket for the Gazebo or Isaac world.",
  physical_robot:
    "ROS bridge for the lab robot. Connection is attempted only when you click Connect.",
};

export function RegisterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const form = useForm<RegisterSourceValues>({
    resolver: zodResolver(registerSourceSchema),
    defaultValues: {
      name: "",
      kind: "ros2_simulation",
      description: "",
      streamUrl: "",
      rosbridgeUrl: "",
      namespace: "",
      apiToken: "",
    },
  });
  const kind = useWatch({ control: form.control, name: "kind" });

  const mutation = useMutation({
    mutationFn: (values: RegisterSourceValues) =>
      getServices().sources.register({
        name: values.name,
        kind: values.kind,
        description: values.description,
        config: {
          streamUrl: values.streamUrl ?? "",
          rosbridgeUrl: values.rosbridgeUrl ?? "",
          namespace: values.namespace ?? "",
          apiToken: values.apiToken ?? "",
        },
      }),
    meta: { silent: true },
    onSuccess: (source) => {
      void client.invalidateQueries({ queryKey: qk.sources });
      toast.success(`${source.name} registered.`);
      onOpenChange(false);
      form.reset();
      router.push(`/app/operations/robots/${source.id}`);
    },
    onError: (error) => {
      if (isServiceError(error) && applyFieldErrors(error.fieldErrors, form.setError)) return;
      toast.error(isServiceError(error) ? error.message : "The source could not be registered.");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register a robot or source</DialogTitle>
          <DialogDescription>
            Secrets stay on the server. The console only stores a masked hint.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          noValidate
        >
          <Field label="Name" error={form.formState.errors.name?.message} required>
            {(props) => <Input {...props} {...form.register("name")} autoFocus />}
          </Field>
          <Field
            label="Kind"
            hint={kindHint[kind]}
            error={form.formState.errors.kind?.message}
            required
          >
            {(props) => (
              <NativeSelect {...props} {...form.register("kind")}>
                {sourceKinds.map((k) => (
                  <option key={k} value={k}>
                    {sourceKindLabel[k]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Description" error={form.formState.errors.description?.message}>
            {(props) => <Textarea {...props} {...form.register("description")} rows={2} />}
          </Field>
          {kind === "live_camera" && (
            <Field
              label="Stream URL"
              hint="http, https, or rtsp."
              error={form.formState.errors.streamUrl?.message}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  {...form.register("streamUrl")}
                  placeholder="rtsp://camera.lab.local/stream"
                />
              )}
            </Field>
          )}
          {(kind === "ros2_simulation" || kind === "physical_robot") && (
            <>
              <Field
                label="ROS bridge URL"
                hint="ws or wss."
                error={form.formState.errors.rosbridgeUrl?.message}
                required
              >
                {(props) => (
                  <Input
                    {...props}
                    {...form.register("rosbridgeUrl")}
                    placeholder="ws://localhost:9090"
                  />
                )}
              </Field>
              <Field label="Namespace" error={form.formState.errors.namespace?.message}>
                {(props) => <Input {...props} {...form.register("namespace")} placeholder="/tb4" />}
              </Field>
              {kind === "physical_robot" && (
                <Field
                  label="API token"
                  hint="Stored as a secret. Never shown again."
                  error={form.formState.errors.apiToken?.message}
                >
                  {(props) => (
                    <Input
                      {...props}
                      {...form.register("apiToken")}
                      type="password"
                      autoComplete="off"
                    />
                  )}
                </Field>
              )}
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Registering…" : "Register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
