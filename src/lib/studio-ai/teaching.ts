import "server-only";

import { unitListResponseSchema } from "@/contracts/unit.contract";
import type { TeachingClasses } from "@/contracts/teaching.contract";
import { listClasses } from "@/lib/class/listClasses";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/session";

/** Call only after the route's existing session/menu guard succeeds. */
export async function loadTeachingData(
  user: SessionUser,
  includeClasses: boolean,
) {
  const [units, classes] = await Promise.all([
    db.unit.findMany({
      select: {
        id: true,
        grade: true,
        chapter: true,
        section: true,
        orderIndex: true,
      },
      orderBy: { orderIndex: "asc" },
    }),
    includeClasses
      ? listClasses(user, 1, 100).then(
          (page): TeachingClasses => ({ status: "ready", page }),
          (): TeachingClasses => ({ status: "error" }),
        )
      : undefined,
  ]);
  return {
    user,
    units: unitListResponseSchema.parse({ data: units }).data,
    ...(classes ? { classes } : {}),
  };
}

