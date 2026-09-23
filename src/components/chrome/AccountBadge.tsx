"use client";

import { useEffect, useState } from "react";

import { signOutAction } from "@/app/actions/auth";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * 헤더 계정 구역 — **누구로 로그인했는지 항상 보인다** (D-77).
 *
 * **왜 생겼나 (2026-08-24 실제 사고).** 「출제 실패 — 본인 소유의 데이터만 접근할 수
 * 있습니다」 가 떴는데 원인이 «다른 계정으로 로그인해 있었다» 였다. 그런데 화면에는
 * 내가 누구인지 볼 방법도, 로그아웃할 방법도 없었다. 원인을 짚을 수가 없었다.
 * 그래서 계정은 **접지 않고 늘 펴 둔다** — 눌러야 보이면 같은 사고가 그대로 재발한다.
 *
 * **왜 클라이언트 섬인가.** AppChrome 은 서버 페이지(4곳)와 **클라이언트 컴포넌트**
 * (MainScreen·ExamDashboard·RoundDetail·PreviewClient)가 함께 쓴다. 그래서 AppChrome
 * 안에서 `getSessionUser()` 를 부를 수 없다. 프롭으로 내리는 방법은 호출처가 9곳이라
 * **한 곳만 빠뜨리면 계정이 조용히 안 뜨는데, 그게 바로 이 기능이 막으려는 실패 모양**
 * 이다. 그래서 세션 조회를 이 파일 한 곳에 가둔다.
 *
 * ⚠️ **로그아웃은 세션 조회 성공 여부와 무관하게 늘 그린다.** 세션이 이상할 때
 *    로그아웃까지 같이 사라지면 잘못된 계정에 **갇힌다** — 오늘 사고가 그 상태였다.
 */
export function AccountBadge() {
  // undefined = 조회 중 · null = 세션 없음 · string = 이메일
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((session: { user?: { email?: string } } | null) => {
        if (alive) setEmail(session?.user?.email ?? null);
      })
      .catch(() => {
        if (alive) setEmail(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      {/* 이동(메인·반·문제은행)과 계정을 가르는 구분선 — 워드마크와 같은 어법이다. */}
      <span aria-hidden="true" className="text-xl text-divider">
        │
      </span>
      {email === undefined ? (
        <Skeleton className="h-4 w-28" />
      ) : email ? (
        <span
          data-testid="account-email"
          className="min-w-0 max-w-56 break-all text-xs font-normal text-text-2"
        >
          {email}
        </span>
      ) : null}
      <form action={signOutAction}>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-lg border border-control bg-surface px-3 text-sm font-semibold text-ink hover:bg-side focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-g-blue"
        >
          로그아웃
        </button>
      </form>
    </>
  );
}
