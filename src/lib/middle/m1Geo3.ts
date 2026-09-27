/**
 * 중1 「원과 부채꼴」 — RPM 1-2 «원과 부채꼴»(01~08·11~18, 16유형)
 * + «도수분포표와 상대도수» 09(일부가 보이지 않는 도수분포다각형, 1유형).
 *
 * 09·10(원의 둘레와 넓이·부채꼴의 호의 길이와 넓이 기본 공식)은 이미
 * `m1Book2.ts` 에 등록돼 있다 — 여기서는 건드리지 않는다.
 *
 * ## 그림 — FigureSpec v2 (물결 6 실렌더 판정, `wave6-geometry-sheet` 근거)
 * `on_circle` 점은 엔진이 수학각(반시계 증가)으로 좌표를 계산해 준다 —
 * 빌더는 «수학 좌표」를 그대로 쓰면 된다(y-down 보정은 엔진이 한다).
 * v2 에 `midpoint` 점 종류가 없어, 아르벨로스·정사각형 그림처럼 원의 중심이
 * 필요하면 좌표를 **직접 계산**한다(양 끝이 좌표여야 한다).
 *
 * ## 09 (도수분포다각형, 09-figure-engine-guide 보류 목록)
 * `freqPolygon` kind 는 `hidden`(찢긴 자국)을 못 받는다 — `_stat_chart` 가
 * `kind === "histogram"` 일 때만 그 값을 본다(`ADV_OPTIONAL.freqPolygon` 에도
 * 키 자체가 없다). 엔진(scripts/figure/*)은 이번 물결에 6E 만 만지므로, 그
 * 제약을 고치지 않고 **표(table)** 로 대체한다 — 09-figure-engine-guide 의
 * 「일부가 보이지 않는 상대도수의 분포표」(m1StatFig.ts 14번)와 같은 자리다.
 * 「다각형과 가로축으로 둘러싸인 부분의 넓이」(08 유형의 넓이 공식)를 단서로
 * 얹어, «표가 찢겼다»는 문장과 «다각형의 넓이로 총합을 구한다»는 풀이가
 * 08·06 유형의 개념을 그대로 쓰게 했다 — 지어낸 그림이 아니라 다른 표현이다.
 *
 * ## 생성 규칙 (m2GeoQuad.ts 와 동일 계약)
 * 정답을 먼저 뽑고 발문을 역산한다. `facts` 에 원 수치를 남겨 테스트가
 * **독립 재계산**한다. 숫자는 전부 `$...$` 안. 그림의 각·표시는 **주어진 것만**
 * 찍는다 — 묻는 값을 미리 그리면 그림이 답을 말해 버린다(09 §2.2 규칙①).
 */
import { intBetween, pick } from "../elementary/rng";
import { drawScale } from "../figure/drawScale";
import type { Rng } from "../elementary/types";

import { piTerm } from "./m1Shared";
import { attempt as attemptStat, def as defStat, obj } from "./m1Stat";
import type { Body as StatBody } from "./m1Stat";
import type { MidProblem, TypeEntry } from "./types";
import { eulReul } from "./m2Josa";

const GRADE = "중1";
const BOOK = "1-2";
const MINOR = "원과 부채꼴";
const MINOR_STAT = "도수분포표와 상대도수";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측). */
const SEC = {
  기본: "원과 부채꼴",
  응용: "부채꼴의 호의 길이와 넓이",
} as const;

type XY = [number, number];
type Fig = Record<string, unknown>;
type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** attempt — 조건을 만족할 때까지 다시 뽑는다. 소진되면 던진다. */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

function def(
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${MINOR}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: MINOR,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor: MINOR,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

/** 원 위의 점 — FigureSpec v2 `on_circle` (기본 원 이름 "c"). */
function onCircle(deg: number, circle = "c"): Fig {
  return { type: "on_circle", circle, angle: r2(deg) };
}

/**
 * 서로 다른 색인 `count` 개를 오름차순으로 뽑는다 (m2GeoQuad.ts 와 동일 규약).
 * 「중복이면 다시 뽑기」는 씨앗이 달라도 앞쪽 색인이 편중된다 — Fisher–Yates.
 */
function distinctIndices(rng: Rng, total: number, count: number): number[] {
  if (count > total) throw new Error("뽑을 개수가 전체보다 많습니다");
  const bag = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }
  return bag.slice(0, count).sort((a, b) => a - b);
}

/** 보기 기호 — 발문에 ㄱ·ㄴ·… 으로 늘어놓는다. */
const BOGI = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ"] as const;

// ═══════════════════════════════════════════════════════════════════
//  명제 은행 — 01·07 (그림 없이 성립)
// ═══════════════════════════════════════════════════════════════════

/**
 * «원과 부채꼴」 뜻·성질 명제. 테스트가 **자기 표**로 같은 판정을 다시 세운다
 * (동어반복 방지) — 여기 값을 고치면 테스트가 빨개진다.
 */
export const SECTOR01_CLAIMS: readonly (readonly [string, boolean])[] = [
  ["원 위의 두 점을 이은 선분을 현이라 한다.", true],
  ["원 위의 두 점을 양 끝으로 하는 원의 일부분을 호라 한다.", true],
  ["두 반지름과 호로 이루어진 도형을 부채꼴이라 한다.", true],
  ["현과 호로 이루어진 도형을 활꼴이라 한다.", true],
  ["원의 중심을 지나는 현은 그 원에서 가장 긴 현이다.", true],
  ["부채꼴의 중심각의 크기가 $180^\\circ$이면 그 부채꼴은 반원이다.", true],
  ["한 원에서 크기가 같은 두 중심각에 대한 호의 길이는 다를 수 있다.", false],
  ["한 원에서 길이가 같은 두 현에 대한 중심각의 크기는 다를 수 있다.", false],
  ["부채꼴과 활꼴이 같아지는 경우는 중심각이 $180^\\circ$일 때뿐이다.", true],
  ["한 원에서 중심각의 크기가 $2$배가 되면 현의 길이도 $2$배가 된다.", false],
  ["한 원에서 중심각의 크기가 $2$배가 되면 호의 길이도 $2$배가 된다.", true],
  ["지름은 원의 중심을 지나는 현이다.", true],
] as const;

/** 부채꼴의 중심각의 크기에 정비례하는 것 — 07 유형이 쓰는 판별 표. */
export const SECTOR07_CLAIMS: readonly (readonly [string, boolean])[] = [
  ["호의 길이", true],
  ["부채꼴의 넓이", true],
  ["현의 길이", false],
  ["삼각형 $OAB$의 넓이", false],
  ["부채꼴의 둘레의 길이", false],
  ["활꼴의 넓이", false],
] as const;

// ═══════════════════════════════════════════════════════════════════
//  그림 빌더
// ═══════════════════════════════════════════════════════════════════

/** 02·05 — 두 부채꼴의 중심각·호(또는 넓이) 비례. `labelSecondAsX` 면 두 번째
 * 중심각을 구하는 문항이라 숫자 대신 「x°」로 적는다(묻는 값을 그리지 않는다). */
