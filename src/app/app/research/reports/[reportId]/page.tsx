import { ReportDetail } from "./report-detail";

export const metadata = { title: "Report" };

export default async function Page({ params }: PageProps<"/app/research/reports/[reportId]">) {
  const { reportId } = await params;
  return <ReportDetail id={reportId} />;
}
