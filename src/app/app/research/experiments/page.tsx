import { Suspense } from "react";

import { LoadingState } from "@/components/states";

import { ExperimentsPage } from "./experiments-page";

export const metadata = { title: "Experiments" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState label="Loading experiments" />}>
      <ExperimentsPage />
    </Suspense>
  );
}
