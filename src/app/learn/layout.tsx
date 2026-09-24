import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import s from "@/components/learn/learn.module.css";
import { StudentMobileNav } from "@/components/learn/StudentMobileNav";

/**
 * «오늘의 개념» 학생 전용 주소(D-125 ⑷) — 로그인 · 첫 비밀번호 · 목록 · 재생 네 장.
 * 학생 세션은 이 주소 아래만 다닌다(관문 `src/lib/studentRouteAccess.ts` — 허용 목록). 서버 액션은 없다 —
 * 학생 쪽 쓰기는 전부 `/api/learn/**` 다(learn-screens 브리프 §2).
 * 화면은 휴대폰이 먼저이고, 넓은 화면에서는 가운데 한 줄로 선다(05 §8.9 학생 화면).
 */
export const metadata: Metadata = {
  title: "오늘의 개념",
};

export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <div className={s.page}>
      {children}
      <Suspense fallback={null}>
        <StudentMobileNav />
      </Suspense>
    </div>
  );
}
