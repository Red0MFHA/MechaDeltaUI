import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Tasks" };

export default function Page() {
  return (
    <ComingSoon
      title="Tasks"
      description="Accepted, running, succeeded, failed, and rejected commands."
      fr="FR-20"
    />
  );
}
