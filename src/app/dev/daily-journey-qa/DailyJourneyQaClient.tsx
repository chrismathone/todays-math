"use client";

import { useEffect, useRef, useState } from "react";
import DailyJourneyBoard, {
  type DailyJourney,
} from "@/components/math-srs/DailyJourneyBoard";
import { StudentReviewPage } from "@/components/math-srs/StudentReviewHome";
import s from "@/components/math-srs/student-review-home.module.css";

const units = [
  "약수와 배수",
  "약분과 통분",
  "분수의 덧셈과 뺄셈",
  "분수의 곱셈",
  "여러 가지 도형의 넓이",
];
function makeJourney(count: number): DailyJourney {
  return {
    completedDays: count,
    todayComplete: false,
    todayAnswered: 4,
    todayGoal: 10,
    days: Array.from({ length: count }, (_, index) => ({
      id: `qa-day-${index + 1}`,
      date: `2026-09-${String(index + 1).padStart(2, "0")}`,
      completedAt: "2026-09-26T09:00:00.000Z",
      title: units[index % units.length],
      subtitle: "초5 · 1학기",
      reviewCount: 10,
    })),
    upcoming: Array.from({ length: 12 }, (_, index) => ({
      title: units[(index + count) % units.length],
      subtitle: "초5 · 1학기",
    })),
  };
}

export default function DailyJourneyQaClient({ days }: { days: number }) {
  const [journey, setJourney] = useState(() => makeJourney(days));
  const [review, setReview] = useState("");
  const readyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    readyRef.current?.setAttribute("data-qa-ready", "true");
  }, []);
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
              ...makeJourney(journey.completedDays + 1),
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
