"use client";

import * as React from "react";

import { Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ControlProps {
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/** Label, hint, and error wiring for one form control. */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const id = React.useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Copies server-side field errors onto a react-hook-form instance. */
export function applyFieldErrors(
  fieldErrors: Record<string, string> | undefined,
  setError: (name: never, error: { type: string; message: string }) => void,
) {
  if (!fieldErrors) return false;
  for (const [name, message] of Object.entries(fieldErrors)) {
    setError(name as never, { type: "server", message });
  }
  return Object.keys(fieldErrors).length > 0;
}
