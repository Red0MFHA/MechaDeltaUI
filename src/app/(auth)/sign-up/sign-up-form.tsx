"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Field, applyFieldErrors } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isServiceError } from "@/lib/contracts/errors";
import { signUpSchema, type SignUpValues } from "@/lib/contracts/schemas";
import { getServices } from "@/lib/services";
import { useHydrated } from "@/lib/use-hydrated";

export function SignUpForm() {
  const ready = useHydrated();
  const router = useRouter();
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: SignUpValues) =>
      getServices().auth.signUp(values.name, values.email, values.password),
    meta: { silent: true },
    onSuccess: () => {
      router.replace("/app/operations/overview");
      router.refresh();
    },
    onError: (error) => {
      if (isServiceError(error) && applyFieldErrors(error.fieldErrors, form.setError)) return;
      form.setError("email", {
        type: "server",
        message: isServiceError(error) ? error.message : "The account could not be created.",
      });
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A new account starts empty. Register a robot or a recording after you sign in.
      </p>
      <form
        className="mt-6 flex flex-col gap-4"
        method="post"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        noValidate
      >
        <Field label="Name" error={form.formState.errors.name?.message} required>
          {(props) => <Input {...props} {...form.register("name")} autoComplete="name" autoFocus />}
        </Field>
        <Field label="Email" error={form.formState.errors.email?.message} required>
          {(props) => (
            <Input {...props} {...form.register("email")} type="email" autoComplete="email" />
          )}
        </Field>
        <Field
          label="Password"
          hint="At least 8 characters."
          error={form.formState.errors.password?.message}
          required
        >
          {(props) => (
            <Input
              {...props}
              {...form.register("password")}
              type="password"
              autoComplete="new-password"
            />
          )}
        </Field>
        <Field label="Confirm password" error={form.formState.errors.confirm?.message} required>
          {(props) => (
            <Input
              {...props}
              {...form.register("confirm")}
              type="password"
              autoComplete="new-password"
            />
          )}
        </Field>
        <Button type="submit" disabled={!ready || mutation.isPending}>
          {mutation.isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
