import type { UnitSeed } from "../../../../prisma/seed-data/units";
import { expr, fracLatex } from "../../elementary/format";
import { make } from "../../elementary/make";
import { subFrac } from "../../elementary/math";
import { createRng, intBetween } from "../../elementary/rng";

export function mixedSubtractionFrames(unit: UnitSeed, seed: number) {
  const rng = createRng(seed);
  const den = () => [3, 4, 5, 6, 8][intBetween(rng, 0, 4)];
  const a = den(),
    b = den(),
    c = den(),
    d = den();
  const totalA: [number, number] = [6 * a + 1, a],
    totalB: [number, number] = [4 * b + 1, b];
  const usedA: [number, number] = [b + 1, b],
    usedB: [number, number] = [c + 1, c];
  const first = subFrac(...totalA, ...usedA);
  const remaining = subFrac(...first, ...usedB);
  const usedC: [number, number] = [c + 1, c],
    usedD: [number, number] = [2 * d + 1, d];
  const leftA = subFrac(...totalA, ...usedC),
    leftB = subFrac(...totalB, ...usedD);
  const difference = subFrac(...leftA, ...leftB);
  const f = (value: readonly [number, number]) => expr(fracLatex(...value));
  return [
    make(
      unit,
      `통에 물이 ${f(totalA)} L 있었습니다. 오전에 ${f(usedA)} L, 오후에 ${f(usedB)} L를 사용했습니다. 남은 물은 몇 L입니까?`,
      f(remaining),
      `오전에 사용한 뒤에는 ${f(first)} L가 남습니다. 여기서 오후에 쓴 ${f(usedB)} L를 빼면 ${f(remaining)} L입니다.`,
    ),
    make(
      unit,
      `가 통에는 물이 ${f(totalA)} L, 나 통에는 ${f(totalB)} L 있었습니다. 가 통에서 ${f(usedC)} L, 나 통에서 ${f(usedD)} L를 사용했습니다. 두 통에 남은 물의 양의 차는 몇 L입니까?`,
      f(difference),
      `가 통에는 ${f(leftA)} L, 나 통에는 ${f(leftB)} L가 남습니다. 두 양의 차는 ${f(difference)} L입니다.`,
    ),
  ];
}
