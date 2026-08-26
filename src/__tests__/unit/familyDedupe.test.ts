/**
 * 🔴 RED → 🟢 — **한 시험지에 같은 문항류는 1개만** (원장님 확정 2026-08-26).
 *
 * 원장님이 보신 것: 초6 「2-6-4 구 알아보기」 일일테스트 8문항에서
 *   문1 「반지름이 16cm 인 구를 중심을 지나게 잘랐습니다 …」
 *   문2 「반지름이  6cm 인 구를 중심을 지나게 잘랐습니다 …」
 * 가 **숫자만 다른 같은 문항**으로 나란히 나왔다.
 *
 * 이어서 원장님: 「다른 문항류를 더 생성하면 됨. 걱정마 일단.」
 * → **규칙을 약하게 하지 않는다.** 갈래가 모자라면 부족을 **드러낸다**.
 *
 * ## 무엇을 잠그나 (그리고 왜 그것이어야 하나)
 *
 * 1. 정체 판정이 **단원과 함께** 본다 — DB 가 `@@id([unitId, familyKey])` 로 잠근다.
 *    문자열만 보면 확인테스트에서 다른 단원의 다른 류가 접혀 멀쩡한 문항이 빠진다.
 * 2. **키가 없는 행은 서로 안 묶인다.** 실측으로 기출 41,084행·변형 3,526행이
 *    `solo:*` 가 아니라 **NULL** 이다. 묶이면 그 44,610행이 통째로 한 류가 되어
 *    시험지에 한 문항밖에 못 들어간다 — 에러가 아니라 **시험지가 얇아질 뿐**이다.
 * 3. **인접 난이도 대체도 류를 넘지 않는다.** 여기가 새면 규칙이 조용히 꺼진다.
 * 4. **부족 안내가 행이 아니라 갈래를 센다.** 행으로 세면 「15개 있는데 8개를 못 냈다」는
 *    앞뒤 안 맞는 안내가 나간다. 가족 크기가 최대 4라 행은 최대 네 배 부풀려 센다.
 */
import { describe, expect, it } from "vitest";

import type { DifficultyRatio } from "@/contracts/common.contract";
import {
  balanceDifficulty,
  type SelectableProblem,
} from "@/lib/generator/balanceDifficulty";
import { countFamilies, familyIdOf } from "@/lib/generator/familyKey";
import { selectProblems } from "@/lib/generator/selectProblems";

const UNIT_A = "11111111-1111-4111-8111-111111111111";
const UNIT_B = "22222222-2222-4222-8222-222222222222";

const problem = (
  id: string,
  over: Partial<SelectableProblem> = {},
): SelectableProblem => ({
  id,
  unitId: UNIT_A,
  difficulty: "응용",
  problemType: "계산",
  directUseAllowed: true,
  content: "짧은 발문이다.",
  figureUrls: [],
  figureDims: [],
  ...over,
});

/** 「이 시험지에 같은 류가 둘 이상 있는가」 — 시험이 직접 세지 않고 제품 함수를 쓴다. */
const familyIds = (items: readonly SelectableProblem[]) =>
  items.map((p) => familyIdOf(p));

const hasDuplicateFamily = (items: readonly SelectableProblem[]) =>
  new Set(familyIds(items)).size !== items.length;

const ratioOf = (over: Partial<DifficultyRatio>): DifficultyRatio =>
  ({ 연산: 0, 기본: 0, 응용: 0, 심화: 0, ...over }) as DifficultyRatio;

describe("문항류 정체 — familyIdOf", () => {
  it("같은 키라도 **단원이 다르면 다른 류**다 (DB 복합키와 같은 규칙)", () => {
    const a = problem("a", { unitId: UNIT_A, familyKey: "elem:초6|구|연산" });
    const b = problem("b", { unitId: UNIT_B, familyKey: "elem:초6|구|연산" });
    expect(familyIdOf(a)).not.toBe(familyIdOf(b));
  });

  it("같은 단원 같은 키면 같은 류다", () => {
    const a = problem("a", { familyKey: "elem:초6|구|연산" });
    const b = problem("b", { familyKey: "elem:초6|구|연산" });
    expect(familyIdOf(a)).toBe(familyIdOf(b));
  });

  it("🔴 키가 없는 행은 **서로 안 묶인다** — NULL·빈 값·공백뿐 전부", () => {
    const rows = [
      problem("n1", { familyKey: null }),
      problem("n2", { familyKey: null }),
      problem("n3", { familyKey: "" }),
      problem("n4", { familyKey: "   " }),
      problem("n5"),
    ];
    // 다섯이 전부 다른 류여야 한다. 하나라도 묶이면 기출 41,084행이 한 류가 된다.
    expect(new Set(familyIds(rows)).size).toBe(5);
  });

  it("앞뒤 공백은 다듬는다 — 같은 류로 본다", () => {
    expect(familyIdOf(problem("a", { familyKey: " k " }))).toBe(
      familyIdOf(problem("b", { familyKey: "k" })),
    );
  });
});

describe("갈래 세기 — countFamilies", () => {
  it("행이 아니라 **갈래**를 센다", () => {
    const rows = [
      problem("a", { familyKey: "k1" }),
      problem("b", { familyKey: "k1" }),
      problem("c", { familyKey: "k1" }),
      problem("d", { familyKey: "k2" }),
    ];
    expect(rows).toHaveLength(4);
    expect(countFamilies(rows)).toBe(2);
  });

  it("키 없는 행은 각각 한 갈래다", () => {
    expect(countFamilies([problem("a"), problem("b"), problem("c")])).toBe(3);
  });
});

