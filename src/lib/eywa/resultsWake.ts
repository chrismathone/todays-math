import { after } from "next/server";
import { db } from "@/lib/db";
import { bindingConfigs, sourceRequest } from "./managedTransport";

export const RESULTS_WAKE_PATH =
  "/api/integrations/todays-math/v2/results-wake";

/**
 * 채점을 저장한 뒤 에이와에 «결과가 바뀌었으니 가져가라»는 신호를 보낸다(2026-10-17 · 원장님 «섞는 방식»).
 * 신호에는 내용이 없다 — 에이와가 서명된 결과 피드(`/api/integrations/eywa/v2/results`)로 직접 끌어간다.
 *
 * 🔴 응답이 나간 뒤(`after`)에 보내고 실패는 삼킨다 — 신호가 늦거나 빠져도 채점 저장은 그대로이고,
 *    에이와의 1시간 안전망 cron 이 같은 결과를 가져간다. 연결 없는 반 · 예측 문제지는 보내지 않는다.
 */
export function wakeEywaResults(testId: string): void {
  try {
    after(() => send(testId));
  } catch {
    // 요청 밖(시험 · 스크립트)에서 불리면 `after` 가 던진다 — 신호는 덤이라 조용히 건너뛴다.
  }
}

async function send(testId: string): Promise<void> {
  try {
    const test = await db.test.findUnique({
      where: { id: testId },
      select: {
        predictionRunId: true,
        class: { select: { eywaBindingId: true } },
      },
    });
    const bindingId = test?.class?.eywaBindingId;
    if (!test || test.predictionRunId || !bindingId) return;
    const config = bindingConfigs(bindingId).find(
      (c) => c.bindingId === bindingId,
    );
    if (!config) return;
    await sourceRequest(config, "control", RESULTS_WAKE_PATH, { bindingId });
  } catch {
    // 안전망 cron 이 있다 — 채점 화면에 오류를 내지 않는다.
  }
}
