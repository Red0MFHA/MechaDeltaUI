"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Field, applyFieldErrors } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isServiceError } from "@/lib/contracts/errors";
import { signInSchema, type SignInValues } from "@/lib/contracts/schemas";
import { DEMO_ACCOUNT } from "@/lib/auth/demo";
import { getServices } from "@/lib/services";
import { useHydrated } from "@/lib/use-hydrated";

export function SignInForm() {
  const ready = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app/operations/overview";
  const reason = params.get("reason");
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: SignInValues) => getServices().auth.signIn(values.email, values.password),
    meta: { silent: true },
    onSuccess: () => {
      router.replace(next.startsWith("/app") ? next : "/app/operations/overview");
      router.refresh();
    },
    onError: (error) => {
      if (isServiceError(error) && applyFieldErrors(error.fieldErrors, form.setError)) return;
      form.setError("password", {
        type: "server",
        message: isServiceError(error) ? error.message : "Sign-in failed. Try again.",
      });
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Open the robot console. Use the demo account, or an account you created here.
      </p>
      {reason === "expired" && (
        <p
          className="mt-4 rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning"
          role="status"
        >
          Your session expired. Sign in again to continue.
        </p>
      )}
      <form
        className="mt-6 flex flex-col gap-4"
        method="post"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        noValidate
      >
        <Field label="Email" error={form.formState.errors.email?.message} required>
          {(props) => (
            <Input
              {...props}
              {...form.register("email")}
              type="email"
              autoComplete="email"
              autoFocus
            />
          )}
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message} required>
          {(props) => (
            <Input
              {...props}
              {...form.register("password")}
              type="password"
              autoComplete="current-password"
            />
          )}
        </Field>
        <Button type="submit" disabled={!ready || mutation.isPending}>
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
        Demo account: <span className="font-mono text-foreground">{DEMO_ACCOUNT.email}</span> /{" "}
        <span className="font-mono text-foreground">{DEMO_ACCOUNT.password}</span>
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        Need an account?{" "}
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
