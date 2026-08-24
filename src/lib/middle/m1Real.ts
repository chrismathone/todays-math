/**
 * 중1 실물 맥락 유형 — `assetScene` 그림을 실은 3유형 (물결 2D).
 *
 * 이 트랙의 배선은 `generate.ts` 한 줄이다 — `m1Extra.ts`(중1 세션의 **합본**)에
 * 끼우면 `middleM1Extra.test.ts` 의 「30유형」 단정이 깨진다. 각 세션의 시험은
 * 자기 유형만 훑는다는 규약(middleTypeCoverage.test.ts 머리 주석) 때문이다.
 *
 * 병렬 세션 소유 모듈 — 이 파일과 `realScene.ts` 는 **이 세션만** 만진다
 * (docs/planning/tracks/middle-engine-parallel-20260823.md 의 파일 소유권 규칙).
 *
 * ## 이 트랙이 다른 트랙과 다른 점 — 그림도 검산 대상이다
 *
 * 1차 물결 계약(정답 역산 · `facts` 독립 검산 · bareNumbers · attempt 소진 시 던짐)
 * 그대로에, **그림 스펙의 모든 라벨에 적힌 수가 `facts` 와 같아야 한다**는 조건이
 * 하나 더 있다. 그림 따로 발문 따로면 «그럴듯한 오답 그림»이 되고, 그건 지면에서
 * 티가 안 난다 — 렌더가 성공하는 오답이다(CLAUDE.md 2026-08-16 「KaTeX 가 초록이라고
 * 지면이 멀쩡한 게 아니다」와 같은 자리).
 *
 * ## 유형 번호를 계획서와 다르게 고른 이유 (실측 2026-08-23)
 *
 * 계획서 §4 는 「기차가 다리/터널」을 `1-1|일차방정식의 활용|22` ·
 * `2-1|연립일차방정식의 활용|17` 로 적었는데, **둘 다 물결 2A 가 이미 등록했다**
 * (`registeredTypes()` 실측 — 1-1 활용 22유형 전량 · 2-1 연립 활용 09~18 전량).
 * 유형 키는 유일해야 하므로(`generate.ts` 가 겹치면 던진다) 같은 «실물 맥락»을
 * 담을 수 있는 **비어 있는** RPM 유형으로 옮겼다. 옮긴 자리는 소재가 아니라
 * **구조**로 골랐다 — 정비례/반비례 활용의 ❶관계식 세우기 ❷대입하기가 곧
 * 「기차가 (다리+기차) 만큼 달린다」이다 (RPM 1-1 p139·p144 실렌더 대조).
 *
 * ## 보류 — 이번에 못 낸 계획서 항목
 *
 * - **끈으로 캔 묶기** (`1-2|원과 부채꼴|16` 끈의 길이): 이 유형의 그림은 캔을
 *   **위에서 본** 원 배치 + 두르는 끈이다(RPM 1-2 p93 0625~0627 실렌더). 그런데
 *   에셋 `can` 은 **옆에서 본** 원기둥이라, 그걸 위에서 본 것처럼 늘어놓으면
 *   그림이 문항과 다른 말을 한다. 어설픈 그림은 없는 것보다 나쁘다(브리프 계약 9).
 *   → 필요한 것: «위에서 본 캔(원)» 에셋 또는 v2 원+접선·호 조판. 에셋 세션에 요청.
 * - **`1-2|입체도형의 겉넓이와 부피|17`** (직육면체 그릇에 담긴 물의 부피): 이 유형은
 *   그릇을 **기울여** 남은 물이 삼각기둥/삼각뿔이 되는 문항이다(RPM 1-2 p132 0881).
 *   `water-tank` 는 똑바로 선 수조라 기울인 장면을 못 만든다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { at, hDim, place, sx, sy, vDim } from "./realScene";
import type { AssetScene } from "./realScene";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중1";

/** 우리 Unit.section 정확한 이름 (prisma/seed-data/units.ts 실측 2026-08-23) */
const SEC = {
  정비례: "정비례 관계 y=ax의 그래프",
  반비례: "반비례 관계 y=a/x의 그래프",
  뿔: "뿔의 겉넓이와 부피",
} as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
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
 * 기차가 다리를 지나는 장면 — 기차는 다리 **앞**에 서 있고, 두 치수가 나란하다.
 * 원본 지면(RPM 1-1 p118 유형 22 개념 상자)의 「↔ 다리의 길이 / ↔ 기차의 길이」 구조.
 */
