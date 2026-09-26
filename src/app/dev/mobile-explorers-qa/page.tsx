import { notFound } from "next/navigation";
import { connection } from "next/server";
import learn from "@/components/learn/learn.module.css";
import { StudentMobileNav } from "@/components/learn/StudentMobileNav";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";

export default async function MobileExplorersQaPage() {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  )
    notFound();
  return (
    <div className={learn.page}>
      <StudentMathExplorers />
      <StudentMobileNav previewPath="/learn/math-explorers" />
    </div>
  );
}
