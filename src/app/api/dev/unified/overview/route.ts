import { loadRecentClasses } from "@/lib/class/recentClasses";
import { db } from "@/lib/db";
import { ownedRowsWhere, ownedStudentsWhere } from "@/lib/ownerScope";
import { getSessionUser } from "@/lib/session";

const headers = { "Cache-Control": "private, no-store" };

/**
 * A bounded, read-only home summary; no curriculum or student roster download.
 * Counts follow the owner scope (D-130 — an admin counts every class): src/lib/ownerScope.ts
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404, headers });
  }

  try {
    const user = await getSessionUser();
    if (!user) {
      return Response.json(
        { error: "내 수업을 확인하려면 로그인해 주세요." },
        { status: 401, headers },
      );
    }

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
