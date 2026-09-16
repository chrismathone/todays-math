import type {
  ClassProgressPlanResponse,
  PlanScheduleEntity,
  ProgressPlanEntity,
} from "@/contracts/dailyAutoTest.contract";
import type { PlanDraft } from "@/lib/class/planDraft";
import { planDraftBody } from "@/lib/class/planDraft";
import { serverErrorText } from "@/lib/class/serverError";

/**
 * 반 계획 읽기 · 저장 · 미리보기 (D-129 ④ · D-131) — 화면 쪽 호출.
 *
 * 계약 스키마는 응답이 온 뒤에 불러온다(`classApi.ts` 와 같은 까닭 — 성능 수리 C-1).
 * 🔴 실패는 **서버 문구 그대로**(`serverErrorText`) — 400/422 로 가르지 않는다(22 §4 리드 결정 F).
 */
const planContract = () => import("@/contracts/dailyAutoTest.contract");

export type PlanResult<T> =
  { ok: true; data: T } | { ok: false; message: string };

async function failure(
  res: Response,
  fallback: string,
): Promise<{ ok: false; message: string }> {
  const body = await res.json().catch(() => null);
  return { ok: false, message: serverErrorText(body) ?? fallback };
}

export async function fetchClassPlan(
  classId: string,
  day: string,
): Promise<PlanResult<ClassProgressPlanResponse["data"]>> {
  try {
    const res = await fetch(
      `/api/classes/${classId}/progress-plan?day=${day}`,
      { cache: "no-store" },
    );
    if (!res.ok) return failure(res, "수업 계획을 불러오지 못했습니다.");
    const { classProgressPlanResponseSchema } = await planContract();
    return {
      ok: true,
      data: classProgressPlanResponseSchema.parse(await res.json()).data,
    };
  } catch {
    return { ok: false, message: "수업 계획을 불러오지 못했습니다." };
  }
}

export async function saveClassPlan(
  classId: string,
  draft: PlanDraft,
): Promise<PlanResult<ProgressPlanEntity>> {
  try {
    const res = await fetch(`/api/classes/${classId}/progress-plan`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(planDraftBody(draft)),
    });
    if (!res.ok) return failure(res, "수업 계획을 저장하지 못했습니다.");
    const { progressPlanResponseSchema } = await planContract();
    return {
      ok: true,
      data: progressPlanResponseSchema.parse(await res.json()).data,
    };
  } catch {
    return { ok: false, message: "수업 계획을 저장하지 못했습니다." };
  }
}

/** 저장하지 않고 편 예정 — 날짜 펴기는 서버 한 곳이다(`POST …/progress-plan/preview`). */
export async function previewClassPlan(
  classId: string,
  draft: PlanDraft,
  day: string,
  signal?: AbortSignal,
): Promise<PlanResult<PlanScheduleEntity>> {
  try {
    const res = await fetch(
      `/api/classes/${classId}/progress-plan/preview?day=${day}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(planDraftBody(draft)),
        signal,
      },
    );
    if (!res.ok) return failure(res, "예정을 미리 보지 못했습니다.");
    const { progressPlanPreviewResponseSchema } = await planContract();
    return {
      ok: true,
      data: progressPlanPreviewResponseSchema.parse(await res.json()).data
        .schedule,
    };
  } catch {
    return { ok: false, message: "예정을 미리 보지 못했습니다." };
  }
}
