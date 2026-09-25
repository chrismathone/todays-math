import { notFound } from "next/navigation";
import learn from "@/components/learn/learn.module.css";
import { connection } from "next/server";
import StudentCourseSrs from "@/components/math-srs/StudentCourseSrs";
import { StudentMobileNav } from "@/components/learn/StudentMobileNav";

export default async function MobileElementaryReviewQaPage() {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }
  return (
    <div className={learn.page}>
      <StudentCourseSrs />
      <StudentMobileNav previewPath="/learn/math-srs" />
    </div>
  );
}
