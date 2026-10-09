import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Experiments" };

export default function Page() {
  return (
    <ComingSoon
      title="Experiments"
      description="Draft, queued, running, completed, and failed policy runs."
      fr="FR-32"
    />
  );
}
