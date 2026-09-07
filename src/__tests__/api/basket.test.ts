/**
 * **담기 바구니 API — 네 갈래 + 시험지 만들기** (D-118, 원장님 확정 2026-09-04).
 *
 * 구현: `src/app/api/basket/route.ts` · `src/app/api/basket/test/route.ts`
 * 대응 계약: `src/contracts/basket.contract.ts`
 *
 * ## 왜 뒤늦게 쓰나 — 그리고 그 사이에 무엇이 안 지켜졌나
 *
 * 기능을 낸 회차(2026-09-04)에는 순수 규칙 둘(`countSpread`·`renumberForTest`)만
 * 잠갔고, 라우트는 **아무도 안 지켰다.** `prismaTestDouble` 에 `basketItem` 이 없다는
 * 것이 이유였는데, 그건 「못 한다」가 아니라 「안 했다」였다. 그동안 코드에만 있던 것:
 *
 *   ㉠ 담기가 **멱등**이다        ㉡ 차례는 **최댓값+1** 이다(`COUNT(*)+1` 이 아니다)
 *   ㉢ 빼기가 **차례를 다시 안 매긴다**   ㉣ 빈 바구니는 **422**
 *   ㉤ 시험지를 만들면 **비워진다**       ㉥ 범위는 **담긴 문항이 정한다**
 *
 * ## 🔴 이 시험이 **못 보는 것** — 정직하게 적는다
 *
 * ⑴ **범위가 «교육과정 차례로 정렬된다»는 것은 여기서 반증되지 않는다.** 시드
 *    `MOCK_UNITS` 자체가 `orderIndex` 오름차순이고 가짜의 `unit.findMany` 는 그
 *    배열을 걸러 내므로, 라우트가 `orderBy` 를 빼도 같은 답이 나온다. 아래 시험이
 *    실제로 죽이는 것은 **「담은 차례를 그대로 범위로 쓰는 구현」**이다(그건 갈린다).
 *    참 정렬은 실물 DB 에서만 갈린다.
 * ⑵ **동시에 두 창에서 담는 경우**는 못 본다. 실제 방어는 `@@unique(userId, problemId)`
 *    이고 그건 DB 제약이라 인메모리 가짜에 없다.
 * ⑶ 차례가 `orderIndex` 로 **정렬되어 온다**는 것은 가짜가 `applyOrder` 로 흉내 낸다 —
 *    실제 인덱스(`@@index([userId, orderIndex])`)가 도는지는 여기서 못 잰다.
 */
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "테스트 강사",
  })),
}));

import {
  DELETE as deleteBasket,
  GET as getBasket,
  POST as addToBasket,
} from "@/app/api/basket/route";
import { POST as makeTestFromBasket } from "@/app/api/basket/test/route";

import { basketResponseSchema } from "@/contracts/basket.contract";
import { basketTestResponseSchema } from "@/contracts/basket.contract";
import { errorResponseSchema } from "@/contracts/common.contract";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import {
  CLASS_OTHER_ID,
  MOCK_CLASSES,
  MOCK_PROBLEM_OTHER_SHARED,
  MOCK_PROBLEM_OTHER_USER,
  MOCK_PROBLEMS,
  MOCK_UNITS,
  NOT_FOUND_ID,
  USER_OTHER_ID,
  USER_TEACHER_ID,
} from "@/mocks/data";

const CLASS_ID = MOCK_CLASSES[0]!.id;
const TEST_DATE = "2026-09-10";

/**
 * 서로 **다른 단원**의 문항 둘 — 교육과정에서 앞선 쪽과 뒤선 쪽.
 * 범위 산정을 겨누는 시험이 이 둘의 차례를 일부러 뒤집어 담는다.
 */
const UNIT_EARLY = MOCK_UNITS[0]!;
const UNIT_LATE = MOCK_UNITS[13]!;
const PROBLEM_EARLY = MOCK_PROBLEMS.find((p) => p.unitId === UNIT_EARLY.id)!;
const PROBLEM_LATE = MOCK_PROBLEMS.find((p) => p.unitId === UNIT_LATE.id)!;

