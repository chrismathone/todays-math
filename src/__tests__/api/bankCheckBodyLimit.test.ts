/**
 * 🔴 출력 직전 재검증의 본문 상한 — 2026-10-21 운영 400 «요청 내용을 읽지 못했습니다.»
 *
 * 교과서 문항 75개를 담고 2단계 → 3단계로 넘어가자 `POST /api/studio/problems/check` 가 400 으로 돌아왔다
 * (운영 error_log 13:25 KST · 본문 19,341바이트 · 배포 28868db2f). 그 문은 본문을 16KB 까지만 읽었는데,
 * 2026-10-18 부터 화면이 문항마다 `selections`(신분 · 실제 형식 · 판)를 같이 실어 한 문항이 257바이트 남짓이 됐다 —
 * 64문항부터는 계약(1~100문항)이 받는 요청을 읽기 전에 버렸다. 교과서만의 일이 아니라 문항 수의 일이다.
 *
 * 그래서 둘을 잠근다: 화면이 실제로 만드는 본문이 dev 짝 라우트를 그대로 지나는가(운영 재현) ·
 * 계약이 허용하는 가장 큰 요청(100문항 · 가장 긴 신분 · 형식 · 판)이 상한 안에 드는가. 상한은 그대로 있다.
 *
 * DB 는 공유 인메모리 대역(`prismaTestDouble`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { bankReadinessResponse } from "@/lib/bankReadiness";
import {
  BANK_CHECK_LIMIT,
  BANK_READINESS_BODY_BYTES,
  bankCheckRequestSchema,
} from "@/contracts/bankReadiness.contract";
import { createMathExamBuilderSource } from "@/components/exam-builder/mathSource";
import type { StudioProblem } from "@/components/unified/types";
import { POST as checkPOST } from "@/app/api/dev/unified/problems/check/route";
import { GET as devGet } from "@/app/api/dev/unified/problems/route";
import { MOCK_UNITS, USER_TEACHER_ID } from "@/mocks/data";

vi.mock("server-only", () => ({}));

const marker = "check-body-limit-fixture";
const signal = new AbortController().signal;

/** 교과서 원문 — 반은 객관식(형식 이름이 가장 길다), 반은 단답형. */
async function plantTextbook(index: number) {
  const choice = index % 2 === 0;
  // exam-wiring: 테스트 — 시험 대역(prismaTestDouble)에 픽스처를 심는다. 실 DB 가 아니다.
  return db.problem.create({
    data: {
      userId: USER_TEACHER_ID,
      unitId: MOCK_UNITS[0].id,
      source: "school_textbook",
      content: choice
        ? `${marker} ${index}\n① 1\n② 2\n③ 3\n④ 4\n⑤ 5`
        : `${marker} ${index}`,
      answer: choice ? "③" : String(index),
      solution: "풀이",
      difficulty: "기본",
      problemType: "계산",
      questionType: choice ? "객관식" : "단답형",
      reviewStatus: "approved",
      directUseAllowed: true,
      pool: "shared",
      figureUrls: [],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
      choiceFigureIndex: [],
    } as never,
  });
}

