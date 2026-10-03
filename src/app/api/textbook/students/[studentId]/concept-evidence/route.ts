/**
 * GET /api/textbook/students/{studentId}/concept-evidence — 내 학생 한 명의 백지 활동(새것부터).
 * 여기서 내는 것은 교재의 백지 활동뿐이다 — 탐험 기록 · 시험 관측은 각자의 정본에서 따로 읽는다
 * (출처를 합쳐 한 점수로 만들지 않는다).
 */
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { studentConceptAttempts } from "@/lib/textbook/server/conceptRows";
import { plain, textbookRoute, uuidParam } from "@/lib/textbook/server/http";

type Context = { params: Promise<{ studentId: string }> };

export const GET = withErrorLog(
  "/api/textbook/students/[studentId]/concept-evidence",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) =>
      plain({
        attempts: await studentConceptAttempts(
          db,
          actor,
          uuidParam((await context.params).studentId, "학생"),
        ),
      }),
    ),
);
