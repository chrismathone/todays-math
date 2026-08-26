/**
 * PUT /api/tests/{id}/problems/{seq} — 동일 단원/난이도 + 최근 14일 중복 제외로 1클릭 교체.
 */
import type { DifficultyRatio } from "@/contracts/common.contract";
import { DIFFICULTY_LADDER, type Difficulty } from "@/contracts/difficulty";
import {
  insufficientProblemsErrorResponseSchema,
  testProblemReplaceResponseSchema,
} from "@/contracts/test.contract";
import { jsonError, jsonOk, notFoundError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { findEligibleProblems } from "@/lib/findEligibleProblems";
import { familyIdOf } from "@/lib/generator/familyKey";
import { selectProblems } from "@/lib/generator/selectProblems";
import { requireOwnedTest } from "@/lib/ownership";
import { serializeTest, serializeTestProblemItem } from "@/lib/serializers";
import type { SessionUser } from "@/lib/session";

import { loadRecentProblemIds } from "./recentProblemIds";

/** 그 갈래 하나만 1인 배분 — 사다리에서 만든다(갈래가 늘면 저절로 따라온다, D-106). */
function ratioFor(difficulty: Difficulty): DifficultyRatio {
  return Object.fromEntries(
    DIFFICULTY_LADDER.map((tier) => [tier, tier === difficulty ? 1 : 0]),
  ) as DifficultyRatio;
}

/** 사다리에서 한 칸 옆. `balanceDifficulty` 의 것과 **같은 규칙**이다. */
const ADJACENT: Record<Difficulty, Difficulty[]> = Object.fromEntries(
  DIFFICULTY_LADDER.map((tier, i) => [
    tier,
    [DIFFICULTY_LADDER[i - 1], DIFFICULTY_LADDER[i + 1]].filter(
      (x): x is Difficulty => x !== undefined,
    ),
  ]),
) as Record<Difficulty, Difficulty[]>;

export async function replaceTestProblemAtSeq(
  session: SessionUser,
  testId: string,
  seq: number,
) {
  const owned = await requireOwnedTest(testId, session.id);
  if (!owned.ok) return owned.response;
  if (owned.data.status !== "draft") {
    return jsonError(
      "CONFLICT",
      "초안 테스트의 문항만 교체할 수 있습니다.",
      409,
    );
  }

  // 두 조회는 독립이다 — 문항 목록은 testId 로, 최근 출제는 사용자·날짜로 좁힌다.
  // 시험지 소유권(`requireOwnedTest`)은 이미 위에서 통과했다.
  const today = owned.data.testDate.toISOString().slice(0, 10);
  const [items, recentFromOtherTests] = await Promise.all([
    db.testProblem.findMany({
      where: { testId },
      include: { problem: true },
      orderBy: { orderIndex: "asc" },
    }),
    loadRecentProblemIds(session.id, today),
  ]);

  const target = items.find((item) => item.orderIndex === seq);
  if (!target?.problem) return notFoundError("문항");

  const usedOnThisTest = items.map((item) => item.problemId);
  const recentProblemIds = [
    ...new Set([...recentFromOtherTests, ...usedOnThisTest]),
  ];

  /**
   * 🔴 **교체가 규칙을 깨면 안 된다** (원장님 확정 2026-08-26 — 한 시험지에 같은 류는 1개).
   *
   * 위의 `recentProblemIds` 는 **문항 id** 만 거른다. 그것만으로는 「지금 5번 자리에
   * 있는 문항의 **형제**」가 3번 자리로 들어올 수 있다 — 원장님이 보신 바로 그 모양
   * (같은 발문, 숫자만 다름)이 **한 번 눌러서** 되살아난다. 출제에만 규칙을 걸고
   * 교체에 안 걸면 정책이 조용히 새는 자리다.
   *
   * ⚠️ **바꾸려는 그 문항 자신의 류는 안 뺀다.** 그 자리는 비워지므로 시험지에 중복이
   *    생기지 않는다. 여기까지 빼면 갈래가 얇은 소단원(실측 초5·초6 전 소단원이
   *    정확히 4갈래)에서 **교체가 통째로 막힌다** — 규칙이 지키려는 것보다 잃는 게 크다.
   */
  const familiesOnOtherSeats = new Set(
    items
      .filter((item) => item.orderIndex !== seq && item.problem)
      .map((item) => familyIdOf(item.problem!)),
  );

  const difficulties: Difficulty[] = [
    target.problem.difficulty,
    ...ADJACENT[target.problem.difficulty],
  ];

  let replacementId: string | undefined;
  for (const difficulty of difficulties) {
    const pool = await findEligibleProblems({
      unitIds: [target.problem.unitId],
      difficulty,
    });

    const picked = selectProblems({
      pool: pool.filter((p) => !familiesOnOtherSeats.has(familyIdOf(p))),
      difficultyRatio: ratioFor(difficulty),
      count: 1,
      recentProblemIds,
      seed: `${testId}:${seq}:${difficulty}`,
    });
    if (picked.problems[0]) {
      replacementId = picked.problems[0].id;
      break;
    }
  }

  if (!replacementId) {
    return jsonOk(
      insufficientProblemsErrorResponseSchema,
      {
        error: {
          code: "INSUFFICIENT_PROBLEMS",
          message: "이 단원에 등록된 문제가 부족합니다.",
          details: {
            unitId: target.problem.unitId,
            available: 0,
            required: 1,
          },
        },
      },
      { status: 422 },
    );
  }

  const updated = await db.$transaction(async (tx) => {
    const claimed = await tx.test.updateMany({
      where: { id: testId, userId: session.id, status: "draft" },
      data: { modified: true },
    });
    if (claimed.count === 0) return null;

    const item = await tx.testProblem.update({
      where: { id: target.id },
      data: { problemId: replacementId, replaced: true },
    });
    const test = await tx.test.findUnique({ where: { id: testId } });
    if (!test) return null;
    return [item, test] as const;
  });
  if (!updated) {
    return jsonError(
      "CONFLICT",
      "초안 테스트의 문항만 교체할 수 있습니다.",
      409,
    );
  }
  const [updatedItem, updatedTest] = updated;

  const problem = await db.problem.findUnique({
    where: { id: updatedItem.problemId },
  });
  if (!problem) return notFoundError("문항");

  return jsonOk(testProblemReplaceResponseSchema, {
    data: {
      test: serializeTest(updatedTest),
      problem: serializeTestProblemItem({ ...updatedItem, problem }),
    },
  });
}
