import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Memory item" };

export default function Page() {
  return (
    <ComingSoon
      title="Memory item"
      description="Size, hashes, freshness, and the ledger events for one record."
      fr="FR-27"
    />
  );
}
