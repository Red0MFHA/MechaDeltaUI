"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center text-zinc-900">
        <h1 className="text-2xl font-semibold">MechaDelta could not load</h1>
        <p className="max-w-md text-sm text-zinc-600">
          The console hit an unexpected error. Your data was not changed.
        </p>
        {error.digest && <p className="font-mono text-xs text-zinc-500">Ref {error.digest}</p>}
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
