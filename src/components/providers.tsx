"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import * as React from "react";
import { toast, Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { describeError, isServiceError } from "@/lib/contracts/errors";
import { dataMode } from "@/lib/services";
import { subscribeScenario } from "@/lib/services/mock/scenario";
import { usePreferences } from "@/lib/stores/preferences";

export const SESSION_EXPIRED_EVENT = "md-session-expired";

function onUnauthorized(error: unknown) {
  if (isServiceError(error) && error.code === "unauthorized") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

function makeClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: onUnauthorized }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        onUnauthorized(error);
        if (mutation.meta?.silent) return;
        const { title, detail } = describeError(error);
        toast.error(title, { description: detail });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
        retry: (count, error) =>
          count < 1 &&
          !(
            isServiceError(error) &&
            ["unauthorized", "forbidden", "not_found", "unsupported", "validation_error"].includes(
              error.code,
            )
          ),
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(makeClient);

  React.useEffect(() => {
    void usePreferences.persist.rehydrate();
  }, []);

  React.useEffect(() => {
    if (dataMode !== "mock") return;
    return subscribeScenario(() => {
      void client.invalidateQueries();
    });
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <NuqsAdapter>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
