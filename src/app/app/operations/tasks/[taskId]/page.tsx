import { TaskDetail } from "./task-detail";

export const metadata = { title: "Task" };

export default async function Page({ params }: PageProps<"/app/operations/tasks/[taskId]">) {
  const { taskId } = await params;
  return <TaskDetail id={taskId} />;
}
