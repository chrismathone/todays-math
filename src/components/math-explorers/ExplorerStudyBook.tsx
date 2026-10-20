"use client";

import { createContext, useContext, type ReactNode } from "react";
import type {
  FadingDailyActivity,
  FadingDailyPlan,
} from "@/contracts/fadingDaily.contract";
import type { JourneyThemeId } from "@/lib/math-explorers/journeyThemes";
import { StudyBook } from "@/components/math-srs/StudyBook";
import { curriculumName } from "@/components/fading/labels";
import { ExplorerMath } from "./ExplorerMath";
import b from "./explorer-study-book.module.css";
import {
  GuideArt,
  GuidePicker,
  GuideReward,
  useExplorerGuide,
} from "./ExplorerGuide";

const StudyUnit = createContext<string | null>(null);

export function DailyStudy({
  plan,
  busy,
  onStart,
  startId,
}: {
  plan: FadingDailyPlan;
  busy: boolean;
  onStart: (activity: FadingDailyActivity) => void;
  startId: string;
}) {
  const next = plan.activities.find((activity) => activity.key === plan.next);
  const done = plan.status === "done" || plan.status === "short";
  const unit = useContext(StudyUnit);
  return (
    <div className={b.study}>
      <h1>{done ? "오늘 공부를 마쳤어요" : "오늘도 한 칸씩 배워요"}</h1>
      {unit ? (
        <p className={b.unit}>
          <ExplorerMath text={curriculumName(unit)} />
        </p>
      ) : null}
      {done ? (
        <>
          <section className={b.result}>
            <h2>오늘 한 것</h2>
            <p>
              개념 {plan.units.recall.done}개 · 문제 {plan.units.question.done}
              개 · 활동 {plan.units.task.done}개
            </p>
          </section>
          <section className={b.result}>
            <h2>내일 할 것</h2>
            <p>기억 복습과 다음 공부를 이어 가요.</p>
          </section>
          <GuideReward />
        </>
      ) : (
        <>
          <p className={b.invitation}>배운 것을 떠올리고, 새 내용을 배워요.</p>
          <div className={b.guide}>
            <GuideArt />
          </div>
          <button
            id={startId}
            type="button"
            className={b.start}
            disabled={busy || !next || next.start === "none"}
            onClick={() => {
              if (next) onStart(next);
            }}
          >
            오늘 공부 시작
          </button>
        </>
      )}
    </div>
  );
}

export function ExplorerStudyBook({
  grade,
  unit,
  theme = "classic",
  study,
  journey,
}: {
  grade: string;
  unit: string;
  theme?: JourneyThemeId;
  study: ReactNode;
  journey: ReactNode;
}) {
  const guide = useExplorerGuide();
  return (
    <StudyBook
      theme={theme}
      leftTitle="오늘 공부"
      rightTitle="나의 수학 여정"
      left={
        <>
          <p className={b.grade}>{grade}</p>
          {guide?.picking ? (
            <GuidePicker />
          ) : (
            <StudyUnit.Provider value={unit}>{study}</StudyUnit.Provider>
          )}
        </>
      }
      right={journey}
    />
  );
}
