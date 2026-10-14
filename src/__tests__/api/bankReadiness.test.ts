/**
 * 🔴 문제은행 P0 읽기 둘 — **출력 직전 재검증**과 **교과서 지정 두 슬롯** (2026-10-14).
 *
 * 재검증: 담을 때 «사용 가능 24»였어도 그 뒤 권리 · 검수가 바뀌면 출력 전에 차이와 까닭을 알려야 한다
 *         (낡은 24 를 그대로 인쇄하지 않는다). 필터와 무관하게 id 로만 본다 — 섞인 출처의 저장 학습지도 인쇄된다.
 * 슬롯:   준비 상태 2/2 ⇔ 오답 복습(`findRetryCandidates` → `planRetry`) 부족 0 — DB 를 지나는 길 그대로 맞댄다.
 *
 * DB 는 공유 인메모리 대역(`prismaTestDouble` — 실제 WHERE 를 판정한다).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import {
  checkBankProblems,
  loadTextbookSlotReadiness,
} from "@/lib/bankReadiness";
import {
  BANK_INELIGIBLE_CODES,
  bankCheckResponseSchema,
  bankTextbookSlotsResponseSchema,
} from "@/contracts/bankReadiness.contract";
import { PROBLEM_INELIGIBLE_CODES } from "@/lib/problemEligibility";
import { planRetry } from "@/lib/generator/planRetry";
import { textbookSlotExternalId } from "@/lib/generator/textbookSlots";
import {
  findRetryCandidates,
  serializeRetryCandidate,
  RETRY_CANDIDATE_SELECT,
} from "@/lib/tests/retryCandidates";
import { UnifiedBankQueryError } from "@/lib/unifiedPreview";
import { POST as checkPOST } from "@/app/api/dev/unified/problems/check/route";
import { POST as slotsPOST } from "@/app/api/dev/unified/problems/textbook-slots/route";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { MOCK_UNITS, USER_TEACHER_ID } from "@/mocks/data";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

const U0 = MOCK_UNITS[0].id;
const U1 = MOCK_UNITS[1].id;

async function plant(patch: Record<string, unknown> = {}) {
  // exam-wiring: 테스트 — 시험 대역(prismaTestDouble)에 픽스처를 심는다. 실 DB 가 아니다.
  return await db.problem.create({
    data: {
      userId: USER_TEACHER_ID,
      unitId: U0,
      source: "manual",
      content: "재검증확인",
      answer: "7",
      solution: "풀이",
      difficulty: "기본",
      problemType: "계산",
      questionType: "단답형",
      reviewStatus: "approved",
      directUseAllowed: true,
      pool: "shared",
      figureUrls: [],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
      ...patch,
    } as never,
  });
}
const origin = (patch: Record<string, unknown> = {}) =>
  plant({ source: "school_textbook", ...patch });
const slot = (
  parent: { id: string; unitId: string },
  n: 1 | 2,
  patch: Record<string, unknown> = {},
) =>
  plant({
    unitId: parent.unitId,
    source: "transformed",
    originProblemId: parent.id,
    externalId: textbookSlotExternalId(parent.id, n),
    ...patch,
  });
const post = (body: unknown) =>
  new Request("https://math.example/api/dev/unified/problems/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("출력 직전 재검증 — id 로만, 까닭과 함께", () => {
  it("열쇠 목록이 자격 규칙의 목록과 같다(계약과 규칙이 갈리면 화면이 모르는 열쇠를 받는다)", () => {
    expect([...BANK_INELIGIBLE_CODES]).toEqual([...PROBLEM_INELIGIBLE_CODES]);
  });

  it("담은 차례대로 · 겹친 id 는 한 번 · 출제 가능 / 출제 불가(열쇠 · 사유 · 검수 상태) / 없음", async () => {
    const ok = await plant();
    const locked = await plant({ directUseAllowed: false });
    const pending = await plant({ reviewStatus: "pending", unitId: U1 });
    const noAnswer = await plant({ answer: MISSING_ANSWER });
    const hidden = await plant({ pool: "private" });
    const gone = crypto.randomUUID();
    const result = bankCheckResponseSchema.parse(
      await checkBankProblems({
        ids: [
          locked.id,
          ok.id,
          pending.id,
          noAnswer.id,
          hidden.id,
          gone,
          ok.id,
        ],
      }),
    );
    expect(
      result.items.map((item) => [item.id, item.state, item.code]),
    ).toEqual([
      [locked.id, "ineligible", "locked"],
      [ok.id, "eligible", null],
      [pending.id, "ineligible", "notApproved"],
      [noAnswer.id, "ineligible", "noAnswer"],
      // 공용 풀 밖 행은 «없음» — 있다는 사실도 드러내지 않는다
      [hidden.id, "missing", null],
      [gone, "missing", null],
    ]);
    expect(result.items[2]).toMatchObject({
      reviewStatus: "pending",
      unitId: U1,
      source: "manual",
      reason: "검수를 통과하지 않은 문항입니다.",
    });
    expect(result.items[4]).toMatchObject({
      reviewStatus: null,
      unitId: null,
      source: null,
      reason: null,
    });
    expect(result.counts).toEqual({
      requested: 6,
      eligible: 1,
      ineligible: 3,
      missing: 2,
    });
  });

  it("조회 뒤 잠기면 출력 직전에 «출제 불가»로 바뀐다 — 낡은 판정을 들고 있지 않는다", async () => {
    const row = await plant();
    expect((await checkBankProblems({ ids: [row.id] })).counts.eligible).toBe(
      1,
    );
    await db.problem.update({
      where: { id: row.id },
      data: { directUseAllowed: false },
    });
    expect((await checkBankProblems({ ids: [row.id] })).items[0]).toMatchObject(
      { state: "ineligible", code: "locked" },
    );
  });

  it("빈 목록 · 101개 · uuid 아님은 400, 읽을 수 없는 본문도 400", async () => {
    for (const ids of [
      [],
      Array.from({ length: 101 }, () => crypto.randomUUID()),
      ["not-a-uuid"],
    ])
      await expect(checkBankProblems({ ids })).rejects.toBeInstanceOf(
        UnifiedBankQueryError,
      );
    vi.stubEnv("NODE_ENV", "development");
    expect((await checkPOST(post("{"))).status).toBe(400);
    expect((await checkPOST(post({ ids: [] }))).status).toBe(400);
    const row = await plant();
    const ok = await checkPOST(post({ ids: [row.id] }));
    expect(ok.status).toBe(200);
    expect(bankCheckResponseSchema.parse(await ok.json()).counts.eligible).toBe(
      1,
    );
    vi.stubEnv("NODE_ENV", "production");
    expect((await checkPOST(post({ ids: [row.id] }))).status).toBe(404);
  });
});

describe("교과서 지정 두 슬롯 — 0/2 · 1/2 · 2/2", () => {
  it("상태와 슬롯마다의 까닭을 원문 차례대로 낸다", async () => {
    const full = await origin();
    await slot(full, 1);
    await slot(full, 2);
    const half = await origin();
    await slot(half, 1, { reviewStatus: "rejected" });
    await slot(half, 2);
    const none = await origin();
    const moved = await origin();
    await slot(moved, 1, { unitId: U1 });
    await slot(moved, 2, { directUseAllowed: false });
    const engine = await plant();
    const hidden = await origin({ pool: "private" });
    const result = bankTextbookSlotsResponseSchema.parse(
      await loadTextbookSlotReadiness({
        sourceIds: [full.id, half.id, none.id, moved.id, engine.id, hidden.id],
      }),
    );
    expect(
      result.items.map((item) => [item.sourceId, item.state, item.ready]),
    ).toEqual([
      [full.id, "ready", 2],
      [half.id, "partial", 1],
      [none.id, "none", 0],
      [moved.id, "none", 0],
      [engine.id, "notTextbook", 0],
      [hidden.id, "missing", 0],
    ]);
    expect(result.items[1]!.slots[0]).toMatchObject({
      slot: 1,
      status: "ineligible",
      code: "notApproved",
    });
    expect(result.items[2]!.slots.map((s) => s.status)).toEqual([
      "missing",
      "missing",
    ]);
    expect(result.items[3]!.slots.map((s) => [s.status, s.code])).toEqual([
      ["unitMismatch", null],
      ["ineligible", "locked"],
    ]);
  });

  it("일반 유사문항(같은 갈래 · 같은 차시)과 과거 복구 자식은 슬롯으로 세지 않는다", async () => {
    const source = await origin({ familyKey: "fam:1" });
    await plant({ familyKey: "fam:1" });
    await plant({
      source: "transformed",
      originProblemId: source.id,
      externalId: `textbook-recovery:${source.id}`,
    });
    const [item] = (await loadTextbookSlotReadiness({ sourceIds: [source.id] }))
      .items;
    expect(item).toMatchObject({ state: "none", ready: 0 });
  });

  it("제외한 변형은 다시 세어 부족으로 남긴다 — 다른 문항으로 채우지 않는다", async () => {
    const source = await origin();
    const first = await slot(source, 1);
    await slot(source, 2);
    const [item] = (
      await loadTextbookSlotReadiness({
        sourceIds: [source.id],
        excludeIds: [first.id],
      })
    ).items;
    expect(item).toMatchObject({ state: "partial", ready: 1 });
    expect(item!.slots[0]!.status).toBe("excluded");
  });

  it("🔴 짝 — DB 를 지나는 복습 길(findRetryCandidates → planRetry)과 같은 답", async () => {
    const cases: Array<[Record<string, unknown>, Record<string, unknown>]> = [
      [{}, {}],
      [{ reviewStatus: "pending" }, {}],
      [{}, { directUseAllowed: false }],
      [{ answer: MISSING_ANSWER }, { pool: "private" }],
      [{ unitId: U1 }, {}],
      [{ reviewStatus: "rejected" }, { reviewStatus: "rejected" }],
    ];
    for (const [one, two] of cases)
      for (const exclude of [false, true]) {
        const source = await origin();
        const first = await slot(source, 1, one);
        await slot(source, 2, two);
        const excludeIds = exclude ? [first.id] : [];
        const [readiness] = (
          await loadTextbookSlotReadiness({
            sourceIds: [source.id],
            excludeIds,
          })
        ).items;
        const wrong = serializeRetryCandidate(
          (await db.problem.findUnique({ where: { id: source.id } }))!,
        );
        const plan = planRetry({
          wrong: [wrong],
          pool: await findRetryCandidates([wrong]),
          excludeIds,
          seed: "pair",
        });
        const label = JSON.stringify({ one, two, exclude });
        expect(readiness!.ready === 2, label).toBe(plan.shortfall === 0);
        expect(readiness!.ready, label).toBe(plan.picked.length);
      }
    expect(Object.keys(RETRY_CANDIDATE_SELECT)).toContain("externalId");
  });

  it("라우트 — 틀린 요청은 400, 계약 꼴로 답하고, 운영 빌드에서는 dev 짝이 닫힌다", async () => {
    const source = await origin();
    await slot(source, 1);
    vi.stubEnv("NODE_ENV", "development");
    expect((await slotsPOST(post({ sourceIds: [] }))).status).toBe(400);
    expect(
      (await slotsPOST(post({ sourceIds: [source.id], extra: true }))).status,
    ).toBe(400);
    const ok = await slotsPOST(post({ sourceIds: [source.id] }));
    expect(ok.status).toBe(200);
    expect(
      bankTextbookSlotsResponseSchema.parse(await ok.json()).items[0],
    ).toMatchObject({ state: "partial", ready: 1 });
    vi.stubEnv("NODE_ENV", "production");
    expect((await slotsPOST(post({ sourceIds: [source.id] }))).status).toBe(
      404,
    );
  });
});
