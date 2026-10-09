import { QuestionDetail } from "./question-detail";

export const metadata = { title: "Question" };

export default async function Page({ params }: PageProps<"/app/operations/ask/[questionId]">) {
  const { questionId } = await params;
  return <QuestionDetail id={questionId} />;
}
