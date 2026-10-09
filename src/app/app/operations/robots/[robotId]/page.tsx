import { SourceDetail } from "./source-detail";

export const metadata = { title: "Source" };

export default async function Page({ params }: PageProps<"/app/operations/robots/[robotId]">) {
  const { robotId } = await params;
  return <SourceDetail id={robotId} />;
}
