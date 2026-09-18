/**
 * 🔴 RED → 🟢 — **결시 칸 덫** (Hi-fi 브리프 §1 #1).
 *
 * 구현: src/lib/achievement/resultSelect.ts
 *
 * 채점 회차 조회가 `absent` 를 select 하지 않으면, 트랙 1 이 그 칸을 스키마에 더해도 결시가
 * **늘 «응시»**로 읽힌다. 읽는 쪽은 덕 타이핑이라 tsc 도 못 잡는다. 그래서 이 시험은
 * **스키마가 지금 가진 칸**(`Prisma.TestResultScalarFieldEnum`)과 select 상수를 견준다 —
 * 트랙 1 이 병합되는 순간 빨개지고, select 에 `absent: true` 를 더해야 다시 초록이다.
 *
 * ⚠️ 병합 뒤에는 **«조회 → 팩터»까지 결시가 실제로 건너오는지** 한 번 더 본다
 *    (보고서 `tracks/reports/achievement-hifi.md` 잔여).
 */
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  readAbsent,
  RESULT_SELECT,
  unreadResultFields,
} from "@/lib/achievement/resultSelect";

describe("🔴 결시 칸 덫 — 스키마에 있는 칸은 조회도 읽는다", () => {
  it("스키마의 결시·점수 칸을 조회가 전부 읽는다 (트랙 1 병합 순간 여기가 빨개진다)", () => {
    expect(
      unreadResultFields(RESULT_SELECT, Prisma.TestResultScalarFieldEnum),
    ).toEqual([]);
  });

  it("덫이 실제로 문다 — absent 칸이 있는 스키마를 대면 «absent 를 안 읽는다»고 말한다", () => {
    expect(
      unreadResultFields({ score: true }, { score: "score", absent: "absent" }),
    ).toEqual(["absent"]);
    expect(
      unreadResultFields(
        { score: true, absent: true },
        { score: "score", absent: "absent" },
      ),
    ).toEqual([]);
  });

  it("🔴 칸이 안 오면 결시는 늘 false 다 — 그래서 select 가 빠지면 조용히 틀린다", () => {
    expect(readAbsent({ score: 0 })).toBe(false);
    expect(readAbsent({ score: null, absent: true })).toBe(true);
  });
});
