import type { UnitSeed } from "../../../../prisma/seed-data/units";
import type { ElemTier } from "../../elementary/difficulty";
import { make } from "../../elementary/make";
import { n } from "../../elementary/format";
import { createRng, intBetween } from "../../elementary/rng";

/** New frames are reachable only through the explicit SRS redraw path. */
export function extraCourseFrames(
  unit: UnitSeed,
  seed: number,
  tier: ElemTier,
) {
  const code = unit.section.split(" ")[0];
  const rng = createRng(seed);
  if (code === "2-1-3" && tier === "응용") {
    const edge = intBetween(rng, 3, 8);
    const low = intBetween(rng, 2, 4) * 1000;
    const high = low + intBetween(rng, 1, 3) * 1000;
    const a = intBetween(rng, 1, 4);
    const b = intBetween(rng, 2, 5);
    const fees = `물건 한 개의 배송 요금은 무게가 ${n(edge)} kg 이하이면 ${n(low)}원, 초과이면 ${n(high)}원입니다.`;
    return [
      make(
        unit,
        `${fees} 무게가 각각 ${n(edge)} kg인 물건 ${n(a)}개와 각각 ${n(edge + 1)} kg인 물건 ${n(b)}개를 하나씩 따로 보내면 요금은 모두 얼마입니까?`,
        n(a * low + b * high),
        `${n(edge)} kg은 이하 구간입니다. 두 구간의 요금을 각각 계산해 더하면 $${a}\\times${low}+${b}\\times${high}=${a * low + b * high}$원입니다.`,
      ),
      make(
        unit,
        `${fees} 무게가 ${n(edge + 1)} kg인 물건에서 포장재 ${n(1)} kg을 덜어 내어 보냈습니다. 배송 요금은 얼마 줄었습니까?`,
        n(high - low),
        `무게가 ${n(edge)} kg이 되어 이하 구간으로 바뀝니다. 줄어든 요금은 $${high}-${low}=${high - low}$원입니다.`,
      ),
    ];
  }
  return [];
}
