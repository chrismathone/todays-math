"use client";

import { useEffect, useRef, useState } from "react";
import DailyJourneyBoard, {
  type DailyJourney,
  type DailyJourneyPosition,
} from "@/components/math-srs/DailyJourneyBoard";
import { StudentReviewPage } from "@/components/math-srs/StudentReviewHome";
import s from "@/components/math-srs/student-review-home.module.css";
import explorer from "@/components/math-explorers/math-explorers.module.css";
import { definitionUnits } from "@/lib/math-explorers/definition-cards";
import { longGrade, shortGrade } from "@/lib/math-explorers/journeyForecast";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";

/**
 * 진도판 검수 — 작은 픽스처 금지(2026-08-19 교훈). 이름은 전부 실제 단원 · 소단원이다.
 *  - `set=middle`   중2 목표 «연립일차방정식»: 학년 단원 → 중3 (기본)
 *  - `set=elementary` 초4 진도 계획 «꺾은선그래프»부터 소단원 → 초5
 *  - `set=all`      판에 나올 수 있는 이름 전부를 예정 · 완료 · 오늘 칸에 올린다(잘림 · 쪼개짐 전수 실측)
 */
type Item = { title: string; subtitle: string; grade: number };
const middle: Item[] = definitionUnits
  .filter((unit) => unit.grade >= 8)
  .map((unit) => ({
    title: unit.title,
    subtitle: longGrade(unit.grade),
    grade: unit.grade,
  }));
const middleStart = middle.findIndex((item) => item.title === "연립일차방정식");
const elementary: Item[] = COURSE_SECTIONS.slice(
  COURSE_SECTIONS.findIndex((section) => section.id === "4-2-5-1"),
).map((section) => ({
  title: section.title,
  subtitle: `초${section.grade} · ${section.semester}학기 · ${section.chapterTitle}`,
  grade: section.grade,
}));
const positions: Record<"middle" | "elementary", DailyJourneyPosition> = {
  middle: {
    caption: "중2 · 7단원 중",
    ordinal: 3,
    title: "연립일차방정식",
    collected: 5,
    total: 35,
    due: 0,
  },
  elementary: {
    caption: "소단원 3개 중",
    ordinal: 1,
    title: "꺾은선그래프",
    note: "꺾은선그래프 알아보기",
    collected: 5,
    total: 30,
    due: 0,
  },
};
const allNames = [
  ...new Set([
    ...definitionUnits.map((unit) => unit.title),
    ...definitionUnits.map((unit) => `${unit.title} 연결 복습`),
    ...COURSE_SECTIONS.map((section) => section.title),
    ...COURSE_SECTIONS.map((section) => section.chapterTitle),
    "기억 복습",
  ]),
];

function planned(list: readonly Item[], from: number, count: number) {
  return list.slice(from, from + count).map((item, index, all) => {
    const before = index
      ? all[index - 1].grade
      : list[Math.max(0, from - 1)].grade;
    return item.grade !== before
      ? {
          title: item.title,
          subtitle: item.subtitle,
          gradeStart: shortGrade(item.grade),
        }
      : { title: item.title, subtitle: item.subtitle };
  });
}

function makeJourney(
  count: number,
  set: "middle" | "elementary",
): DailyJourney {
  const list = set === "middle" ? middle : elementary;
  const start = set === "middle" ? middleStart : 0;
  return {
    completedDays: count,
    todayComplete: false,
    todayAnswered: 4,
    todayGoal: 10,
    days: Array.from({ length: count }, (_, index) => ({
      id: `qa-day-${index + 1}`,
      date: `2026-09-${String((index % 28) + 1).padStart(2, "0")}`,
      completedAt: "2026-09-26T09:00:00.000Z",
      title:
        index % 3 === 1
          ? "기억 복습"
          : list[(start + index) % list.length].title,
      subtitle: list[(start + index) % list.length].subtitle,
      reviewCount: 10,
    })),
    upcoming: planned(list, (start + count) % list.length, 12 - (count % 12)),
    position: positions[set],
  };
}

