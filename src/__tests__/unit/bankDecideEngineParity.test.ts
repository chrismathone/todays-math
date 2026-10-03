import { describe, expect, it } from "vitest";
import {
  captureEngineEvidence,
  FACTOR_KEY,
  readEvidence,
  TRIG_KEY,
  type EngineEvidence,
} from "../helpers/bankDecideEngineEvidence";

describe("B4·B5: 수정 전 45유형 × 씨앗 300개 지문", () => {
  it("발문·정답·난수는 전부 같고, 허용한 해설·오답만 바뀐다", () => {
    const before = readEvidence<EngineEvidence>(
      "bankDecideEngine.before.json.gz",
    );
    const after = captureEngineEvidence();
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
