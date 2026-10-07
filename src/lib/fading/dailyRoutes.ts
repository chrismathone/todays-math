import "server-only";
import {
  fadingDailyPlanResponseSchema,
  fadingDailyQuotaSchema,
} from "@/contracts/fadingDaily.contract";
import { jsonOk, validationError } from "@/lib/apiResponse";
import { noStore } from "@/lib/learn/accountRoutes";
import { readSrsState } from "@/lib/math-srs/serverStore";
import { fadingConceptMap } from "./catalog";
import { serverFadingDailyPlan } from "./explorerDailyServer";
import { enterFadingRoute, fadingRouteFailure } from "./routes";

/**
 * GET /api/learn/fading/daily?quota= — «오늘 할 일»(계약 `fadingDaily.contract.ts`). `quota` 는 오늘 분량(1 ~ 60 의 정수 · 안 줘도 된다).
 *
 * 다른 «오늘의 기억» 라우트와 같은 문을 지난다(학생 세션 · 살아 있는 계정 · 서버가 정하는 «오늘» · 서버 문 `MATH_FADING`).
 * 🔴 읽기뿐이다 — 학생 기록을 한 번 읽고 아무것도 쓰지 않는다. 탐험을 시작하거나 풀이를 여는 것은 지금 있는 길이 한다.
 */
export async function handleFadingDailyRequest(
  request: Request,
): Promise<Response> {
  const gate = await enterFadingRoute(request, false);
  if (gate.response) return gate.response;
  const { student, now } = gate;
  try {
    // 분량은 저장하지 않는 값이다 — 숫자 글자만 받고(«1e1» · « 20» · «20.0» 은 받지 않는다) 범위를 본다.
    const asked = new URL(request.url).searchParams.get("quota");
    let quota: number | undefined;
    if (asked !== null) {
      const parsed = fadingDailyQuotaSchema.safeParse(
        /^\d{1,2}$/.test(asked) ? Number(asked) : Number.NaN,
      );
      if (!parsed.success) return noStore(validationError(parsed.error));
      quota = parsed.data;
    }
    const saved = await readSrsState(student.id);
    return noStore(
      jsonOk(fadingDailyPlanResponseSchema, {
        data: serverFadingDailyPlan({
          state: saved.state,
          studentId: student.id,
          now,
          concepts: fadingConceptMap(),
          quota,
        }),
      }),
    );
  } catch (error) {
    return fadingRouteFailure(error);
  }
}
