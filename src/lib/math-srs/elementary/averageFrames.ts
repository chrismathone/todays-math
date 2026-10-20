import type { UnitSeed } from "../../../../prisma/seed-data/units";
import type { ElemTier } from "../../elementary/difficulty";
import { n } from "../../elementary/format";
import { make } from "../../elementary/make";
import { createRng, intBetween } from "../../elementary/rng";

export function extraAverageFrames(
  unit: UnitSeed,
  seed: number,
  tier: ElemTier,
) {
  const code = unit.section.split(" ")[0];
  const rng = createRng(seed);
  if (code === "2-6-1" || code === "2-6-2") {
    const size = intBetween(rng, 3, 5),
      avg = intBetween(rng, 8, 15),
      increase = intBetween(rng, 2, 5);
    if (tier === "기본")
      return [
        make(
          unit,
          `자료 ${n(size)}개의 평균이 ${n(avg)}입니다. 각 자료에 똑같이 ${n(increase)}씩 더하면 새 평균은 얼마입니까?`,
          n(avg + increase),
          `자료 하나마다 ${n(increase)}씩 늘어나므로 평균도 ${n(increase)}만큼 늘어납니다. 새 평균은 $${avg}+${increase}=${avg + increase}$입니다.`,
        ),
      ];
    if (code === "2-6-2" && tier === "응용") {
      const remaining = intBetween(rng, 2, 3),
        delta = remaining * intBetween(rng, 1, 2);
      const target = avg + delta;
      const answer = avg + (size + remaining) * (delta / remaining);
      return [
        make(
          unit,
          `${n(size)}경기까지의 평균 점수가 ${n(avg)}점입니다. 남은 ${n(remaining)}경기를 마친 뒤 전체 경기의 평균을 ${n(target)}점으로 만들려면, 남은 경기에서 경기당 평균 몇 점을 얻어야 합니까?`,
          n(answer),
          `전체 목표 점수는 $${size + remaining}\\times${target}=${(size + remaining) * target}$점이고 지금까지는 $${size}\\times${avg}=${size * avg}$점입니다. 남은 점수를 ${n(remaining)}경기로 나누면 평균 ${n(answer)}점입니다.`,
        ),
      ];
    }
  }
  if (code !== "2-6-3") return [];
  const red = intBetween(rng, 2, 6),
    extra = intBetween(rng, 1, 4);
  const blue = red + extra;
  if (tier === "기본") {
    const kind = seed % 3;
    const shownRed = kind === 0 ? 0 : red,
      shownBlue = kind === 1 ? 0 : red;
    const chance = kind === 0 ? 0 : kind === 1 ? 1 : 0.5;
    const top = intBetween(rng, 4, 9);
    const cutoffs = Array.from(
      { length: 3 },
      () => [0, top, top + 1][intBetween(rng, 0, 2)],
    );
    const certain = cutoffs.filter((k) => k >= top).length;
    return [
      make(
        unit,
        `빨간 구슬 ${n(shownRed)}개와 파란 구슬 ${n(shownBlue)}개만 든 주머니에서 구슬 한 개를 꺼냅니다. 빨간색일 가능성을 수로 쓰시오. (불가능은 0, 반반은 0.5, 확실은 1)`,
        n(chance),
        `빨간 구슬이 ${kind === 0 ? "없으므로 불가능합니다" : kind === 1 ? "전부이므로 확실합니다" : "파란 구슬과 같은 수이므로 반반입니다"}. 가능성은 ${n(chance)}입니다.`,
      ),
      make(
        unit,
        `주머니에는 빨간 구슬과 파란 구슬만 들어 있습니다. 파란 구슬은 ${n(blue)}개이고 빨간색을 꺼낼 가능성은 반반입니다. 빨간 구슬의 수를 구하시오.`,
        n(blue),
        `빨간색과 파란색의 가능성이 반반이므로 두 색의 구슬 수가 같습니다. 빨간 구슬도 ${n(blue)}개입니다.`,
      ),
      make(
        unit,
        `${n(1)}부터 ${n(top)}까지의 자연수가 하나씩 적힌 카드를 섞어 한 장 뽑습니다. 다음 세 가지 일 중 확실하게 일어나는 일은 모두 몇 개입니까? ① 뽑은 수가 ${n(cutoffs[0])} 이하이다. ② 뽑은 수가 ${n(cutoffs[1])} 이하이다. ③ 뽑은 수가 ${n(cutoffs[2])} 이하이다.`,
        n(certain),
        `가장 큰 수가 ${n(top)}이므로 ${n(top)} 이상의 수 이하인 일은 확실합니다. 세 문장 중 ${n(certain)}개입니다.`,
      ),
    ];
  }
  if (tier === "응용") {
    const kind = seed % 3;
    const change =
      kind === 0
        ? "빨간 구슬을 모두 꺼냈습니다."
        : kind === 1
          ? "파란 구슬을 모두 꺼냈습니다."
          : `빨간 구슬을 더 ${n(extra)}개 넣었습니다.`;
    const chance = kind === 0 ? 0 : kind === 1 ? 1 : 0.5;
    const removed = intBetween(rng, 1, 3);
    return [
      make(
        unit,
        `빨간 구슬 ${n(red)}개와 파란 구슬 ${n(blue)}개만 든 주머니가 있습니다. ${change} 그 뒤 남은 주머니에서 구슬 한 개를 꺼낼 때 빨간색일 가능성을 수로 쓰시오. (불가능은 0, 반반은 0.5, 확실은 1)`,
        n(chance),
        `변화 뒤에는 ${kind === 0 ? "빨간 구슬이 없어 불가능합니다" : kind === 1 ? "빨간 구슬만 남아 확실합니다" : "빨간 구슬과 파란 구슬이 같은 수가 되어 반반입니다"}. 가능성은 ${n(chance)}입니다.`,
      ),
      make(
        unit,
        `주머니에 빨간 구슬 ${n(red)}개와 파란 구슬 ${n(blue)}개만 있습니다. 빨간 구슬만 더 넣어 빨간색을 꺼낼 가능성을 반반으로 만들면, 주머니의 구슬은 모두 몇 개가 됩니까?`,
        n(2 * blue),
        `빨간 구슬을 $${blue}-${red}=${extra}$개 넣으면 두 색이 각각 ${n(blue)}개입니다. 모두 $${blue}+${blue}=${2 * blue}$개입니다.`,
      ),
      make(
        unit,
        `주머니에 빨간 구슬 ${n(red)}개와 파란 구슬 ${n(blue + removed)}개만 있습니다. 파란 구슬을 먼저 ${n(removed)}개 꺼낸 뒤, 빨간 구슬만 더 넣어 빨간색을 꺼낼 가능성을 반반으로 만들려고 합니다. 빨간 구슬을 몇 개 더 넣어야 합니까?`,
        n(extra),
        `파란 구슬은 $${blue + removed}-${removed}=${blue}$개가 됩니다. 빨간 구슬도 ${n(blue)}개가 되어야 하므로 $${blue}-${red}=${extra}$개 더 넣습니다.`,
      ),
    ];
  }
  return [];
}
