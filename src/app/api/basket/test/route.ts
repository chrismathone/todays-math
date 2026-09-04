/**
 * POST /api/basket/test — **담은 것만으로 새 시험지**를 만든다 (원장님 확정 2026-09-04).
 * 대응 계약: `src/contracts/basket.contract.ts`
 *
 * 자동 출제(`/api/tests/generate`)는 **그대로 둔다.** 이것은 그 옆에 나는
 * «손으로 짜는 길» 하나다 — 진도·난이도 배분·D-20 최근 제외를 하나도 안 본다.
 * 원장이 눈으로 고른 것이 곧 시험지다.
 *
 * ## 🔴 범위를 화면에서 안 받는다
 *
 * `Test.rangeEndUnitId` 는 NOT NULL 이라 무언가는 적어야 한다. 그런데 손으로 고른
 * 시험지의 범위는 **담긴 문항이 정한다** — 화면이 보내게 두면 담긴 것과 어긋난
 * 범위가 지면에 찍힌다. 그래서 담긴 문항의 단원을 `Unit.orderIndex` 로 세워
 * 가장 앞과 가장 뒤를 서버가 고른다.
 *
 * ## 차례를 여기서 **다시 센다**
 *
 * 바구니의 `orderIndex` 는 빼기가 구멍을 내므로 1..N 이 아니다(그건 일부러 그렇다 —
 * 다시 매기면 「셋째로 담은 것」이 다른 문항을 가리킨다). 시험지의 문항 번호는
 * 1..N 이어야 하므로 **담은 차례대로 읽어 새로 붙인다.**
 *
 * ## 비운 뒤에 만든다
 *
 * 시험지가 만들어지면 바구니를 비운다. 안 비우면 다음 시험지에 같은 문항이 통째로
 * 다시 실리고, 원장이 그것을 알아채는 자리가 **인쇄물뿐**이다.
 */
import type { NextRequest } from "next/server";

import {
  basketTestRequestSchema,
  basketTestResponseSchema,
} from "@/contracts/basket.contract";
import {
  jsonError,
  jsonOk,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { renumberForTest } from "@/lib/basket/readBasket";
import { db } from "@/lib/db";
import { requireOwnedClass, requireOwnedStudentInClass } from "@/lib/ownership";
import { getSessionUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const body = await request.json().catch(() => undefined);
  const parsed = basketTestRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const owned = await requireOwnedClass(input.classId, session.id);
  if (!owned.ok) return owned.response;
  if (input.studentId) {
    const studentOwned = await requireOwnedStudentInClass(
      input.studentId,
      input.classId,
      session.id,
    );
    if (!studentOwned.ok) return studentOwned.response;
  }

  const items = await db.basketItem.findMany({
    where: { userId: session.id },
    orderBy: { orderIndex: "asc" },
    include: { problem: { select: { id: true, unitId: true } } },
  });

  // 🔴 빈 바구니로 시험지를 만들면 **문항 0개짜리 지면**이 나간다. 스키마가 그것을
  //    안 막으므로(문항은 다른 표다) 여기서 막고, 화면이 읽을 수 있는 사유를 준다.
  if (items.length === 0) {
    return jsonError(
      "VALIDATION_ERROR",
      "담은 문항이 없습니다. 문제은행에서 먼저 담으십시오.",
      422,
    );
  }

  // 범위 — 담긴 문항의 단원을 교육과정 차례로 세워 양끝을 고른다.
  const units = await db.unit.findMany({
    where: { id: { in: [...new Set(items.map((i) => i.problem.unitId))] } },
    select: { id: true, orderIndex: true },
    orderBy: { orderIndex: "asc" },
  });
  // 단원이 하나도 안 나오면 담긴 문항이 사라진 것이다 — 조용히 넘기지 않는다.
  const first = units[0];
  const last = units[units.length - 1];
  if (!first || !last) {
    return jsonError(
      "VALIDATION_ERROR",
      "담은 문항의 단원을 찾지 못했습니다.",
      422,
    );
  }

  const created = await db.$transaction(async (tx) => {
    const test = await tx.test.create({
      data: {
        userId: session.id,
        classId: input.classId,
        studentId: input.studentId ?? null,
        // 손으로 고른 시험지는 진도에 매이지 않는다 — 범위가 있는 `review` 쪽이다.
        testType: "review",
        rangeStartUnitId: first.id,
        rangeEndUnitId: last.id,
        status: "draft",
        modified: false,
        testDate: new Date(`${input.testDate}T00:00:00.000Z`),
      },
    });

    await tx.testProblem.createMany({
      // 🔴 번호를 여기서 다시 세지 않는다 — `renumberForTest` **한 곳**이 그 규칙을
      //    들고 있고 시험이 그것을 겨눈다. 옮겨 적으면 두 벌이 된다.
      data: renumberForTest(items).map(({ item, orderIndex }) => ({
        testId: test.id,
        problemId: item.problem.id,
        orderIndex,
        replaced: false,
      })),
    });

    // 시험지가 된 바구니는 비운다 — 안 비우면 다음 시험지에 통째로 다시 실린다.
    await tx.basketItem.deleteMany({ where: { userId: session.id } });
    return test;
  });

  return jsonOk(
    basketTestResponseSchema,
    { data: { testId: created.id, problemCount: items.length } },
    { status: 201 },
  );
}
