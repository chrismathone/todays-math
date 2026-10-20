import type { UnitSeed } from "../../../../prisma/seed-data/units";
import { expr, fracLatex } from "../../elementary/format";
import { make } from "../../elementary/make";
import { addFrac, subFrac } from "../../elementary/math";
import { createRng, intBetween } from "../../elementary/rng";

export function mixedAdditionFrames(unit: UnitSeed, seed: number) {
  const rng = createRng(seed);
  const a = intBetween(rng, 3, 8),
    b = intBetween(rng, 3, 8),
    c = intBetween(rng, 3, 8);
  const x: [number, number] = [intBetween(rng, 2, 4) * a + 1, a];
  const y: [number, number] = [intBetween(rng, 1, 3) * b + 1, b];
  const used: [number, number] = [c + 1, c];
  const total = addFrac(...x, ...y),
    remaining = subFrac(...total, ...used);
  const f = (value: readonly [number, number]) => expr(fracLatex(...value));
  return [
    make(
      unit,
      `물이 ${f(x)} L 든 통과 ${f(y)} L 든 통의 물을 모두 한 통에 모았습니다. 그중 ${f(used)} L를 사용한 뒤 남은 물은 몇 L입니까?`,
      f(remaining),
      `두 통의 물을 합하면 ${f(total)} L입니다. 사용한 양을 빼면 ${f(remaining)} L가 남습니다.`,
    ),
  ];
}
