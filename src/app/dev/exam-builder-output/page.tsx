import { notFound } from "next/navigation";
import { connection } from "next/server";
import ExamBuilderOutput from "./ExamBuilderOutput";

export const metadata = {
  title: "시험지 출력 시안 · 임시 편집",
  robots: { index: false, follow: false },
};

export default async function Page() {
  await connection();
  if (process.env.NODE_ENV !== "development") notFound();
  return <ExamBuilderOutput />;
}
