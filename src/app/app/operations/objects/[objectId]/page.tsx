import { ObjectDetail } from "./object-detail";

export const metadata = { title: "Object" };

export default async function Page({ params }: PageProps<"/app/operations/objects/[objectId]">) {
  const { objectId } = await params;
  return <ObjectDetail id={objectId} />;
}
