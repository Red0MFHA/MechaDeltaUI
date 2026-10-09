import { Suspense } from "react";

import { LoadingState } from "@/components/states";

import { EventsPage } from "./events-page";

export const metadata = { title: "Events" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState label="Loading events" />}>
      <EventsPage />
    </Suspense>
  );
}
