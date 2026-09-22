import { loadRecentClasses } from "@/lib/class/recentClasses";
import { db } from "@/lib/db";
import { ownedRowsWhere, ownedStudentsWhere } from "@/lib/ownerScope";
import { authorizeStudio } from "@/lib/studio-ai/guard";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

const headers = { "Cache-Control": "private, no-store" };

/**
 * A bounded, read-only home summary; no curriculum or student roster download.
 * Counts follow the owner scope (D-130 — an admin counts every class): src/lib/ownerScope.ts
 */
async function handleGet(request: Request) {
  try {
    const access = await authorizeStudio(request);
    if (access.response) return access.response;
    const user = access.user!;

    const [classCount, studentCount, classes] = await Promise.all([
      db.class.count({ where: ownedRowsWhere(user) }),
      db.student.count({ where: ownedStudentsWhere(user) }),
      // Recent three classes; an admin also gets each class owner (D-132): src/lib/class/recentClasses.ts
      loadRecentClasses(user),
    ]);

    return Response.json(
      {
        data: {
          user: { id: user.id, name: user.name },
          classCount,
          studentCount,
          classes,
        },
      },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "수업 현황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503, headers },
    );
  }
}

export const GET = withErrorLog("/api/studio/overview", handleGet);
