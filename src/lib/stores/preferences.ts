"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { TimezonePolicy } from "@/lib/format";

interface PreferencesState {
  timezone: TimezonePolicy;
  /** Selected source per user id. */
  sourceByUser: Record<string, string>;
  /** Run ids picked for comparison. */
  compareRunIds: string[];
  setTimezone: (timezone: TimezonePolicy) => void;
  setSource: (userId: string, sourceId: string) => void;
  setCompareRunIds: (ids: string[]) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      timezone: "local",
      sourceByUser: {},
      compareRunIds: [],
      setTimezone: (timezone) => set({ timezone }),
      setSource: (userId, sourceId) =>
        set((s) => ({ sourceByUser: { ...s.sourceByUser, [userId]: sourceId } })),
      setCompareRunIds: (compareRunIds) => set({ compareRunIds }),
    }),
    {
      name: "md-preferences",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
