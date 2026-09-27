import { connection } from "next/server";
import { notFound } from "next/navigation";
import { StudentMobileNav } from "@/components/learn/StudentMobileNav";
import learn from "@/components/learn/learn.module.css";
import DailyJourneyQaClient from "./DailyJourneyQaClient";

export default async function DailyJourneyQaPage({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string;
    set?: string;
    variant?: string;
    part?: string;
  }>;
}) {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  )
    notFound();
  const query = await searchParams;
  const count = Number(query.days ?? 3);
  const set =
    query.set === "elementary" || query.set === "all" ? query.set : "middle";
  return (
    <div className={learn.page}>
      <DailyJourneyQaClient
        days={
          Number.isFinite(count)
            ? Math.min(60, Math.max(0, Math.floor(count)))
            : 3
        }
        set={set}
        variant={query.variant === "map" ? "map" : "full"}
        part={
          [1, 2, 3, 4].includes(Number(query.part)) ? Number(query.part) : 0
        }
      />
      <StudentMobileNav previewPath="/learn/math-srs" />
    </div>
  );
}
