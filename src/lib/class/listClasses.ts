import "server-only";

import {
  classListResponseSchema,
  type ClassEntity,
} from "@/contracts/class.contract";
import { accessibleClassesWhere } from "@/lib/classAccess";
import {
  CLASS_OWNER_NAME,
  showsClassOwner,
  toClassOwner,
} from "@/lib/class/classOwner";
import { db } from "@/lib/db";
import type { ScopeViewer } from "@/lib/ownerScope";
import { serializeClass } from "@/lib/serializers";

type ClassWithOwnerName = Parameters<typeof serializeClass>[0] & {
  user: { name: string };
};

export function serializeClassWithOwner(
  viewer: ScopeViewer,
  row: ClassWithOwnerName,
) {
  return { ...serializeClass(row), owner: toClassOwner(viewer, row) };
}

/** Same authorized, paginated rows for /api/classes and the teaching bootstrap. */
export async function listClasses(
  viewer: ScopeViewer,
  page: number,
  pageSize: number,
) {
  const scope = await accessibleClassesWhere(viewer);
  const skip = (page - 1) * pageSize;
  let data: ClassEntity[];
  let total: number;
  if (showsClassOwner(viewer)) {
    // D-132: mine first, then others; createdAt desc within each group.
    const mineWhere = { AND: [{ userId: viewer.id }, scope] };
    const othersWhere = { AND: [{ userId: { not: viewer.id } }, scope] };
    const orderBy = { createdAt: "desc" as const };
    const [mineTotal, othersTotal] = await Promise.all([
      db.class.count({ where: mineWhere }),
      db.class.count({ where: othersWhere }),
    ]);
    const mine =
      skip < mineTotal
        ? await db.class.findMany({
            where: mineWhere,
            skip,
            take: pageSize,
            orderBy,
            include: CLASS_OWNER_NAME,
          })
        : [];
    const room = pageSize - mine.length;
    const others =
      room > 0
        ? await db.class.findMany({
            where: othersWhere,
            skip: Math.max(0, skip - mineTotal),
            take: room,
            orderBy,
            include: CLASS_OWNER_NAME,
          })
        : [];
    data = [...mine, ...others].map((row) =>
      serializeClassWithOwner(viewer, row),
    );
    total = mineTotal + othersTotal;
  } else {
    const [rows, count] = await Promise.all([
      db.class.findMany({
        where: scope,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      db.class.count({ where: scope }),
    ]);
    data = rows.map(serializeClass);
    total = count;
  }
  return classListResponseSchema.parse({
    data,
    meta: { page, pageSize, total },
  });
}

