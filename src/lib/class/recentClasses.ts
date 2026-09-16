/**
 * 작업실 개요 «최근 등록한 반» 세 줄 — `api/studio/overview` 와 dev 쌍둥이(`api/dev/unified/overview`)가
 * 같이 부른다. 두 라우트가 조회를 따로 적으면 한쪽만 담당이 실린다.
 *
 * 소유 범위(D-130): `ownerScope.ts`. 담당(D-132 — 관리자에게만): `classOwner.ts`.
 * 🔴 고르는 세 반은 지금 그대로 **최근 등록 셋**이다 — 담당은 그 셋 안의 순서만 바꾼다(내 반이 맨 위).
 *    내 반을 셋 안에 끌어들이려면 «최근 등록한 반»이라는 이름부터 바뀌어야 한다(보고서 ⑤ 리드 결정).
 */
import type { Prisma } from "@prisma/client";

import type { ClassOwner } from "@/contracts/class.contract";
import { db } from "@/lib/db";
import { ownedRowsWhere, type ScopeViewer } from "@/lib/ownerScope";

import {
  CLASS_OWNER_NAME,
  mineFirst,
  showsClassOwner,
  toClassOwner,
} from "./classOwner";

export type RecentClass = {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
  currentUnit: { chapter: string; section: string } | null;
  /** 관리자에게만 — 없으면 키째로 없다 */
  owner?: ClassOwner;
};

const RECENT_CLASS_SELECT = {
  id: true,
  name: true,
  grade: true,
  _count: { select: { students: true } },
  progresses: {
    // Class progress only, with the same latest-record order as /api/progress.
    where: { studentId: null },
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    take: 1,
    select: { unit: { select: { chapter: true, section: true } } },
  },
} satisfies Prisma.ClassSelect;

const RECENT_ORDER = [
  { createdAt: "desc" },
  { id: "asc" },
] satisfies Prisma.ClassOrderByWithRelationInput[];

type RecentRow = {
  id: string;
  name: string;
  grade: string;
  _count: { students: number };
  progresses: { unit: { chapter: string; section: string } }[];
};

const toRecent = (item: RecentRow): RecentClass => ({
  id: item.id,
  name: item.name,
  grade: item.grade,
  studentCount: item._count.students,
  currentUnit: item.progresses[0]?.unit ?? null,
});

export async function loadRecentClasses(
  viewer: ScopeViewer,
): Promise<RecentClass[]> {
  const where = ownedRowsWhere(viewer);
  if (!showsClassOwner(viewer)) {
    const rows = await db.class.findMany({
      where,
      orderBy: RECENT_ORDER,
      take: 3,
      select: RECENT_CLASS_SELECT,
    });
    return rows.map(toRecent);
  }
  const rows = await db.class.findMany({
    where,
    orderBy: RECENT_ORDER,
    take: 3,
    select: { ...RECENT_CLASS_SELECT, userId: true, ...CLASS_OWNER_NAME },
  });
  return mineFirst(
    rows.map((item) => ({
      ...toRecent(item),
      owner: toClassOwner(viewer, item),
    })),
    (c) => c.owner,
  );
}
