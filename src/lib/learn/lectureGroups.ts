/**
 * 학생 목록의 **날짜 묶음** · 상태 알약 · 다음 영상 (브리프 §1.1 · 05 §8.9 학생 화면 · 시안 `sList`).
 *
 * 부르는 곳: src/components/learn/LectureList.tsx · WatchScreen.tsx — 화면은 이 결과를 그리기만 한다.
 *
 * - 묶음은 **그 차시를 수업한 날**(`LearnUnit.taughtOn`)이다. 그 날짜는 서버가 반 진도 ∪ 개인 진도에서
 *   가장 최근 날로 센다(`src/lib/learn/lectureAccess.ts` 의 `progressDatesOf` — 목록·기록이 같은 행에서).
 * - 가장 최근 날의 묶음이 맨 앞(**남색 판**), 나머지는 최근 순. 같은 날 여러 차시는 교육과정 차례.
 * - 🔴 «오늘» 은 그 날이 **오늘(학원 시간 KST)** 일 때만이다 — 어제 수업이면 날짜만.
 *   요일은 달력이 정한다(`formatDayWithWeekday` — 시안의 «9월 15일 (월)» 은 틀렸다, 2026-09-15 는 화요일).
 */
import type { ConceptLectureForStudent } from "@/contracts/conceptLecture.contract";
import type { LearnUnit } from "@/contracts/studentAccount.contract";

/** 학원 시간(KST, UTC+9) — 서머타임이 없다 */
const KST_OFFSET_MS = 9 * 3_600_000;

/** 그 시각의 학원 날짜(YYYY-MM-DD) — 서버 시계의 UTC 자정이 아니다 */
export function kstDateOf(at: Date): string {
  return new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export interface UnitGroup {
  unit: LearnUnit;
  lectures: ConceptLectureForStudent[];
}

export interface DayGroup {
  /** 수업한 날(YYYY-MM-DD) */
  day: string;
  /** 🔴 그 날이 오늘(KST)인가 — «오늘» 표시는 이것 하나로만 */
  isToday: boolean;
  units: UnitGroup[];
}

/**
 * 🔴 날짜 묶음 — 최근이 먼저. 강의가 없는 차시는 서지 않는다. 차시를 모르는 강의는 **버리지 않고 던진다**
 * (조용히 빼면 목록에서 강의 하나가 소리 없이 사라진다 — 서버는 열린 강의의 차시를 늘 같이 보낸다).
 */
export function groupLecturesByDay(
  units: readonly LearnUnit[],
  lectures: readonly ConceptLectureForStudent[],
  today: string,
): DayGroup[] {
  const known = new Set(units.map((u) => u.id));
  const lecturesOf = new Map<string, ConceptLectureForStudent[]>();
  for (const lecture of lectures) {
    if (!known.has(lecture.unitId))
      throw new Error(
        `[lectureGroups] 차시를 모르는 강의 — ${lecture.id} (unitId ${lecture.unitId})`,
      );
    const list = lecturesOf.get(lecture.unitId) ?? [];
    list.push(lecture);
    lecturesOf.set(lecture.unitId, list);
  }

  const byDay = new Map<string, UnitGroup[]>();
  for (const unit of [...units].sort((a, b) => a.orderIndex - b.orderIndex)) {
    const list = lecturesOf.get(unit.id);
    if (!list) continue;
    const group = byDay.get(unit.taughtOn) ?? [];
    group.push({ unit, lectures: list });
    byDay.set(unit.taughtOn, group);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([day, group]) => ({ day, isToday: day === today, units: group }));
}

export type WatchStateKey = "new" | "mid" | "done";

/** 상태 알약 — `새로` · `64% 봄` · `끝까지 봄`. %는 **서버가 센 값** 그대로다(student-auth §2.5). */
export function watchState(watch: ConceptLectureForStudent["watch"]): {
  key: WatchStateKey;
  label: string;
} {
  if (watch?.completed) return { key: "done", label: "끝까지 봄" };
  if (watch && watch.percent > 0)
    return { key: "mid", label: `${watch.percent}% 봄` };
  return { key: "new", label: "새로" };
}

/** 다음 영상 — 서버가 준 차례(교육과정 → 강의 순서)에서 바로 뒤. 마지막이면 없다. */
export function nextLectureAfter(
  lectures: readonly ConceptLectureForStudent[],
  id: string,
): ConceptLectureForStudent | null {
  const at = lectures.findIndex((l) => l.id === id);
  return at === -1 ? null : (lectures[at + 1] ?? null);
}
