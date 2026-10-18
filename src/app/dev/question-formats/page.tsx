import { connection } from "next/server";
import { notFound } from "next/navigation";
import QuestionFormatsFixture from "./QuestionFormatsFixture";

export const metadata = {
  title: "문항 형식 · 로컬 검증",
  robots: { index: false, follow: false },
};

export default async function Page() {
  await connection();
  if (process.env.NODE_ENV !== "development") notFound();
  return <QuestionFormatsFixture />;
}
