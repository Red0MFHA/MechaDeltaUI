import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Overview" };

export default function Page() {
  return (
    <ComingSoon
      title="Overview"
      description="Recent events, tasks, questions, and a RAM snapshot for the selected source."
      fr="FR-10"
    />
  );
}
