import { Suspense } from "react";

import { LoadingState } from "@/components/states";

import { TasksPage } from "./tasks-page";

export const metadata = { title: "Tasks" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState label="Loading tasks" />}>
      <TasksPage />
    </Suspense>
  );
}