function trainBridgeScene(trainLen: number, bridgeLen: number): AssetScene {
  const bridgeW = 178;
  const bridge = place("bridge", 104, bridgeW, { y: 44 });
  const deckY = sy(bridge, "bridge", at(bridge, "bridge", "deck"));
  const trainW = 92;
  const train = place("train-side", 6, trainW, { groundY: deckY });
  return {
    version: "elem-1",
    kind: "assetScene",
    canvas: [300, 150],
    items: [bridge, train],
    // 기차가 허공에 뜬 것처럼 보이지 않게 상판 높이의 선로를 왼쪽까지 깐다.
    segments: [
      [2, deckY, sx(bridge, "bridge", at(bridge, "bridge", "slabL")), deckY],
    ],
    dims: [
      hDim(
        sx(bridge, "bridge", at(bridge, "bridge", "slabL")),
        sx(bridge, "bridge", at(bridge, "bridge", "slabR")),
        140,
        `${bridgeLen} m`,
      ),
      hDim(
        sx(train, "train-side", 3),
        sx(train, "train-side", 176),
        20,
        `${trainLen} m`,
      ),
    ],
  };
}

/** 기차가 터널을 지나는 장면 — 터널 길이는 터널 몸통 위에, 기차 길이는 기차 위에. */
function trainTunnelScene(trainLen: number, tunnelLen: number): AssetScene {
  const tunnelW = 146;
  const tunnel = place("tunnel", 138, tunnelW, { groundY: 124 });
  const trainW = 96;
  const train = place("train-side", 10, trainW, { groundY: 124 });
  return {
    version: "elem-1",
    kind: "assetScene",
    canvas: [300, 150],
    items: [tunnel, train],
    segments: [[4, 124, 296, 124]],
    dims: [
      hDim(
        sx(tunnel, "tunnel", at(tunnel, "tunnel", "mouth")),
        sx(tunnel, "tunnel", at(tunnel, "tunnel", "tail")),
        30,
        `${tunnelLen} m`,
      ),
      hDim(
        sx(train, "train-side", 3),
        sx(train, "train-side", 176),
        78,
        `${trainLen} m`,
      ),
    ],
    labels: [{ x: sx(tunnel, "tunnel", 100), y: 143, text: "터널" }],
  };
}

/** 원뿔 모양 그릇 — 반지름은 가로 치수, 높이는 세로 치수(글자는 선 옆). */
function coneCupScene(radius: number, height: number): AssetScene {
  const cupW = 92;
  const cup = place("cup-cone", 66, cupW, { y: 24 });
  const rimY = sy(cup, "cup-cone", at(cup, "cup-cone", "rim"));
  const apexY = sy(cup, "cup-cone", at(cup, "cup-cone", "apex"));
  const cenX = sx(cup, "cup-cone", at(cup, "cup-cone", "cx"));
  const edgeX = sx(
    cup,
    "cup-cone",
    at(cup, "cup-cone", "cx") + at(cup, "cup-cone", "rx"),
  );
  const h = vDim(cenX + 62, rimY, apexY, `${height} cm`, 16);
  return {
    version: "elem-1",
    kind: "assetScene",
    canvas: [240, 156],
    items: [cup],
    segments: [[cenX, rimY, cenX, apexY, "dash"]],
    dims: [hDim(cenX, edgeX, rimY - 14, `${radius} cm`), h.dim],
    labels: [h.label],
  };
}

// ── 유형 ────────────────────────────────────────────────────────────

