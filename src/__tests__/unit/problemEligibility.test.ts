/**
 * 출제 자격 — **Prisma `where` 와 JS 술어가 같은 답을 내는가** (2026-09-07).
 *
 * 자격을 묻는 자리가 셋이라 규칙이 두 모양(`where` · 술어)으로 존재한다. 그 둘이
 * 갈리면 「화면은 담을 수 있다는데 서버가 거부」 또는 그 반대가 되고, 뒤엣것은
 * **조용히 못 낼 문항을 종이로 내보낸다.**
 *
 * 그래서 픽스처 하나가 아니라 **행렬 전량**을 만들어 둘을 맞댄다 — 한쪽만 고치면
 * 반드시 빨개진다. 이것이 이 파일의 존재 이유다.
 */
import { describe, expect, it } from "vitest";

import { MISSING_ANSWER } from "@/lib/missingAnswer";
import {
  isProblemEligible,
  problemEligibleWhere,
  problemIneligibleReason,
  type ProblemEligibilityInput,
} from "@/lib/problemEligibility";
import {
  prismaTestDouble,
  resetPrismaTestDouble,
} from "@/mocks/prismaTestDouble";
import { MOCK_PROBLEMS } from "@/mocks/data";

const POOLS = ["shared", "private"] as const;
const STATUSES = ["approved", "pending", "rejected"] as const;
const ALLOWED = [true, false] as const;
const ANSWERS = ["3", MISSING_ANSWER] as const;

/** 네 축의 곱 — 2 × 3 × 2 × 2 = 24행. */
function matrix(): ProblemEligibilityInput[] {
  const rows: ProblemEligibilityInput[] = [];
  for (const pool of POOLS)
    for (const reviewStatus of STATUSES)
      for (const directUseAllowed of ALLOWED)
        for (const answer of ANSWERS)
          rows.push({ pool, reviewStatus, directUseAllowed, answer });
  return rows;
}

describe("problemIneligibleReason — 사유", () => {
  const ok: ProblemEligibilityInput = {
    pool: "shared",
    reviewStatus: "approved",
    directUseAllowed: true,
    answer: "3",
  };

  it("네 조건을 다 만족하면 사유가 없다", () => {
    expect(problemIneligibleReason(ok)).toBeNull();
    expect(isProblemEligible(ok)).toBe(true);
  });

  it("🔴 출제가 잠긴 문항 — 오늘 실측 1,751건이 이 갈래다(전부 approved)", () => {
    expect(problemIneligibleReason({ ...ok, directUseAllowed: false })).toBe(
      "출제가 잠긴 문항입니다.",
    );
  });

  it("검수 전·반려 문항", () => {
    expect(problemIneligibleReason({ ...ok, reviewStatus: "pending" })).toBe(
      "검수를 통과하지 않은 문항입니다.",
    );
    expect(problemIneligibleReason({ ...ok, reviewStatus: "rejected" })).toBe(
      "검수를 통과하지 않은 문항입니다.",
    );
  });

  it("공용 풀이 아닌 문항 · 정답이 없는 문항", () => {
    expect(problemIneligibleReason({ ...ok, pool: "private" })).toBe(
      "공용 풀 문항이 아닙니다.",
    );
    expect(problemIneligibleReason({ ...ok, answer: MISSING_ANSWER })).toBe(
      "정답이 없는 문항입니다.",
    );
  });

  it("여럿이 걸리면 앞의 사유를 말한다 — 순서가 곧 우선순위다", () => {
    expect(
      problemIneligibleReason({
        pool: "private",
        reviewStatus: "pending",
        directUseAllowed: false,
        answer: MISSING_ANSWER,
      }),
    ).toBe("공용 풀 문항이 아닙니다.");
  });
});

describe("🔴 where 와 술어가 같은 답을 낸다 — 규칙이 두 벌이 되면 여기서 빨개진다", () => {
  it("24행 행렬 전량에서 일치한다", async () => {
    resetPrismaTestDouble();
    const rows = matrix();
    // 이미 시드된 **DB 행**을 그대로 펼쳐 쓴다 — 손으로 나열하면 스키마가 자랄 때마다
    // 이 시험이 먼저 깨진다(problemTransform.test 의 seedFigureProblem 과 같은 방식).
    const seed = await prismaTestDouble.problem.findUnique({
      where: { id: MOCK_PROBLEMS[0]!.id },
    });
    const base = { ...seed! } as Record<string, unknown>;
    delete base.id;
    delete base.problemCode;
    delete base.createdAt;
    delete base.updatedAt;

    const ids: string[] = [];
    for (const row of rows) {
      // exam-wiring: 테스트 — 픽스처다. 자격 행렬을 만들려고 시드 행을 펼친 것이고 기출이 아니다.
      const created = await prismaTestDouble.problem.create({
        data: {
          ...(base as Parameters<
            typeof prismaTestDouble.problem.create
          >[0]["data"]),
          answer: row.answer,
          reviewStatus: row.reviewStatus as "approved",
          directUseAllowed: row.directUseAllowed,
          pool: row.pool as "shared",
        },
      });
      ids.push(created.id);
    }

    const passed = await prismaTestDouble.problem.findMany({
      where: {
        AND: [problemEligibleWhere(), { id: { in: ids } }],
      },
      select: { id: true },
    });
    const passedIds = new Set(
      (passed as Array<{ id: string }>).map((p) => p.id),
    );

    // 분모를 먼저 못 박는다 — 행렬이 줄어들면 「일치」가 공허해진다.
    expect(rows.length).toBe(24);
    const byPredicate = rows.filter((r) => isProblemEligible(r)).length;
    expect(byPredicate).toBe(1); // shared · approved · allowed · 정답 있음 — 하나뿐이다
    expect(passedIds.size).toBe(byPredicate);

    rows.forEach((row, i) => {
      expect(
        passedIds.has(ids[i]!),
        `where 와 술어가 갈렸다: ${JSON.stringify(row)}`,
      ).toBe(isProblemEligible(row));
    });
  });
});
