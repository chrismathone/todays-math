import type { UnitSeed } from "../../../../prisma/seed-data/units";
import type { ElemTier } from "../../elementary/difficulty";
import { generateElementaryForm } from "../../elementary/forms";
import { n } from "../../elementary/format";
import { make } from "../../elementary/make";
import { createRng, intBetween } from "../../elementary/rng";

/** Uses the existing cuboid kind and its labels; no new figure contract. */
export function extraBoxFrames(unit: UnitSeed, seed: number, tier: ElemTier) {
  const code = unit.section.split(" ")[0];
  if (!code.startsWith("2-5-") || tier !== "응용") return [];
  const source = generateElementaryForm(unit, seed, "02");
  const spec = source.figureSpec as { w: number; d: number; h: number };
  const { w, d, h } = spec;
  const rng = createRng(seed);
  const count = intBetween(rng, 2, 5);
  const edges = 4 * (w + d + h);
  const intro = `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체`;
  if (code === "2-5-1") {
    const left = intBetween(rng, 5, 30);
    return [
      make(
        unit,
        `${intro} 모양 상자가 ${n(count)}개 있습니다. 상자마다 모든 모서리에 끈을 한 번씩 붙이면 끈은 모두 몇 cm 필요합니까?`,
        n(edges * count),
        `상자 하나의 모서리 길이의 합은 $(${w}+${d}+${h})\\times4=${edges}$ cm입니다. ${n(count)}개에 필요한 끈은 $${edges}\\times${count}=${edges * count}$ cm입니다.`,
        source.figureSpec,
      ),
      make(
        unit,
        `${intro} 모양 상자의 모든 모서리에 끈을 한 번씩 붙였습니다. 처음 끈의 길이가 ${n(edges + left)} cm였다면 남는 끈은 몇 cm입니까?`,
        n(left),
        `필요한 끈은 $(${w}+${d}+${h})\\times4=${edges}$ cm입니다. 남는 끈은 $${edges + left}-${edges}=${left}$ cm입니다.`,
        source.figureSpec,
      ),
    ];
  }
  if (code === "2-5-2")
    return [
      make(
        unit,
        `한 모서리가 ${n(w)} cm인 정육면체 모양 틀을 ${n(count)}개 만들려고 합니다. 모든 모서리를 철사로 만들 때 필요한 철사는 모두 몇 cm입니까?`,
        n(edges * count),
        `틀 하나에는 $${w}\\times12=${edges}$ cm가 필요합니다. ${n(count)}개에는 $${edges}\\times${count}=${edges * count}$ cm가 필요합니다.`,
        source.figureSpec,
      ),
    ];
  if (code === "2-5-3") {
    const areas = [w * d, w * h, d * h];
    const difference = Math.max(...areas) - Math.min(...areas);
    return [
      make(
        unit,
        `${intro}에서 가장 넓은 면과 가장 좁은 면의 넓이의 차는 몇 cm²입니까?`,
        n(difference),
        `서로 다른 세 면의 넓이는 ${n(areas[0])}, ${n(areas[1])}, ${n(areas[2])} cm²입니다. 가장 넓은 면에서 가장 좁은 면을 빼면 ${n(difference)} cm²입니다.`,
        source.figureSpec,
      ),
    ];
  }
  if (code === "2-5-4") {
    const longest = Math.max(w, d, h),
      shortest = Math.min(w, d, h);
    return [
      make(
        unit,
        `${intro}의 겨냥도입니다. 보이지 않는 모서리 중 가장 긴 것 한 개와 가장 짧은 것 한 개의 길이를 더하면 몇 cm입니까?`,
        n(longest + shortest),
        `보이지 않는 모서리는 가로·세로·높이 방향으로 하나씩 있습니다. 가장 긴 ${n(longest)} cm와 가장 짧은 ${n(shortest)} cm를 더하면 ${n(longest + shortest)} cm입니다.`,
        source.figureSpec,
      ),
    ];
  }
  return [];
}
