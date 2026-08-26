/**
 * 격리 벽이 `where` 를 **연산에 맞는 모양으로** 씌우는가 (원장님 2026-08-26
 * 「승인 눌렀더니 검수 상태를 바꾸지 못했습니다」).
 *
 * ## 왜 이 시험이 늦게 왔나
 *
 * 벽은 모든 problem 읽기의 `where` 를 `AND` 로 감쌌다. 그런데 **`findUnique` 계열은
 * `AND` 를 안 받는다** — `ProblemWhereUniqueInput` 에는 스칼라 필터와 `OR`·`NOT` 은
 * 있어도 `AND` 가 없다. 그래서 질의가 아예 안 나가고 `PrismaClientValidationError` 로
 * 500 이 났고, 승인·반려·수정·삭제·변형·문항교체가 **전부** 죽어 있었다.
 *
 * 🔴 관문은 전량 초록이었다. 그 시험들이 Prisma 를 **모킹**하기 때문이다 —
 *    「확장이 만든 `where` 를 Prisma 가 받아 주는가」라는 축이 아예 없었다.
 *    (CLAUDE.md 2026-08-19 「없는 축은 변이시킬 수 없다」)
 *
 * 그래서 방어가 **둘**이다. 여기(순수 함수, 관문에서 늘 돈다)와
 * `scripts/qa/probe-problem-wall.ts`(진짜 DB 를 두드린다). 이 시험만으로는
 * 「Prisma 가 정말 AND 를 거부하는가」를 증명하지 못한다 — 그건 저쪽 몫이다.
 */
import { describe, expect, it } from "vitest";

import {
  APP_VISIBLE_PROBLEM_POOL,
  scopeProblemWhere,
} from "@/lib/problemVisibility";

const UNIQUE_OPS = ["findUnique", "findUniqueOrThrow"] as const;
const OTHER_OPS = [
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
] as const;

describe("[격리 벽] where 를 연산에 맞게 씌운다", () => {
  it.each(UNIQUE_OPS)(
    "🔴 %s 는 **AND 를 안 쓴다** — 쓰면 Prisma 가 질의를 거부한다",
    (op) => {
      const got = scopeProblemWhere(op, { id: "p1" });
      expect(got).not.toHaveProperty("AND");
      expect(got).toEqual({ id: "p1", pool: APP_VISIBLE_PROBLEM_POOL });
    },
  );

  it.each(UNIQUE_OPS)("%s 도 풀 조건은 **반드시** 붙는다", (op) => {
    expect(scopeProblemWhere(op, undefined)).toEqual({
      pool: APP_VISIBLE_PROBLEM_POOL,
    });
  });

  it.each(OTHER_OPS)(
    "%s 는 AND 로 감싼다 — 호출부 조건을 건드리지 않으려고",
    (op) => {
      expect(scopeProblemWhere(op, { unitId: "u1" })).toEqual({
        AND: [{ unitId: "u1" }, { pool: APP_VISIBLE_PROBLEM_POOL }],
      });
    },
  );

  it("where 가 없어도 AND 계열은 풀 조건 하나만 남는다", () => {
    expect(scopeProblemWhere("findMany", undefined)).toEqual({
      AND: [{ pool: APP_VISIBLE_PROBLEM_POOL }],
    });
  });

  it("🔴 호출부가 다른 풀을 적어 와도 **벽이 이긴다** (닫히는 쪽으로만 샌다)", () => {
    const got = scopeProblemWhere("findUnique", {
      id: "p1",
      pool: "private",
    });
    expect(got).toEqual({ id: "p1", pool: APP_VISIBLE_PROBLEM_POOL });
  });
});
