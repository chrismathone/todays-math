/**
 * 🔴 RED → 🟢 — **결시 칸 덫** (Hi-fi 브리프 §1 #1).
 *
 * 구현: src/lib/achievement/resultSelect.ts
 *
 * 채점 회차 조회가 `absent` 를 select 하지 않으면 칸이 있어도 결시가 **늘 «응시»**로 읽힌다
 * (예전 읽는 쪽은 덕 타이핑이라 tsc 도 못 잡았다). 그래서 이 시험은 **스키마가 지금 가진 칸**
 * (`Prisma.TestResultScalarFieldEnum`)과 select 상수를 견준다.
 *
 * 이력: 트랙 1 병합 **전**에 트랙 1 스키마로 클라이언트를 만들어 돌려 **실제로 빨개지는 것**
 * (`expected ['absent'] to deeply equal []`)을 봤고, 병합(fe5a125d) 뒤 select 에 `absent` 를 더해 초록이다.
 * «조회 → 팩터»까지 결시가 건너오는지는 `achievementLoad.test.ts` 가 본다.
 */
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
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

  it("🔴 트랙 1 병합 뒤 — 스키마에 결시 칸이 있고 조회도 읽는다", () => {
    expect("absent" in Prisma.TestResultScalarFieldEnum).toBe(true);
    expect(RESULT_SELECT.absent).toBe(true);
  });
});
