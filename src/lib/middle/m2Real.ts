/**
 * 중2 실물 맥락 유형 — `assetScene` 그림을 실은 2유형 (물결 2D).
 *
 * 병렬 세션 소유 모듈 — `m1Real.ts`·`realScene.ts` 와 한 세션이 만진다.
 * 계약·보류 사유는 `m1Real.ts` 머리 주석에 함께 적었다.
 *
 * ## 유형 번호를 계획서와 다르게 고른 이유 (실측 2026-08-23)
 *
 * 계획서 §4 의 「기차가 다리/터널」·「마주 보고 걷기」가 가리키던
 * `2-1|연립일차방정식의 활용|12·13·17` 은 **물결 2A 가 09~18 을 전량 등록**해
 * 비어 있지 않다. 같은 맥락을 담을 수 있는 빈 유형으로 옮겼다 —
 * 마주 보고 걷기는 RPM 2-1 p141 유형 12(속력)의 0958 이 **바로 그 문항**이다.
 *
 * ## rpmMinor 의 얇은 공백 (U+2009)
 *
 * `일차함수와 그 그래프  ⑵` 의 공백 하나는 **얇은 공백**이다 —
 * `scripts/rpm/rpm-type-catalog.json`(색인 정본)이 그렇게 담고 있고, 테스트가
 * 그 파일과 직접 대조한다(브리프 계약 5). 옆 모듈 `m2Func.ts` 는 이 자리를
 * 보통 공백 둘로 적어 정본과 다르다 — 그쪽은 색인 대조 검사가 없어서 안 걸린다.
 * **여기서 그 이탈을 따라 적지 않는다**(틀린 것을 베끼면 정본이 둘이 된다).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { at, hDim, place, sx, sy, vDim } from "./realScene";
import type { AssetScene } from "./realScene";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";

/** RPM 색인 정본의 중단원명 — 가운데 공백 하나는 U+2009(얇은 공백)다. */
export const MINOR_LINEAR2 = "일차함수와 그 그래프\u2009 ⑵";

/** 우리 Unit.section 정확한 이름 (prisma/seed-data/units.ts 실측 2026-08-23) */
const SEC = {
  일차함수활용: "일차함수의 활용(속력, 도형, 기타)",
} as const;

function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

