"use client";

import { AlertTriangleIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center" role="alert">
      <AlertTriangleIcon className="size-8 text-danger" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The console hit an unexpected error. Your data was not changed. Try again, or go back to
        overview.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">Ref {error.digest}</p>
      )}
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" onClick={() => router.push("/app/operations/overview")}>
          Go to overview
        </Button>
      </div>
    </div>
  );
}
