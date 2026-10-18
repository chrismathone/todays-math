import { accessibleTestsWhere, assertClassWrite } from "@/lib/classAccess";
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
import {
  findEligibleProblems,
  type EligibleProblem,
} from "@/lib/findEligibleProblems";
import { familyIdOf } from "@/lib/generator/familyKey";
import { selectProblems } from "@/lib/generator/selectProblems";
import { requireOwnedTest } from "@/lib/ownership";
import { serializeTest, serializeTestProblemItem } from "@/lib/serializers";
import { contentOf } from "./testProblemContent";
import { hydrateTestSnapshots } from "./loadSnapshotAssets";
import type { SessionUser } from "@/lib/session";

import { loadRecentProblemIds } from "./recentProblemIds";
import { classifyFormat } from "@/lib/problem/provenance";
import { expandQuestionProblemIds } from "@/lib/problem/questionQueries";
import { questionIdOf } from "@/lib/problem/questionIdentity";
import { QuestionSelectionConflict } from "@/lib/problem/questionSelection";
import { selectionStillCurrent } from "./selectionCurrent";

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
  const owned = await requireOwnedTest(testId, session, "test:write");
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
  // 최근 출제(D-20)의 열쇠는 **시험지 소유자**다 — 관리자가 남의 시험지를 고쳐도(D-130) 그 계정 기준.
  const today = owned.data.testDate.toISOString().slice(0, 10);
  const [storedItems, recentFromOtherTests] = await Promise.all([
    db.testProblem.findMany({
      where: { testId },
      include: { problem: true, snapshot: true },
      orderBy: { orderIndex: "asc" },
    }),
    loadRecentProblemIds(owned.data.userId, today),
  ]);

  const items = (await hydrateTestSnapshots(storedItems)).map((row) => ({
    ...row,
    problem: contentOf(row),
  }));
  const target = items.find((item) => item.orderIndex === seq);
  if (!target?.problem) return notFoundError("문항");

  const usedOnThisTest = items.map((item) => item.problemId);
  const recentProblemIds = await expandQuestionProblemIds([
    ...new Set([...recentFromOtherTests, ...usedOnThisTest]),
  ]);
  const requestedFormat = classifyFormat(target.problem);

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
  let replacement: EligibleProblem | undefined;
  for (const difficulty of difficulties) {
    const pool = await findEligibleProblems({
      unitIds: [target.problem.unitId],
      difficulty,
    });

    const picked = selectProblems({
      pool: pool.filter(
        (p) =>
          !familiesOnOtherSeats.has(familyIdOf(p)) &&
          (requestedFormat === "unknown" ||
            classifyFormat(p) === requestedFormat),
      ),
      difficultyRatio: ratioFor(difficulty),
      count: 1,
      recentProblemIds,
      seed: `${testId}:${seq}:${difficulty}`,
    });
    if (picked.problems[0]) {
      replacementId = picked.problems[0].id;
      replacement = picked.problems[0];
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

  const updated = await db
    .$transaction(async (tx) => {
      if (!owned.data.predictionRunId)
        await assertClassWrite(tx, session, owned.data.classId, "test:write");
      if (!replacement || !(await selectionStillCurrent(tx, [replacement])))
        return null;
      const claimed = await tx.test.updateMany({
        where: {
          id: testId,
          ...(await accessibleTestsWhere(session, "test:write")),
          status: "draft",
        },
        data: { modified: true },
      });
      if (claimed.count === 0) return null;

      const others = await tx.testProblem.findMany({
        where: { testId, NOT: { id: target.id } },
        include: { problem: true },
      });
      if (
        others.some(
          (item) =>
            questionIdOf(item.problem) === questionIdOf(replacement) ||
            familyIdOf(item.problem) === familyIdOf(replacement),
        )
      )
        throw new QuestionSelectionConflict();
      const changed = await tx.testProblem.updateMany({
        where: { id: target.id, problemId: target.problemId },
        data: { problemId: replacementId, snapshotId: null, replaced: true },
      });
      if (changed.count !== 1) throw new QuestionSelectionConflict();
      const item = (
        await tx.testProblem.findMany({ where: { id: target.id } })
      )[0];
      if (!item) throw new QuestionSelectionConflict();
      const test = await tx.test.findUnique({ where: { id: testId } });
      if (!test) return null;
      return [item, test] as const;
    })
    .catch((error) => {
      if (error instanceof QuestionSelectionConflict) return null;
      throw error;
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
