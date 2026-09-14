import { db } from "@/lib/db";
import { authorizeStudio } from "@/lib/studio-ai/guard";

const headers = { "Cache-Control": "private, no-store" };

/** A bounded, read-only home summary; no curriculum or student roster download. */
export async function GET(request: Request) {
  try {
    const access = await authorizeStudio(request);
    if (access.response) return access.response;
    const user = access.user!;

    const [classCount, studentCount, classes] = await Promise.all([
      db.class.count({ where: { userId: user.id } }),
      db.student.count({ where: { class: { userId: user.id } } }),
      db.class.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: 3,
        select: {
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
        },
      }),
    ]);

    return Response.json(
      {
        data: {
          user: { id: user.id, name: user.name },
          classCount,
          studentCount,
          classes: classes.map((item) => ({
            id: item.id,
            name: item.name,
            grade: item.grade,
            studentCount: item._count.students,
            currentUnit: item.progresses[0]?.unit ?? null,
          })),
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
