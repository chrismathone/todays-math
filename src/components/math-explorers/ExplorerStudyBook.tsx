"use client";

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  FadingDailyActivity,
  FadingDailyPlan,
} from "@/contracts/fadingDaily.contract";
import {
  JOURNEY_THEMES,
  type JourneyThemeId,
} from "@/lib/math-explorers/journeyThemes";
import { curriculumName } from "@/components/fading/labels";
import { ExplorerMath } from "./ExplorerMath";
import b from "./explorer-study-book.module.css";

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
  return (
    <div className={b.study}>
      <h1>{done ? "오늘 공부를 마쳤어요" : "오늘도 한 칸씩 배워요"}</h1>
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
          <div className={b.reward} aria-label="보상 그림 자리">
            오늘의 한 장을 채웠어요
          </div>
        </>
      ) : (
        <>
          {next ? (
            <p className={b.nextName}>
              <ExplorerMath
                text={curriculumName(
                  next.kind === "recall"
                    ? next.terms.join(" · ")
                    : next.source.title,
                )}
              />
            </p>
          ) : (
            <p>지금 시작할 공부를 준비하고 있어요.</p>
          )}
          <div className={b.guide}>
            <div aria-label="길잡이 그림 자리" className={b.guideArt}>
              길잡이
            </div>
            <p>
              떠올려 보고, 풀어 보며
              <br />
              오늘 공부를 이어 가요.
            </p>
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
  const [page, setPage] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const id = useId();
  const image = JOURNEY_THEMES[theme].boardImage;
  return (
    <div
      className={b.book}
      style={
        image
          ? ({ "--study-theme": `url("${image}")` } as CSSProperties)
          : undefined
      }
    >
      <div className={b.tabs} role="group" aria-label="책의 두 면">
        {["오늘 공부", "나의 수학 여정"].map((label, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={page === index}
            aria-controls={`${id}-${index}`}
            onClick={() => setPage(index)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className={b.spread}
        data-testid="study-spread"
        data-page={page}
        onTouchStart={(event) => {
          const first = event.touches[0];
          touch.current = first ? { x: first.clientX, y: first.clientY } : null;
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
        onTouchEnd={(event) => {
          const first = event.changedTouches[0];
          const from = touch.current;
          touch.current = null;
          if (!first || !from) return;
          const dx = first.clientX - from.x;
          const dy = first.clientY - from.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
            setPage(dx < 0 ? 1 : 0);
        }}
      >
        <section
          id={`${id}-0`}
          className={b.leaf}
          data-leaf="0"
          aria-label="오늘 공부"
        >
          <div className={b.band} />
          <div className={b.content}>
            <p className={b.pageTitle}>오늘 공부</p>
            <p className={b.grade}>{grade}</p>
            <p className={b.unit}>
              <ExplorerMath text={curriculumName(unit)} />
            </p>
            {study}
            <button type="button" className={b.turn} onClick={() => setPage(1)}>
              나의 수학 여정 보기
            </button>
          </div>
        </section>
        <section
          id={`${id}-1`}
          className={b.leaf}
          data-leaf="1"
          aria-label="나의 수학 여정"
        >
          <div className={b.band} />
          <div className={b.content}>
            <h2 className={b.pageTitle}>나의 수학 여정</h2>
            {journey}
            <button type="button" className={b.turn} onClick={() => setPage(0)}>
              오늘 공부 보기
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
