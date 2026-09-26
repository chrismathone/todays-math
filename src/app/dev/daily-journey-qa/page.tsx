import { connection } from "next/server";
import { notFound } from "next/navigation";
import { StudentMobileNav } from "@/components/learn/StudentMobileNav";
import learn from "@/components/learn/learn.module.css";
import DailyJourneyQaClient from "./DailyJourneyQaClient";

export default async function DailyJourneyQaPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  )
    notFound();
  const count = Number((await searchParams).days ?? 3);
  return (
    <div className={learn.page}>
      <DailyJourneyQaClient
        days={
          Number.isFinite(count)
            ? Math.min(60, Math.max(0, Math.floor(count)))
            : 3
        }
      />
      <StudentMobileNav previewPath="/learn/math-srs" />
    </div>
  );
}
