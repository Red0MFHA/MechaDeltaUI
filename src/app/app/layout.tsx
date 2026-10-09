import { Suspense } from "react";

import { SessionGate } from "@/components/session";
import { AppShell } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

function ShellFallback() {
  return (
    <div className="flex min-h-screen" aria-busy="true">
      <span className="sr-only">Loading the console</span>
      <div className="hidden w-60 border-r border-border bg-surface p-4 lg:block">
        <Skeleton className="mb-6 h-6 w-32" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="mb-3 h-5 w-40" />
        ))}
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <SessionGate>
        <AppShell>{children}</AppShell>
      </SessionGate>
    </Suspense>
  );
}
