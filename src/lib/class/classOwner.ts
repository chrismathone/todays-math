/**
 * **담당** — 반 이름을 내보내는 응답에 «누구의 반인가»를 싣는 판정 · 조회 조각 · 순서 (D-132).
 *
 * 결정: docs/planning/07-coding-convention.md D-132 · 05 §8.11 · 브리프 tracks/briefs/class-owner-tag.md
 * 계약: `classOwnerSchema`(src/contracts/class.contract.ts)
 *
 * ## 🔴 싣는 판정은 여기 한 줄
 *
 * 관리자(D-130 — 소유 울타리를 넘는 사람)에게만 싣는다. 관리자가 아닌 계정은 전부 자기 반이라
 * 담당이 뜻이 없다(D-132 ⑸). 그래서 응답은 **키가 없고**, 화면은 «칸이 있으면 그린다»로만 가른다 —
 * 라우트·화면이 `isAdmin` 을 따로 읽지 않는다. 관리자 판정 자체는 `crossesOwnerFence` 하나다.
 *
 * 변이 하네스 `scripts/qa/mutate-class-owner.ts` 가 `showsClassOwner` 를 «늘 싣는다»·«안 싣는다»
 * 두 방향으로 뒤집어 짝 시험(관리자 / 관리자 아님)이 빨개지는지 본다.
 *
 * ## 순서 — 내 반이 맨 위 (D-132 ⑷)
 *
 * `mineFirst` 는 **안정 정렬**이다 — 내 반 묶음과 나머지 묶음 **안의** 순서는 부르는 쪽의 순서
 * (반 목록은 `createdAt desc`, 메인은 단계, 개념 판은 학년·이름)를 그대로 둔다. 담당이 없는 행
 * (관리자 아님)은 모두 같은 자리라 순서가 하나도 안 바뀐다.
 */
import type { Prisma } from "@prisma/client";

import type { ClassOwner } from "@/contracts/class.contract";
import { crossesOwnerFence, type ScopeViewer } from "@/lib/ownerScope";

/** 🔴 **유일한 판정** — 이 사람에게 담당을 싣는가. */
export function showsClassOwner(viewer: ScopeViewer): boolean {
  return crossesOwnerFence(viewer);
}

/**
 * 반 조회에 붙이는 담당 이름 조각 — `include` 에도 `select` 에도 그대로 들어간다.
 * 반마다 계정을 따로 읽지 않는다(한 번의 조회에 조인).
 */
export const CLASS_OWNER_NAME = {
  user: { select: { name: true } },
} satisfies Prisma.ClassInclude & Prisma.ClassSelect;

/** 조인해 읽은 반 한 행 → 담당. */
export function toClassOwner(
  viewer: ScopeViewer,
  row: { userId: string; user: { name: string } },
): ClassOwner {
  return { name: row.user.name, mine: row.userId === viewer.id };
}

/** 내 반이면 0, 아니면(담당이 없는 행 포함) 1 — 정렬 비교의 첫 열쇠. */
export function mineRank(owner: ClassOwner | undefined): 0 | 1 {
  return owner?.mine === true ? 0 : 1;
}

/** 내 반을 맨 위로 — 안정 정렬(묶음 안의 순서는 그대로). 입력 배열은 건드리지 않는다. */
export function mineFirst<T>(
  rows: readonly T[],
  ownerOf: (row: T) => ClassOwner | undefined,
): T[] {
  return [...rows].sort((a, b) => mineRank(ownerOf(a)) - mineRank(ownerOf(b)));
}
