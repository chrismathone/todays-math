import type { UnitSeed } from "../../../../prisma/seed-data/units";
import type { ElemTier } from "../../elementary/difficulty";
import { make } from "../../elementary/make";
import { n } from "../../elementary/format";
import { createRng, intBetween } from "../../elementary/rng";
import { generateElementaryForm } from "../../elementary/forms";
import { extraBoxFrames } from "./boxFrames";

/** New frames are reachable only through the explicit SRS redraw path. */
export function extraCourseFrames(
  unit: UnitSeed,
  seed: number,
  tier: ElemTier,
) {
  const code = unit.section.split(" ")[0];
  if (code.startsWith("2-5-")) return extraBoxFrames(unit, seed, tier);
  const rng = createRng(seed);
  if ((code === "2-4-5" || code === "2-4-6") && tier === "응용") {
    if (code === "2-4-5") {
      const a = intBetween(rng, 2, 9);
      const b = intBetween(rng, 2, 9);
      const remaining = (a * b - 1) / 100;
      return [
        make(
          unit,
          `가로가 ${n(a / 10)} m, 세로가 ${n(b / 10)} m인 직사각형 종이에서 넓이가 ${n(0.01)} m²인 조각을 잘라 냈습니다. 남은 종이의 넓이는 몇 m²입니까?`,
          n(remaining),
          `전체 넓이는 $${a / 10}\\times${b / 10}=${(a * b) / 100}$ m²입니다. 잘라 낸 넓이를 빼면 ${n(remaining)} m²입니다.`,
        ),
      ];
    }
    const rawA = intBetween(rng, 11, 28);
    const a = rawA % 10 === 0 ? rawA + 1 : rawA;
    const rawB = a + intBetween(rng, 2, 8);
    const b = rawB % 10 === 0 ? rawB + 1 : rawB;
    const difference = (a * b - a * a) / 100;
    return [
      make(
        unit,
        `가로가 ${n(a / 10)} m, 세로가 ${n(b / 10)} m인 직사각형과 한 변이 ${n(a / 10)} m인 정사각형이 있습니다. 두 도형의 넓이의 차는 몇 m²입니까?`,
        n(difference),
        `직사각형의 넓이는 ${n((a * b) / 100)} m²이고 정사각형의 넓이는 ${n((a * a) / 100)} m²입니다. 차는 ${n(difference)} m²입니다.`,
      ),
    ];
  }
  if (code === "2-3-1") {
    const source = generateElementaryForm(unit, seed, "05");
    const spec = source.figureSpec as { items: { shape: string }[] };
    const counts = new Map<string, number>();
    for (const item of spec.items)
      counts.set(item.shape, (counts.get(item.shape) ?? 0) + 1);
    const groups = [...counts.values()];
    const pairs = groups.filter((count) => count === 2).length;
    const singles = groups.filter((count) => count === 1).length;
    if (tier === "기본")
      return [
        make(
          unit,
          "그림에서 서로 합동인 도형은 몇 쌍입니까?",
          n(pairs),
          `같은 모양과 크기의 도형끼리 짝을 지으면 ${n(pairs)}쌍입니다.`,
          source.figureSpec,
        ),
      ];
    if (tier === "응용")
      return [
        make(
          unit,
          "그림의 모든 도형이 합동인 짝을 하나씩 가지게 하려고 합니다. 짝이 없는 모양마다 합동인 도형을 한 개씩 더 그리면, 도형을 모두 몇 개 더 그려야 합니까?",
          n(singles),
          `짝이 없는 모양이 ${n(singles)}종류이므로 각각 한 개씩 ${n(singles)}개를 더 그립니다.`,
          source.figureSpec,
        ),
        make(
          unit,
          "그림에서 합동인 도형끼리는 한 개만 남기려고 합니다. 지워야 할 도형은 모두 몇 개입니까?",
          n(pairs),
          `합동인 짝이 ${n(pairs)}쌍이고 각 쌍에서 하나씩 지우므로 ${n(pairs)}개입니다.`,
          source.figureSpec,
        ),
      ];
  }
  if (code === "2-3-3" && tier === "응용") {
    const source = generateElementaryForm(unit, seed, "02");
    const spec = source.figureSpec as { n: number; cells: number[][] };
    const completed = new Set(spec.cells.map(([x, y]) => `${x},${y}`));
    for (const [x, y] of spec.cells) completed.add(`${spec.n - 1 - x},${y}`);
    const blank = spec.n ** 2 - completed.size;
    return [
      make(
        unit,
        "점선을 대칭축으로 하는 선대칭도형을 색칠하여 완성하려고 합니다. 완성한 뒤 칠하지 않은 칸은 모두 몇 칸입니까?",
        n(blank),
        `전체 ${n(spec.n ** 2)}칸에서 완성한 도형의 ${n(completed.size)}칸을 빼면 ${n(blank)}칸입니다.`,
        source.figureSpec,
      ),
    ];
  }
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
