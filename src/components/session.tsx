"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";

import { SESSION_EXPIRED_EVENT } from "@/components/providers";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session } from "@/lib/contracts/types";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";

const SessionContext = React.createContext<Session | null>(null);

export function useSession() {
  const session = React.useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside <SessionGate>.");
  return session;
}

export function useSignOut() {
  const router = useRouter();
  const client = useQueryClient();
  return React.useCallback(
    async (reason?: "expired") => {
      await getServices().auth.signOut();
      client.clear();
      router.replace(reason ? `/sign-in?reason=${reason}` : "/sign-in");
    },
    [client, router],
  );
}

/** Loads the session in the browser. The proxy has already rejected requests without a valid cookie. */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const signOut = useSignOut();
  const { data, isPending } = useQuery({
    queryKey: qk.session,
    queryFn: () => getServices().auth.getSession(),
    staleTime: 60_000,
    retry: false,
  });

  React.useEffect(() => {
    const handler = () => void signOut("expired");
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [signOut]);

  React.useEffect(() => {
    if (!isPending && !data) void signOut("expired");
  }, [data, isPending, signOut]);

  if (!data) {
    return (
      <div className="flex min-h-screen" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your session</span>
        <div className="hidden w-60 border-r border-border bg-surface p-4 md:block">
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

  return <SessionContext.Provider value={data}>{children}</SessionContext.Provider>;
}
