import "server-only";
import { fadingDailyPlanResponseSchema } from "@/contracts/fadingDaily.contract";
import { jsonOk } from "@/lib/apiResponse";
import { kstDateOf } from "@/lib/kstDate";
import { noStore } from "@/lib/learn/accountRoutes";
import { readSrsState } from "@/lib/math-srs/serverStore";
import { fadingConceptMap } from "./catalog";
import { serverFadingDailyPlan } from "./explorerDailyServer";
import { fadingQuotaForStudent } from "./quotaServer";
import { enterFadingRoute, fadingRouteFailure } from "./routes";

/**
 * GET /api/learn/fading/daily — «오늘 할 일»(계약 `fadingDaily.contract.ts`).
 * 분량은 **교사가 정한 학생의 값**이다(원장님 결정 2026-10-17 · `quota.ts`) — 없으면 서비스 기본. 🔴 학생 쪽 요청이 분량을 정하지 못한다:
 * 주소의 `?quota=` 는 더 읽지 않는다(서버 없이 도는 측정용 원천 `createLocalFadingSource` 만 그 값을 받는다).
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
    const quota = await fadingQuotaForStudent(student.id, kstDateOf(now));
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
