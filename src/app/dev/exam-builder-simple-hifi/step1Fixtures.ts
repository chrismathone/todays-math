import { CURRICULUM_UNITS } from "../../../../prisma/seed-data/units";

/** 기존 시안과 같은 735차시 시드. 이름·묶음·순서를 그대로 쓴다.
 * available은 조건 조작을 위한 예시 수이며 실제 문항 재고가 아니다.
 */
export const STEP1_SCOPES = [...CURRICULUM_UNITS]
  .sort((a, b) => a.orderIndex - b.orderIndex)
  .map((unit) => ({
    id: `scope-${unit.orderIndex}`,
    grade: unit.grade,
    chapter: unit.chapter,
    name: unit.section,
    available: 40 + (unit.orderIndex % 9),
  }));

export type Step1Scope = (typeof STEP1_SCOPES)[number];
export const STEP1_GRADES = [...new Set(STEP1_SCOPES.map((row) => row.grade))];
export const STEP1_VARIANTS = [
  {
    id: "S1",
    name: "단계 열",
    idea: "학년·과정, 단원, 차시를 왼쪽부터 한 열씩 엽니다.",
    weakness: "세 열이 열리면 긴 차시 이름이 여러 줄로 이어집니다.",
  },
  {
    id: "S2",
    name: "한 열 차례",
    idea: "고른 단계는 한 줄로 접고 다음 목록을 아래에 엽니다.",
    weakness: "앞 목록을 다시 보려면 요약 줄의 변경을 눌러야 합니다.",
  },
  {
    id: "S3",
    name: "경로 줄",
    idea: "위에서 고른 경로를 확인하고 현재 단계의 목록만 봅니다.",
    weakness: "앞 단계와 현재 목록을 동시에 비교하기 어렵습니다.",
  },
  {
    id: "S4",
    name: "고르기 창",
    idea: "단계별 고르기 단추로 공용 창에서 목록을 엽니다.",
    weakness: "각 단계의 목록을 보려면 창을 열어야 합니다.",
  },
] as const;

export type Step1Variant = (typeof STEP1_VARIANTS)[number];
