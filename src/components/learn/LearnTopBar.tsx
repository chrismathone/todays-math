"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { LearnStudent } from "@/contracts/studentAccount.contract";

import { postLogout } from "./learnApi";
import s from "./learn.module.css";

/**
 * 학생 화면 윗줄 — «오늘수학» · 이름 · 반 · 나가기 (시안 `sTop`).
 * 나가기는 학생 로그아웃 API(`POST /api/learn/logout`) — 원장님 로그아웃(서버 액션 → `/login`)과 따로다(D-125 ⑷).
 */
export function LearnTopBar({ student }: { student: LearnStudent | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function leave() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    const result = await postLogout();
    // 성공이면 서버가 준 학생 로그인 주소로 · 세션이 이미 없으면(401) 어차피 로그인으로
    if (result.ok || result.status === 401) {
      router.replace(result.ok ? result.data.redirectTo : "/learn/login");
      router.refresh();
      return;
    }
    setPending(false);
    setFailed(true);
  }

  return (
    <header className={s.top}>
      <b>오늘의수학</b>
      <span className={s.who}>
        {student ? (
          <>
            <span>
              {student.name} · {student.className}
            </span>
            <span aria-hidden="true">·</span>
          </>
        ) : null}
        <button
          type="button"
          className={s.textButton}
          onClick={() => void leave()}
          disabled={pending}
        >
          나가기
        </button>
        {failed ? (
          <span role="alert" className={s.error}>
            나가지 못했습니다.
          </span>
        ) : null}
      </span>
    </header>
  );
}
