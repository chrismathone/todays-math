import { unitListResponseSchema } from "@/contracts/unit.contract";
import { db } from "@/lib/db";
import { authorizeStudio } from "@/lib/studio-ai/guard";

const headers = { "Cache-Control": "private, no-store" };

/** Bootstrap the embedded teaching area; never expose teaching data anonymously. */
export async function GET(request: Request) {
  try {
    const access = await authorizeStudio(request);
    if (access.response) return access.response;
    const user = access.user!;

    // Curriculum is shared; ClassManage/MainScreen use the existing owner-scoped APIs.
    const units = await db.unit.findMany({
      select: {
        id: true,
        grade: true,
        chapter: true,
        section: true,
        orderIndex: true,
      },
      orderBy: { orderIndex: "asc" },
    });
    const parsed = unitListResponseSchema.parse({ data: units });
    return Response.json({ data: { user, units: parsed.data } }, { headers });
  } catch {
    return Response.json(
      { error: "수업 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503, headers },
    );
  }
}
