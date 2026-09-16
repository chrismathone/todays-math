/**
 * 관리자 화면의 «누구의 반» Hi-fi 3(`docs/design/mockups/hifi-d132-class-owner.html`)의 데이터.
 * 개발용 시안 페이지(`/dev/class-owner-hifi`)와 화면 시험(`classOwnerTag.test.tsx`)이 같이 쓴다 —
 * 캡처와 시험이 같은 데이터를 본다.
 *
 * - 반 · 학년 · 계정 이름은 시안 그대로(2026-09-16 공유 DB 에서 읽은 것). 맨 위 «목요 심화반»만 보기용
 *   예시다(원장님 계정의 반은 지금 0개). 반 id · 날짜는 예시다.
 * - 순서는 서버가 내는 모양 그대로 — **내 반이 맨 위**, 나머지는 시안 순서.
 * - `plain()` 은 같은 행에서 담당만 뺀 것 — 관리자가 아닌 계정이 받는 모양(키째로 없다).
 */
import type { ClassEntity, ClassOwner } from "@/contracts/class.contract";
import { DEFAULT_DIFFICULTY_RATIO } from "@/contracts/difficulty";

const uid = (n: number) =>
  `6c000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** 원장님 계정 이름 — 화면은 «내 반»으로 적으므로 글자는 보이지 않는다 */
export const ADMIN_ACCOUNT_NAME = "관리자";
/** 시안의 가장 긴 담당 이름(7자) — 선택 상자에서 «이어하기선생» 으로 잘린다 */
export const LONGEST_OWNER = "이어하기선생님";

const SPECS: { name: string; grade: string; owner: string | null }[] = [
  { name: "목요 심화반", grade: "중2", owner: null },
  { name: "테스트반", grade: "중2", owner: "강선생" },
  { name: "중등M 초6 MS2A", grade: "초6", owner: "강선생" },
  { name: "초등M 초5 MS1A", grade: "초5", owner: "강선생" },
  { name: "테스트 B", grade: "5", owner: "원장" },
  { name: "걷기반", grade: "중2", owner: "걷기원장" },
  { name: "빈손반", grade: "중1", owner: "빈손선생님" },
  { name: "이어반", grade: "중2", owner: LONGEST_OWNER },
];

export const OWNER_CLASS_IDS = SPECS.map((_, i) => uid(i + 1));

export function ownerOf(spec: { owner: string | null }): ClassOwner {
  return spec.owner === null
    ? { name: ADMIN_ACCOUNT_NAME, mine: true }
    : { name: spec.owner, mine: false };
}

/** 관리자가 받는 반 목록(`GET /api/classes`) — 모든 행에 담당, 내 반이 맨 위 */
export const OWNER_CLASSES: ClassEntity[] = SPECS.map((spec, i) => ({
  id: uid(i + 1),
  userId: uid(100 + (spec.owner === null ? 0 : i + 1)),
  name: spec.name,
  grade: spec.grade,
  defaultProblemCount: 8,
  difficultyRatio: DEFAULT_DIFFICULTY_RATIO,
  createdAt: `2026-09-${String(15 - i).padStart(2, "0")}T09:00:00.000Z`,
  updatedAt: `2026-09-${String(15 - i).padStart(2, "0")}T09:00:00.000Z`,
  owner: ownerOf(spec),
}));

/** 같은 행에서 담당만 뺀 것 — 관리자가 아닌 계정의 응답 모양 */
export function plain<T extends { owner?: ClassOwner }>(
  rows: readonly T[],
): Omit<T, "owner">[] {
  return rows.map(({ owner, ...rest }) => {
    void owner;
    return rest;
  });
}

/**
 * 오늘의 개념 판(`/dev/concept-hifi` 픽스처, 반 12)에 얹는 담당 — 시안 순서 그대로.
 * 두 번째 반(초6 A반)을 원장님 반으로 둔다 — 학년 순서로는 둘째라 «내 반 맨 위»가 보인다.
 */
export const CONCEPT_BOARD_OWNERS: readonly ClassOwner[] = [
  { name: "강선생", mine: false },
  { name: ADMIN_ACCOUNT_NAME, mine: true },
  { name: "강선생", mine: false },
  { name: "원장", mine: false },
  { name: "걷기원장", mine: false },
  { name: "빈손선생님", mine: false },
  { name: LONGEST_OWNER, mine: false },
  { name: "강선생", mine: false },
  { name: "원장", mine: false },
  { name: "걷기원장", mine: false },
  { name: "빈손선생님", mine: false },
  { name: LONGEST_OWNER, mine: false },
];
