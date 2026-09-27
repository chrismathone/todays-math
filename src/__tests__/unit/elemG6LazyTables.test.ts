/**
 * 초6 후보 표 55개는 **처음 쓸 때 한 번** 만든다 (`lazyTable`, 2026-09-28).
 *
 * 🔴 왜 이 파일이 있나. `g6.ts` 가 **적재될 때마다** 후보 표를 역산 검사
 *    (`backsolveSafe`·`backsolveSafeStem` → `forwardReachable`, `oneStepHits`)하며 만들어,
 *    그 모듈을 끌어오는 탐험 API(`/api/learn/math-explorers`)의 새 인스턴스 첫 요청이
 *    2초 넘게 걸렸다(보고 reward-latency §3①). 상자 누름이 그 첫 요청이면 누름이 2초다.
 *
 * 세 겹으로 지킨다.
 *   ⑴ **적재는 표를 하나도 만들지 않는다** — 역산 검사가 한 번도 안 돈다(대역으로 센다).
 *      최상위 문장이 검사 함수를 직접 부르는 자리도 없다(글로 센다 — 새 표가 즉시 계산으로 돌아오면 빨개진다).
 *   ⑵ **표 내용이 옛 판(적재 때 계산)과 같다** — 아래 지문은 `42bf33acf`(즉시 계산 판)에서 찍었다.
 *   ⑶ **만드는 순서가 달라도 같다** — 거꾸로 만든 표와, 표 없이 바로 낸 문항(쓰는 차례대로 만들어짐)이
 *      같은 씨앗에서 한 글자도 안 다르다. 표는 결정적(난수·시각 없음)이라 언제 만들어도 같아야 한다.
 *
 * ## 다시 찍은 이력 (다시 찍을 때는 **반드시 여기에 까닭을 적는다**)
 *
 * - **2026-09-28 처음 찍음** — 55표. 게으른 초기화로 옮기기 전 판에서 찍고, 옮긴 뒤 판이 전부 같음을 확인했다
 *   (초6 소단원 56 × 갈래·문형 × 씨앗 30 = 15,720문항 지문도 전후 같음).
 *
 * ⚠️ 표 규칙(범위·가드)을 **일부러** 바꾸면 그 표의 지문만 바뀐다 — 바뀐 표가 의도한 것인지 보고 다시 찍는다.
 *    이름이 없는 표가 생기거나 없어지면 ⑴ 이 먼저 운다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reach = vi.hoisted(() => ({ calls: 0 }));
vi.mock("@/lib/elementary/forwardReach", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/elementary/forwardReach")>();
  return {
    ...original,
    forwardReachable: (
      ...args: Parameters<typeof original.forwardReachable>
    ) => {
      reach.calls += 1;
      return original.forwardReachable(...args);
    },
  };
});

const TABLE_DIGESTS: Record<string, string> = {
  "g6.SAME_MULT": "ec4827255abebb86", // 594
  "g6.SAME_TWO": "4a77eb7cf0ab26ba", // 6246
  "g6.DIFF_MULT": "b7c808c6d5a027d6", // 3975
  "g6.DIFF_TWO": "82cb700b36954344", // 61396
  "g6.NAT_MULT": "6f78595ad8e5f10b", // 712
  "g6.NAT_TWO": "9f14736c297cf027", // 7939
  "g6.ROUND_CROSS": "830636e7f88e2062", // 1353
  "g6.REM_CROSS": "aa268fcce49eb9cb", // 1464
  "g6.PRISM_AREA_MID": "d5de73fbfe9adb4f", // 5152
  "g6.PRISM_EDGE_MID": "d4ce72c56d2d36dc", // 93
  "g6.PRISM_NET_MID": "3abe5185a4501070", // 142
  "g6.PYR_AREA_MID": "106261943b33045a", // 6102
  "g6.SOLID_KIND_TOP": "06cf2a681582a0f7", // 15
  "g6.PYR_SUM_MID": "142b092e3e6607cf", // 24
  "g6.SURF_RANGE_MID": "4b128bc950c0b8bd", // 2672
  "g6.SURF_SQUARE_TOP": "8ef85fbbba98e68d", // 73
  "g6.VOL_PAIR_MID": "71fc2e307c2dd93a", // 218
  "g6.VOL_TRIPLE_TOP": "20e86c7a908c156e", // 120
  "g6.CUBIC_RANGE_MID": "295fce0f21dc0beb", // 1294
  "g6.RATIO_PROP_MID": "fd2059ffa19e03e6", // 324
  "g6.SIMPLE_RATIO_MID": "4446ef16b99364df", // 255
  "g6.PROP_EQ_MID": "47bae74b4fe9f880", // 519
  "g6.PROP_RULE_MID": "f481ba2fc1485b1c", // 31
  "g6.SHARE_RANGE_MID": "e0a9c7a2811ffd28", // 377
  "g6.SHARE_SPLIT_TOP": "afa26c090d8c1c54", // 12756
  "g6.AREA_RANGE_MID": "2de581ef76fa9fc5", // 3770
  "g6.NAT_DIV_REDUCE_MID": "246f91ad0c1de5ce", // 1569
  "g6.FRAC_RETURN_MID": "0a69f949c0a14bb9", // 54
  "g6.MIXED_NAT_DIVISOR_TOP": "b304732299bf60bb", // 1654
  "g6.ROLL_TOP": "4a4d8fbd0bbf1a0b", // 596
  "g6.CYL_SQUARE_MID": "f13f4bc3afa3d52d", // 12
  "g6.NET_SQUARE_MID": "392140e32afedd9d", // 12
  "g6.CONE_PAIR_TOP": "5e5edf2eabe91c19", // 148
  "g6.UNDER_ONE_SMALLEST": "df2638db6093fa3a", // 197
  "g6.BRING_ZERO_SLOT": "54bfd53c5ab243e2", // 1389
  "g6.ZERO_TENTH_SLOT": "6a03b1b54180079f", // 629
  "g6.RATE_WINDOW_MID": "276fda53bc48bcbc", // 10964
  "g6.PCT_WINDOW_MID": "55595dc11dc885c8", // 21337
  "g6.VOTE_WINDOW_MID": "f58e28bcf2b49953", // 24169
  "g6.MIXED_TOP_MID": "27726dd8df133538", // 64
  "g6.BAND_LEN_MID": "1f20e4fd53d7d97b", // 2658
  "g6.AREA_RANGE_BY_ANS": "40d88ca59da9dcb7", // 14
  "g6.AREA_RANGE_ANSWERS": "ded1a9aa90cb320a", // 14
  "g6.FRAC_RETURN_BY_ANS": "174f90b58414c7d8", // 9
  "g6.FRAC_RETURN_ANSWERS": "7b73c48e19809b7b", // 9
  "g6.CONE_BY_POS": "3e4ed025cd50d35a", // 14
  "g6.CONE_POSITIONS": "13e945eb7486759e", // 14
  "g6.UNDER_ONE_SMALLEST_BINS": "bdf343ffb78f3060", // 30
  "g6.BRING_ZERO_BINS": "51c97898144d5956", // 4
  "g6.ZERO_TENTH_BINS": "ff5bfe668a8a0677", // 5
  "g6.RATE_WINDOW_BINS": "2e28ff1c879e131b", // 52
  "g6.PCT_WINDOW_BINS": "d4b22d36cc6cc4c1", // 97
  "g6.VOTE_WINDOW_BINS": "5fd3db075b284956", // 109
  "g6.MIXED_TOP_BINS": "d79083b300668d29", // 12
  "g6.BAND_LEN_BINS": "cc82ae766181d263", // 36
};

/** `Map` 은 `JSON.stringify` 가 `{}` 로 지운다 — 항목을 순서대로 적는다. */
const digest = (value: unknown) =>
  createHash("sha256")
    .update(
      JSON.stringify(value, (_, v: unknown) =>
        v instanceof Map ? { __map: [...v] } : v,
      ),
    )
    .digest("hex")
    .slice(0, 16);

