import { EvidencePage } from "./evidence-page";

export const metadata = { title: "Evidence" };

export default async function Page({ params }: PageProps<"/app/operations/evidence/[evidenceId]">) {
  const { evidenceId } = await params;
  return <EvidencePage id={evidenceId} />;
}