/**
 * 🔴 **픽스처가 전제를 지키는지 먼저 못 박는다.** 이것이 없으면 나중에 시드가
 *    바뀌어 두 문항이 같은 단원이 되어도 범위 시험이 «통과»한다 — 아무것도 안 재고.
 */
if (
  UNIT_EARLY.orderIndex >= UNIT_LATE.orderIndex ||
  PROBLEM_EARLY === undefined ||
  PROBLEM_LATE === undefined ||
  PROBLEM_EARLY.unitId === PROBLEM_LATE.unitId
) {
  throw new Error(
    "[basket.test] 픽스처 전제가 깨졌다 — 다른 단원의 문항 둘이 필요하다",
  );
}

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** 담기 — 응답을 계약으로 검사해서 돌려준다(모든 갈래가 «담은 뒤의 바구니»를 낸다). */
async function add(problemId: string) {
  const res = await addToBasket(
    jsonRequest("http://localhost/api/basket", "POST", { problemId }),
  );
  expect(res.status, `담기 실패: ${problemId}`).toBe(200);
  return basketResponseSchema.parse(await res.json()).data;
}

async function removeOne(problemId: string) {
  const res = await deleteBasket(
    jsonRequest(`http://localhost/api/basket?problemId=${problemId}`, "DELETE"),
  );
  expect(res.status).toBe(200);
  return basketResponseSchema.parse(await res.json()).data;
}

async function read() {
  const res = await getBasket();
  expect(res.status).toBe(200);
  return basketResponseSchema.parse(await res.json()).data;
}

/** 다음 한 번의 호출만 다른 사람이 하게 만든다. */
function asOtherUser() {
  vi.mocked(getSessionUser).mockResolvedValueOnce({
    id: USER_OTHER_ID,
    email: "other@todaysmath.test",
    name: "박강사",
  } as Awaited<ReturnType<typeof getSessionUser>>);
}

describe("GET /api/basket — 빈 바구니", () => {
  it("담기 전에는 비어 있고, 사다리 **전 칸**이 0 으로 온다", async () => {
    const data = await read();
    expect(data.total).toBe(0);
    expect(data.items).toEqual([]);
    // 칸이 아예 없으면 받는 쪽이 「없다」와 「0이다」를 못 가른다.
    expect(Object.keys(data.spread).sort()).toEqual(
      [...DIFFICULTY_LADDER].sort(),
    );
  });

  it("로그인하지 않으면 401", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    const res = await getBasket();
    expect(res.status).toBe(401);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "UNAUTHORIZED",
    );
  });
});

