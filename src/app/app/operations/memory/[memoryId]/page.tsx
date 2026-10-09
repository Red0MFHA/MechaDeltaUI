import { MemoryDetail } from "./memory-detail";

export const metadata = { title: "Memory item" };

export default async function Page({ params }: PageProps<"/app/operations/memory/[memoryId]">) {
  const { memoryId } = await params;
  return <MemoryDetail id={memoryId} />;
}