describe("배분이 같은 류를 두 번 담지 않는다 — balanceDifficulty", () => {
  it("🔴 한 난이도 안에서 같은 류가 넷이어도 **하나만** 뽑는다", () => {
    const pool = [
      problem("s1", { familyKey: "구" }),
      problem("s2", { familyKey: "구" }),
      problem("s3", { familyKey: "구" }),
      problem("s4", { familyKey: "구" }),
    ];
    const { selected } = balanceDifficulty(pool, ratioOf({ 응용: 4 }), 4);
    expect(selected).toHaveLength(1);
    expect(hasDuplicateFamily(selected)).toBe(false);
  });

  it("🔴 **인접 난이도 대체**도 류를 넘지 않는다", () => {
    // 응용 2개를 요청하는데 응용에는 「구」 하나뿐. 부족분을 기본에서 메우려는데
    // 기본에도 「구」밖에 없다 → 대체 경로가 새면 「구」가 두 번 들어간다.
    const pool = [
      problem("a1", { difficulty: "응용", familyKey: "구" }),
      problem("b1", { difficulty: "기본", familyKey: "구" }),
      problem("b2", { difficulty: "기본", familyKey: "구" }),
    ];
    const { selected } = balanceDifficulty(pool, ratioOf({ 응용: 2 }), 2);
    expect(hasDuplicateFamily(selected)).toBe(false);
    expect(selected).toHaveLength(1);
  });

  it("난이도가 달라도 **같은 류면 한 번**이다", () => {
    const pool = [
      problem("x1", { difficulty: "기본", familyKey: "구" }),
      problem("x2", { difficulty: "응용", familyKey: "구" }),
      problem("y1", { difficulty: "응용", familyKey: "원" }),
    ];
    const { selected } = balanceDifficulty(
      pool,
      ratioOf({ 기본: 1, 응용: 2 }),
      3,
    );
    expect(hasDuplicateFamily(selected)).toBe(false);
    expect(selected).toHaveLength(2);
  });

  it("키 없는 행 넷은 **넷 다** 뽑힌다 — 규칙에 과하게 걸리지 않는다", () => {
    const pool = [
      problem("p1", { familyKey: null }),
      problem("p2", { familyKey: null }),
      problem("p3", { familyKey: null }),
      problem("p4", { familyKey: null }),
    ];
    const { selected } = balanceDifficulty(pool, ratioOf({ 응용: 4 }), 4);
    expect(selected).toHaveLength(4);
  });

  it("🔴 부족 안내의 `available` 이 **행이 아니라 갈래**를 센다", () => {
    // 원장님이 보신 그 자리의 축소판 — 행은 넉넉한데 갈래가 모자라다.
    const pool = [
      problem("s1", { familyKey: "구" }),
      problem("s2", { familyKey: "구" }),
      problem("s3", { familyKey: "구" }),
      problem("s4", { familyKey: "원" }),
      problem("s5", { familyKey: "원" }),
    ];
    const { selected, shortfall } = balanceDifficulty(
      pool,
      ratioOf({ 응용: 5 }),
      5,
    );
    expect(selected).toHaveLength(2);
    expect(shortfall).toHaveLength(1);
    // 행으로 세면 5 다. 그러면 「5개 있는데 5개를 못 냈다」가 되어 안내가 거짓말이 된다.
    expect(shortfall[0]!.available).toBe(2);
    expect(shortfall[0]!.required).toBe(5);
  });
});

describe("출제 전체 경로 — selectProblems", () => {
  it("🔴 원장님이 보신 자리 — 같은 류가 시험지에 두 번 오지 않는다", () => {
    // 초6 「2-6-4 구 알아보기」의 모양: 행은 15, 갈래는 4.
    const pool: SelectableProblem[] = [];
    for (const [tier, key] of [
      ["연산", "구|연산"],
      ["기본", "구|기본"],
      ["응용", "구|응용"],
      ["심화", "구|심화"],
    ] as const) {
      for (let i = 0; i < 4; i += 1) {
        pool.push(problem(`${key}-${i}`, { difficulty: tier, familyKey: key }));
      }
    }
    const { problems } = selectProblems({
      pool,
      difficultyRatio: ratioOf({ 연산: 2, 기본: 2, 응용: 2, 심화: 2 }),
      count: 8,
      recentProblemIds: [],
      seed: "seed-1",
    });
    expect(hasDuplicateFamily(problems)).toBe(false);
    // 갈래가 4뿐이므로 8을 못 채운다 — 조용히 채우지 않는다는 것이 이 값의 뜻이다.
    expect(problems).toHaveLength(4);
  });

  it("어느 시드에서도 같은 류가 겹치지 않는다", () => {
    const pool: SelectableProblem[] = [];
    for (let k = 0; k < 6; k += 1) {
      for (let i = 0; i < 3; i += 1) {
        pool.push(problem(`k${k}-${i}`, { familyKey: `key-${k}` }));
      }
    }
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const { problems } = selectProblems({
        pool,
        difficultyRatio: ratioOf({ 응용: 6 }),
        count: 6,
        recentProblemIds: [],
        seed,
      });
      expect(hasDuplicateFamily(problems)).toBe(false);
      expect(problems).toHaveLength(6);
    }
  });

  it("키가 전부 없는 풀(기출만인 경우)은 **예전과 똑같이** 정원을 채운다", () => {
    const pool = Array.from({ length: 10 }, (_, i) => problem(`old-${i}`));
    const { problems } = selectProblems({
      pool,
      difficultyRatio: ratioOf({ 응용: 8 }),
      count: 8,
      recentProblemIds: [],
      seed: "seed-legacy",
    });
    expect(problems).toHaveLength(8);
  });
});
