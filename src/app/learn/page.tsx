import type { Metadata } from "next";
import { redirect } from "next/navigation";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import { fadingEnabled } from "@/lib/fading/enabled";
import { readJourneyTheme } from "@/lib/journeyThemeStore";
import { getStudentSession } from "@/lib/learn/studentRequest";
import { TextbookReturnLink } from "@/components/learn/textbook/TextbookReturnLink";

export const metadata: Metadata = { title: "수학 탐험 · 오늘 수학" };

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
  // 탐험이 학생의 기본 화면이다. 새 개념 복습은 이 화면 안에서 열며,
  // 기존 진도·풀이 기록과 새 복습 기록은 각자의 저장 경로를 유지한다.
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
        student
        key={view ?? "home"}
        initialView={view}
        journeyTheme={theme}
        conceptMemoryEnabled={fadingEnabled()}
      />
    </>
  );
}