function figTwoSectors(a: number, x: number, labelSecondAsX: boolean): Fig {
  return {
    version: 2,
    points: {
      O1: [58, 60],
      A: onCircle(160, "c1"),
      B: onCircle(160 - a, "c1"),
      O2: [190, 60],
      C: onCircle(20, "c2"),
      D: onCircle(20 + x, "c2"),
    },
    circles: {
      c1: { center: "O1", radius: 55 },
      c2: { center: "O2", radius: 55 },
    },
    segments: {
      O1A: ["O1", "A"],
      O1B: ["O1", "B"],
      O2C: ["O2", "C"],
      O2D: ["O2", "D"],
    },
    angles: {
      angA: { vertex: "O1", points: ["A", "B"], label: `${a}°` },
      angC: {
        vertex: "O2",
        points: ["C", "D"],
        label: labelSecondAsX ? "x°" : `${x}°`,
      },
    },
    labels: { O1: "O", A: "A", B: "B", O2: "O", C: "C", D: "D" },
  };
}

/** 03 — 원의 둘레를 세 점으로 나눈 세 중심각. 값은 안 적는다(비만 발문이 말한다). */
function figThreeSplit(p: number, q: number, total: number): Fig {
  const angAB = (360 * p) / total;
  const angBC = (360 * q) / total;
  return {
    version: 2,
    points: {
      O: [95, 90],
      A: onCircle(90),
      B: onCircle(90 - angAB),
      C: onCircle(90 - angAB - angBC),
    },
    circles: { c: { center: "O", radius: 70 } },
    segments: { OA: ["O", "A"], OB: ["O", "B"], OC: ["O", "C"] },
    labels: { O: "O", A: "A", B: "B", C: "C" },
  };
}

/** 04 — 평행한 두 현 AB∥CD. 호 AC=호 BD 정리(보조선) — 각·수치는 안 적는다. */
function figParallelChords(alpha: number, beta: number): Fig {
  return {
    version: 2,
    points: {
      O: [95, 90],
      A: onCircle(alpha),
      B: onCircle(180 - alpha),
      C: onCircle(-beta),
      D: onCircle(180 + beta),
    },
    circles: { c: { center: "O", radius: 70 } },
    segments: {
      AB: { points: ["A", "B"], parallel: 1 },
      CD: { points: ["C", "D"], parallel: 1 },
    },
    labels: { O: "O", A: "A", B: "B", C: "C", D: "D" },
  };
}

/** 06 갈래0 — 같은 중심각 θ 를 공유하는 두 현. 반지름 tick 만 찍는다. */
function figChordCompare(theta: number): Fig {
  return {
    version: 2,
    points: {
      O: [95, 90],
      A: onCircle(20),
      B: onCircle(20 + theta),
      C: onCircle(200),
      D: onCircle(200 + theta),
    },
    circles: { c: { center: "O", radius: 70 } },
    segments: {
      OA: { points: ["O", "A"], ticks: 1 },
      OB: { points: ["O", "B"], ticks: 1 },
      OC: { points: ["O", "C"], ticks: 1 },
      OD: { points: ["O", "D"], ticks: 1 },
      AB: ["A", "B"],
      CD: ["C", "D"],
    },
    labels: { O: "O", A: "A", B: "B", C: "C", D: "D" },
  };
}

/** 06 갈래1 — 중심각 60°(정삼각형) 특수 사례. */
function figChordEquilateral(): Fig {
  return {
    version: 2,
    points: { O: [90, 100], A: onCircle(0), B: onCircle(60) },
    circles: { c: { center: "O", radius: 70 } },
    segments: { OA: ["O", "A"], OB: ["O", "B"], AB: ["A", "B"] },
    angles: { angO: { vertex: "O", points: ["A", "B"], label: "60°" } },
    labels: { O: "O", A: "A", B: "B" },
  };
}

/** 08 — 지름 AB + CB=OB(정삼각형). 각은 derive 값이라 안 찍고 tick 만. */
function figEquilateralArc(): Fig {
  return {
    version: 2,
    points: { O: [95, 90], B: onCircle(0), A: onCircle(180), C: onCircle(60) },
    circles: { c: { center: "O", radius: 70 } },
    segments: {
      AB: ["A", "B"],
      OC: { points: ["O", "C"], ticks: 1 },
      OB: { points: ["O", "B"], ticks: 1 },
      CB: { points: ["C", "B"], ticks: 1 },
    },
    labels: { O: "O", A: "A", B: "B", C: "C" },
  };
}

/** 11 — 부채꼴 색칠(wave6-geometry-sheet `s_sector()` 그대로). */
function figSectorShaded(x: number): Fig {
  return {
    version: 2,
    points: { O: [95, 90], A: onCircle(0), B: onCircle(x) },
    circles: { c: { center: "O", radius: 70 } },
    segments: { OA: ["O", "A"], OB: ["O", "B"] },
    arcs: { ab: { circle: "c", from: "A", to: "B", dir: "ccw" } },
    regions: {
      shade: {
        boundary: [
          { seg: ["O", "A"] },
          { arc: { circle: "c", from: "A", to: "B", dir: "ccw" } },
          { seg: ["B", "O"] },
        ],
        fill: "#e8eef8",
      },
    },
    angles: { t: { vertex: "O", points: ["A", "B"], label: `${x}°` } },
    labels: { O: "O", A: "A", B: "B" },
  };
}

/** 반지름 `r1`~`r2`, 벌어짐 `x`도인 부채꼴이 **실제로 차지하는 상자의 대각선**. */
function sectorSpan(r1: number, r2: number, x: number): number {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of [r1, r2]) {
    for (let t = 0; t <= x; t += 1) {
      xs.push(r * Math.cos((t * Math.PI) / 180));
      ys.push(r * Math.sin((t * Math.PI) / 180));
    }
  }
  return Math.hypot(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  );
}

/**
 * 12·13 — 동심 부채꼴 사이(도넛 부채꼴). 반지름을 지면 배율로 키워 시각을
 * 확보한다(수치 그대로는 지름이 몇십 px 라 안 보인다 — 지면 비율 자체는
 * 두 반지름 모두 같은 배율을 쓰므로 그림 속에서도 참이다).
 */
