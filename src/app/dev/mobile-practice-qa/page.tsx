import { notFound } from "next/navigation";
import { connection } from "next/server";
import { StudentMobileNav } from "@/components/learn/StudentMobileNav";
import learn from "@/components/learn/learn.module.css";
import MobilePracticeQaClient from "./MobilePracticeQaClient";

export default async function MobilePracticeQaPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }
  const rawKind = (await searchParams).kind;
  const kind =
    typeof rawKind === "string" &&
    [
      "choice",
      "long",
      "embedded",
      "fraction4",
      "fraction12",
      "path",
      "selfcheck",
    ].includes(rawKind)
      ? rawKind
      : "choice";
  return (
    <div className={learn.page}>
      <MobilePracticeQaClient kind={kind} />
      <StudentMobileNav previewPath="/learn/math-srs" />
    </div>
  );
}
