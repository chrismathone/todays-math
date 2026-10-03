/**
 * 손으로 쓴 시범 매핑 — plan-v03 §5. 그래프 단원 간선 `E56-N03 → E56-N04` 한 줄과 그 확인 범위다.
 * 소단원 선수 그래프가 아니다. 제목 유사도 · 탐험 단원(`curriculumBridge`)으로 고르지 않는다.
 *
 * 이 파일은 그래프 JSON 을 읽지 않는다(판 해시는 루트가 덧붙인다). 코스 쪽은 타입만 가져온다 —
 * `courseAutomation` 이 이 모듈을 부르므로 실행 시 import 는 순환이 된다.
 */
import type { StoredCourse } from "@/lib/math-srs/courseAutomation";
import {
  COURSE_SECTIONS,
  getCourseSection,
} from "@/lib/math-srs/elementary/catalog";

export const PILOT_TARGET_UNIT_ID = "E56-N04" as const;
export const PILOT_CHECK_UNIT_ID = "E56-N03" as const;

/** 분수×자연수 · 자연수×분수 — 응용 갈래가 곱한 뒤 분수를 뺀다(`g5.ts` fm221Apply · fm222Apply) */
export const PILOT_TARGET_SECTION_IDS = Object.freeze([
  "5-2-2-1",
  "5-2-2-2",
] as const);
/** 확인 차례는 고정 — 대분수의 뺄셈 → 진분수의 뺄셈. `5-1-4-2`(약분)는 자기채점이라 뺐다 */
export const PILOT_CHECK_SECTION_IDS = Object.freeze([
  "5-1-5-4",
  "5-1-5-3",
] as const);
export const PILOT_SECTION_IDS = Object.freeze([
  ...PILOT_TARGET_SECTION_IDS,
  ...PILOT_CHECK_SECTION_IDS,
] as const);

export type PilotTargetSectionId = (typeof PILOT_TARGET_SECTION_IDS)[number];
export type PilotCheckSectionId = (typeof PILOT_CHECK_SECTION_IDS)[number];
export type PilotSectionId = (typeof PILOT_SECTION_IDS)[number];

export function isPilotTarget(id: string): id is PilotTargetSectionId {
  return (PILOT_TARGET_SECTION_IDS as readonly string[]).includes(id);
}
export function isPilotCheck(id: string): id is PilotCheckSectionId {
  return (PILOT_CHECK_SECTION_IDS as readonly string[]).includes(id);
}

/** 시범 소단원의 그래프 단원. 시범 밖은 null — 다른 단원을 지어내지 않는다. */
export function sectionUnitId(
  sectionId: string,
): typeof PILOT_TARGET_UNIT_ID | typeof PILOT_CHECK_UNIT_ID | null {
  if (isPilotTarget(sectionId)) return PILOT_TARGET_UNIT_ID;
  if (isPilotCheck(sectionId)) return PILOT_CHECK_UNIT_ID;
  return null;
}

export interface MappingInfo {
  unitId: string;
  /** `verified` = 이 편집 단원과 코스 소단원의 대응을 확인했다. 성취기준 감사 완료가 아니다 */
  mappingStatus: "verified" | "unmapped";
  /** 자동 문제 제시가 되는가 — 조회 가능 여부와 다르다 */
  supply: "available" | "unavailable";
  role: "target" | "check" | null;
  sectionIds: readonly string[];
  /** 시범 범위는 단원의 학습 요소를 다 재지 않는다 — 늘 부분 확인 */
  partial: true;
}

export function mappingInfo(unitId: string): MappingInfo {
  if (unitId === PILOT_TARGET_UNIT_ID)
    return {
      unitId,
      mappingStatus: "verified",
      supply: "available",
      role: "target",
      sectionIds: [...PILOT_TARGET_SECTION_IDS],
      partial: true,
    };
  if (unitId === PILOT_CHECK_UNIT_ID)
    return {
      unitId,
      mappingStatus: "verified",
      supply: "available",
      role: "check",
      sectionIds: [...PILOT_CHECK_SECTION_IDS],
      partial: true,
    };
  return {
    unitId,
    mappingStatus: "unmapped",
    supply: "unavailable",
    role: null,
    sectionIds: [],
    partial: true,
  };
}

/**
 * 지금 코스의 다음 학습 소단원 — `courseAutomation` 의 `nextLearning` 과 같은 셈이다
 * (선택한 소단원부터 차례대로, 끝내지 않은 첫 소단원). 같음은 시험이 `courseSummary` 로 확인한다.
 */
export function targetForCourse(course: StoredCourse): string | null {
  const selected = getCourseSection(course.learner.selectedSectionId);
  if (!selected) return null;
  return (
    COURSE_SECTIONS.find(
      (section) =>
        section.order >= selected.order &&
        !course.completedSectionIds.includes(section.id),
    )?.id ?? null
  );
}

/** 지금 목표가 시범 목표일 때만 그 소단원. */
export function pilotTargetForCourse(
  course: StoredCourse,
): PilotTargetSectionId | null {
  const target = targetForCourse(course);
  return target && isPilotTarget(target) ? target : null;
}
