"use client";

import { useState } from "react";
import type {
  ExplorerAction,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";
import DailyJourneyBoard, {
  type DailyJourney,
} from "@/components/math-srs/DailyJourneyBoard";
import { kstDateOf } from "@/lib/kstDate";
import { ExplorerChests } from "./ExplorerPieces";
import s from "./math-explorers.module.css";

export type ExplorerCard = ExplorerState["units"][number]["cards"][number];
export const gradeLabel = (grade: number) =>
  grade < 7 ? `초등 ${grade}학년` : `중학교 ${grade - 6}학년`;

export function explorerJourney(state: ExplorerState): DailyJourney {
  const today = kstDateOf(new Date());
  const completed = [...state.completedDays].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const todayComplete = completed.some((day) => day.date === today);
  const course = state.units.filter(
    (unit) => unit.grade === state.profile.courseGrade,
  );
  const target =
    state.session && !state.session.done
      ? state.session.unitId
      : (state.profile.goalUnitId ??
        course.find((unit) => unit.cards.some((card) => !card.progress?.level))
          ?.id ??
        course[0]?.id);
  const start = Math.max(
    0,
    course.findIndex((unit) => unit.id === target),
  );
  return {
    completedDays: completed.length,
    todayComplete,
    todayAnswered: todayComplete
      ? 15
      : !state.session || state.session.reviewOnly
        ? 0
        : state.session.round > 0 || state.session.done
          ? 15
          : state.session.index,
    todayGoal: 15,
    days: completed.map((day) => {
      const unit = state.units.find((candidate) => candidate.id === day.unitId);
      return {
        id: `explorers:${day.date}`,
        date: day.date,
        completedAt: day.date,
        title: unit?.title ?? "개념 탐험",
        subtitle: unit ? gradeLabel(unit.grade) : "지난 학습",
        reviewCount: 15,
      };
    }),
    upcoming: course
      .slice(start)
      .map((unit) => ({ title: unit.title, subtitle: gradeLabel(unit.grade) })),
  };
}

export default function ExplorerHome({
  state,
  busy,
  onAction,
  onResume,
  onInspect,
}: {
  state: ExplorerState;
  busy: boolean;
  onAction: (action: ExplorerAction) => void;
  onResume: () => void;
  onInspect: (card: ExplorerCard) => void;
}) {
  const [tab, setTab] = useState<"board" | "collection" | "memory">("board");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const active = !!state.session && !state.session.done;
  const units = state.units.filter(
    (unit) => unit.grade === state.profile.courseGrade,
  );
  const cards = units.flatMap((unit) => unit.cards);
  const allCards = state.units.flatMap((unit) => unit.cards);
  const currentUnit =
    units.find(
      (unit) =>
        unit.id === (active ? state.session?.unitId : state.profile.goalUnitId),
    ) ??
    units.find((unit) => unit.cards.some((card) => !card.progress?.level)) ??
    units[0];
  const selectedUnit =
    units.find((unit) => unit.id === selectedUnitId) ?? currentUnit;
  const collected = cards.filter(
    (card) => (card.progress?.level ?? 0) > 0,
  ).length;
  const courseDue = cards.filter((card) => state.dueCardIds.includes(card.id));
  const courseWeak = cards.filter((card) =>
    state.weakCardIds.includes(card.id),
  );
  const unitCollected = selectedUnit.cards.filter(
    (card) => (card.progress?.level ?? 0) > 0,
  ).length;
  const onStart = (unitId: string) => {
    if (active) onResume();
    else onAction({ type: "start", route: "unit", unitId });
  };

  return (
    <div className={s.home}>
      <div className={s.homeSummary}>
        <span>뜻을 알고, 예를 고르고, 다시 기억해요.</span>
        <span
          className={s.stars}
          aria-label={`모은 별 ${state.profile.stars}개`}
        >
          ✦ {state.profile.stars}
        </span>
      </div>
      <div className={s.grades} aria-label="학년별 개념 코스">
        {[3, 4, 5, 6, 7, 8, 9].map((grade) => (
          <button
            type="button"
            key={grade}
            aria-pressed={state.profile.courseGrade === grade}
            disabled={busy || active}
            onClick={() => {
              setSelectedUnitId(null);
              onAction({ type: "course", grade });
            }}
          >
            {grade < 7 ? `초${grade}` : `중${grade - 6}`}
          </button>
        ))}
      </div>
      {active ? (
        <p className={s.quietNote}>
          진행 중인 탐험을 마치면 학년을 바꿀 수 있어요.
        </p>
      ) : null}
      <div className={s.homeTabs} role="group" aria-label="개념 탐험 화면">
        {(
          [
            ["board", "진도판"],
            ["collection", `개념 도감 ${collected}/${cards.length}`],
            ["memory", "기억 복습"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "board" ? (
        <>
          <section className={s.base} aria-label="우리 기지 키우기">
            <div
              className={s.baseArt}
              data-level={state.profile.level}
              aria-hidden="true"
            >
              <svg viewBox="0 0 100 80" fill="none">
                <path d="M14 61 50 45l36 16-36 17Z" fill="#d6e6f8" />
                <path
                  d="M26 34 50 18l24 16v28H26V34Z"
                  fill="#dbe8ff"
                  stroke="#6586bd"
                  strokeWidth="2"
                />
                <path
                  d="M19 35 50 11l31 24"
                  stroke="#3159bd"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M44 62V44h12v18" fill="#7299d6" />
                <rect
                  x="33"
                  y="34"
                  width="8"
                  height="8"
                  rx="2"
                  fill="#fff0ad"
                />
                <rect
                  x="59"
                  y="34"
                  width="8"
                  height="8"
                  rx="2"
                  fill="#fff0ad"
                />
                {state.profile.level > 0 ? (
                  <path
                    d="M70 12V2m0 0 14 5-14 5"
                    stroke="#d5a641"
                    strokeWidth="2"
                    fill="#ffe196"
                  />
                ) : null}
                {state.profile.level > 1 ? (
                  <path
                    d="m12 26 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Zm74-8 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z"
                    fill="#efc45b"
                  />
                ) : null}
              </svg>
            </div>
            <div>
              <span>우리 기지 · {state.profile.level}단계</span>
              <strong>
                {
                  [
                    "작은 배움터",
                    "수학 탐험소",
                    "기억 연구소",
                    "빛나는 수학 기지",
                  ][Math.min(state.profile.level, 3)]
                }
              </strong>
              <p>개념과 보상상자로 모은 별로 키워요.</p>
            </div>
            <button
              type="button"
              disabled={
                busy ||
                state.profile.level >= 3 ||
                state.profile.stars <
                  ([3, 6, 12][state.profile.level] ?? Infinity)
              }
              onClick={() => onAction({ type: "upgrade" })}
            >
              {state.profile.level >= 3 ? (
                "성장 완료"
              ) : (
                <>
                  키우기 <span>✦ {[3, 6, 12][state.profile.level]}</span>
                </>
              )}
            </button>
          </section>
          {courseDue.length > 0 ? (
            <section className={s.memoryRibbon}>
              <div>
                <strong>다시 기억할 개념 {courseDue.length}개</strong>
                <span>오늘 복습할 카드가 기다리고 있어요.</span>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  active
                    ? onResume()
                    : onAction({ type: "start", route: "memory" })
                }
              >
                {active ? "이어서 학습" : "기억 퀘스트"} →
              </button>
            </section>
          ) : null}
          <section className={s.panel}>
            <DailyJourneyBoard
              journey={explorerJourney(state)}
              busy={busy}
              nextLabel={active ? "이어서 탐험하기" : "오늘의 탐험 시작"}
              onNext={() => onStart(currentUnit.id)}
              onReviewDay={(day) =>
                onAction({ type: "start", route: "unit", dayId: day.date })
              }
            />
          </section>
          {state.session?.done && state.session.unresolved.length > 0 ? (
            <section className={s.pendingReview}>
              <strong>한 번 더 살펴볼 개념</strong>
              <p>
                세 번 다시 풀고 남은 개념이에요. 필요할 때 해설을 열어 보세요.
              </p>
              <div>
                {[
                  ...new Set(
                    state.session.unresolved.map((item) => item.cardId),
                  ),
                ].map((id) => {
                  const card = allCards.find((item) => item.id === id);
                  return card ? (
                    <button
                      type="button"
                      key={id}
                      onClick={() => onInspect(card)}
                    >
                      {card.name} <span>해설 보기</span>
                    </button>
                  ) : null;
                })}
              </div>
            </section>
          ) : null}
          <section className={s.panel}>
            <div className={s.sectionHeading}>
              <div>
                <p>{gradeLabel(state.profile.courseGrade)}</p>
                <h2>배울 단원</h2>
              </div>
              <span>
                {collected} / {cards.length}개념 수집
              </span>
            </div>
            <div className={s.units} aria-label="단원 선택">
              {units.map((unit, index) => (
                <button
                  type="button"
                  key={unit.id}
                  aria-pressed={selectedUnit.id === unit.id}
                  onClick={() => setSelectedUnitId(unit.id)}
                >
                  <span className={s.unitNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong>{unit.title}</strong>
                  <span>
                    {
                      unit.cards.filter(
                        (card) => (card.progress?.level ?? 0) > 0,
                      ).length
                    }{" "}
                    / 5개념
                  </span>
                </button>
              ))}
            </div>
            <div className={s.unitDetail}>
              <span className={s.unitSymbol} aria-hidden="true">
                {selectedUnit.symbol}
              </span>
              <div>
                <p>{selectedUnit.subtitle}</p>
                <h3>{selectedUnit.title}</h3>
                <p>
                  {unitCollected === 5
                    ? "다섯 개념을 모았어요. 다시 풀며 기억을 확인해요."
                    : "뜻을 읽고 세 활동을 해결하면 개념 카드를 모아요."}
                </p>
              </div>
            </div>
            <div className={s.conceptChips}>
              {selectedUnit.cards.map((card) => (
                <button
                  type="button"
                  key={card.id}
                  onClick={() => onInspect(card)}
                  data-collected={
                    (card.progress?.level ?? 0) > 0 ? "true" : undefined
                  }
                >
                  <span aria-hidden="true">
                    {card.progress?.level ? "✓" : "○"}
                  </span>
                  {card.name}
                </button>
              ))}
            </div>
            <div className={s.unitActions}>
              <button
                type="button"
                className={s.primary}
                disabled={busy}
                onClick={() => onStart(selectedUnit.id)}
              >
                {active
                  ? "진행 중인 탐험 이어하기"
                  : unitCollected === 5
                    ? "이 단원 다시 연습"
                    : "이 단원 탐험 시작"}{" "}
                →
              </button>
              <button
                type="button"
                className={s.secondary}
                disabled={
                  busy || active || state.profile.goalUnitId === selectedUnit.id
                }
                onClick={() =>
                  onAction({ type: "goal", unitId: selectedUnit.id })
                }
              >
                {state.profile.goalUnitId === selectedUnit.id
                  ? "나의 목표 단원"
                  : "목표 단원으로"}
              </button>
            </div>
            <p className={s.quietNote}>
              개념 5개 · 15문항 · 오답은 모아서 최대 3회 복습
            </p>
            <ExplorerChests
              chests={state.chests.filter(
                (chest) => chest.unit === selectedUnit.id,
              )}
              busy={busy}
              onClaim={(chestId) => onAction({ type: "chest", chestId })}
            />
          </section>
        </>
      ) : tab === "collection" ? (
        <section className={s.panel}>
          <div className={s.sectionHeading}>
            <div>
              <p>{gradeLabel(state.profile.courseGrade)}</p>
              <h2>나의 개념 도감</h2>
            </div>
            <span>
              {collected} / {cards.length}
            </span>
          </div>
          <p className={s.quietNote}>
            카드를 눌러 기억 단계와 연결된 개념을 살펴보세요.
          </p>
          <div className={s.collection}>
            {cards.map((card) => (
              <button
                type="button"
                key={card.id}
                onClick={() => onInspect(card)}
                data-level={card.progress?.level ?? 0}
              >
                <span>
                  {units.find((unit) => unit.id === card.unitId)?.title}
                </span>
                <strong>{card.name}</strong>
                <div
                  className={s.levelDots}
                  aria-label={`기억 ${card.progress?.level ?? 0}단계`}
                >
                  {[1, 2, 3].map((level) => (
                    <i
                      key={level}
                      data-earned={
                        (card.progress?.level ?? 0) >= level
                          ? "true"
                          : undefined
                      }
                    />
                  ))}
                </div>
                <small>
                  {state.dueCardIds.includes(card.id)
                    ? "오늘 복습"
                    : card.progress?.level
                      ? `${card.progress.due.slice(5).replace("-", "/")} 복습`
                      : "아직 수집 전"}
                </small>
              </button>
            ))}
          </div>
          <p className={s.scheduleNote}>
            읽은 뒤 세 활동을 해결하면 카드를 모아요. 도움 없이 기억하면 복습
            간격이 1 → 3 → 7 → 14 → 30일로 늘어나요.
          </p>
        </section>
      ) : (
        <section className={s.panel}>
          <div className={s.sectionHeading}>
            <div>
              <p>{gradeLabel(state.profile.courseGrade)}</p>
              <h2>기억을 이어 가요</h2>
            </div>
            <span>{courseDue.length}개 복습</span>
          </div>
          <div className={s.memorySchedule} aria-label="복습 간격">
            {[1, 3, 7, 14, 30].map((day) => (
              <span key={day}>
                {day}
                <small>일 뒤</small>
              </span>
            ))}
          </div>
          <p className={s.quietNote}>
            기억이 흐려지기 전에 다시 풀고, 어려운 개념은 연결된 앞개념부터
            살펴봐요.
          </p>
          <button
            type="button"
            className={s.primary}
            disabled={busy || (!active && courseDue.length === 0)}
            onClick={() =>
              active ? onResume() : onAction({ type: "start", route: "memory" })
            }
          >
            {active
              ? "이어서 탐험하기"
              : courseDue.length
                ? "오늘의 기억 퀘스트"
                : "오늘 복습할 카드가 없어요"}
          </button>
          <div className={s.memoryCards}>
            {courseDue.map((card) => (
              <button
                type="button"
                key={card.id}
                onClick={() => onInspect(card)}
              >
                <strong>{card.name}</strong>
                <span>기억 {card.progress?.level ?? 0}단계 · 오늘 복습 →</span>
              </button>
            ))}
          </div>
          <h3 className={s.subheading}>앞개념부터 다시 단단하게</h3>
          {courseWeak.length ? (
            <div className={s.repairCards}>
              {courseWeak.map((card) => (
                <article key={card.id}>
                  <button
                    type="button"
                    className={s.cardName}
                    onClick={() => onInspect(card)}
                  >
                    {card.name}
                  </button>
                  <p>
                    {card.prerequisiteIds
                      .map(
                        (id) =>
                          allCards.find((candidate) => candidate.id === id)
                            ?.name,
                      )
                      .filter(Boolean)
                      .join(" → ") || "정의를 다시 확인해요"}
                  </p>
                  <button
                    type="button"
                    className={s.secondary}
                    disabled={busy || active}
                    onClick={() =>
                      onAction({
                        type: "start",
                        route: "repair",
                        cardId: card.id,
                      })
                    }
                  >
                    연결 개념 회복 퀘스트
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className={s.quietNote}>
              학습 기록이 쌓이면 함께 복습할 앞개념을 안내해요.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
