import type { Metadata } from "next";
import { redirect } from "next/navigation";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import { fadingEnabled } from "@/lib/fading/enabled";
import { readJourneyTheme } from "@/lib/journeyThemeStore";
import { getStudentSession } from "@/lib/learn/studentRequest";
import { TextbookReturnLink } from "@/components/learn/textbook/TextbookReturnLink";

export const metadata: Metadata = { title: "수학 탐험 · 오늘의수학" };

/** One entry for bank practice, concepts and review, sharing the same expedition. */
export default async function LearnHomePage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string | string[];
    fromTextbook?: string | string[];
  }>;
}) {
  const [student, query] = await Promise.all([
    getStudentSession(),
    searchParams,
  ]);
  if (!student) redirect("/learn/login");
  if (student.mustChangePassword) redirect("/learn/password");
  // 서버 문이 켜져 있으면 학생의 첫 화면은 «오늘의 기억»이다(원장님 2026-10-06). 주소에 딸린 것이 없는 들어오기만 돌린다 —
  // 도감(`view`)과 교재에서 넘어온 길(`fromTextbook`)은 교재 개념백지가 아직 이 화면에 기대고 있어 그대로 둔다.
  if (
    fadingEnabled() &&
    query.view === undefined &&
    query.fromTextbook === undefined
  )
    redirect("/learn/fading");
  const view = query.view === "collection" ? "collection" : undefined;
  // 진도판 테마(학원 전체 한 벌) — 읽다 실패해도 학생 첫 화면은 지금 판으로 뜬다.
  const { theme } = await readJourneyTheme().catch(() => ({
    theme: "classic" as const,
  }));
  return (
    <>
      {query.fromTextbook && (
        <TextbookReturnLink
          studentId={student.studentId}
          value={query.fromTextbook}
        />
      )}
      <StudentMathExplorers
        key={view ?? "home"}
        initialView={view}
        journeyTheme={theme}
      />
    </>
  );
}
