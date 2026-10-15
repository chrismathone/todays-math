import { describe, expect, it } from "vitest";
import {
  arithmeticRoundOverlapLimit,
  selectArithmeticRounds,
} from "@/lib/arithmetic/roundSelection";
import { assignArithmeticRegeneration } from "@/lib/arithmetic/regenerationSelection";

function choose(values: string[], n: number): string[][] {
  if (!n) return [[]];
  return values.flatMap((v, i) =>
    choose(values.slice(i + 1), n - 1).map((rest) => [v, ...rest]),
  );
}
function oracle(
  pools: string[][],
  rounds: { domain: string; count: number }[][],
) {
  const options = rounds.map((round) => {
    let rows: string[][] = [[]];
    for (const a of round)
      rows = rows.flatMap((row) =>
        choose(pools[Number(a.domain)], a.count)
          .filter((next) => next.every((k) => !row.includes(k)))
          .map((next) => [...row, ...next]),
      );
    return rows;
  });
  function visit(index: number, prior: string[][]): boolean {
    if (index === options.length) return true;
    return options[index].some(
      (row) =>
        prior.every(
          (previous) =>
            row.filter((k) => previous.includes(k)).length <=
            Math.floor(Math.min(row.length, previous.length) / 5),
        ) && visit(index + 1, [...prior, row]),
    );
  }
  return visit(0, []);
}
function select(
  pools: string[][],
  rounds: { domain: string; count: number }[][],
) {
  return selectArithmeticRounds(
    rounds,
    pools.map((pool, i) => ({
      id: String(i),
      *candidates() {
        for (const key of pool) yield { key, value: key };
      },
    })),
    "fixed",
  );
}
function check(rounds: string[][]) {
  for (let i = 0; i < rounds.length; i++) {
    expect(new Set(rounds[i]).size).toBe(rounds[i].length);
    for (let j = 0; j < i; j++)
      expect(
        rounds[i].filter((k) => rounds[j].includes(k)).length,
      ).toBeLessThanOrEqual(
        arithmeticRoundOverlapLimit(rounds[i].length, rounds[j].length),
      );
  }
}
describe("complete pairwise round selection", () => {
  it("does not expand unrelated large domains when one tiny component needs overlap", () => {
    let unrelatedVisits = 0;
    const domains = Array.from({ length: 100 }, (_, d) => ({
      id: String(d),
      *candidates() {
        for (let i = 0; i < 1e9; i++) {
          unrelatedVisits++;
          yield { key: `${d}-${i}`, value: `${d}-${i}` };
        }
      },
    }));
    domains.push({
      id: "tiny",
      *candidates() {
        for (let i = 0; i < 9; i++)
          yield { key: `tiny-${i}`, value: `tiny-${i}` };
      },
    });
    const rounds = [0, 1].map((r) => [
      { domain: "tiny", count: 5 },
      ...Array.from({ length: 50 }, (_, i) => ({
        domain: String(r * 50 + i),
        count: 1,
      })),
    ]);
    const result = selectArithmeticRounds(rounds, domains, "lazy");
    expect(unrelatedVisits).toBe(100);
    check(result.map((r) => r.flat()));
  });
  it("matches an independent exhaustive oracle on heterogeneous finite domains", () => {
    const universe = Array.from({ length: 7 }, (_, i) => String(i));
    let cases = 0;
    for (let a = 1; a <= 7; a++)
      for (let b = 1; b <= 7; b++)
        for (let shift = 0; shift < 3; shift++)
          for (const counts of [
            [1, 1, 1],
            [2, 1, 2],
            [3, 2, 4],
            [5, 0, 5],
          ]) {
            const pools = [
              universe.slice(0, a),
              universe.slice(shift, shift + b),
            ];
            const rounds = [
              [
                { domain: "0", count: counts[0] },
                ...(counts[1] ? [{ domain: "1", count: counts[1] }] : []),
              ],
              [{ domain: "1", count: counts[2] }],
            ];
            const possible = oracle(pools, rounds);
            let result: string[][][] | undefined;
            try {
              result = select(pools, rounds);
            } catch (error) {
              expect(error).toHaveProperty("reason");
            }
            expect(Boolean(result), JSON.stringify({ pools, rounds })).toBe(
              possible,
            );
            if (result) check(result.map((r) => r.flat()));
            cases++;
          }
    expect(cases).toBe(588);
  });
  it("requires zero overlap for 1-4 items and allows exactly one for length five", () => {
    const pools = [Array.from({ length: 9 }, (_, i) => String(i))];
    const rounds = Array.from({ length: 2 }, () => [{ domain: "0", count: 5 }]);
    const result = select(pools, rounds).map((r) => r.flat());
    check(result);
    expect(result[0].filter((k) => result[1].includes(k))).toHaveLength(1);
    expect(select(pools, rounds)).toEqual(select(pools, rounds));
    expect(() => select([pools[0].slice(0, 8)], rounds)).toThrow();
    expect(() => select(pools, [...rounds, rounds[0]])).toThrow();
    const three = Array.from({ length: 3 }, () => [{ domain: "0", count: 5 }]);
    check(
      select([Array.from({ length: 12 }, (_, i) => String(i))], three).map(
        (r) => r.flat(),
      ),
    );
  });
  it("rescues overlapping allocations whose greedy order steals a singleton", () => {
    const result = select(
      [["a", "b", "c"], ["a"]],
      [
        [
          { domain: "0", count: 2 },
          { domain: "1", count: 1 },
        ],
      ],
    );
    expect(result[0][1]).toEqual(["a"]);
    expect(new Set(result[0][0])).toEqual(new Set(["b", "c"]));
  });
  it("matches brute-force maximum changed slots with overlapping budget masks", () => {
    const keys = ["a", "b", "c", "d", "e"];
    for (let mask = 1; mask < 32; mask++)
      for (let cap = 0; cap <= 2; cap++) {
        const constraints = [
          {
            keys: new Set(keys.filter((_, i) => mask & (1 << i))),
            allowance: cap,
          },
          { keys: new Set(["b", "d"]), allowance: 1 },
        ];
        const choices = [keys.slice(0, 4), keys.slice(1), ["a", "c", "e"]].map(
          (row, i) =>
            row.map((key) => ({
              key,
              item: key,
              cost: key === ["a", "b", "c"][i] ? 1 : 0,
            })),
        );
        const all = choices[0]
          .flatMap((a) =>
            choices[1].flatMap((b) => choices[2].map((c) => [a, b, c])),
          )
          .filter(
            (row) =>
              new Set(row.map((x) => x.key)).size === 3 &&
              constraints.every(
                (rule) =>
                  row.filter((x) => rule.keys.has(x.key)).length <=
                  rule.allowance,
              ),
          );
        const minimum = Math.min(
          ...all.map((row) => row.reduce((sum, x) => sum + x.cost, 0)),
        );
        const result = assignArithmeticRegeneration(choices, constraints);
        expect(result === null).toBe(!all.length);
        if (result)
          expect(
            result.reduce(
              (sum, key, i) =>
                sum + choices[i].find((c) => c.key === key)!.cost,
              0,
            ),
          ).toBe(minimum);
      }
  });
  it("keeps the ordinary 2000-item path lazy, deterministic and shuffled within sections", () => {
    let visited = 0;
    const domains = [
      {
        id: "a",
        *candidates() {
          for (let i = 0; i < 1e9; i++) {
            visited++;
            yield { key: String(i), value: i };
          }
        },
      },
    ];
    const rounds = Array.from({ length: 10 }, () => [
      { domain: "a", count: 200 },
    ]);
    const selected = selectArithmeticRounds(rounds, domains, "shuffle");
    expect(visited).toBe(2000);
    expect(
      JSON.stringify(selected[0][0]) ===
        JSON.stringify(Array.from({ length: 200 }, (_, i) => i)),
    ).toBe(false);
    expect(new Set(selected.flat(2)).size).toBe(2000);
  });
});