/** 이름 전부 — 예정 칸(12개씩), 완료 칸(12개씩), 오늘 칸(이름 하나씩). */
function allBoards(): { key: string; journey: DailyJourney }[] {
  const boards: { key: string; journey: DailyJourney }[] = [];
  const base = { todayAnswered: 0, todayGoal: 15, position: positions.middle };
  for (let i = 0; i < allNames.length; i += 12) {
    const names = allNames.slice(i, i + 12);
    boards.push({
      key: `planned-${i}`,
      journey: {
        ...base,
        completedDays: 0,
        todayComplete: true,
        days: [],
        upcoming: names.map((title) => ({ title, subtitle: "검수" })),
      },
    });
    boards.push({
      key: `done-${i}`,
      journey: {
        ...base,
        completedDays: names.length,
        todayComplete: true,
        upcoming: [],
        days: names.map((title, index) => ({
          id: `qa-${i + index}`,
          date: "2026-09-01",
          completedAt: "2026-09-01T09:00:00.000Z",
          title,
          subtitle: "검수",
          reviewCount: 0,
        })),
      },
    });
  }
  allNames.forEach((title, index) =>
    boards.push({
      key: `current-${index}`,
      journey: {
        ...base,
        completedDays: 0,
        todayComplete: false,
        days: [],
        upcoming: [{ title, subtitle: "검수" }],
      },
    }),
  );
  return boards;
}

export default function DailyJourneyQaClient({
  days,
  set,
  variant,
  part,
}: {
  days: number;
  set: "middle" | "elementary" | "all";
  variant: "full" | "map";
  /** `set=all` 을 네 조각으로 — 한 페이지에 판 410여 개면 PC 폭에서 몇 분 걸린다. 0 이면 전부. */
  part: number;
}) {
  const [journey, setJourney] = useState(() =>
    makeJourney(days, set === "all" ? "middle" : set),
  );
  const [review, setReview] = useState("");
  const readyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    readyRef.current?.setAttribute("data-qa-ready", "true");
  }, []);
  if (set === "all")
    return (
      <div
        ref={readyRef}
        data-qa-all="true"
        style={{ display: "grid", gap: 16, padding: 16 }}
      >
        {allBoards()
          .filter(
            (_, index, all) =>
              !part || Math.floor((index * 4) / all.length) === part - 1,
          )
          .map((board) => (
            // 탐험 홈과 같은 판 틀(`journeyPanel`) — 폰 390 에서 판 334px · 320 에서 272px.
            <div
              key={board.key}
              data-qa-board={board.key}
              className={explorer.journeyPanel}
            >
              <DailyJourneyBoard
                journey={board.journey}
                variant={variant}
                onReviewDay={() => {}}
              />
            </div>
          ))}
      </div>
    );
  return (
    <StudentReviewPage
      kind="elementary"
      student={{ name: "test_s", className: "테스트반" }}
      practiceTitle="전체 학습 진도"
      boardReady
    >
      <div className={s.boardSection} ref={readyRef}>
        <DailyJourneyBoard
          journey={journey}
          variant={variant}
          onNext={() =>
            setJourney((current) => ({
              ...current,
              todayAnswered: Math.min(
                current.todayGoal,
                current.todayAnswered + 1,
              ),
            }))
          }
          onReviewDay={(day) => setReview(day.id)}
        />
        <output aria-label="검수 복습 일차">{review}</output>
        <button
          type="button"
          style={{ cursor: "pointer" }}
          onClick={() =>
            setJourney({
              ...makeJourney(journey.completedDays + 1, set),
              todayComplete: true,
              todayAnswered: 10,
            })
          }
        >
          검수: 하루 완료
        </button>
      </div>
    </StudentReviewPage>
  );
}
