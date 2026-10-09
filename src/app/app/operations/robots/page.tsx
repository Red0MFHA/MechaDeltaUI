import { Suspense } from "react";

import { LoadingState } from "@/components/states";

import { RobotsPage } from "./robots-page";

export const metadata = { title: "Robots & sources" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState label="Loading sources" />}>
      <RobotsPage />
    </Suspense>
  );
}
