"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { useSession } from "@/components/session";
import type { RobotSource } from "@/lib/contracts/types";
import { qk } from "@/lib/query/keys";
import { getServices } from "@/lib/services";
import { usePreferences } from "@/lib/stores/preferences";

export function useSources() {
  return useQuery({ queryKey: qk.sources, queryFn: () => getServices().sources.list() });
}

export interface ActiveSourceState {
  source: RobotSource | undefined;
  sources: RobotSource[];
  isPending: boolean;
  error: unknown;
  select: (id: string) => void;
}

/** The source chosen in the top bar. Falls back to the first source when the stored one is gone. */
export function useActiveSource(): ActiveSourceState {
  const session = useSession();
  const { data, isPending, error } = useSources();
  const stored = usePreferences((s) => s.sourceByUser[session.user.id]);
  const setSource = usePreferences((s) => s.setSource);
  const sources = React.useMemo(() => data ?? [], [data]);
  const source = sources.find((s) => s.id === stored) ?? sources[0];
  const select = React.useCallback(
    (id: string) => setSource(session.user.id, id),
    [session.user.id, setSource],
  );
  return { source, sources, isPending, error, select };
}
