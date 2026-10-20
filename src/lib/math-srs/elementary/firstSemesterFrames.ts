import type { UnitSeed } from "../../../../prisma/seed-data/units";
import type { ElemTier } from "../../elementary/difficulty";
import type { ElemProblem } from "../../elementary/types";
import { fig, make } from "../../elementary/make";
import { n } from "../../elementary/format";
import { createRng, intBetween } from "../../elementary/rng";

export function extraFirstSemesterFrames(
  unit: UnitSeed,
  seed: number,
  tier: ElemTier,
): ElemProblem[] {
  const code = unit.section.split(" ")[0];
  const rng = createRng(seed);
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
          `△의 두 값은 ${n(factor * x)}, ${n(factor * y)}이므로 합은 $${factor * x}+${factor * y}=${factor * (x + y)}$입니다.`,
          figure,
        ),
      ];
  }
  return [];
}
