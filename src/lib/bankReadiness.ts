import "server-only";
import {
  bankCheckRequestSchema,
  bankTextbookSlotsRequestSchema,
  type BankCheckItem,
  type BankCheckResponse,
  type BankTextbookSlotReadiness,
  type BankTextbookSlotsResponse,
} from "@/contracts/bankReadiness.contract";
import { db } from "@/lib/db";
import {
  textbookSlotCandidateWhere,
  textbookSlotReadiness,
} from "@/lib/generator/textbookSlots";
import {
  problemIneligibleCode,
  problemIneligibleReason,
} from "@/lib/problemEligibility";
import { problemVisibleWhere } from "@/lib/problemPool";
import { RETRY_CANDIDATE_SELECT } from "@/lib/tests/retryCandidates";
import { readStrictJson } from "@/lib/textbook/strictJson";
import { UnifiedBankQueryError } from "@/lib/unifiedPreview";

/**
 * 문제은행 P0 읽기 둘 — 출력 직전 재검증 · 교과서 지정 두 슬롯 (`bankReadiness.contract.ts`).
 *
 * 둘 다 **공용 풀에서 보이는 행**(`problemVisibleWhere`)만 읽는다 — 풀 밖 행은 «없음»으로 답하고 그 존재를
 * 드러내지 않는다. 자격의 판정은 `problemEligibility.ts` 한 곳, 슬롯은 오답 복습과 같은 `textbookSlotReadiness`.
 */

const unique = (ids: readonly string[]) => [...new Set(ids)];

/** 담긴 문항이 지금도 출제 가능한가 — 필터와 무관하게 id 로만(섞인 출처의 저장 학습지도 그대로 인쇄된다). */
export async function checkBankProblems(
  input: unknown,
): Promise<BankCheckResponse> {
  const parsed = bankCheckRequestSchema.safeParse(input);
  if (!parsed.success)
    throw new UnifiedBankQueryError("확인할 문항을 1~100개로 보내 주세요.");
  const ids = unique(parsed.data.ids);
  const rows = await db.problem.findMany({
    where: { AND: [problemVisibleWhere(), { id: { in: ids } }] },
    select: {
      id: true,
      pool: true,
      reviewStatus: true,
      directUseAllowed: true,
      answer: true,
      unitId: true,
      source: true,
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const items = ids.map((id): BankCheckItem => {
    const row = byId.get(id);
    if (!row)
      return {
        id,
        state: "missing",
        code: null,
        reason: null,
        reviewStatus: null,
        unitId: null,
        source: null,
      };
    const code = problemIneligibleCode(row);
    return {
      id,
      state: code === null ? "eligible" : "ineligible",
      code,
      reason: problemIneligibleReason(row),
      reviewStatus: row.reviewStatus,
      unitId: row.unitId,
      source: row.source,
    };
  });
  const count = (state: BankCheckItem["state"]) =>
    items.filter((item) => item.state === state).length;
  return {
    items,
    counts: {
      requested: items.length,
      eligible: count("eligible"),
      ineligible: count("ineligible"),
      missing: count("missing"),
    },
  };
}

/**
 * 교과서 원문의 지정 두 슬롯 — 오답 복습과 **같은 술어**(`textbookSlotReadiness`)로.
 * 슬롯 행은 자격과 무관하게 보이는 것을 읽는다(«하나 반려 → 1/2»의 까닭을 말하려고). 2/2 ⇔ 복습 부족 0.
 */
export async function loadTextbookSlotReadiness(
  input: unknown,
): Promise<BankTextbookSlotsResponse> {
  const parsed = bankTextbookSlotsRequestSchema.safeParse(input);
  if (!parsed.success)
    throw new UnifiedBankQueryError(
      "원문을 1~100개, 제외할 문항을 100개까지 보내 주세요.",
    );
  const sourceIds = unique(parsed.data.sourceIds);
  const origins = await db.problem.findMany({
    where: { AND: [problemVisibleWhere(), { id: { in: sourceIds } }] },
    select: { id: true, unitId: true, source: true },
  });
  const textbookIds = origins
    .filter((origin) => origin.source === "school_textbook")
    .map((origin) => origin.id);
  const slotRows = textbookIds.length
    ? await db.problem.findMany({
        where: {
          AND: [problemVisibleWhere(), textbookSlotCandidateWhere(textbookIds)],
        },
        select: RETRY_CANDIDATE_SELECT,
        orderBy: { id: "asc" },
      })
    : [];
  const byId = new Map(origins.map((origin) => [origin.id, origin]));
  return {
    items: sourceIds.map((sourceId): BankTextbookSlotReadiness => {
      const origin = byId.get(sourceId);
      if (!origin)
        return { sourceId, state: "missing", ready: 0, required: 2, slots: [] };
      const readiness = textbookSlotReadiness(origin, slotRows, {
        excludeIds: parsed.data.excludeIds,
      });
      return {
        sourceId,
        state: readiness.state,
        ready: readiness.ready,
        required: readiness.required,
        slots: readiness.slots,
      };
    }),
  };
}

/**
 * 라우트의 몸 — 운영(`/api/studio/problems/…`)과 dev 짝이 같이 쓴다. 관문은 부르는 라우트가 먼저 지난다.
 * 본문은 상한(16KB — id 200개 남짓) 안에서 엄격하게 읽는다. 틀린 요청은 400, 그 밖의 실패는 503.
 */
export async function bankReadinessResponse(
  request: Request,
  headers: HeadersInit,
  load: (input: unknown) => Promise<unknown>,
): Promise<Response> {
  let body: unknown;
  try {
    body = await readStrictJson(request, { maxBytes: 16 * 1024 });
  } catch {
    return Response.json(
      { error: "요청 내용을 읽지 못했습니다." },
      { status: 400, headers },
    );
  }
  try {
    return Response.json(await load(body), { headers });
  } catch (error) {
    if (error instanceof UnifiedBankQueryError)
      return Response.json({ error: error.message }, { status: 400, headers });
    return Response.json(
      { error: "문항 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503, headers },
    );
  }
}
