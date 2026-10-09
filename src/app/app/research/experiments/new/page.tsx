import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "New experiment" };

export default function Page() {
  return (
    <ComingSoon
      title="New experiment"
      description="Pick a policy, workload, source, and payload RAM budget."
      fr="FR-33"
    />
  );
}
