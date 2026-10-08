import { describe, expect, it } from "vitest";
import {
  captureEngineEvidence,
  FACTOR_KEY,
  readEvidence,
  TRIG_KEY,
  type EngineEvidence,
} from "../helpers/bankDecideEngineEvidence";

/**
 * 2026-10-08 적재 전 관문(`scripts/qa/highLoadGate.ts`)이 `공통수학1|인수분해|04` 꼴 0 에서 **값이 같은 보기**를
 * 찾았다 — $r=-p$ 이면 「$y$ 의 부호를 둘 다 바꾼」 오답이 「상수 짝을 바꾼」 오답과 인수의 차례만 다른 같은 식이다.
 * 그 판에서만 둘째 후보를 「상수 하나의 부호를 틀린」 오답으로 바꿨다. 후보의 **자리 · 수 · 난수 소비는 그대로**라,
 * 바뀐 글을 옛 글로 되돌리면 오답 지문이 기준선과 같아야 한다 — 그 밖의 판 · 다른 유형은 한 바이트도 안 바뀌었다는 뜻이다.
 */
const factor04 = (a: number, b: number): string =>
  `(x${a === 1 ? "+" : a === -1 ? "-" : a > 0 ? `+${a}` : `${a}`}y${b > 0 ? `+${b}` : `${b}`})`;
let factor04Restored = 0;
function beforeGateFix(
  key: string,
  problem: { facts: Record<string, number>; distractors?: readonly string[] },
): readonly string[] | null {
  const given = problem.distractors ?? null;
  const { mode, p, q, r, s } = problem.facts;
  if (key !== FACTOR_KEY || given === null || mode !== 0 || p! + r! !== 0)
    return given;
  const now = `$${factor04(p!, q!)}${factor04(r!, -s!)}$`;
  const was = `$${factor04(-p!, q!)}${factor04(-r!, s!)}$`;
  return given.map((d) => {
    if (d !== now) return d;
    factor04Restored += 1;
    return was;
  });
}

describe("B4·B5: 수정 전 45유형 × 씨앗 300개 지문", () => {
  it("발문·정답·난수는 전부 같고, 허용한 해설·오답만 바뀐다", () => {
    const before = readEvidence<EngineEvidence>(
      "bankDecideEngine.before.json.gz",
    );
    const after = captureEngineEvidence(beforeGateFix);
    // 되돌린 판이 0 이면 위 대조는 «아무것도 안 바꿨다»와 구별이 안 된다 — 관문 수리가 실제로 닿은 판이 있어야 한다.
    expect(factor04Restored).toBeGreaterThan(0);
    // 그리고 그대로 뽑은 지문은 기준선과 **달라야** 한다(수리가 정말 들어갔다).
    const raw = captureEngineEvidence().find((e) => e.key === FACTOR_KEY)!;
    expect(raw.hashes.distractors).not.toBe(
      before.find((e) => e.key === FACTOR_KEY)!.hashes.distractors,
    );
    expect(before).toHaveLength(45);
    expect(after.map((entry) => entry.key)).toEqual(
      before.map((entry) => entry.key),
    );
    for (const [i, row] of after.entries()) {
      const old = before[i];
      expect(row.count, row.key).toBe(300);
      for (const field of [
        "content",
        "answer",
        "metadata",
        "random",
        "stableSolution",
      ])
        expect(row.hashes[field], `${row.key}: ${field}`).toBe(
          old.hashes[field],
        );
      if (row.key !== FACTOR_KEY)
        expect(row.hashes.solution, row.key).toBe(old.hashes.solution);
      if (row.key !== TRIG_KEY)
        expect(row.hashes.distractors, row.key).toBe(old.hashes.distractors);
      if (row.key === FACTOR_KEY) {
        expect(row.editableSolutions.map(([seed]) => seed)).toEqual([
          86, 95, 103, 110,
        ]);
        expect(row.editableSolutions.map(([seed]) => seed)).toEqual(
          old.editableSolutions.map(([seed]) => seed),
        );
        for (const [j, [seed, hash]] of row.editableSolutions.entries())
          expect(hash, `두 계수 벌을 적은 seed ${seed}`).not.toBe(
            old.editableSolutions[j][1],
          );
      }
    }
  }, 60000);
});
