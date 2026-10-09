import { Suspense } from "react";

import { LoadingState } from "@/components/states";

import { MemoryPage } from "./memory-page";

export const metadata = { title: "Memory" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState label="Loading memory" />}>
      <MemoryPage />
    </Suspense>
  );
}
