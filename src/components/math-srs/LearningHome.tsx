"use client";

import { useState } from "react";
import { CONCEPTS } from "@/lib/math-srs/concepts";
import { estimatedRecall } from "@/lib/math-srs/memory";
import { learningInsights } from "@/lib/math-srs/insights";
import type { ConceptId, Learner, Mission } from "@/lib/math-srs/types";
import s from "./math-srs.module.css";

const marks: Record<ConceptId, string> = {
  balance: "=",
  "two-step": "2x",
  distribute: "( )",
  "both-sides": "⇄",
  fractions: "½",
  word: "Aa",
};
const dayLabel = (date: string) =>
  new Date(date).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  });

export function LearningHome({
  learner,
  mission,
  now,
  onStart,
}: {
  learner: Learner;
  mission?: Mission;
  now: Date;
  onStart: () => void;
}) {
  const [onlyDue, setOnlyDue] = useState(false);
  const stats = learningInsights(learner, now);
  const dueIds = new Set(
    learner.memories
      .filter(
        (memory) =>
          memory.attempts > 0 &&
          memory.nextReviewAt &&
          new Date(memory.nextReviewAt) <= now,
      )
      .map((memory) => memory.conceptId),
  );
  const assessed = learner.memories.filter((memory) => memory.attempts > 0);
  const recall = assessed.length
    ? Math.round(
        assessed.reduce(
          (sum, memory) => sum + estimatedRecall(memory, now),
          0,
        ) / assessed.length,
      )
    : null;
  const answered = mission?.attempts.length ?? 0;
  const total = mission?.problems.length ?? 12;
  const nextConcept = mission?.problems[answered]?.conceptId;
  const maxDayCount = Math.max(1, ...stats.week.map((day) => day.count));

  return (
    <>
      <div className={s.greeting}>
        <div>
          <p className={s.eyebrow}>매일 수학 복습</p>
          <h1>오늘의 기억</h1>
          <p>{learner.name}님의 수학이 오래 남도록.</p>
        </div>
        <p className={s.date}>
          {now.toLocaleDateString("ko-KR", {
            timeZone: "Asia/Seoul",
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
          <span>중학교 1학년 · 일차방정식</span>
        </p>
      </div>

      <div className={s.homeGrid}>
        <section
          className={s.missionHero}
          aria-labelledby="daily-mission-title"
        >
          <div className={s.heroCopy}>
            <div className={s.heroTop}>
              <span className={s.heroLabel}>오늘의 복습</span>
              <span>
                {mission?.completedAt
                  ? "미션 완료"
                  : answered
                    ? "이어서 학습"
                    : "나에게 맞춘 12문제"}
              </span>
            </div>
            <h2 id="daily-mission-title">
              {mission?.completedAt ? (
                <>
                  오늘의 노력,
                  <br />
                  기억에 남았어요.
                </>
              ) : answered ? (
                <>
                  좋아요, 여기서
                  <br />
                  이어가 볼까요?
                </>
              ) : (
                <>
                  한 번 더 꺼내면,
                  <br />더 오래 남으니까.
                </>
              )}
            </h2>
            <p>
              {mission?.completedAt
                ? "다시 꺼낸 생각이 내일의 실력이 됩니다."
                : answered
                  ? `${total - answered}문제 남았어요. 내 속도대로 마무리해요.`
                  : "쉬운 문제부터 시작해, 잊어가는 개념을 다시 만나요."}
            </p>
            <div className={s.heroMeta}>
              <span>약 10–15분</span>
              <span>힌트와 단계별 풀이</span>
            </div>
            <button type="button" className={s.heroButton} onClick={onStart}>
              {mission?.completedAt
                ? "오늘의 결과 보기"
                : answered
                  ? `미션 이어하기 · ${answered}/${total}`
                  : "오늘의 미션 시작"}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className={s.missionVisual} aria-hidden="true">
            <div className={s.tileGrid}>
              {Array.from({ length: total }, (_, index) => (
                <span
                  key={index}
                  data-state={
                    index < answered
                      ? "done"
                      : index === answered
                        ? "current"
                        : "waiting"
                  }
                >
                  {index < answered ? "✓" : String(index + 1).padStart(2, "0")}
                </span>
              ))}
            </div>
            <p>
              <b>{answered}</b>
              <span> / {total}</span>
            </p>
            <span>한 문제씩, 차곡차곡</span>
          </div>
          <div className={s.heroFoot}>
            <span>
              <i aria-hidden="true" />
              {mission?.completedAt
                ? "오늘의 미션을 모두 마쳤어요"
                : nextConcept
                  ? `다음 개념 · ${CONCEPTS.find((concept) => concept.id === nextConcept)?.title}`
                  : "워밍업 → 개념 복습 → 마지막 도전"}
            </span>
            <span>
              {answered} / {total} 완료
            </span>
          </div>
        </section>

        <section className={s.weekly} aria-labelledby="weekly-heading">
          <div className={s.panelHeading}>
            <h2 id="weekly-heading">나의 학습 리듬</h2>
            <span className={s.small}>최근 7일</span>
          </div>
          <p className={s.weekHeadline}>
            <b>{stats.activeDays}</b>
            <span>일의 작은 꾸준함</span>
          </p>
          <ol className={s.weekBars} aria-label="최근 7일 풀이 기록">
            {stats.week.map((day) => (
              <li
                key={day.date}
                data-today={day.today}
                aria-label={`${day.date}, ${day.count}문제${day.today ? ", 오늘" : ""}`}
              >
                <span className={s.dayCount}>{day.count || "—"}</span>
                <div className={s.dayTrack} aria-hidden="true">
                  <i
                    style={{
                      height: day.count
                        ? `${Math.max(12, (day.count / maxDayCount) * 100)}%`
                        : "4px",
                    }}
                    data-active={day.count > 0}
                  />
                </div>
                <span>{day.today ? "오늘" : day.label}</span>
              </li>
            ))}
          </ol>
          <div className={s.weekSummary}>
            <span>
              이번 7일 <b>{stats.weeklyAttempts}문제</b>
            </span>
            <span>
              완료 미션 <b>{stats.completed}회</b>
            </span>
          </div>
          <p className={s.small}>
            {stats.activeDays
              ? "짧게라도 다시 떠올린 시간이 쌓이고 있어요."
              : "첫 문제를 풀면 나만의 리듬이 시작돼요."}
          </p>
        </section>
      </div>

      <div className={s.learningWorkspace}>
        <section
          className={s.memorySection}
          id="srs-memory"
          aria-labelledby="memory-heading"
        >
          <div className={s.panelHeading}>
            <div>
              <p className={s.eyebrow}>개념별 복습 현황</p>
              <h2 id="memory-heading">지금, 나의 개념 기억</h2>
            </div>
            <span className={s.recallSummary}>
              {recall === null ? (
                "첫 기록을 기다려요"
              ) : (
                <>
                  평균 <b>{recall}%</b>
                </>
              )}
            </span>
          </div>
          <div className={s.memoryFilters} aria-label="개념 보기">
            <button
              type="button"
              aria-pressed={!onlyDue}
              onClick={() => setOnlyDue(false)}
            >
              전체 개념 <span>6</span>
            </button>
            <button
              type="button"
              aria-pressed={onlyDue}
              onClick={() => setOnlyDue(true)}
            >
              복습할 개념 <span>{dueIds.size}</span>
            </button>
            <span>개념을 누르면 학습 기록을 볼 수 있어요</span>
          </div>
          <div className={s.memoryGrid}>
            {CONCEPTS.filter(
              (concept) => !onlyDue || dueIds.has(concept.id),
            ).map((concept) => {
              const memory = learner.memories.find(
                (item) => item.conceptId === concept.id,
              )!;
              const measured = memory.attempts > 0;
              const value = measured ? estimatedRecall(memory, now) : 0;
              const due = dueIds.has(concept.id);
              return (
                <details
                  key={`${learner.id}-${concept.id}`}
                  className={s.conceptCard}
                >
                  <summary>
                    <div className={s.conceptTop}>
                      <span className={s.conceptMark} aria-hidden="true">
                        {marks[concept.id]}
                      </span>
                      <span className={s.conceptStatus} data-due={due}>
                        {!measured
                          ? "시작 전"
                          : due
                            ? "복습할 때"
                            : value < 70
                              ? "쌓아가는 중"
                              : "잘 기억해요"}
                      </span>
                    </div>
                    <h3>{concept.title}</h3>
                    <div className={s.conceptScore}>
                      {measured ? (
                        <>
                          <b>{value}</b>
                          <span>%</span>
                        </>
                      ) : (
                        <>
                          <b>—</b>
                          <span>측정 전</span>
                        </>
                      )}
                      <span className={s.expandMark} aria-hidden="true">
                        ↗
                      </span>
                    </div>
                    <div className={s.meter} aria-hidden="true">
                      <i style={{ width: `${value}%` }} />
                    </div>
                    <span className={s.srOnly}> · 학습 기록 펼치기</span>
                  </summary>
                  <div className={s.conceptDetail}>
                    <p>{concept.description}</p>
                    {measured ? (
                      <dl>
                        <div>
                          <dt>숙련도</dt>
                          <dd>{Math.round(memory.mastery)} / 100</dd>
                        </div>
                        <div>
                          <dt>개념 확인</dt>
                          <dd>{memory.attempts}회</dd>
                        </div>
                        <div>
                          <dt>최근 복습</dt>
                          <dd>
                            {memory.lastReviewedAt
                              ? dayLabel(memory.lastReviewedAt)
                              : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt>다음 권장 복습</dt>
                          <dd>
                            {due
                              ? "지금 복습해요"
                              : memory.nextReviewAt
                                ? dayLabel(memory.nextReviewAt)
                                : "—"}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p>미션에서 이 개념을 풀면 기록이 생겨요.</p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
          {onlyDue && dueIds.size === 0 ? (
            <div className={s.emptyState}>
              <span aria-hidden="true">↗</span>
              <h3>지금 예정된 복습은 없어요.</h3>
              <p>오늘의 미션으로 다른 개념도 차근차근 확인해요.</p>
              <button
                type="button"
                className={s.textButton}
                onClick={() => setOnlyDue(false)}
              >
                전체 개념 보기 →
              </button>
            </div>
          ) : null}
          <p className={s.memoryNote}>
            예상 기억률은 풀이 결과와 지난 시간을 반영한 추정값이에요. 숙련도와
            최근 기록을 함께 확인해 주세요.
          </p>
        </section>

        <aside className={s.learningAside}>
          <section className={s.rhythmNote} aria-labelledby="rhythm-heading">
            <p className={s.eyebrow}>오늘의 학습 흐름</p>
            <h2 id="rhythm-heading">
              잘하는 것보다,
              <br />
              다시 해보는 습관.
            </h2>
            <ol className={s.rhythm}>
              <li>
                <span>01</span>
                <div>
                  <b>가볍게 시작하고</b>
                  <p>익숙한 계산으로 감을 깨워요.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <b>잊기 전에 꺼내 보고</b>
                  <p>기억이 흐려지는 개념을 다시 만나요.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <b>한 걸음 더 도전해요</b>
                  <p>틀린 문제도 다음 복습의 길잡이가 돼요.</p>
                </div>
              </li>
            </ol>
            <span className={s.rhythmSymbol} aria-hidden="true">
              x + you
            </span>
          </section>
        </aside>
      </div>

      {stats.attempts.length > 0 ? (
        <section className={s.recentSection} aria-labelledby="recent-heading">
          <div className={s.panelHeading}>
            <div>
              <p className={s.eyebrow}>최근 학습</p>
              <h2 id="recent-heading">방금 쌓은 기억들</h2>
            </div>
            <span className={s.small}>최근 5문제</span>
          </div>
          <ol className={s.recentCards}>
            {stats.attempts
              .slice(-5)
              .reverse()
              .map((attempt, index) => (
                <li key={`${attempt.problemId}-${index}`}>
                  <span
                    className={s.outcomeMark}
                    data-correct={attempt.correct}
                    aria-hidden="true"
                  >
                    {attempt.correct ? "✓" : "↺"}
                  </span>
                  <div>
                    <b>
                      {
                        CONCEPTS.find(
                          (concept) => concept.id === attempt.conceptId,
                        )?.title
                      }
                    </b>
                    <span>
                      {attempt.correct
                        ? attempt.usedHint
                          ? "힌트와 함께 해결"
                          : "스스로 해결"
                        : "다음에 다시 도전"}
                    </span>
                  </div>
                  <small>{Math.round(attempt.elapsedSeconds)}초</small>
                </li>
              ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
