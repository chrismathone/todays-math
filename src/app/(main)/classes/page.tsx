import { connection } from "next/server";

import { AppChrome } from "@/components/chrome/AppChrome";
import { ClassManage } from "@/components/class/ClassManage";
import { onlySupportedGrades } from "@/contracts/supportedGrades";
import { db } from "@/lib/db";
import { canManageClassStudents, canManageRoster } from "@/lib/ownerScope";
import { getSessionUser } from "@/lib/session";

export default async function ClassesPage() {
  await connection();

  const session = await getSessionUser();

  const units = await db.unit.findMany({
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      grade: true,
      chapter: true,
      section: true,
      orderIndex: true,
    },
  });

  return (
    <AppChrome activeNav="classes">
      {/* 고르는 목록만 좁힌다 — 이름을 되찾는 `/api/units` 는 그대로다(2026-09-07). */}
      <ClassManage
        units={onlySupportedGrades(units)}
        canManageRoster={session ? canManageRoster(session) : false}
        canManageStudents={session ? canManageClassStudents(session) : false}
      />
    </AppChrome>
  );
}