describe("POST /api/basket — 담기", () => {
  it("담으면 «담은 뒤의 바구니»가 통째로 온다 — 화면이 다시 안 물어도 된다", async () => {
    const data = await add(PROBLEM_EARLY.id);
    expect(data.total).toBe(1);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]!.problem.id).toBe(PROBLEM_EARLY.id);
    expect(data.items[0]!.orderIndex).toBe(1);
    // 분포를 **서버가** 센다 — 그 문항의 갈래가 하나 올라 있어야 한다.
    expect(data.spread[PROBLEM_EARLY.difficulty]).toBe(1);
  });

  it("🔴 적힌 수의 **합이 곧 `total`** 이다", async () => {
    await add(PROBLEM_EARLY.id);
    await add(PROBLEM_LATE.id);
    const data = await add(MOCK_PROBLEM_OTHER_SHARED.id);
    // 어느 칸에도 안 들어간 문항이 있으면 바가 「3개」라 해 놓고 분포는 2를 말한다.
    const sum = DIFFICULTY_LADDER.reduce(
      (a, d) => a + (data.spread[d] ?? 0),
      0,
    );
    expect(sum).toBe(data.total);
    expect(data.total).toBe(3);
  });

  it("🔴 **멱등** — 같은 문항을 두 번 담아도 한 칸이고 차례가 안 바뀐다", async () => {
    await add(PROBLEM_EARLY.id);
    await add(PROBLEM_LATE.id);
    const again = await add(PROBLEM_EARLY.id);

    expect(again.total).toBe(2);
    // 다시 담았다고 맨 뒤로 밀리면 「담은 차례」가 거짓이 된다.
    expect(again.items.map((i) => i.problem.id)).toEqual([
      PROBLEM_EARLY.id,
      PROBLEM_LATE.id,
    ]);
    expect(again.items.map((i) => i.orderIndex)).toEqual([1, 2]);
  });

  it("🔴 차례는 **최댓값+1** 이다 — 구멍이 있어도 부딪히지 않는다", async () => {
    // 이 시험이 죽이는 구현: `COUNT(*) + 1`.
    // 자리 {1,2,3} 에서 2번을 빼면 {1,3} 이 남고 COUNT 는 2 다 — 그 식은 **3** 을
    // 주어 이미 있는 3번과 부딪힌다(제약이 없어 조용히 겹치고, 그때부터 차례가
    // 뜻을 잃는다). 2026-08-29 문항류 자리에서 실제로 겪은 결함이다.
    await add(PROBLEM_EARLY.id); // 1
    await add(PROBLEM_LATE.id); // 2
    await add(MOCK_PROBLEM_OTHER_SHARED.id); // 3
    await removeOne(PROBLEM_LATE.id); // 자리 {1, 3}

    const after = await add(MOCK_PROBLEMS[1]!.id);
    const indexes = after.items.map((i) => i.orderIndex);
    expect(indexes).toEqual([1, 3, 4]);
    expect(new Set(indexes).size, "차례가 겹쳤다").toBe(indexes.length);
  });

  it("공유 풀이면 **남의 문항도** 담을 수 있다 (D-31)", async () => {
    const data = await add(MOCK_PROBLEM_OTHER_SHARED.id);
    expect(data.items[0]!.problem.id).toBe(MOCK_PROBLEM_OTHER_SHARED.id);
  });

  it("🔴 볼 수 없는 남의 private 문항은 담을 수 없다 (404)", async () => {
    // 담기면 화면에 **그릴 수 없는 칸**이 생기고, 그대로 시험지에 실린다.
    const res = await addToBasket(
      jsonRequest("http://localhost/api/basket", "POST", {
        problemId: MOCK_PROBLEM_OTHER_USER.id,
      }),
    );
    expect(res.status).toBe(404);
    expect(
      await db.basketItem.count({ where: { userId: USER_TEACHER_ID } }),
    ).toBe(0);
  });

  it("없는 문항은 404", async () => {
    const res = await addToBasket(
      jsonRequest("http://localhost/api/basket", "POST", {
        problemId: NOT_FOUND_ID,
      }),
    );
    expect(res.status).toBe(404);
  });

  it("problemId 가 uuid 가 아니면 400", async () => {
    const res = await addToBasket(
      jsonRequest("http://localhost/api/basket", "POST", { problemId: "abc" }),
    );
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "VALIDATION_ERROR",
    );
  });

  it("로그인하지 않으면 401", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    const res = await addToBasket(
      jsonRequest("http://localhost/api/basket", "POST", {
        problemId: PROBLEM_EARLY.id,
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/basket — 빼기·비우기", () => {
  it("🔴 한 문항을 빼도 **남은 차례를 다시 안 매긴다**", async () => {
    await add(PROBLEM_EARLY.id); // 1
    await add(PROBLEM_LATE.id); // 2
    await add(MOCK_PROBLEM_OTHER_SHARED.id); // 3

    const after = await removeOne(PROBLEM_LATE.id);
    // 다시 매기면 「내가 셋째로 담은 것」이 다른 문항을 가리킨다 — 일부러 구멍을 둔다.
    expect(after.items.map((i) => i.orderIndex)).toEqual([1, 3]);
    expect(after.items.map((i) => i.problem.id)).toEqual([
      PROBLEM_EARLY.id,
      MOCK_PROBLEM_OTHER_SHARED.id,
    ]);
  });

  it("🔴 응답이 이미 «지운 뒤»의 분포다 — 바가 옛 수를 말하지 않게", async () => {
    await add(PROBLEM_EARLY.id);
    await add(PROBLEM_LATE.id);
    const after = await removeOne(PROBLEM_EARLY.id);
    expect(after.total).toBe(1);
    expect(after.spread[PROBLEM_EARLY.difficulty]).toBe(
      PROBLEM_EARLY.difficulty === PROBLEM_LATE.difficulty ? 1 : 0,
    );
  });

  it("problemId 없이 부르면 통째로 비운다", async () => {
    await add(PROBLEM_EARLY.id);
    await add(PROBLEM_LATE.id);
    const res = await deleteBasket(
      jsonRequest("http://localhost/api/basket", "DELETE"),
    );
    expect(res.status).toBe(200);
    const data = basketResponseSchema.parse(await res.json()).data;
    expect(data.total).toBe(0);
    expect(data.items).toEqual([]);
  });

  it("problemId 가 uuid 가 아니면 400 — 조용히 통째로 비우지 않는다", async () => {
    await add(PROBLEM_EARLY.id);
    const res = await deleteBasket(
      jsonRequest("http://localhost/api/basket?problemId=%20", "DELETE"),
    );
    expect(res.status).toBe(400);
    // 🔴 이것이 이 시험의 핵심이다 — 잘못된 값을 «없는 것»으로 읽으면 한 칸을
    //    빼려던 손짓이 **바구니를 통째로 비운다.**
    expect(await db.basketItem.count({})).toBe(1);
  });

  it("로그인하지 않으면 401", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    const res = await deleteBasket(
      jsonRequest("http://localhost/api/basket", "DELETE"),
    );
    expect(res.status).toBe(401);
  });
});

describe("담기 바구니 — 계정마다 따로다", () => {
  it("🔴 남이 담은 것은 내 바구니에 안 보인다", async () => {
    asOtherUser();
    const mine0 = await addToBasket(
      jsonRequest("http://localhost/api/basket", "POST", {
        problemId: PROBLEM_EARLY.id,
      }),
    );
    expect(mine0.status).toBe(200);

    const mine = await read();
    expect(mine.total).toBe(0);
    expect(
      await db.basketItem.count({ where: { userId: USER_OTHER_ID } }),
    ).toBe(1);
  });

  it("🔴 내가 비워도 남의 바구니는 그대로다", async () => {
    asOtherUser();
    await addToBasket(
      jsonRequest("http://localhost/api/basket", "POST", {
        problemId: PROBLEM_EARLY.id,
      }),
    );
    await add(PROBLEM_LATE.id);

    const res = await deleteBasket(
      jsonRequest("http://localhost/api/basket", "DELETE"),
    );
    expect(res.status).toBe(200);
    expect(
      await db.basketItem.count({ where: { userId: USER_OTHER_ID } }),
    ).toBe(1);
    expect(
      await db.basketItem.count({ where: { userId: USER_TEACHER_ID } }),
    ).toBe(0);
  });
});

describe("POST /api/basket/test — 담은 것으로 시험지", () => {
  function makeRequest(body: unknown) {
    return jsonRequest("http://localhost/api/basket/test", "POST", body);
  }

  it("🔴 빈 바구니는 422 — 문항 0개짜리 지면이 나가지 않게", async () => {
    const res = await makeTestFromBasket(
      makeRequest({ classId: CLASS_ID, testDate: TEST_DATE }),
    );
    expect(res.status).toBe(422);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.code).toBe("VALIDATION_ERROR");
    // 🔴 **사유까지 본다.** 이 가드를 빼도 뒤의 「단원을 못 찾았다」가 같은 422 를
    //    내므로 상태 코드만 보면 **가드가 없어도 초록**이다(변이로 확인했다).
    //    그리고 두 문구는 원장이 할 일이 다르다 — 하나는 «담으십시오», 다른 하나는
    //    「무슨 소린가」다.
    expect(body.error.message).toContain("담은 문항이 없습니다");
  });

  it("🔴 구멍이 있어도 시험지 문항 번호는 **담은 차례대로 1..N**", async () => {
    await add(PROBLEM_EARLY.id); // 1
    await add(PROBLEM_LATE.id); // 2
    await add(MOCK_PROBLEM_OTHER_SHARED.id); // 3
    await removeOne(PROBLEM_LATE.id); // 자리 {1, 3}

    const res = await makeTestFromBasket(
      makeRequest({ classId: CLASS_ID, testDate: TEST_DATE }),
    );
    expect(res.status).toBe(201);
    const body = basketTestResponseSchema.parse(await res.json()).data;
    expect(body.problemCount).toBe(2);

    const rows = await db.testProblem.findMany({
      where: { testId: body.testId },
      orderBy: { orderIndex: "asc" },
    });
    expect(rows.map((r: { orderIndex: number }) => r.orderIndex)).toEqual([
      1, 2,
    ]);
    expect(rows.map((r: { problemId: string }) => r.problemId)).toEqual([
      PROBLEM_EARLY.id,
      MOCK_PROBLEM_OTHER_SHARED.id,
    ]);
  });

  it("🔴 범위는 **담긴 문항이** 정한다 — 담은 차례가 아니다", async () => {
    // 교육과정에서 **뒤선** 단원의 문항을 먼저 담는다. 담은 차례를 그대로 범위로
    // 쓰는 구현이면 시작·끝이 뒤집힌다.
    await add(PROBLEM_LATE.id);
    await add(PROBLEM_EARLY.id);

    const res = await makeTestFromBasket(
      makeRequest({ classId: CLASS_ID, testDate: TEST_DATE }),
    );
    expect(res.status).toBe(201);
    const { testId } = basketTestResponseSchema.parse(await res.json()).data;

    const created = await db.test.findUnique({ where: { id: testId } });
    expect(created?.rangeStartUnitId).toBe(UNIT_EARLY.id);
    expect(created?.rangeEndUnitId).toBe(UNIT_LATE.id);
    // 손으로 고른 시험지는 진도에 안 매인다 — 범위가 있는 쪽이다.
    expect(created?.testType).toBe("review");
    expect(created?.status).toBe("draft");
  });

  it("🔴 시험지를 만들면 바구니가 비워진다", async () => {
    await add(PROBLEM_EARLY.id);
    const res = await makeTestFromBasket(
      makeRequest({ classId: CLASS_ID, testDate: TEST_DATE }),
    );
    expect(res.status).toBe(201);
    // 안 비우면 다음 시험지에 통째로 다시 실리고, 원장이 그걸 아는 자리가 인쇄물뿐이다.
    expect(await read()).toMatchObject({ total: 0, items: [] });
  });

  it("🔴 마지막 걸음이 실패하면 **시험지도 안 남는다** (원자성)", async () => {
    await add(PROBLEM_EARLY.id);
    await add(PROBLEM_LATE.id);
    const testsBefore = await db.test.count({});
    const rowsBefore = await db.testProblem.count({});

    // ⚠️ **비우기를 실패시킨다.** 앞의 걸음(`testProblem.createMany`)을 실패시키면
    //    바구니는 어차피 손도 안 댄 상태라 「안 비워졌다」가 **공짜로** 통과한다 —
    //    되돌리기가 없어도 초록이다. 마지막 걸음을 실패시켜야 앞의 둘(시험지·문항
    //    행)이 실제로 되돌아가는지 갈린다.
    const spy = vi
      .spyOn(db.basketItem, "deleteMany")
      .mockRejectedValueOnce(new Error("일부러 실패"));
    try {
      await expect(
        makeTestFromBasket(
          makeRequest({ classId: CLASS_ID, testDate: TEST_DATE }),
        ),
      ).rejects.toThrow("일부러 실패");
    } finally {
      spy.mockRestore();
    }

    // 시험지만 남고 바구니가 그대로면, 원장이 「안 만들어졌다」고 알고 다시 눌러
    // **빈 시험지가 쌓인다.** 셋이 한 덩이여야 한다.
    expect(await db.test.count({}), "떠도는 시험지가 남았다").toBe(testsBefore);
    expect(await db.testProblem.count({})).toBe(rowsBefore);
    expect((await read()).total).toBe(2);
  });

  it("남의 반으로는 만들 수 없다 (403)", async () => {
    await add(PROBLEM_EARLY.id);
    const res = await makeTestFromBasket(
      makeRequest({ classId: CLASS_OTHER_ID, testDate: TEST_DATE }),
    );
    expect(res.status).toBe(403);
    // 막혔으면 바구니도 그대로여야 한다.
    expect(
      await db.basketItem.count({ where: { userId: USER_TEACHER_ID } }),
    ).toBe(1);
  });

  it("없는 반이면 404", async () => {
    await add(PROBLEM_EARLY.id);
    const res = await makeTestFromBasket(
      makeRequest({ classId: NOT_FOUND_ID, testDate: TEST_DATE }),
    );
    expect(res.status).toBe(404);
  });

  it("날짜 형식이 틀리면 400", async () => {
    await add(PROBLEM_EARLY.id);
    const res = await makeTestFromBasket(
      makeRequest({ classId: CLASS_ID, testDate: "2026/09/10" }),
    );
    expect(res.status).toBe(400);
  });

  it("로그인하지 않으면 401", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    const res = await makeTestFromBasket(
      makeRequest({ classId: CLASS_ID, testDate: TEST_DATE }),
    );
    expect(res.status).toBe(401);
  });
});

