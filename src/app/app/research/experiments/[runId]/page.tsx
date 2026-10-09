import { RunDetail } from "./run-detail";

export const metadata = { title: "Run" };

export default async function Page({ params }: PageProps<"/app/research/experiments/[runId]">) {
  const { runId } = await params;
  return <RunDetail id={runId} />;
}