function def(
  rpmBook: string,
  rpmMinor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${rpmBook}|${rpmMinor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook,
    rpmMinor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook,
      rpmMinor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

// ── 그림 ────────────────────────────────────────────────────────────

/**
 * 수조에 물을 넣는 장면 — 물의 양 둘(들이·처음)이 그림에 적힌다.
 *
 * ⚠️ 에셋의 물 높이는 **고정**이다(수조 안쪽 높이의 47%). 그래서 생성기는
 * 처음 물의 양이 들이의 40~60% 가 되도록 뽑는다 — 안 그러면 「$100$ L 들이에
 * $20$ L」 문항 옆에 반쯤 찬 그림이 붙는다. 발문과 다른 말을 하는 그림은
 * 렌더가 성공하는 오답이다.
 */
function waterTankScene(capacity: number, initial: number): AssetScene {
  const tankW = 140;
  const tank = place("water-tank", 76, tankW, { y: 26 });
  const leftX = sx(tank, "water-tank", at(tank, "water-tank", "left"));
  const topY = sy(tank, "water-tank", at(tank, "water-tank", "top"));
  const bottomY = sy(tank, "water-tank", at(tank, "water-tank", "bottom"));
  const surfaceY = sy(tank, "water-tank", at(tank, "water-tank", "water"));
  const level = vDim(leftX - 26, surfaceY, bottomY, `${initial} L`, -20);
  return {
    version: "elem-1",
    kind: "assetScene",
    canvas: [280, 158],
    items: [tank],
    segments: [[leftX - 26, surfaceY, leftX, surfaceY, "dash"]],
    dims: [level.dim],
    labels: [
      level.label,
      {
        x: sx(tank, "water-tank", 60),
        y: topY - 12,
        text: `들이 ${capacity} L`,
      },
    ],
  };
}

/** 마주 보고 걷는 장면 — 두 지점 사이 거리는 치수, 각자의 속력은 라벨. */
function walkTowardScene(
  dist: number,
  speedA: number,
  speedB: number,
): AssetScene {
  const groundY = 118;
  const personW = 50;
  const a = place("person-walking", 20, personW, { groundY });
  const b = place("person-walking", 230, personW, { groundY, flip: true });
  return {
    version: "elem-1",
    kind: "assetScene",
    canvas: [300, 150],
    items: [a, b],
    segments: [[6, groundY, 294, groundY]],
    dims: [hDim(30, 270, groundY + 22, `${dist} m`)],
    labels: [
      { x: 34, y: 22, text: "A" },
      { x: 266, y: 22, text: "B" },
      { x: 46, y: 40, text: `분속 ${speedA} m` },
      { x: 254, y: 40, text: `분속 ${speedB} m` },
    ],
  };
}

// ── 유형 ────────────────────────────────────────────────────────────

export const M2_REAL: TypeEntry[] = [
  /**
   * 일차함수의 활용 — 물의 양. 처음 $a$ L 에 $1$분마다 $b$ L 씩 → $y=a+bx$.
   * RPM 2-1 p141 유형 11 의 구조 그대로(수치·소재는 새로 만든 것).
   */
  def(
    "2-1",
    MINOR_LINEAR2,
    "11",
    "일차함수의 활용 물의 양에 대한 문제",
    SEC.일차함수활용,
    "mid",
    (rng) =>
      attempt(80, () => {
        const capacity = pick(rng, [40, 50, 60, 80, 100, 120] as const);
        // 에셋의 물 높이가 고정이라 처음 물의 양을 들이의 40~60% 로 묶는다.
        const lo = Math.ceil((capacity * 4) / 10);
        const hi = Math.floor((capacity * 6) / 10);
        const initial =
          intBetween(rng, Math.ceil(lo / 2), Math.floor(hi / 2)) * 2;
        const rate = intBetween(rng, 2, 8);
        const remain = capacity - initial;
        if (remain % rate !== 0) return null;
        const t = remain / rate;
        if (t < 4 || t > 40) return null;
        return {
          content:
            `오른쪽 그림과 같이 물을 $${capacity}$ L까지 담을 수 있는 수조에 $${initial}$ L의 물이 들어 있다. ` +
            `이 수조에 $1$분에 $${rate}$ L씩 물을 넣을 때, $x$분 후의 수조의 물의 양을 $y$ L라 하자. ` +
            `수조에 물을 가득 채우는 데 몇 분이 걸리는지 구하시오.`,
          answer: `$${t}$분`,
          solution:
            `처음 물의 양이 $${initial}$ L이고 $1$분마다 $${rate}$ L씩 늘어나므로 $y=${initial}+${rate}x$이다.\n` +
            `가득 차면 $y=${capacity}$이므로 $${initial}+${rate}x=${capacity}$, 즉 $${rate}x=${remain}$이다.\n` +
            `따라서 $x=${t}$이므로 $${t}$분이 걸린다.`,
          facts: { capacity, initial, rate, t },
          figureSpec: waterTankScene(capacity, initial),
        };
      }),
  ),

  /**
   * 일차함수의 활용 — 속력. 마주 보고 걸으면 두 사람 사이의 거리가
   * $y=d-(v_1+v_2)x$ 로 줄고, $y=0$ 이 되는 때가 만나는 때다.
   * RPM 2-1 p141 유형 12 의 0958 과 같은 구조(수치·이름은 새로 만든 것).
   */
  def(
    "2-1",
    MINOR_LINEAR2,
    "12",
    "일차함수의 활용 속력에 대한 문제",
    SEC.일차함수활용,
    "mid",
    (rng) =>
      attempt(80, () => {
        const speedA = intBetween(rng, 4, 9) * 10;
        const speedB = intBetween(rng, 4, 9) * 10;
        if (speedA === speedB) return null;
        const t = intBetween(rng, 5, 16);
        const dist = (speedA + speedB) * t;
        if (dist < 500 || dist > 2400) return null;
        return {
          content:
            `오른쪽 그림과 같이 $${dist}$ m 떨어진 두 지점 A, B가 있다. ` +
            `수아는 A 지점에서 분속 $${speedA}$ m로, 준호는 B 지점에서 분속 $${speedB}$ m로 동시에 마주 보고 걷기 시작하였다. ` +
            `출발한 지 $x$분 후의 두 사람 사이의 거리를 $y$ m라 할 때, 두 사람이 만나는 것은 출발한 지 몇 분 후인지 구하시오.`,
          answer: `$${t}$분 후`,
          solution:
            `$1$분에 두 사람 사이의 거리는 $${speedA}+${speedB}=${speedA + speedB}$ (m)씩 줄어든다.\n` +
            `따라서 $y=${dist}-${speedA + speedB}x$이다.\n` +
            `두 사람이 만나면 $y=0$이므로 $${dist}-${speedA + speedB}x=0$에서 $x=${t}$이다.\n` +
            `따라서 출발한 지 $${t}$분 후에 만난다.`,
          facts: { dist, speedA, speedB, t },
          figureSpec: walkTowardScene(dist, speedA, speedB),
        };
      }),
  ),
];
