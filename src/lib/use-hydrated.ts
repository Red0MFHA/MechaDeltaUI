import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** False during SSR and the first client render; true after hydration. */
export function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
