/**
 * **담기 바구니** — 문제은행에서 고른 문항을 계정에 담아 둔다.
 * 대응 계약: `src/contracts/basket.contract.ts`
 *
 *   GET    /api/basket              내 바구니 (담은 차례대로 · 난이도 분포 포함)
 *   POST   /api/basket              담기 (멱등)
 *   DELETE /api/basket              비우기 (지운 뒤의 바구니를 돌려준다)
 *   DELETE /api/basket?problemId=…  한 문항만 빼기
 *
 * ## 🔴 이 파일이 지키는 것 둘
 *
 * ㉠ **분포를 서버가 센다.** 바가 「7개 · 심화중 3 · 응용 2」를 말하므로(Hi-fi ㉡),
 *    화면이 따로 세면 담긴 것의 일부만 받아 온 쪽에서 조용히 다른 수가 나온다.
 * ㉡ **차례는 다시 매기지 않는다.** 빼기는 그 행만 지운다 — 다시 매기면 남은 행의
 *    번호가 통째로 흔들려 「셋째로 담은 것」이 다른 문항을 가리킨다.
 *    시험지로 옮길 때 차례대로 다시 세어 1..N 을 붙인다(`from-test` 라우트).
 */
import type { NextRequest } from "next/server";

import {
  basketAddRequestSchema,
  basketResponseSchema,
} from "@/contracts/basket.contract";
import { uuidSchema } from "@/contracts/common.contract";
import {
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { readBasket } from "@/lib/basket/readBasket";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  return jsonOk(basketResponseSchema, { data: await readBasket(session.id) });
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const body = await request.json().catch(() => undefined);
  const parsed = basketAddRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  // 🔴 **볼 수 없는 문항은 담을 수 없다.** 공유 풀(D-31)이 아니고 남의 것이면
  //    바구니에 넣는 순간 화면에 못 그리는 칸이 생긴다.
  const problem = await db.problem.findFirst({
    where: {
      id: parsed.data.problemId,
      OR: [{ pool: "shared" }, { userId: session.id }],
    },
    select: { id: true },
  });
  if (!problem) return notFoundError("문항");

  // 담은 차례 — 지금 바구니의 **가장 큰 번호 + 1**.
  //
  // ⚠️ `COUNT(*) + 1` 로 하면 안 된다. 그 식은 번호가 1..N 으로 빈틈없이 이어져
  //    있다고 가정하는데 빼기가 구멍을 낸다 — 자리 {1,3} 에서 COUNT=2 이면 2를
  //    주고, 그 다음에 또 2를 준다. 2026-08-29 에 문항류 자리에서 겪은 그 결함이다.
  const last = await db.basketItem.findFirst({
    where: { userId: session.id },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });

  // 이미 담긴 문항이면 아무 일도 안 하고 성공이다(멱등) — `@@unique` 가 잡는다.
  await db.basketItem.upsert({
    where: {
      userId_problemId: {
        userId: session.id,
        problemId: parsed.data.problemId,
      },
    },
    create: {
      userId: session.id,
      problemId: parsed.data.problemId,
      orderIndex: (last?.orderIndex ?? 0) + 1,
    },
    update: {},
  });

  return jsonOk(basketResponseSchema, { data: await readBasket(session.id) });
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const raw = new URL(request.url).searchParams.get("problemId");

  // 🔴 **비우기와 빼기가 같은 응답을 낸다** — 둘 다 «지운 뒤의 바구니»다.
  //    빼기가 지운 id 만 돌려주면 화면이 분포를 다시 물어야 하고, 그 사이 바가
  //    옛 수를 말한다. 한 번에 지금 상태를 준다.
  if (raw === null) {
    await db.basketItem.deleteMany({ where: { userId: session.id } });
  } else {
    const parsed = uuidSchema.safeParse(raw);
    if (!parsed.success) return validationError(parsed.error);
    await db.basketItem.deleteMany({
      where: { userId: session.id, problemId: parsed.data },
    });
  }

  return jsonOk(basketResponseSchema, { data: await readBasket(session.id) });
}
