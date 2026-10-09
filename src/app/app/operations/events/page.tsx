import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Events" };

export default function Page() {
  return (
    <ComingSoon
      title="Events"
      description="Observation history with type, time, and linked objects."
      fr="FR-14"
    />
  );
}
