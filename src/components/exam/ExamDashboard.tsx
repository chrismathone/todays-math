"use client";

import { useEffect, useState } from "react";

import { AppChrome } from "@/components/chrome/AppChrome";
import { ExamListSkeleton } from "@/components/ui/PageSkeletons";

import type { ExamRoundSummary } from "./examScreen.contract";
import { loadExamRounds } from "./examApi";
import { RoundRow } from "./RoundRow";
import { sortRounds } from "./viewModel";

/**
 * '오늘의 시험' 계기판 (S-T70 · D-39 확정).
 *
 * 진행 중인 내신 회차를 큰 순번 + D-day 로 세운다. 반·진도 단위로 도는 '오늘의 수학'과 달리
 * 이 축의 단위는 **학교 내신 1회차**다(05 §8.7).
 */
type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rounds: ExamRoundSummary[] };

export function ExamDashboard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadExamRounds()
      .then((rounds) => {
        if (!cancelled) setState({ status: "ready", rounds });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error", message: "회차를 불러오지 못했습니다" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  if (state.status === "loading") {
    return <ExamListSkeleton />;
  }

  if (state.status === "error") {
    return (
      <AppChrome tab="exam">
        <div className="mx-5 my-5 rounded-xl border border-[var(--learn-track,#dde3ec)] bg-[var(--learn-surface,#fff)] p-6 text-[14px] text-[var(--learn-ink,#172b4d)]">
          <h1 className="text-[18px] font-bold">회차를 확인할 수 없습니다</h1>
          <p role="alert" className="mt-2 text-[var(--learn-muted,#596c86)]">
            {state.message}
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 min-h-11 rounded-lg border border-[var(--learn-accent,#3159df)] bg-[var(--learn-accent,#3159df)] px-4 font-semibold text-white hover:bg-[var(--learn-accent-hover,#2448bd)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--learn-focus,#82a1ff)]"
          >
            다시 불러오기
          </button>
        </div>
      </AppChrome>
    );
  }

  const rounds = sortRounds(state.rounds);

  return (
    <AppChrome tab="exam">
      <div className="px-4 pt-4 pb-6 sm:px-6">
        {/* 시안의 우측 「+ 새 회차」는 회차 생성 API·폼이 없어 넣지 않았다.
            누르면 아무 일도 안 하는 컨트롤을 두는 것이 D-30 이 막는 바로 그 버그다. */}
        <h1 className="border-b border-[var(--learn-track,#dde3ec)] pb-2 text-[18px] font-bold text-[var(--learn-ink,#172b4d)]">
          진행 중인 내신
        </h1>
        {rounds.length === 0 ? (
          /*
            🔴 **문구가 할 수 없는 일을 시켰다** (UI-03, 2026-09-08).
            종전 문구는 「예측을 실행하면 여기에 쌓입니다」였는데, **실행할 자리가
            화면 어디에도 없다.** 처음 여는 사람은 어디서 눌러야 하는지 찾다가 만다.

            실측(2026-09-08 공유 DB): `Exam` **1편** · `ExamQuestion` **19** ·
            `PredictionRun` **0**. 곧 지금은 화면이 부족한 게 아니라 **근거로 쓸 기출이
            없다.** 예측을 돌리는 길도 `POST /api/predictions` 하나뿐이고 CLI 도 없다.

            그래서 버튼을 만들지 않는다(D-30 — 누르면 아무 일도 안 하는 컨트롤을 두는 것이
            이 규칙이 막는 바로 그 버그다). 대신 **무엇이 있어야 회차가 생기는지**를 적는다.
            기출이 쌓이고 실행 경로가 생기면 그때 이 문구와 함께 진입점을 만든다.
          */
          <div className="rounded-xl border border-[var(--learn-track,#dde3ec)] bg-[var(--learn-surface,#fff)] p-6 text-[14px] text-[var(--learn-muted,#596c86)]">
            <p>아직 회차가 없습니다.</p>
            <p className="mt-1">
              회차는 같은 학교·학년·과목의 지난 시험지를 근거로 예측을 실행할 때
              만들어집니다.
            </p>
            <p className="mt-1">
              지금은 기출 적재가 먼저이고, 예측을 실행하는 화면은 아직 없습니다.
            </p>
          </div>
        ) : (
          rounds.map((round, i) => (
            <RoundRow key={round.id} round={round} index={i + 1} />
          ))
        )}
      </div>
    </AppChrome>
  );
}