export const M1_REAL: TypeEntry[] = [
  /**
   * 정비례 활용 — 기차가 다리를 완전히 지나는 경우.
   * ❶ $y=ax$ 로 놓고 (x0, y0) 로 $a$(=속력)를 구한다 ❷ 다리+기차 만큼 달린다.
   */
  def(
    "1-1",
    "정비례와 반비례",
    "04",
    "정비례 관계 의 활용",
    SEC.정비례,
    "응용",
    (rng) =>
      attempt(80, () => {
        const speed = intBetween(rng, 12, 30); // 초속 m — 정비례 상수 a
        const t = intBetween(rng, 14, 40); // 정답(초)
        const trainLen = intBetween(rng, 6, 20) * 10;
        const bridgeLen = speed * t - trainLen;
        if (bridgeLen < 200 || bridgeLen % 5 !== 0) return null;
        const x0 = intBetween(rng, 4, 9);
        const y0 = speed * x0;
        if (x0 === t) return null;
        return {
          content:
            `오른쪽 그림과 같이 길이가 $${trainLen}$ m인 기차가 길이가 $${bridgeLen}$ m인 다리를 지나려고 한다. ` +
            `이 기차가 일정한 속력으로 달릴 때 $x$초 동안 달린 거리를 $y$ m라 하면 $y$는 $x$에 정비례하고, ` +
            `이 기차는 $${x0}$초 동안 $${y0}$ m를 달렸다. ` +
            `이 기차가 다리를 완전히 지나는 데 몇 초가 걸리는지 구하시오.`,
          answer: `$${t}$초`,
          solution:
            `$y$가 $x$에 정비례하므로 $y=ax$로 놓으면 $${y0}=a\\times ${x0}$에서 $a=${speed}$이다.\n` +
            `즉 $y=${speed}x$이므로 이 기차는 $1$초에 $${speed}$ m씩 달린다.\n` +
            `기차가 다리를 완전히 지나려면 $(${bridgeLen}+${trainLen})=${bridgeLen + trainLen}$ (m)를 달려야 하므로\n` +
            `$${speed}x=${bridgeLen + trainLen}$에서 $x=${t}$이다. 따라서 $${t}$초가 걸린다.`,
          facts: { trainLen, bridgeLen, x0, y0, speed, t },
          figureSpec: trainBridgeScene(trainLen, bridgeLen),
        };
      }),
  ),

  /**
   * 반비례 활용 — 기차가 터널을 완전히 지나는 경우.
   * 달릴 거리(터널+기차)가 일정하므로 (속력)×(시간)이 일정 → $y=\dfrac{a}{x}$.
   */
  def(
    "1-1",
    "정비례와 반비례",
    "14",
    "반비례 관계 의 활용",
    SEC.반비례,
    "응용",
    (rng) =>
      attempt(80, () => {
        const speed = intBetween(rng, 12, 32); // 초속 m
        const t = intBetween(rng, 20, 60); // 정답(초)
        const trainLen = intBetween(rng, 8, 20) * 10;
        const tunnelLen = speed * t - trainLen;
        if (tunnelLen < 300 || tunnelLen > 1600 || tunnelLen % 10 !== 0) {
          return null;
        }
        return {
          content:
            `오른쪽 그림과 같이 길이가 $${trainLen}$ m인 기차가 길이가 $${tunnelLen}$ m인 터널을 완전히 지나려고 한다. ` +
            `이 기차의 속력을 초속 $x$ m, 터널을 완전히 지나는 데 걸리는 시간을 $y$초라 하면 $y$는 $x$에 반비례한다. ` +
            `이 기차가 초속 $${speed}$ m로 달릴 때, 터널을 완전히 지나는 데 몇 초가 걸리는지 구하시오.`,
          answer: `$${t}$초`,
          solution:
            `기차가 터널을 완전히 지나려면 $(${tunnelLen}+${trainLen})=${tunnelLen + trainLen}$ (m)를 달려야 한다.\n` +
            `$($속력$)\\times($시간$)=${tunnelLen + trainLen}$로 일정하므로 $y=\\dfrac{${tunnelLen + trainLen}}{x}$이다.\n` +
            `$x=${speed}$를 대입하면 $y=\\dfrac{${tunnelLen + trainLen}}{${speed}}=${t}$이다. 따라서 $${t}$초가 걸린다.`,
          facts: { trainLen, tunnelLen, speed, t },
          figureSpec: trainTunnelScene(trainLen, tunnelLen),
        };
      }),
  ),

  /**
   * 원뿔 모양의 그릇에 물 채우기 — (그릇의 부피) ÷ (물을 채우는 속력).
   * RPM 1-2 p132 유형 18 의 구조 그대로(수치·소재는 새로 만든 것).
   */
  def(
    "1-2",
    "입체도형의 겉넓이와 부피",
    "18",
    "원뿔 모양의 그릇에 담긴 물의 부피",
    SEC.뿔,
    "응용",
    (rng) =>
      attempt(80, () => {
        const radius = pick(rng, [3, 6, 9, 12] as const);
        const height = pick(rng, [6, 9, 12, 15, 18, 21] as const);
        const rate = pick(rng, [2, 3, 4, 6, 8, 9, 12] as const); // 1분에 rate·π cm³
        const vol = radius * radius * height; // 부피 = (vol/3)·π
        if (vol % (3 * rate) !== 0) return null;
        const t = vol / (3 * rate);
        if (t < 4 || t > 90) return null;
        return {
          content:
            `오른쪽 그림과 같이 밑면인 원의 반지름의 길이가 $${radius}$ cm, 높이가 $${height}$ cm인 ` +
            `원뿔 모양의 빈 그릇이 있다. 이 그릇에 $1$분에 $${rate}\\pi$ cm$^{3}$씩 물을 넣을 때, ` +
            `물을 가득 채우는 데 몇 분이 걸리는지 구하시오. (단, 그릇의 두께는 생각하지 않는다.)`,
          answer: `$${t}$분`,
          solution:
            `그릇의 부피는 $\\dfrac{1}{3}\\times\\pi\\times ${radius}^{2}\\times ${height}=${vol / 3}\\pi$ (cm$^{3}$)이다.\n` +
            `$1$분에 $${rate}\\pi$ cm$^{3}$씩 넣으므로 걸리는 시간은 $${vol / 3}\\pi\\div ${rate}\\pi=${t}$ (분)이다.`,
          facts: { radius, height, rate, t },
          figureSpec: coneCupScene(radius, height),
        };
      }),
  ),
];