function figAnnulus(r1: number, r2: number, x: number): Fig {
  // ⚠️ **지름이 아니라 «실제로 그려지는 크기»로 맞춘다.** $45°$ 부채꼴은 원의
  //    1/8 만 차지하므로 지름을 150 으로 맞추면 지면에서는 그 절반뿐이다
  //    (실측: 도형 지름이 글자의 3.8배 — RPM 은 10 안팎). 호 위의 점들을 훑어
  //    **부채꼴이 실제로 차지하는 상자**를 재고 그 대각선을 목표로 삼는다.
  const SCALE = drawScale(sectorSpan(r1, r2, x));
  return {
    version: 2,
    points: {
      O: [30, 100],
      A1: onCircle(0, "inner"),
      B1: onCircle(x, "inner"),
      A2: onCircle(0, "outer"),
      B2: onCircle(x, "outer"),
    },
    circles: {
      inner: { center: "O", radius: r1 * SCALE, draw: false },
      outer: { center: "O", radius: r2 * SCALE, draw: false },
    },
    segments: { A1A2: ["A1", "A2"], B1B2: ["B1", "B2"] },
    arcs: {
      outerArc: { circle: "outer", from: "A2", to: "B2", dir: "ccw" },
      innerArc: { circle: "inner", from: "B1", to: "A1", dir: "cw" },
    },
    regions: {
      shade: {
        boundary: [
          { seg: ["A1", "A2"] },
          { arc: { circle: "outer", from: "A2", to: "B2", dir: "ccw" } },
          { seg: ["B2", "B1"] },
          { arc: { circle: "inner", from: "B1", to: "A1", dir: "cw" } },
        ],
        fill: "#e8eef8",
      },
    },
    labels: { O: "O", A1: "A", B1: "B", A2: "C", B2: "D" },
  };
}

/**
 * 14 — 아르벨로스. 세 반원이 모두 기준선 위(같은 쪽)로 볼록하다. 세 점이
 * 전부 raw 좌표라 중심을 직접 계산한다(v2 에 `midpoint` 가 없다).
 * 방향은 실렌더로 확인했다 — 큰 원 A→B `cw`, 작은 원은 거꾸로 `ccw` 둘.
 */
function figArbelos(r1: number, r2: number): Fig {
  // ⚠️ 여기만 배율이 **없었다** — 지름이 그대로 14단위라 라벨(24)보다 작았다.
  //    형제 갈래는 전부 배율을 곱한다(`drawScale` 주석 참조).
  const S = drawScale(2 * r1 + 2 * r2);
  const A: XY = [0, 140];
  const C: XY = [2 * r1 * S, 140];
  const B: XY = [(2 * r1 + 2 * r2) * S, 140];
  return {
    version: 2,
    points: {
      A,
      C,
      B,
      Obig: [(r1 + r2) * S, 140],
      Osmall1: [r1 * S, 140],
      Osmall2: [(2 * r1 + r2) * S, 140],
    },
    circles: {
      big: { center: "Obig", radius: (r1 + r2) * S, draw: false },
      small1: { center: "Osmall1", radius: r1 * S, draw: false },
      small2: { center: "Osmall2", radius: r2 * S, draw: false },
    },
    segments: { AB: ["A", "B"] },
    regions: {
      shade: {
        boundary: [
          { arc: { circle: "big", from: "A", to: "B", dir: "cw" } },
          { arc: { circle: "small2", from: "B", to: "C", dir: "ccw" } },
          { arc: { circle: "small1", from: "C", to: "A", dir: "ccw" } },
        ],
        fill: "#f2d5c8",
      },
    },
    labels: { A: "A", C: "C", B: "B" },
  };
}

/**
 * 15 — 정사각형 + 두 사분원(렌즈). 방향은 실렌더로 확인했다 — 두 호 모두
 * `cw` 로 D→B, B→D 를 그으면 정사각형 안쪽으로 볼록한 렌즈가 된다.
 */
