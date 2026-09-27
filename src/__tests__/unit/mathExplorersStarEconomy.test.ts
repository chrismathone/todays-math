import { describe, expect, it } from "vitest";
import days from "../fixtures/starEconomyDays.json";
import {
  BASE_STAGE_NAMES,
  TILE_STAR_FLOOR,
  baseStageName,
  baseUpgradeCost,
  tileStarBonus,
} from "@/lib/math-explorers/starEconomy";

type Row = [kind: string, learned: number, product: number, tile: number];
type Persona = "g8" | "g4" | "g7";
const personas: Persona[] = ["g8", "g4", "g7"];

/**
 * 30·90일 날별 기록(제품 엔진으로 돌린 학생 셋)에 새 규칙을 입혀 센다 — 보고서 · Wire 표와 같은 방법.
 * 학생은 살 수 있으면 바로 산다. `bonus` 를 끄면 칸 보장 없이(지금 규칙의 수입) 센다.
 */
function simulate(rows: Row[], bonus = true) {
  let stars = 0,
    earned = 0,
    level = 0,
    zero = 0,
    maxZero = 0,
    lastBuy = 0,
    maxWait = 0;
  for (const [index, [, learned, product, tile]] of rows.entries()) {
    const add = product + (bonus && tile ? tileStarBonus(learned) : 0);
    stars += add;
    earned += add;
    zero = add ? 0 : zero + 1;
    maxZero = Math.max(maxZero, zero);
    while (stars >= baseUpgradeCost(level)) {
      stars -= baseUpgradeCost(level);
      level++;
      maxWait = Math.max(maxWait, index + 1 - lastBuy);
      lastBuy = index + 1;
    }
  }
  return {
    earned,
    level,
    stars,
    maxZero,
    maxWait: Math.max(maxWait, rows.length - lastBuy),
  };
}
const table = (span: "days30" | "days90", bonus = true) =>
  personas.map((p) => simulate(days[span][p] as Row[], bonus));

describe("star economy rules (D-144)", () => {
  it("tops a tile up to three stars from the mission's own card stars, never more", () => {
    expect(TILE_STAR_FLOOR).toBe(3);
    expect([0, 1, 2, 3, 5].map(tileStarBonus)).toEqual([3, 2, 1, 0, 0]);
  });

  it("keeps the first three base costs and then asks 12 for every further stage, without an end", () => {
    expect([0, 1, 2, 3, 4, 10, 99].map(baseUpgradeCost)).toEqual([
      3, 6, 12, 12, 12, 12, 12,
    ]);
    expect(BASE_STAGE_NAMES).toEqual([
      "작은 배움터",
      "수학 탐험소",
      "기억 연구소",
      "빛나는 수학 기지",
    ]);
    expect([0, 3, 4, 31].map(baseStageName)).toEqual([
      "작은 배움터",
      "빛나는 수학 기지",
      "빛나는 수학 기지",
      "빛나는 수학 기지",
    ]);
  });

  it("reproduces the investigated baseline from the day records (old income, no tile bonus)", () => {
    // 병목 조사(보고서 §5) · Wire «지금» 줄과 같은 수입: 중2 · 초4 · 중1
    expect(table("days30", false).map((r) => r.earned)).toEqual([163, 17, 131]);
    expect(table("days30", false).map((r) => r.maxZero)).toEqual([0, 21, 1]);
    expect(table("days90", false).map((r) => r.earned)).toEqual([236, 34, 300]);
    // 90일이면 중2 도 기억 복습 날이 0 이 된다(카드가 다 3단계)
    expect(table("days90", false).map((r) => r.maxZero)).toEqual([14, 48, 3]);
  });

  it("gives every student stars on every completed day and a use for them — the agreed option D numbers", () => {
    const d30 = table("days30");
    expect(d30.map((r) => r.earned)).toEqual([167, 96, 153]);
    expect(d30.map((r) => r.level)).toEqual([15, 9, 14]);
    expect(d30.map((r) => r.maxZero)).toEqual([0, 0, 0]);
    expect(d30.map((r) => r.maxWait)).toEqual([3, 4, 3]);
    const d90 = table("days90");
    expect(d90.map((r) => r.earned)).toEqual([361, 281, 399]);
    expect(d90.map((r) => r.level)).toEqual([31, 24, 34]);
    expect(d90.map((r) => r.maxZero)).toEqual([0, 0, 0]);
    expect(d90.map((r) => r.maxWait)).toEqual([4, 4, 4]);
    // 끝이 없어 «다 사고 남은 별»이 생기지 않는다 — 잔고는 늘 다음 단계 값보다 작다
    for (const r of [...d30, ...d90])
      expect(r.stars).toBeLessThan(baseUpgradeCost(r.level));
  });
});
