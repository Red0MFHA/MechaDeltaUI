import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Task" };

export default function Page() {
  return (
    <ComingSoon
      title="Task detail"
      description="Status history and the reason a command was rejected or failed."
      fr="FR-20"
    />
  );
}