/**
 * 🔴 **출제 자격** — 손으로 짜는 길이 자동 출제의 관문 옆으로 나 있었다 (2026-09-07).
 *
 * 담기는 「볼 수 있나」(공유 풀)만 물었고 시험지 만들기는 아무것도 안 물었다. 그래서
 * 실측 **1,751건**(전부 `approved` 인데 `directUseAllowed=false` — 그림이 유실돼 잠근
 * 것들)이 「다음 그림에서…」라고 적힌 채 **그림 없이 종이로** 나갈 수 있었다.
 * 이 결함은 500도 로그도 안 남긴다 — 원장이 인쇄물을 봐야 안다.
 *
 * 규칙은 `src/lib/problemEligibility.ts` **한 곳**이고, 그 모듈의 `where` 와 술어가
 * 같은 답을 내는지는 `problemEligibility.test.ts` 가 24행 행렬로 따로 잠근다.
 */
describe("🔴 출제 자격 — 낼 수 없는 문항은 담기지도, 시험지가 되지도 않는다", () => {
  /** 시드된 DB 행을 펼쳐 «자격이 없는» 문항 하나를 만든다. */
  async function seedProblem(patch: Record<string, unknown>) {
    const seed = await db.problem.findUnique({
      where: { id: MOCK_PROBLEMS[0]!.id },
    });
    const base = { ...(seed as Record<string, unknown>) };
    delete base.id;
    delete base.problemCode;
    delete base.createdAt;
    delete base.updatedAt;
    // exam-wiring: 테스트 — 픽스처다. 자격 없는 문항을 만들려고 시드 행을 펼친 것이고 기출이 아니다.
    return db.problem.create({
      data: { ...base, ...patch } as Parameters<
        typeof db.problem.create
      >[0]["data"],
    });
  }

  async function expectAddRejected(problemId: string, reason: string) {
    const res = await addToBasket(
      jsonRequest("http://localhost/api/basket", "POST", { problemId }),
    );
    expect(res.status).toBe(422);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.code).toBe("VALIDATION_ERROR");
    // 🔴 사유까지 본다 — 상태 코드만 보면 다른 422 가 대신 통과시킨다.
    expect(body.error.message).toBe(reason);
    // 그리고 **정말 안 담겼는지**를 바구니로 확인한다(응답만 보면 반쪽이다).
    expect((await read()).total).toBe(0);
  }

  it("출제가 잠긴 문항은 담기지 않는다 — 오늘 1,751건이 이 갈래다", async () => {
    const blocked = await seedProblem({ directUseAllowed: false });
    await expectAddRejected(blocked.id, "출제가 잠긴 문항입니다.");
  });

  it("검수를 통과하지 않은 문항은 담기지 않는다 (D-22)", async () => {
    const pending = await seedProblem({ reviewStatus: "pending" });
    await expectAddRejected(pending.id, "검수를 통과하지 않은 문항입니다.");
  });

  it("정답이 없는 문항은 담기지 않는다 — 정답지가 빈다", async () => {
    const noAnswer = await seedProblem({ answer: "(정답 없음)" });
    await expectAddRejected(noAnswer.id, "정답이 없는 문항입니다.");
  });

  it("자격이 있으면 담긴다 — **반증 쪽**(가드가 멀쩡한 것을 막지 않는가)", async () => {
    const ok = await seedProblem({});
    const basket = await add(ok.id);
    expect(basket.total).toBe(1);
  });

  it("🔴 담은 **뒤에** 잠긴 문항은 시험지가 되지 않는다 — 가드가 생기기 전에 담긴 행도 이 길로 막힌다", async () => {
    // 시드에 이 반의 시험지가 이미 있으므로 **전후로 견준다** — 절대 수를 박으면
    // 시드가 자랄 때 이 시험이 «만들지 않았다»를 못 재고 먼저 깨진다.
    const before = await db.test.count({ where: { classId: CLASS_ID } });
    await add(PROBLEM_EARLY.id);
    await add(PROBLEM_LATE.id);
    // 담을 때는 멀쩡했다. 그 사이 그림 유실로 잠겼다(실제로 그렇게 잠근다).
    await db.problem.update({
      where: { id: PROBLEM_LATE.id },
      data: { directUseAllowed: false },
    });

    const res = await makeTestFromBasket(
      jsonRequest("http://localhost/api/basket/test", "POST", {
        classId: CLASS_ID,
        testDate: TEST_DATE,
      }),
    );
    expect(res.status).toBe(422);
    const body = errorResponseSchema.parse(await res.json());
    // 🔴 **무엇을 빼야 하는지 말한다** — 조용히 빼면 원장이 고른 것과 다른 시험지가
    //    나가고, 그 사실을 인쇄물에서만 알게 된다(D-20).
    expect(body.error.message).toContain("낼 수 없는 문항 1건");
    expect(body.error.message).toContain("출제가 잠긴 문항입니다.");
    // 조용히 만들지 않았는지 — 시험지가 **하나도 더** 안 생겼어야 한다.
    expect(await db.test.count({ where: { classId: CLASS_ID } })).toBe(before);
  });

  it("담긴 것이 전부 자격을 갖추면 시험지가 만들어진다 — **반증 쪽**", async () => {
    await add(PROBLEM_EARLY.id);
    await add(PROBLEM_LATE.id);
    const res = await makeTestFromBasket(
      jsonRequest("http://localhost/api/basket/test", "POST", {
        classId: CLASS_ID,
        testDate: TEST_DATE,
      }),
    );
    expect(res.status).toBe(201);
    expect(
      basketTestResponseSchema.parse(await res.json()).data.problemCount,
    ).toBe(2);
  });
});
