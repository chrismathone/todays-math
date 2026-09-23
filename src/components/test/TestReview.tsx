"use client";

import { useCallback } from "react";
import Link from "next/link";
import RouteLinkStatus from "@/components/ui/RouteLinkStatus";

import { useUnitGrades } from "@/components/problem/useUnitGrades";
import { Button } from "@/components/ui/Button";
import { OwnerTag } from "@/components/ui/OwnerTag";
import { TestReviewContentSkeleton } from "@/components/ui/PageSkeletons";

import { ReviewProblemCard } from "./ReviewProblemCardLazy";
import { useTestReview } from "./useTestReview";

type Props = {
  testId: string;
};

/** 상태를 사람 말로. 시험 상태 열거형과 한 곳에서 짝짓는다. */
const TEST_STATUS_TEXT: Record<string, string> = {
  draft: "초안",
  confirmed: "확정됨",
  printed: "인쇄함",
};

export function TestReview({ testId }: Props) {
  const {
    state,
    replace,
    confirm,
    retry,
    replacingSeq,
    confirming,
    busy,
    replacedCount,
    actionError,
  } = useTestReview(testId);
  const grades = useUnitGrades();

  // 카드마다 새 화살표 함수를 만들면 ReviewProblemCard 의 memo 가 죽는다 —
  // 번호는 카드가 인자로 돌려주고, 여기서는 고정된 함수 하나만 넘긴다.
  const replaceProblem = useCallback(
    (orderIndex: number) => void replace(orderIndex),
    [replace],
  );

  if (state.status === "loading") {
    return <TestReviewContentSkeleton />;
  }

  if (state.status === "notfound" || state.status === "error") {
    return (
      <main className="px-4 py-6 sm:px-8">
        <p role="alert" className="text-[14px] text-g-red-text">
          {state.status === "notfound"
            ? "테스트를 찾을 수 없습니다"
            : state.message}
        </p>
        <div className="mt-3 flex items-center gap-2">
          {state.status === "error" ? (
            <Button variant="ink" onClick={retry}>
              다시 불러오기
            </Button>
          ) : null}
          <Link
            href="/"
            className="inline-flex min-h-11 items-center px-3 text-[14px] font-bold text-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-g-blue"
          >
            오늘의 테스트로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const draft = state.test.status === "draft";

  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col">
      <main className="flex-1 pb-20">
        {/*
          검수 머리말 — **무엇을 보고 있는가**를 문항을 읽기 전에 알린다
          (UI-06, 원장님 결정 2026-09-08 · 안 B).

          종전에는 「검수」와 「8문항」뿐이라, 여러 반의 시험을 연속으로 처리하면
          문항 내용을 기억해야 대상을 알 수 있었다.

          🔴 **학생 이름이 반드시 있어야 한다.** 학생별 출제가 있어 같은 반·같은 날·
             같은 유형의 시험이 학생 수만큼 생긴다 — 반 이름만 적으면 그것들이 전부
             똑같이 보인다(2026-09-08 협의에서 드러났다).

          ⚠️ 「확정이 왜 비활성인가」는 여기 안 적는다. 그 답은 **버튼 옆**에 있어야
             한다 — 이 화면은 아래로 길어서 머리말은 스크롤 밖으로 나간다.
        */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-4 sm:px-8">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--learn-ink,#172b4d)]">
              {state.studentName
                ? `${state.className} · ${state.studentName}`
                : state.className}
              {/* 담당 — 서버가 실어 보낼 때만(관리자, D-132). 화면만 — 인쇄 지면에는 없다(⑺) */}
              {state.classOwner ? (
                <OwnerTag owner={state.classOwner} className="ml-2" />
              ) : null}
            </h1>
            <p className="mt-1 text-[14px] text-[var(--learn-muted,#596c86)]">
              {state.test.testType === "review" ? "확인테스트" : "일일테스트"} ·{" "}
              {state.test.testDate} · {state.problems.length}문항 ·{" "}
              {TEST_STATUS_TEXT[state.test.status] ?? state.test.status}
            </p>
          </div>
        </div>
        <div>
          {state.problems.map((item) => (
            <ReviewProblemCard
              key={item.id}
              orderIndex={item.orderIndex}
              problem={item.problem}
              grade={grades.get(item.problem.unitId)}
              replacing={busy}
              onReplace={draft ? replaceProblem : undefined}
            />
          ))}
        </div>
      </main>
      <footer className="sticky bottom-0 flex flex-wrap items-center gap-4 border-t border-[var(--learn-track,#dde3ec)] bg-[var(--learn-soft,#edf2ff)] px-4 py-3 sm:px-8">
        <span className="text-[14px] text-[var(--learn-muted,#596c86)] tabular-nums">
          교체 {replacedCount}
        </span>
        {actionError ? (
          <p role="alert" className="text-[14px] font-semibold text-g-red-text">
            {actionError}
          </p>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {/*
            비활성 사유를 **버튼 옆**에 적는다 (UI-06). 비활성 버튼만 두면 「이미 끝난
            것인지, 무엇이 모자란 것인지」를 알 수 없다.

            교체·확정은 서로 기다린다. 처리 중인 문항 번호도 여기서 알린다.
          */}
          <p
            role="status"
            className="text-[14px] text-[var(--learn-muted,#596c86)]"
          >
            {replacingSeq !== null
              ? `문 ${replacingSeq} 교체 중입니다. 교체가 끝나면 확정할 수 있습니다`
              : confirming
                ? "확정을 처리하는 중입니다"
                : !draft
                  ? "확정된 시험은 문항을 바꿀 수 없습니다"
                  : "확정 후 인쇄할 수 있습니다"}
          </p>
          <Button
            variant="ink"
            disabled={!draft || busy}
            onClick={() => void confirm()}
          >
            확정
          </Button>
          {draft ? (
            <Button variant="ghost" disabled>
              인쇄
            </Button>
          ) : (
            <Link
              href={`/tests/${testId}/print`}
              className="inline-flex min-h-11 min-w-[44px] items-center justify-center px-3 text-[14px] font-bold text-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-g-blue"
            >
              인쇄
            </Link>
          )}
          {/*
            채점 진입점 — **이 한 자리뿐**이다 (D-134 트랙 1 · 브리프 §1.3).

            🔴 **초안에는 안 보인다.** 아직 나가지 않은 시험지라 채점할 것이 없다. 감추는 것으로
               끝내지 않고 서버도 같은 규칙을 든다(`lib/testResults/gradeSheet.ts` — 초안이면 422).
               화면만 막으면 경로가 열린 채로 남아 「확정 전에 이미 본 시험」이 생긴다.
            ⚠️ 메인 «오늘의 확인테스트» 줄에는 붙이지 않았다 — 지난주에 크게 고친 자리다(D-133).
               붙일 자리 제안은 보고서 ⑤.
          */}
          {draft ? null : (
            <Link
              href={`/tests/${testId}/grade`}
              className="inline-flex min-h-11 min-w-[44px] items-center justify-center px-3 text-[14px] font-bold text-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-g-blue"
            >
              채점
              <RouteLinkStatus />
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