async function fresh() {
  vi.resetModules();
  reach.calls = 0;
  const g6 = await import("@/lib/elementary/g6");
  const lazy = await import("@/lib/elementary/lazyTable");
  const tables = lazy
    .lazyTableEntries()
    .filter(([name]) => name.startsWith("g6."));
  return { g6, lazy, tables };
}

/** 초6 모든 소단원 × 기본·등록 갈래 × 씨앗 — 제품 출제 경로 그대로. */
async function sixthGradePages(seeds: number) {
  const gen = await import("@/lib/elementary/generate");
  const pages: unknown[] = [];
  for (const unit of gen.elementaryUnits().filter((u) => u.grade === "초6"))
    for (const tier of [undefined, ...gen.supportedTiers(unit)])
      for (let seed = 1; seed <= seeds; seed++)
        pages.push(gen.generateElementaryProblem(unit, seed, tier));
  return pages;
}

describe("초6 후보 표 — 처음 쓸 때 한 번 (콜드 스타트)", () => {
  beforeEach(() => {
    reach.calls = 0;
  });

  it("적재는 표를 하나도 만들지 않고 역산 검사도 한 번 안 돈다", async () => {
    const { lazy, tables } = await fresh();
    expect(reach.calls).toBe(0);
    expect(lazy.lazyTablesBuilt()).toBe(0);
    expect(tables.map(([name]) => name).sort()).toEqual(
      Object.keys(TABLE_DIGESTS).sort(),
    );
  });

  it("최상위 문장이 후보 검사를 직접 부르지 않는다 — 표는 lazyTable 안에서만 만든다", () => {
    const file = resolve(process.cwd(), "src/lib/elementary/g6.ts");
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const checks = new Set([
      "backsolveSafe",
      "backsolveSafeStem",
      "oneStepHits",
    ]);
    const eager: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return;
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        checks.has(node.expression.text)
      ) {
        const line = source.getLineAndCharacterOfPosition(node.getStart()).line;
        eager.push(`${line + 1}: ${node.expression.text}`);
      }
      ts.forEachChild(node, visit);
    };
    for (const statement of source.statements)
      if (!ts.isFunctionDeclaration(statement)) visit(statement);
    expect(eager).toEqual([]);
  });

  it("표 내용이 옛 판(적재 때 계산)과 같고, 두 번 불러도 같은 표를 준다", async () => {
    const { lazy, tables } = await fresh();
    const got = Object.fromEntries(
      tables.map(([name, table]) => [name, digest(table())]),
    );
    expect(got).toEqual(TABLE_DIGESTS);
    expect(lazy.lazyTablesBuilt()).toBe(tables.length);
    expect(reach.calls).toBeGreaterThan(0);
    for (const [, table] of tables) expect(table()).toBe(table());
    expect(lazy.lazyTablesBuilt()).toBe(tables.length);
  }, 120_000);

  it("거꾸로 만든 표와 표 없이 바로 낸 문항이 같다 — 초6 전 소단원 · 갈래 · 씨앗", async () => {
    await fresh();
    const onDemand = await sixthGradePages(4);

    const { tables } = await fresh();
    const reversed = Object.fromEntries(
      [...tables].reverse().map(([name, table]) => [name, digest(table())]),
    );
    expect(reversed).toEqual(TABLE_DIGESTS);
    expect(await sixthGradePages(4)).toEqual(onDemand);
  }, 180_000);
});
