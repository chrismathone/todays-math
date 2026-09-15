/**
 * «오늘의 개념» 화면의 글자 모양 — 날짜 · 영상 길이 · 강의 상태 알약 문구(05 §8.9 시안 1안).
 * 계산(게시 판정·n/m)은 여기 없다 — 서버가 낸 값을 **글자로** 바꾸기만 한다.
 */
import type { ConceptLectureCounts } from "@/contracts/conceptAdmin.contract";
import type { ConceptLectureStatus } from "@/contracts/conceptLecture.contract";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 날짜만(YYYY-MM-DD, 학원 날짜) — 시간대를 타지 않게 UTC 로 읽는다 */
function dayParts(day: string) {
  const d = new Date(`${day}T00:00:00.000Z`);
  return {
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    w: WEEKDAYS[d.getUTCDay()],
  };
}

/** `2026-09-15` → «9월 15일 (월)» */
export function formatDayWithWeekday(day: string): string {
  const p = dayParts(day);
  return `${p.m}월 ${p.d}일 (${p.w})`;
}

/** `2026-09-15` → «9월 15일» */
export function formatDay(day: string): string {
  const p = dayParts(day);
  return `${p.m}월 ${p.d}일`;
}

/** 시각(ISO) → 학원 날짜(KST) «9월 12일» */
export function formatInstantDay(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
}

/** 초 → «2:19» */
export function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type LectureStateKey = "pub" | "draft" | "none";

/** 차시의 강의 상태 알약 — 게시(코발트) · 초안(호박) · 영상 없음(회색). 내린 강의는 학생이 못 보므로 «영상 없음» */
export function unitStateLabel(c: ConceptLectureCounts): {
  key: LectureStateKey;
  label: string;
} {
  if (c.published && c.draft)
    return { key: "pub", label: `게시 ${c.published} · 초안 ${c.draft}` };
  if (c.published) return { key: "pub", label: `게시 ${c.published}편` };
  if (c.draft) return { key: "draft", label: `초안 ${c.draft}편` };
  return { key: "none", label: "영상 없음" };
}

/** 강의 한 편의 상태 알약 */
export function lectureStateLabel(status: ConceptLectureStatus): {
  key: LectureStateKey;
  label: string;
} {
  if (status === "published") return { key: "pub", label: "게시" };
  if (status === "draft") return { key: "draft", label: "초안" };
  return { key: "none", label: "내림" };
}
