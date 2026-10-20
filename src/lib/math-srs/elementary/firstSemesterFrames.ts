import type { UnitSeed } from "../../../../prisma/seed-data/units";
import type { ElemTier } from "../../elementary/difficulty";
import type { ElemProblem } from "../../elementary/types";
import { fig, make } from "../../elementary/make";
import { n } from "../../elementary/format";
import { createRng, intBetween } from "../../elementary/rng";
import { mixedSubtractionFrames } from "./mixedSubtractionFrames";
import { mixedAdditionFrames } from "./mixedAdditionFrames";

export function extraFirstSemesterFrames(
  unit: UnitSeed,
  seed: number,
  tier: ElemTier,
): ElemProblem[] {
  const code = unit.section.split(" ")[0];
  if (code === "1-5-2" && tier === "응용")
    return mixedAdditionFrames(unit, seed);
  if (code === "1-5-4" && tier === "응용")
    return mixedSubtractionFrames(unit, seed);
  const rng = createRng(seed);
  if (code === "1-4-2") {
    const den = [3, 5, 7, 11][intBetween(rng, 0, 3)];
    const num = intBetween(rng, 1, den - 1),
      factor = intBetween(rng, 2, 6);
    const den2 = [3, 5, 7, 11][intBetween(rng, 0, 3)];
    const num2 = intBetween(rng, 1, den2 - 1),
      factor2 = intBetween(rng, 2, 6);
    const fraction = `$\\frac{${num * factor}}{${den * factor}}$`;
    const fraction2 = `$\\frac{${num2 * factor2}}{${den2 * factor2}}$`;
    const reduced = `$\\frac{${num}}{${den}}$`;
    const reason = `주어진 분수 ${fraction}에 대해 크기가 같은 기약분수는 ${reduced}입니다.`;
    if (tier === "기본")
      return [
        make(
          unit,
          `주어진 분수 ${fraction}에 대해 크기가 같은 기약분수의 분자는 얼마입니까?`,
          n(num),
          reason,
        ),
        make(
          unit,
          `주어진 분수 ${fraction}에 대해 크기가 같은 기약분수의 분모는 얼마입니까?`,
          n(den),
          reason,
        ),
        make(
          unit,
          `${fraction}의 분자와 분모를 각각 같은 자연수로 나누어 기약분수를 만들었습니다. 나눈 수는 얼마입니까?`,
          n(factor),
          `${reason} 분자와 분모를 각각 ${n(factor)}로 나누었습니다.`,
        ),
      ];
    if (tier === "응용")
      return [
        make(
          unit,
          `두 분수 ${fraction}, ${fraction2}에 대해 각각 크기가 같은 기약분수로 만들었습니다. 두 기약분수의 분모의 합은 얼마입니까?`,
          n(den + den2),
          `${reason} 다른 분수의 분모는 ${n(den2)}입니다. 두 분모의 합은 $${den}+${den2}=${den + den2}$입니다.`,
        ),
        make(
          unit,
          `주어진 분수 ${fraction}에 대해 크기가 같은 기약분수에서 분자와 분모의 합은 얼마입니까?`,
          n(num + den),
          `${reason} 분자와 분모의 합은 $${num}+${den}=${num + den}$입니다.`,
        ),
        make(
          unit,
          `주어진 분수 ${fraction}에 대해 크기가 같은 기약분수를 만들면 분모는 얼마나 작아집니까?`,
          n(den * (factor - 1)),
          `${reason} 분모가 ${n(den * factor)}에서 ${n(den)}로 바뀌므로 $${den * factor}-${den}=${den * (factor - 1)}$만큼 작아집니다.`,
        ),
      ];
  }
  if (code === "1-3-2") {
    const factor = intBetween(rng, 2, 8),
      x = intBetween(rng, 5, 10),
      y = x + intBetween(rng, 2, 5);
    const figure = fig("table", {
      headers: ["□", "1", "2", "3"],
      rows: [["△", String(factor), String(factor * 2), String(factor * 3)]],
    });
    if (tier === "기본")
      return [
        make(
          unit,
          "표의 대응 관계는 $\\triangle=\\square\\times\\text{㉠}$입니다. ㉠에 알맞은 수를 구하시오.",
          n(factor),
          `표에서 △는 □의 ${n(factor)}배이므로 ㉠은 ${n(factor)}입니다.`,
          figure,
        ),
      ];
    if (tier === "응용")
      return [
        make(
          unit,
          `표와 같은 대응 관계에서 □가 ${n(x)}일 때 △는 얼마입니까?`,
          n(factor * x),
          `표에서 △는 □의 ${n(factor)}배입니다. $${x}\\times${factor}=${factor * x}$이므로 △는 ${n(factor * x)}입니다.`,
          figure,
        ),
        make(
          unit,
          `표와 같은 대응 관계에서 □가 ${n(x)}에서 ${n(y)}로 커질 때 △는 얼마만큼 커집니까?`,
          n(factor * (y - x)),
          `△의 두 값은 ${n(factor * x)}, ${n(factor * y)}입니다. 차는 $${factor * y}-${factor * x}=${factor * (y - x)}$입니다.`,
          figure,
        ),
        make(
          unit,
          `표와 같은 대응 관계에서 □가 ${n(x)}일 때의 △와 □가 ${n(y)}일 때의 △의 합을 구하시오.`,
          n(factor * (x + y)),
          `△의 두 값은 ${n(factor * x)}, ${n(factor * y)}입니다. 합은 $${factor * x}+${factor * y}=${factor * (x + y)}$입니다.`,
          figure,
        ),
      ];
  }
  return [];
}
