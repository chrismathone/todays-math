import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import s from "@/components/learn/learn.module.css";
import { StudentMobileNav } from "@/components/learn/StudentMobileNav";
import { TestConsole } from "@/components/learn/TestConsole";
import { fadingEnabled } from "@/lib/fading/enabled";
import { getStudentSession } from "@/lib/learn/studentRequest";
import { testConsoleLoginId } from "@/lib/learn/testConsoleServer";

/**
 * «오늘의 개념» 학생 전용 주소(D-125 ⑷) — 로그인 · 첫 비밀번호 · 목록 · 재생 네 장.
 * 학생 세션은 이 주소 아래만 다닌다(관문 `src/lib/studentRouteAccess.ts` — 허용 목록). 서버 액션은 없다 —
 * 학생 쪽 쓰기는 전부 `/api/learn/**` 다(learn-screens 브리프 §2).
 * 화면은 휴대폰이 먼저이고, 넓은 화면에서는 가운데 한 줄로 선다(05 §8.9 학생 화면).
 */
export const metadata: Metadata = {
  title: "오늘의 개념",
};

/** 시험용 학생 계정(`test_s`)이면 테스트 도구판을 싣는다(원장님 2026-09-28). 판정이 실패하면 안 싣는다. */
async function showTestConsole(): Promise<boolean> {
  try {
    const student = await getStudentSession();
    return student ? !!(await testConsoleLoginId(student.studentId)) : false;
  } catch {
    return false;
  }
}

export default async function LearnLayout({
  children,
}: {
  children: ReactNode;
}) {
  const testConsole = await showTestConsole();
  return (
    <div className={s.page}>
      {children}
      <Suspense fallback={null}>
        <StudentMobileNav fading={fadingEnabled()} />
      </Suspense>
      {testConsole && <TestConsole />}
    </div>
  );
}
