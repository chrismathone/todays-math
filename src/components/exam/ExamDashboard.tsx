"use client";

import { useEffect, useState } from "react";

import { AppChrome } from "@/components/chrome/AppChrome";
import { ExamStudyEntry } from "@/components/exam-practice/ExamStudyEntry";

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
    return (
      <AppChrome tab="exam">
        <div className="px-4 pt-4 pb-6 sm:px-6">
          <ExamStudyEntry />
          <p role="status">진행 중인 내신 회차를 불러오는 중입니다…</p>
        </div>
      </AppChrome>
    );
  }

  if (state.status === "error") {
    return (
      <AppChrome tab="exam">
        <div className="mx-5 my-5 rounded-xl border border-[var(--learn-track,#dde3ec)] bg-[var(--learn-surface,#fff)] p-6 text-[14px] text-[var(--learn-ink,#172b4d)]">
          <ExamStudyEntry />
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
        <ExamStudyEntry />
        {/* 시안의 우측 「+ 새 회차」는 회차 생성 API·폼이 없어 넣지 않았다.
            누르면 아무 일도 안 하는 컨트롤을 두는 것이 D-30 이 막는 바로 그 버그다. */}
        <h1 className="border-b border-[var(--learn-track,#dde3ec)] pb-2 text-[18px] font-bold text-[var(--learn-ink,#172b4d)]">
          진행 중인 내신
        </h1>
        {rounds.length === 0 ? (
          <div className="rounded-xl border border-[var(--learn-track,#dde3ec)] bg-[var(--learn-surface,#fff)] p-6 text-[14px] text-[var(--learn-muted,#596c86)]">
            <p>아직 회차가 없습니다.</p>
            <p className="mt-1">
              회차는 같은 학교·학년·과목의 지난 시험지를 근거로 예측을 실행할 때
              만들어집니다.
            </p>
            <p className="mt-1">
              원문을 보관하지 않고 새 문제로 공부하려면 위의 기출 대비 연습을
              이용해 주세요. 예측 회차 이력과 별도로 사용할 수 있습니다.
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
