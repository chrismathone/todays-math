import { kstDateOf } from "@/lib/kstDate";
import type { Learner } from "./types";

/** The dashboard follows KST, just like mission creation, even across midnight. */
export function learningInsights(learner: Learner, now: Date) {
  const attempts = learner.missions
    .flatMap((mission) => mission.attempts)
    .sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
  const today = kstDateOf(now);
  const counts = new Map<string, number>();
  for (const attempt of attempts) {
    const date = kstDateOf(new Date(attempt.answeredAt));
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${today}T12:00:00+09:00`);
    day.setUTCDate(day.getUTCDate() - (6 - index));
    const date = kstDateOf(day);
    return {
      date,
      label: new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        weekday: "short",
      }).format(day),
      count: counts.get(date) ?? 0,
      today: date === today,
    };
  });
  return {
    attempts,
    correct: attempts.filter((attempt) => attempt.correct).length,
    completed: learner.missions.filter((mission) => mission.completedAt).length,
    week,
    activeDays: week.filter((day) => day.count > 0).length,
    weeklyAttempts: week.reduce((total, day) => total + day.count, 0),
  };
}