beforeEach(() => {
  // 대역은 `select: { unit }` 관계 투영을 모른다 — 목록 읽기가 쓰는 단원 이름만 덧붙인다(questionBankProjection 과 같다).
  const find = db.problem.findMany.bind(db.problem);
  vi.spyOn(db.problem, "findMany").mockImplementation((async (
    args: Parameters<typeof db.problem.findMany>[0],
  ) => {
    if (!args?.select?.unit) return find(args);
    const rows = await find({
      ...args,
      select: { ...args.select, unit: false, unitId: true },
    });
    return rows.map((row) => {
      const unit = MOCK_UNITS.find((u) => u.id === row.unitId)!;
      return {
        ...row,
        unit: {
          grade: unit.grade,
          chapter: unit.chapter,
          section: unit.section,
        },
      };
    });
  }) as typeof db.problem.findMany);
  vi.stubEnv("NODE_ENV", "development");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

/** 화면의 요청을 dev 짝 라우트로 그대로 보낸다 — 가짜 답을 만들지 않는다. */
const routeToDev: typeof fetch = async (input, init) => {
  const url = new URL(String(input), "http://localhost");
  const request = new Request(url, init as RequestInit);
  if (url.pathname === "/api/dev/unified/problems/check")
    return checkPOST(request);
  if (url.pathname === "/api/dev/unified/problems" && request.method === "GET")
    return devGet(request);
  throw new Error(`unexpected request ${request.method} ${url.pathname}`);
};

async function readAsBuilder(count: number) {
  const rows = [];
  for (let index = 0; index < count; index++)
    rows.push(await plantTextbook(index));
  const params = new URLSearchParams({
    identity: "question",
    view: "page",
    ids: rows.map((row) => row.id).join(","),
    pageSize: String(count),
  });
  const response = await devGet(
    new Request(`http://localhost/api/dev/unified/problems?${params}`),
  );
  expect(response.status).toBe(200);
  const page = (await response.json()) as { problems: StudioProblem[] };
  expect(page.problems).toHaveLength(count);
  return page.problems;
}

describe("출력 직전 재검증 — 본문 상한", () => {
  it.each([75, BANK_CHECK_LIMIT])(
    "🔴 운영 재현 — 교과서 문항 %i개를 담고 3단계로: 화면이 만드는 본문 그대로 재검증을 지난다",
    async (count) => {
      const items = await readAsBuilder(count);
      const sent: number[] = [];
      const source = createMathExamBuilderSource({
        problemsUrl: "/api/dev/unified/problems",
        fetch: async (input, init) => {
          if (String(input).endsWith("/check"))
            sent.push(new TextEncoder().encode(String(init?.body)).byteLength);
          return routeToDev(input, init);
        },
      });
      await expect(source.prepareOutput!(items, signal)).resolves.toEqual(
        items,
      );
      // 문항마다 형식 · 판을 같이 실은 본문이었다(id 만 실은 가벼운 요청이 아니다).
      expect(sent).toHaveLength(1);
      expect(sent[0]).toBeGreaterThan(16 * 1024);
      expect(sent[0]).toBeLessThanOrEqual(BANK_READINESS_BODY_BYTES);
    },
  );

  it("계약이 허용하는 가장 큰 요청(100문항 · 가장 긴 신분 · 형식 · 판)이 상한 안에 들고 라우트가 읽는다", async () => {
    const hex = "f".repeat(64);
    const ids = Array.from({ length: BANK_CHECK_LIMIT }, () =>
      crypto.randomUUID(),
    );
    const body = {
      ids,
      selections: ids.map((problemId) => ({
        questionId: `q:v1:${hex}`,
        problemId,
        format: "multiple_choice",
        revision: `qr:v1:${hex}`,
      })),
    };
    expect(bankCheckRequestSchema.safeParse(body).success).toBe(true);
    const bytes = new TextEncoder().encode(JSON.stringify(body)).byteLength;
    expect(bytes).toBeLessThanOrEqual(BANK_READINESS_BODY_BYTES);
    const response = await bankReadinessResponse(
      new Request("http://localhost/check", {
        method: "POST",
        body: JSON.stringify(body),
      }),
      {},
      async (input) => ({ read: (input as { ids: string[] }).ids.length }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ read: BANK_CHECK_LIMIT });
  });

  it("상한은 그대로 있다 — 넘는 본문은 읽기 전에 400(계약 검사까지 가지 않는다)", async () => {
    const load = vi.fn(async () => ({}));
    const response = await bankReadinessResponse(
      new Request("http://localhost/check", {
        method: "POST",
        body: JSON.stringify({
          ids: [crypto.randomUUID()],
          pad: "x".repeat(BANK_READINESS_BODY_BYTES),
        }),
      }),
      {},
      load,
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("요청 내용을 읽지 못했습니다.");
    expect(load).not.toHaveBeenCalled();
  });
});