function figSquareLens(s: number): Fig {
  const SCALE = 8;
  const L = s * SCALE;
  const A: XY = [20, 20];
  const B: XY = [20, 20 + L];
  const C: XY = [20 + L, 20 + L];
  const D: XY = [20 + L, 20];
  return {
    version: 2,
    points: { A, B, C, D },
    circles: {
      cA: { center: "A", radius: L, draw: false },
      cC: { center: "C", radius: L, draw: false },
    },
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
    },
    regions: {
      shade: {
        boundary: [
          { arc: { circle: "cA", from: "D", to: "B", dir: "cw" } },
          { arc: { circle: "cC", from: "B", to: "D", dir: "cw" } },
        ],
        fill: "#eef7e6",
      },
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

/**
 * 16 — 통 n개를 묶은 벨트. 양 끝 원의 위·아래 접점만 있으면 되고 가운데
 * 원들은 장식(전부 같은 반지름이라 자동으로 접한다). 방향은 실렌더로
 * 확인했다 — 왼쪽 끝은 top→bot `ccw`(서쪽으로 볼록), 오른쪽 끝은
 * bot→top `ccw`(동쪽으로 볼록).
 */
function figBelt(n: number, r: number): Fig {
  const SCALE = 3;
  const R = r * SCALE;
  const points: Record<string, unknown> = {};
  const circles: Record<string, unknown> = {};
  for (let i = 0; i < n; i += 1) {
    points[`O${i}`] = [20 + 2 * R * i, 80];
    circles[`c${i}`] = { center: `O${i}`, radius: R };
  }
  points.topL = onCircle(90, "c0");
  points.topR = onCircle(90, `c${n - 1}`);
  points.botL = onCircle(270, "c0");
  points.botR = onCircle(270, `c${n - 1}`);
  return {
    version: 2,
    points,
    circles,
    segments: { top: ["topL", "topR"], bot: ["botL", "botR"] },
    arcs: {
      leftCap: { circle: "c0", from: "topL", to: "botL", dir: "ccw" },
      rightCap: { circle: `c${n - 1}`, from: "botR", to: "topR", dir: "ccw" },
    },
  };
}

/** 17 — 직사각형(원이 지나간 자리는 발문이 말로 설명 — 09 §2.2 규칙②). */
function figRectSimple(p: number, q: number): Fig {
  const SCALE = drawScale(Math.max(p, q));
  const w = p * SCALE;
  const h = q * SCALE;
  const A: XY = [20, 20];
  const B: XY = [20, 20 + h];
  const C: XY = [20 + w, 20 + h];
  const D: XY = [20 + w, 20];
  return {
    version: 2,
    points: { A, B, C, D },
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

/**
 * 18 — 직각삼각형이 O 를 중심으로 회전. 점 A 가 그리는 자취를 점선 호로.
 * 반지름을 픽셀 배율로 키운다 — 실측 cm 값을 그대로 쓰면(3cm 등) 직각 표시
 * 정사각형이 변보다 커서 「직각 표시가 안 들어간다」로 던진다.
 */
function figRotate(a: number, b: number, theta: number): Fig {
  const SCALE = 6;
  return {
    version: 2,
    points: {
      O: [90, 130],
      A: onCircle(0, "cA"),
      Ap: onCircle(theta, "cA"),
      B: [90, 130 - b * SCALE],
    },
    circles: { cA: { center: "O", radius: a * SCALE, draw: false } },
    segments: { OA: ["O", "A"], OB: ["O", "B"], AB: ["A", "B"] },
    arcs: {
      sweep: { circle: "cA", from: "A", to: "Ap", dir: "ccw", dash: "4 3" },
    },
    angles: { rO: { vertex: "O", points: ["A", "B"], right: true } },
    labels: { O: "O", A: "A", B: "B", Ap: "A'" },
  };
}

// ═══════════════════════════════════════════════════════════════════
//  02·05 공용 매개변수 — 정비례 비 (서로소가 아니어도 무방, 발문 값이 다르면 된다)
// ═══════════════════════════════════════════════════════════════════

const PROP_RATIOS: readonly (readonly [number, number])[] = [
  [2, 3],
  [3, 4],
  [1, 2],
  [3, 5],
  [2, 5],
  [4, 5],
  [1, 3],
  [3, 2],
  [4, 3],
  [5, 3],
];

// ⚠️ 180° 는 뺀다 — 중심각이 평각이면 두 반지름이 한 지름 위에 겹쳐
//    `angles` 표시가 「구별 안 되는 각」으로 던진다(실렌더로 드러남, 11 유형).
const NICE_ANGLES: readonly number[] = [
  30, 45, 60, 72, 90, 120, 135, 144, 150, 240, 270, 300,
];

/** 11·12 — 호의 길이 계수가 정수가 되는 (r, x) 쌍. */
function pickSectorRX(rng: Rng): { r: number; x: number } {
  return attempt(300, () => {
    const x = pick(rng, NICE_ANGLES);
    const r = intBetween(rng, 3, 18);
    return (r * x) % 180 === 0 ? { r, x } : null;
  });
}

/** 12 — 두 반지름 모두 호의 길이 계수가 정수가 되는 (r1, r2, x). */
function pickAnnulusPerimeter(rng: Rng): { r1: number; r2: number; x: number } {
  return attempt(400, () => {
    const x = pick(rng, NICE_ANGLES);
    const r1 = intBetween(rng, 3, 10);
    const r2 = intBetween(rng, r1 + 2, r1 + 14);
    if ((r1 * x) % 180 !== 0 || (r2 * x) % 180 !== 0) return null;
    return { r1, r2, x };
  });
}

/** 13 — 12 의 조건 + 넓이 계수(π 앞 정수)까지 정수가 되는 (r1, r2, x). */
function pickAnnulusArea(rng: Rng): { r1: number; r2: number; x: number } {
  return attempt(400, () => {
    const { r1, r2, x } = pickAnnulusPerimeter(rng);
    const areaCoef = ((r2 * r2 - r1 * r1) * x) / 360;
    return Number.isInteger(areaCoef) ? { r1, r2, x } : null;
  });
}

// ═══════════════════════════════════════════════════════════════════
//  유형 — 원과 부채꼴 (16유형)
// ═══════════════════════════════════════════════════════════════════

const SECTOR_TYPES: TypeEntry[] = [
  def("01", "원과 부채꼴", SEC.기본, "기본", (rng): Body => {
    const idx = distinctIndices(rng, SECTOR01_CLAIMS.length, 5);
    const x = idx.filter((i) => SECTOR01_CLAIMS[i]![1]).length;
    const lines = idx
      .map((i, k) => `${BOGI[k]}. ${SECTOR01_CLAIMS[i]![0]}`)
      .join("\n");
    const truth = idx
      .map(
        (i, k) =>
          `${BOGI[k]}. ${SECTOR01_CLAIMS[i]![1] ? "옳다" : "옳지 않다"}`,
      )
      .join("\n");
    return {
      content: `다음 보기 중 옳은 것은 모두 몇 개인지 구하시오.\n\n${lines}`,
      answer: `$${x}$개`,
      solution: `원과 부채꼴의 뜻과 성질에 따라 각 보기의 참·거짓을 살피면 다음과 같다.\n${truth}\n따라서 옳은 것은 $${x}$개이다.`,
      facts: {
        i0: idx[0]!,
        i1: idx[1]!,
        i2: idx[2]!,
        i3: idx[3]!,
        i4: idx[4]!,
        x,
      },
      figureSpec: null,
    };
  }),

  def("02", "중심각의 크기와 호의 길이", SEC.기본, "응용", (rng): Body => {
    const [a2, x2] = pick(rng, PROP_RATIOS);
    const k = pick(rng, [2, 3, 4] as const);
    const a = 10 * a2;
    const x = 10 * x2;
    const L1 = k * a2;
    const L2 = k * x2;
    const branch = intBetween(rng, 0, 1);
    if (branch === 0) {
      return {
        content: `그림과 같이 중심각의 크기가 각각 $${a}^\\circ$, $x^\\circ$인 두 부채꼴이 있다. 두 부채꼴의 호의 길이가 각각 $${L1}\\,\\mathrm{cm}$, $${L2}\\,\\mathrm{cm}$일 때, $x$의 값을 구하시오.`,
        answer: `$${x}$`,
        solution: `한 원(또는 반지름이 같은 두 원)에서 부채꼴의 호의 길이는 중심각의 크기에 정비례하므로 $${a}:x=${L1}:${L2}$이다.\n따라서 $${a}\\times${L2}=x\\times${L1}$에서 $x=${x}$이다.`,
        facts: { branch, a, x, L1, L2 },
        figureSpec: figTwoSectors(a, x, true),
      };
    }
    return {
      content: `그림과 같이 중심각의 크기가 각각 $${a}^\\circ$, $${x}^\\circ$인 두 부채꼴이 있다. 두 부채꼴의 호의 길이가 각각 $${L1}\\,\\mathrm{cm}$, $y\\,\\mathrm{cm}$일 때, $y$의 값을 구하시오.`,
      answer: `$${L2}$`,
      solution: `부채꼴의 호의 길이는 중심각의 크기에 정비례하므로 $${a}:${x}=${L1}:y$이다.\n따라서 $${a}\\times y=${x}\\times${L1}$에서 $y=${L2}$이다.`,
      facts: { branch, a, x, L1, L2 },
      figureSpec: figTwoSectors(a, x, false),
    };
  }),

  def(
    "03",
    "호의 길이의 비가 주어질 때 중심각의 크기 구하기",
    SEC.기본,
    "응용",
    (rng): Body =>
      attempt(300, (): Body | null => {
        const total = pick(rng, [6, 8, 9, 10, 12, 15, 18] as const);
        const p = intBetween(rng, 1, total - 4);
        const q = intBetween(rng, 1, total - p - 2);
        const r = total - p - q;
        if (r < 1) return null;
        // 비는 **가장 간단한 자연수의 비**로 준다 — 「$8:2:2$」(씨앗 1,000 중 18.6%,
        // 2026-09-27). 두 항이 같은 것($2:2:5$)은 이등변 꼴이라 둔다. 통과율 78.2%(전수)
        // — 300번이면 던질 확률 $10^{-199}$.
        if (gcd(gcd(p, q), r) !== 1) return null;
        const target = intBetween(rng, 0, 2) as 0 | 1 | 2;
        const vals = [p, q, r] as const;
        const x = (360 * vals[target]) / total;
        if (!Number.isInteger(x)) return null;
        const names = ["AOB", "BOC", "COA"] as const;
        return {
          content: `그림과 같이 원 O의 둘레 위의 세 점 A, B, C에 대하여 호 AB, 호 BC, 호 CA의 길이의 비가 $${p}:${q}:${r}$이다. $\\angle ${names[target]}$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `한 원에서 호의 길이는 중심각의 크기에 정비례하므로 세 중심각의 비도 $${p}:${q}:${r}$이다.\n따라서 $\\angle ${names[target]}=360^\\circ\\times\\dfrac{${vals[target]}}{${p}+${q}+${r}}=${x}^\\circ$이다.`,
          facts: { p, q, r, total, target, x },
          figureSpec: figThreeSplit(p, q, total),
        };
      }),
  ),

  def("04", "보조선을 그어 호의 길이 구하기", SEC.기본, "심화하", (rng): Body =>
    attempt(200, (): Body | null => {
      const x = intBetween(rng, 6, 20);
      const c1 = intBetween(rng, 1, 4);
      const c2 = pick(
        rng,
        [1, 2, 3, 4].filter((v) => v !== c1),
      );
      const big = Math.max(c1, c2);
      const V = intBetween(rng, big * x + 5, big * x + 40);
      const off1 = V - c1 * x;
      const off2 = V - c2 * x;
      if (Math.abs(off1) > 60 || Math.abs(off2) > 60) return null;
      const expr = (c: number, off: number) =>
        `${c}x${off === 0 ? "" : off > 0 ? `+${off}` : `${off}`}`;
      const alpha = intBetween(rng, 35, 60);
      const beta = intBetween(rng, 20, 55);
      return {
        content: `그림과 같이 원 O에서 $\\overline{AB}\\parallel\\overline{CD}$이고 호 AC의 길이는 $${expr(c1, off1)}$, 호 BD의 길이는 $${expr(c2, off2)}$이다. $x$의 값을 구하시오.`,
        answer: `$${x}$`,
        solution: `점 $A$, $B$에서 각각 $\\overline{CD}$에 수선을 내리면 생기는 두 직각삼각형이 합동임을 이용하면(보조선), 평행한 두 현이 원 위에 만드는 호는 그 길이가 같음을 알 수 있다 — 즉 호 $AC=$호 $BD$이다.\n$${expr(c1, off1)}=${expr(c2, off2)}$${eulReul(off2)} 정리하면 $x=${x}$이다.`,
        facts: { c1, off1, c2, off2, x, alpha, beta },
        figureSpec: figParallelChords(alpha, beta),
      };
    }),
  ),

  def("05", "중심각의 크기와 부채꼴의 넓이", SEC.기본, "응용", (rng): Body => {
    const [a2, x2] = pick(rng, PROP_RATIOS);
    const k = pick(rng, [2, 3, 4] as const);
    const a = 10 * a2;
    const x = 10 * x2;
    const S1 = k * a2;
    const S2 = k * x2;
    const branch = intBetween(rng, 0, 1);
    if (branch === 0) {
      return {
        content: `그림과 같이 중심각의 크기가 각각 $${a}^\\circ$, $x^\\circ$인 두 부채꼴이 있다. 두 부채꼴의 넓이가 각각 $${S1}\\,\\mathrm{cm}^2$, $${S2}\\,\\mathrm{cm}^2$일 때, $x$의 값을 구하시오.`,
        answer: `$${x}$`,
        solution: `한 원(또는 반지름이 같은 두 원)에서 부채꼴의 넓이는 중심각의 크기에 정비례하므로 $${a}:x=${S1}:${S2}$이다.\n따라서 $${a}\\times${S2}=x\\times${S1}$에서 $x=${x}$이다.`,
        facts: { branch, a, x, S1, S2 },
        figureSpec: figTwoSectors(a, x, true),
      };
    }
    return {
      content: `그림과 같이 중심각의 크기가 각각 $${a}^\\circ$, $${x}^\\circ$인 두 부채꼴이 있다. 두 부채꼴의 넓이가 각각 $${S1}\\,\\mathrm{cm}^2$, $y\\,\\mathrm{cm}^2$일 때, $y$의 값을 구하시오.`,
      answer: `$${S2}$`,
      solution: `부채꼴의 넓이는 중심각의 크기에 정비례하므로 $${a}:${x}=${S1}:y$이다.\n따라서 $${a}\\times y=${x}\\times${S1}$에서 $y=${S2}$이다.`,
      facts: { branch, a, x, S1, S2 },
      figureSpec: figTwoSectors(a, x, false),
    };
  }),

  def("06", "중심각의 크기와 현의 길이", SEC.기본, "응용", (rng): Body => {
    const branch = intBetween(rng, 0, 1);
    if (branch === 0) {
      return attempt(200, (): Body | null => {
        const x = intBetween(rng, 5, 25);
        const c1 = pick(rng, [1, 2, 3] as const);
        const c2 = pick(
          rng,
          [1, 2, 3].filter((v) => v !== c1),
        );
        const big = Math.max(c1, c2);
        const V = intBetween(rng, big * x + 3, big * x + 30);
        const off1 = V - c1 * x;
        const off2 = V - c2 * x;
        if (Math.abs(off1) > 40 || Math.abs(off2) > 40) return null;
        const theta = intBetween(rng, 50, 110);
        const expr = (c: number, off: number) =>
          `${c}x${off === 0 ? "" : off > 0 ? `+${off}` : `${off}`}`;
        return {
          content: `그림과 같이 원 O에서 $\\angle AOB=\\angle COD$이고 $\\overline{AB}=(${expr(c1, off1)})\\,\\mathrm{cm}$, $\\overline{CD}=(${expr(c2, off2)})\\,\\mathrm{cm}$일 때, $x$의 값을 구하시오.`,
          answer: `$${x}$`,
          solution: `한 원에서 크기가 같은 두 중심각에 대한 현의 길이는 같으므로 $\\overline{AB}=\\overline{CD}$이다.\n$${expr(c1, off1)}=${expr(c2, off2)}$${eulReul(off2)} 정리하면 $x=${x}$이다.`,
          facts: { branch, c1, off1, c2, off2, x, theta },
          figureSpec: figChordCompare(theta),
        };
      });
    }
    const r = intBetween(rng, 4, 15);
    return {
      content: `그림과 같이 원 O에서 $\\overline{OA}=\\overline{OB}=${r}\\,\\mathrm{cm}$이고 $\\angle AOB=60^\\circ$일 때, $\\overline{AB}$의 길이를 구하시오.`,
      answer: `$${r}\\,\\mathrm{cm}$`,
      solution: `$\\overline{OA}=\\overline{OB}$이므로 삼각형 $OAB$는 이등변삼각형이고 $\\angle AOB=60^\\circ$이므로 나머지 두 밑각의 크기도 각각 $60^\\circ$이다.\n따라서 삼각형 $OAB$는 정삼각형이므로 $\\overline{AB}=\\overline{OA}=${r}\\,(\\mathrm{cm})$이다.`,
      // sixty — 그림의 「60°」 라벨(고정된 주어진 값)을 facts 에도 남긴다.
      // 씨앗마다 변하지 않지만, 그림 라벨은 항상 facts 로 추적 가능해야 한다.
      facts: { branch, r, sixty: 60 },
      figureSpec: figChordEquilateral(),
    };
  }),

  def("07", "중심각의 크기에 정비례하는 것", SEC.기본, "응용", (rng): Body => {
    const count = intBetween(rng, 4, SECTOR07_CLAIMS.length);
    const idx = distinctIndices(rng, SECTOR07_CLAIMS.length, count);
    const x = idx.filter((i) => SECTOR07_CLAIMS[i]![1]).length;
    const lines = idx
      .map((i, k) => `${BOGI[k]}. ${SECTOR07_CLAIMS[i]![0]}`)
      .join("\n");
    const truth = idx
      .map(
        (i, k) =>
          `${BOGI[k]}. ${SECTOR07_CLAIMS[i]![1] ? "정비례한다" : "정비례하지 않는다"}`,
      )
      .join("\n");
    return {
      content: `다음 보기 중 부채꼴의 중심각의 크기에 정비례하는 것은 모두 몇 개인지 구하시오.\n\n${lines}`,
      answer: `$${x}$개`,
      solution: `중심각의 크기에 정비례하는 것은 호의 길이와 부채꼴의 넓이뿐이다. 각 보기를 살피면 다음과 같다.\n${truth}\n따라서 정비례하는 것은 $${x}$개이다.`,
      facts: {
        n: count,
        i0: idx[0]!,
        i1: idx[1]!,
        i2: idx[2]!,
        i3: idx[3]!,
        i4: idx[4] ?? -1,
        i5: idx[5] ?? -1,
        x,
      },
      figureSpec: null,
    };
  }),

  def(
    "08",
    "도형의 성질을 이용하여 호의 길이 구하기",
    SEC.기본,
    "응용",
    (rng): Body => {
      const k = intBetween(rng, 2, 8);
      const r = 3 * k;
      const coef = 2 * k;
      return {
        content: `그림과 같이 원 O에서 $\\overline{AB}$는 원 O의 지름이고, 호 $AB$ 위의 점 $C$에 대하여 $\\overline{CB}=\\overline{OB}$이다. 반지름의 길이가 $${r}\\,\\mathrm{cm}$일 때, 호 $AC$의 길이를 구하시오.`,
        answer: `$${coef}\\pi\\,\\mathrm{cm}$`,
        solution: `$\\overline{OC}=\\overline{OB}=\\overline{CB}$(반지름·주어진 조건)이므로 삼각형 $OCB$는 정삼각형이고 $\\angle COB=60^\\circ$이다.\n$\\overline{AB}$가 지름이므로 $\\angle AOB=180^\\circ$이고, $\\angle AOC=180^\\circ-60^\\circ=120^\\circ$이다.\n따라서 호 $AC$의 길이는 $2\\pi\\times${r}\\times\\dfrac{120}{360}=${coef}\\pi\\,(\\mathrm{cm})$이다.`,
        facts: { k, r, coef },
        figureSpec: figEquilateralArc(),
      };
    },
  ),

  def(
    "11",
    "부채꼴에서 색칠한 부분의 둘레의 길이와 넓이",
    SEC.응용,
    "응용",
    (rng): Body => {
      const { r, x } = pickSectorRX(rng);
      const arcCoef = (r * x) / 180;
      const areaCoef = (r * r * x) / 360;
      return {
        content: `그림과 같이 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 중심각의 크기가 $${x}^\\circ$인 부채꼴 $OAB$가 있다. 이 부채꼴의 둘레의 길이와 넓이를 차례대로 구하시오.`,
        answer: `둘레의 길이 $(${2 * r}+${piTerm(arcCoef)})\\,\\mathrm{cm}$, 넓이 $${piTerm(areaCoef)}\\,\\mathrm{cm}^2$`,
        solution: `호의 길이는 $2\\pi\\times${r}\\times\\dfrac{${x}}{360}=${piTerm(arcCoef)}\\,(\\mathrm{cm})$이다.\n둘레의 길이는 반지름 두 개와 호의 길이의 합이므로 $2\\times${r}+${piTerm(arcCoef)}=(${2 * r}+${piTerm(arcCoef)})\\,(\\mathrm{cm})$이다.\n넓이는 $\\pi\\times${r}^{2}\\times\\dfrac{${x}}{360}=${piTerm(areaCoef)}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { r, x, arcCoef, areaCoef },
        figureSpec: figSectorShaded(x),
      };
    },
  ),

  def("12", "색칠한 부분의 둘레의 길이", SEC.응용, "응용", (rng): Body => {
    const { r1, r2, x } = pickAnnulusPerimeter(rng);
    const outerCoef = (r2 * x) / 180;
    const innerCoef = (r1 * x) / 180;
    const straight = 2 * (r2 - r1);
    const arcSum = outerCoef + innerCoef;
    return {
      content: `그림과 같이 중심이 같고 반지름의 길이가 각각 $${r1}\\,\\mathrm{cm}$, $${r2}\\,\\mathrm{cm}$인 두 부채꼴이 크기가 $${x}^\\circ$로 같은 중심각을 공유한다. 색칠한 부분의 둘레의 길이를 구하시오.`,
      answer: `$(${straight}+${piTerm(arcSum)})\\,\\mathrm{cm}$`,
      solution: `큰 부채꼴의 호의 길이는 $2\\pi\\times${r2}\\times\\dfrac{${x}}{360}=${piTerm(outerCoef)}\\,(\\mathrm{cm})$, 작은 부채꼴의 호의 길이는 $2\\pi\\times${r1}\\times\\dfrac{${x}}{360}=${piTerm(innerCoef)}\\,(\\mathrm{cm})$이다.\n색칠한 부분의 둘레의 길이는 두 호의 길이의 합과 두 반지름의 차의 $2$배의 합이므로 $${piTerm(outerCoef)}+${piTerm(innerCoef)}+2\\times(${r2}-${r1})=(${straight}+${piTerm(arcSum)})\\,(\\mathrm{cm})$이다.`,
      facts: { r1, r2, x, outerCoef, innerCoef, straight, arcSum },
      figureSpec: figAnnulus(r1, r2, x),
    };
  }),

  def("13", "색칠한 부분의 넓이 (1)", SEC.응용, "응용", (rng): Body => {
    const { r1, r2, x } = pickAnnulusArea(rng);
    const areaCoef = ((r2 * r2 - r1 * r1) * x) / 360;
    return {
      content: `그림과 같이 중심이 같고 반지름의 길이가 각각 $${r1}\\,\\mathrm{cm}$, $${r2}\\,\\mathrm{cm}$인 두 부채꼴이 크기가 $${x}^\\circ$로 같은 중심각을 공유한다. 색칠한 부분의 넓이를 구하시오.`,
      answer: `$${areaCoef}\\pi\\,\\mathrm{cm}^2$`,
      solution: `색칠한 부분의 넓이는 큰 부채꼴의 넓이에서 작은 부채꼴의 넓이를 뺀 것이므로 $\\pi\\times${r2}^{2}\\times\\dfrac{${x}}{360}-\\pi\\times${r1}^{2}\\times\\dfrac{${x}}{360}=${areaCoef}\\pi\\,(\\mathrm{cm}^2)$이다.`,
      facts: { r1, r2, x, areaCoef },
      figureSpec: figAnnulus(r1, r2, x),
    };
  }),

  def("14", "색칠한 부분의 넓이 (2)", SEC.응용, "응용", (rng): Body => {
    const r1 = intBetween(rng, 2, 9);
    const r2 = intBetween(rng, 2, 9);
    const areaCoef = r1 * r2;
    return {
      content: `그림과 같이 $\\overline{AB}$를 지름으로 하는 큰 반원 안에 $\\overline{AC}=${2 * r1}\\,\\mathrm{cm}$, $\\overline{CB}=${2 * r2}\\,\\mathrm{cm}$를 각각 지름으로 하는 두 반원을 그렸다. 색칠한 부분(아르벨로스)의 넓이를 구하시오.`,
      answer: `$${areaCoef}\\pi\\,\\mathrm{cm}^2$`,
      solution: `큰 반원의 반지름은 $${r1 + r2}\\,\\mathrm{cm}$, 작은 두 반원의 반지름은 각각 $${r1}\\,\\mathrm{cm}$, $${r2}\\,\\mathrm{cm}$이다.\n색칠한 부분의 넓이는 큰 반원의 넓이에서 작은 두 반원의 넓이를 뺀 것이므로 $\\dfrac{1}{2}\\pi\\times(${r1 + r2})^{2}-\\dfrac{1}{2}\\pi\\times${r1}^{2}-\\dfrac{1}{2}\\pi\\times${r2}^{2}=${areaCoef}\\pi\\,(\\mathrm{cm}^2)$이다.`,
      facts: { r1, r2, areaCoef },
      figureSpec: figArbelos(r1, r2),
    };
  }),

  def("15", "색칠한 부분의 넓이 (3)", SEC.응용, "응용", (rng): Body => {
    const s = 2 * intBetween(rng, 3, 10);
    const half = (s * s) / 2;
    const sq = s * s;
    return {
      content: `그림과 같이 한 변의 길이가 $${s}\\,\\mathrm{cm}$인 정사각형 $ABCD$에서 두 꼭짓점 $A$, $C$를 중심으로 하고 반지름의 길이가 $${s}\\,\\mathrm{cm}$인 부채꼴을 각각 그렸다. 색칠한 부분(두 부채꼴이 겹치는 부분)의 넓이를 구하시오.`,
      answer: `$(${half}\\pi-${sq})\\,\\mathrm{cm}^2$`,
      solution: `두 부채꼴의 넓이의 합은 $2\\times\\dfrac{1}{4}\\pi\\times${s}^{2}=${half}\\pi\\,(\\mathrm{cm}^2)$이다.\n이 합은 정사각형의 넓이에 색칠한 부분(겹치는 부분)의 넓이를 한 번 더 더한 것과 같으므로, 색칠한 부분의 넓이는 두 부채꼴의 넓이의 합에서 정사각형의 넓이를 뺀 것이다.\n정사각형의 넓이는 $${s}\\times${s}=${sq}\\,(\\mathrm{cm}^2)$이므로 색칠한 부분의 넓이는 $(${half}\\pi-${sq})\\,\\mathrm{cm}^2$이다.`,
      facts: { s, half, sq },
      figureSpec: figSquareLens(s),
    };
  }),

  def("16", "끈의 길이", SEC.응용, "응용", (rng): Body => {
    const n = intBetween(rng, 2, 4);
    const r = intBetween(rng, 3, 10);
    const straight = 4 * r * (n - 1);
    return {
      content: `그림과 같이 반지름의 길이가 $${r}\\,\\mathrm{cm}$로 같은 원 모양의 통 $${n}$개를 서로 닿게 이어 놓고 끈으로 팽팽하게 묶었다. 매듭에 필요한 길이는 생각하지 않을 때, 끈의 길이를 구하시오.`,
      answer: `$(${straight}+${2 * r}\\pi)\\,\\mathrm{cm}$`,
      solution: `끈의 곧은 부분은 원 $${n}$개가 나란히 놓인 폭 $${2 * r * (n - 1)}\\,\\mathrm{cm}$가 위·아래 두 군데이므로 $2\\times${2 * r * (n - 1)}=${straight}\\,(\\mathrm{cm})$이다.\n끈의 굽은 부분은 양 끝 통에서 반원씩(합하면 원 하나)이므로 $2\\pi\\times${r}=${2 * r}\\pi\\,(\\mathrm{cm})$이다.\n따라서 끈의 길이는 $(${straight}+${2 * r}\\pi)\\,\\mathrm{cm}$이다.`,
      facts: { n, r, straight },
      figureSpec: figBelt(n, r),
    };
  }),

  def("17", "원이 지나간 자리의 넓이", SEC.응용, "응용", (rng): Body => {
    // 표준 결과로 채택 — 「(직사각형 바깥으로 반지름 r 만큼 부푼 둥근 사각형)
    // − (원래 직사각형)」로 독립 재도출해 확인했다: (p+2r)(q+2r)+πr² − pq
    // = 2r(p+q) + πr². 종이/화이트보드 재검증은 안 했으나 두 방법(둘레×반지름
    // + 모서리 부채꼴 넷 / 부푼 사각형 차)이 같은 식으로 귀결되는 것을 확인했다.
    // 가로와 세로가 같으면 「가로 $9$cm, 세로 $9$cm인 직사각형」 — 정사각형을 직사각형이라
    // 부르는 꼴이다(씨앗 1,000 중 11.6%, 2026-09-27). 그림(`figRectSimple`)도 같은 두 값을
    // 그리므로 함께 맞는다. 통과율 88.9% — 100번이면 던질 확률 $0.111^{100}\approx10^{-96}$.
    const [p, q] = attempt(100, () => {
      const p = intBetween(rng, 4, 12);
      const q = intBetween(rng, 4, 12);
      return p === q ? null : ([p, q] as const);
    });
    const r = intBetween(rng, 1, 5);
    const linCoef = 2 * r * (p + q);
    const piCoef = r * r;
    return {
      content: `그림과 같이 가로의 길이가 $${p}\\,\\mathrm{cm}$, 세로의 길이가 $${q}\\,\\mathrm{cm}$인 직사각형 $ABCD$의 둘레를 반지름의 길이가 $${r}\\,\\mathrm{cm}$인 원이 한 바퀴 돌 때, 원이 지나간 자리의 넓이를 구하시오. (단, 원은 직사각형의 바깥쪽을 돈다.)`,
      answer: `$(${linCoef}+${piTerm(piCoef)})\\,\\mathrm{cm}^2$`,
      solution: `원이 지나간 자리는 직사각형의 네 변을 따라 생기는 폭 $${r}\\,\\mathrm{cm}$인 직사각형 넷과, 네 꼭짓점에서 생기는 부채꼴 넷(모으면 반지름 $${r}\\,\\mathrm{cm}$인 원 하나)으로 이루어진다.\n네 변을 따라 생기는 부분의 넓이의 합은 (반지름)$\\times$(직사각형의 둘레)$=${r}\\times2\\times(${p}+${q})=${linCoef}\\,(\\mathrm{cm}^2)$이다.\n네 꼭짓점에서 생기는 부채꼴의 넓이의 합은 $\\pi\\times${r}^{2}=${piTerm(piCoef)}\\,(\\mathrm{cm}^2)$이다.\n따라서 원이 지나간 자리의 넓이는 $(${linCoef}+${piTerm(piCoef)})\\,\\mathrm{cm}^2$이다.`,
      facts: { p, q, r, linCoef, piCoef },
      figureSpec: figRectSimple(p, q),
    };
  }),

  def("18", "도형을 회전시켰을 때 움직인 거리", SEC.응용, "응용", (rng): Body =>
    attempt(200, (): Body | null => {
      const a = intBetween(rng, 3, 15);
      const theta = pick(rng, [60, 90, 120, 150, 180] as const);
      if ((a * theta) % 180 !== 0) return null;
      const b = intBetween(rng, 3, 15);
      const coef = (a * theta) / 180;
      return {
        content: `그림과 같이 $\\angle O=90^\\circ$인 직각삼각형 $OAB$에서 $\\overline{OA}=${a}\\,\\mathrm{cm}$, $\\overline{OB}=${b}\\,\\mathrm{cm}$이다. 이 삼각형을 점 $O$를 중심으로 반시계 방향으로 $${theta}^\\circ$만큼 회전시킬 때, 점 $A$가 움직인 거리를 구하시오.`,
        answer: `$${piTerm(coef)}\\,\\mathrm{cm}$`,
        solution: `점 $A$는 점 $O$를 중심으로 반지름이 $\\overline{OA}=${a}\\,\\mathrm{cm}$인 원 위를 움직이므로 그 이동 거리는 $2\\pi\\times${a}\\times\\dfrac{${theta}}{360}=${piTerm(coef)}\\,(\\mathrm{cm})$이다.`,
        facts: { a, b, theta, coef },
        figureSpec: figRotate(a, b, theta),
      };
    }),
  ),
];

// ═══════════════════════════════════════════════════════════════════
//  유형 09 — 도수분포표와 상대도수 「일부가 보이지 않는 도수분포다각형」
// ═══════════════════════════════════════════════════════════════════

type StatTopic = {
  subject: string;
  head: string;
  lo: number;
  w: number;
};

const STAT_TOPICS: readonly StatTopic[] = [
  { subject: "통학 시간", head: "시간(분)", lo: 10, w: 10 },
  { subject: "몸무게", head: "몸무게(kg)", lo: 30, w: 10 },
  { subject: "제자리멀리뛰기 기록", head: "기록(cm)", lo: 140, w: 10 },
  { subject: "윗몸일으키기 횟수", head: "횟수(회)", lo: 0, w: 10 },
];

/** 표 칸 라벨 — 2열 표는 폭이 남아 교과서 표기를 그대로 쓴다(09 §4-24). 표는
 * KaTeX 를 안 거치는 날 텍스트라 `$...$` 를 넣으면 안 된다(달러 기호가 그대로 찍힌다). */
function bandTableLabel(t: StatTopic, i: number): string {
  return i === 0
    ? `${t.lo}이상~${t.lo + t.w}미만`
    : `${t.lo + i * t.w} ~ ${t.lo + (i + 1) * t.w}`;
}

/** 발문 문장에 쓰는 계급 구간 — 표와 달리 KaTeX 를 거치므로 수는 `$...$` 로 감싼다. */
function bandContentPhrase(t: StatTopic, i: number): string {
  const lo = t.lo + i * t.w;
  const hi = lo + t.w;
  return `$${lo}$ 이상 $${hi}$ 미만`;
}

function statTableSpec(
  t: StatTopic,
  rows: readonly (readonly string[])[],
): MidProblem["figureSpec"] {
  return {
    version: "elem-1",
    kind: "table",
    headers: [t.head, "도수(명)"],
    rows: rows.map((r) => [...r]),
  };
}

const STAT_TYPE: TypeEntry = defStat(
  MINOR_STAT,
  "09",
  "일부가 보이지 않는 도수분포다각형",
  "도수분포다각형",
  "응용",
  (rng) =>
    attemptStat(200, (): StatBody | null => {
      const t = pick(rng, STAT_TOPICS);
      const n = pick(rng, [4, 5] as const);
      const values = Array.from({ length: n }, () => intBetween(rng, 2, 12));
      const total = values.reduce((s, v) => s + v, 0);
      const area = t.w * total;
      const h = intBetween(rng, 0, n - 1);
      const rows = values.map((v, i) => [
        bandTableLabel(t, i),
        i === h ? "" : String(v),
      ]);
      const spec = statTableSpec(t, rows);
      const head = `다음은 어느 반 학생들의 ${obj(t.subject)} 조사하여 나타낸 도수분포표인데 일부가 찢어져 보이지 않는다. 이 자료를 도수분포다각형으로 나타내면 다각형과 가로축으로 둘러싸인 부분의 넓이가 $${area}$이다.`;
      const factsBase: Record<string, number> = {
        lo: t.lo,
        w: t.w,
        n,
        h,
        area,
        total,
      };
      values.forEach((v, i) => {
        factsBase[`f${i}`] = v;
      });

      const branch = intBetween(rng, 0, 1);
      const band = bandContentPhrase(t, h);
      if (branch === 0) {
        return {
          content: `${head} ${band}인 계급의 도수를 구하시오.`,
          answer: `$${values[h]}$명`,
          solution: `도수분포다각형과 가로축으로 둘러싸인 부분의 넓이는 (계급의 크기)$\\times$(도수의 총합)과 같으므로 도수의 총합은 $${area}\\div${t.w}=${total}$이다.\n보이는 계급의 도수의 합은 $${total - values[h]!}$이므로 구하는 도수는 $${total}-${total - values[h]!}=${values[h]}$(명)이다.`,
          facts: { ...factsBase, branch, ans: values[h]! },
          figureSpec: spec,
        };
      }
      return {
        content: `${head} 조사한 학생은 모두 몇 명인지 구하시오.`,
        answer: `$${total}$명`,
        solution: `도수분포다각형과 가로축으로 둘러싸인 부분의 넓이는 (계급의 크기)$\\times$(도수의 총합)이므로 도수의 총합은 $${area}\\div${t.w}=${total}$이다.`,
        facts: { ...factsBase, branch, ans: total },
        figureSpec: spec,
      };
    }),
);

export const M1_GEO3: TypeEntry[] = [...SECTOR_TYPES, STAT_TYPE];
