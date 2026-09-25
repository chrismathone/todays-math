import { notFound } from "next/navigation";
import learn from "@/components/learn/learn.module.css";
import { connection } from "next/server";
import { StudentMathSrs } from "@/components/math-srs/StudentMathSrs";
import { StudentMobileNav } from "@/components/learn/StudentMobileNav";

export default async function MobileMiddleReviewQaPage() {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }
  return (
    <div className={learn.page}>
      <StudentMathSrs />
      <StudentMobileNav previewPath="/learn/math-srs/algebra" />
    </div>
  );
}
