/**
 * 중2 「사각형의 성질」 — RPM 2-2 «여러 가지 사각형»(01~12·17).
 *
 * 2B 물결(v2 마크 문법: 같음 tick·평행 »·이중 호·직각 기호)이 열어 준 유형들이다.
 * 앞 물결(2A)이 «마크가 없어 못 그린다»며 `m2GeoTri.ts` 머리 주석의 2B 대기
 * 목록에 번호로 남겨 둔 것을 여기서 낸다. 같은 중단원의 13~16(평행선과 삼각형의
 * 넓이)은 이미 `m2GeoTri.ts` 에 있다 — 우리 단원이 «평행선과 삼각형의 넓이»라
 * 그쪽에 붙은 것이고, 이 파일은 «직사각형, 마름모, 정사각형»·«등변사다리꼴,
 * 여러 가지 사각형» 두 단원을 맡는다.
 *
 * ## 생성 규칙 — 정답을 먼저 뽑고 발문을 역산한다 (m1LinearApply 와 동일 계약)
 *
 * 각은 정수로 뽑아 답이 항상 정수다. 길이·넓이도 정수로 떨어지게 역산한다.
 * `facts` 에 발문의 원 수치를 남겨 테스트가 조건식을 **독립 재계산**한다.
 * 숫자는 전부 `$...$` 안.
 *
 * ## 그림 규약
 *
 * 사각형 꼭짓점 배치는 RPM 지면과 같다 — **A 왼쪽 위 · B 왼쪽 아래 ·
 * C 오른쪽 아래 · D 오른쪽 위**. 그림의 각·길이 비는 발문의 실제 값으로
 * 계산한다(09 §4-20). 마크는 **주어진 것만** 찍는다 — 결론(예: 이등변)을
 * 미리 찍으면 그림이 답을 말해 버린다.
 */
import { intBetween } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { withDims } from "./figureDims";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-2";
const MINOR = "여러 가지 사각형";

/** 우리 `Unit.section` 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC = {
  직사각형류: "직사각형, 마름모, 정사각형",
  등변사다리꼴: "등변사다리꼴, 여러 가지 사각형",
  평삼넓이: "평행선과 삼각형의 넓이",
} as const;

const DEG = Math.PI / 180;

/**
 * 계수를 적는다 — $1$ 은 **안 적는다**.
 *
 * 지면에 `$1x=7$` 이 나가도 값은 맞고 KaTeX 도 초록이라 값 검산이 구조적으로
 * 못 본다. 실제로 02·04·06 이 `p=2` 일 때 그렇게 나가고 있었고, 새 소단원이
 * 지면 훑개(`midPage`)에 붙는 순간 드러났다(2026-08-27).
 */
function coefTex(c: number): string {
  if (c === 1) return "";
  if (c === -1) return "-";
  return String(c);
}

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

type XY = [number, number];
type Fig = Record<string, unknown>;

/** 수학 좌표(y-위) → SVG 좌표(y-아래), 220×190 균일 배율 (m2GeoTri 와 동일 규약). */
function fitPts(pts: Record<string, XY>): Record<string, XY> {
  const xs = Object.values(pts).map((p) => p[0]);
  const ys = Object.values(pts).map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const m = 18;
  const s = Math.min(
    (220 - 2 * m) / Math.max(maxX - minX, 1e-9),
    (190 - 2 * m) / Math.max(maxY - minY, 1e-9),
  );
  const out: Record<string, XY> = {};
  for (const [k, [x, y]] of Object.entries(pts)) {
    out[k] = [r2(m + (x - minX) * s), r2(190 - m - (y - minY) * s)];
  }
  return out;
}

/** attempt — 조건을 만족할 때까지 다시 뽑는다. 소진되면 던진다. */
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

// ── 도형 ────────────────────────────────────────────────────────────────

/** RPM 배치의 직사각형 네 꼭짓점 (A 왼위 · B 왼아래 · C 오른아래 · D 오른위). */
function rectPts(w: number, h: number): Record<string, XY> {
  return { A: [0, h], B: [0, 0], C: [w, 0], D: [w, h] };
}

/**
 * 직사각형 + 두 대각선의 반쪽 넷 — 반쪽마다 tick 하나로 «네 조각이 같다»를 보인다.
 * 대각선을 통짜로 그리지 않고 O 에서 끊어야 tick 을 붙일 수 있다.
 */
function figRect01(w: number, h: number, angA?: number): Fig {
  const pts = rectPts(w, h);
  pts.O = [w / 2, h / 2];
  const angles: Record<string, unknown> = {
    rB: { vertex: "B", points: ["A", "C"], right: true },
  };
  if (angA !== undefined) {
    angles.angA = { vertex: "A", points: ["B", "O"], label: `${angA}°` };
  }
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
      AO: { points: ["A", "O"], ticks: 1 },
      OC: { points: ["O", "C"], ticks: 1 },
      BO: { points: ["B", "O"], ticks: 1 },
      OD: { points: ["O", "D"], ticks: 1 },
    },
    angles,
    labels: { A: "A", B: "B", C: "C", D: "D", O: "O" },
  };
}

/** 평행사변형 + 두 대각선 — 대변에 평행 » (한 쌍 1개, 다른 쌍 2개). */
function figPara(w: number, h: number, slant: number, withDiag: boolean): Fig {
  const pts: Record<string, XY> = {
    A: [slant, h],
    B: [0, 0],
    C: [w, 0],
    D: [w + slant, h],
  };
  if (withDiag) pts.O = [(w + slant) / 2, h / 2];
  // ⚠️ 평행 » 는 **방향이 같아야** 한 쌍으로 읽힌다. B→C 와 D→A 처럼 반대로
  //    적으면 지면에서 화살촉이 서로 마주 본다(실렌더로 드러났다).
  const segments: Record<string, unknown> = {
    AB: { points: ["A", "B"], parallel: 2 },
    DC: { points: ["D", "C"], parallel: 2 },
    BC: { points: ["B", "C"], parallel: 1 },
    AD: { points: ["A", "D"], parallel: 1 },
  };
  const labels: Record<string, string> = { A: "A", B: "B", C: "C", D: "D" };
  if (withDiag) {
    segments.AO = ["A", "O"];
    segments.OC = ["O", "C"];
    segments.BO = ["B", "O"];
    segments.OD = ["O", "D"];
    labels.O = "O";
  }
  return { version: 2, points: fitPts(pts), segments, labels };
}

/** 마름모 (A 위 · B 왼 · C 아래 · D 오른) — 네 변 tick, 두 대각선 직교. */
function figRhombus(
  p: number,
  q: number,
  angles: Record<string, unknown>,
): Fig {
  const pts: Record<string, XY> = {
    A: [0, q],
    B: [-p, 0],
    C: [0, -q],
    D: [p, 0],
    O: [0, 0],
  };
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: { points: ["A", "B"], ticks: 1 },
      BC: { points: ["B", "C"], ticks: 1 },
      CD: { points: ["C", "D"], ticks: 1 },
      DA: { points: ["D", "A"], ticks: 1 },
      AO: ["A", "O"],
      OC: ["O", "C"],
      BO: ["B", "O"],
      OD: ["O", "D"],
    },
    angles: {
      rO: { vertex: "O", points: ["A", "D"], right: true },
      ...angles,
    },
    labels: { A: "A", B: "B", C: "C", D: "D", O: "O" },
  };
}

/** 정사각형 + 두 대각선 — 네 변 tick·한 꼭짓점 직각. `acLabel` 은 대각선 치수. */
function figSquareDiag(s: number, acLabel?: string): Fig {
  const pts: Record<string, XY> = { ...rectPts(s, s), O: [s / 2, s / 2] };
  const labels: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    O: "O",
  };
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: { points: ["A", "B"], ticks: 1 },
      BC: { points: ["B", "C"], ticks: 1 },
      CD: { points: ["C", "D"], ticks: 1 },
      DA: { points: ["D", "A"], ticks: 1 },
      AO: ["A", "O"],
      OC: ["O", "C"],
      BO: ["B", "O"],
      OD: ["O", "D"],
    },
    angles: {
      rB: { vertex: "B", points: ["A", "C"], right: true },
      rO: { vertex: "O", points: ["A", "B"], right: true },
    },
    labels,
  };
  return withDims(shape, { AC: acLabel }) as Fig;
}

/** 정사각형 ABCD + 대각선 AC 위의 점 E + BE·DE — ∠BEC 를 표시한다. */
function figSquarePoint05(b: number): Fig {
  const s = 130;
  const ae = (s * Math.sin((b - 45) * DEG)) / Math.sin(b * DEG);
  const t = ae / (s * Math.SQRT2);
  const pts: Record<string, XY> = {
    ...rectPts(s, s),
    E: [r2(t * s), r2(s - t * s)],
  };
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: { points: ["A", "B"], ticks: 1 },
      BC: { points: ["B", "C"], ticks: 1 },
      CD: { points: ["C", "D"], ticks: 1 },
      DA: { points: ["D", "A"], ticks: 1 },
      AE: ["A", "E"],
      EC: ["E", "C"],
      BE: ["B", "E"],
      DE: ["D", "E"],
    },
    angles: {
      rB: { vertex: "B", points: ["A", "C"], right: true },
      angE: { vertex: "E", points: ["B", "C"], label: `${b}°` },
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E" },
  };
}

/**
 * 등변사다리꼴 (AD∥BC) — 윗변·아랫변에 평행 », 평행하지 않은 두 변에 tick.
 * `foot` 을 주면 D 에서 BC 에 내린 수선의 발 H 와 직각 기호를 함께 그린다.
 */
function figIsoTrap(
  top: number,
  bottom: number,
  height: number,
  opts: {
    foot?: boolean;
    diagBD?: boolean;
    angA?: string;
    angB?: string;
    angADB?: string;
    labels?: Record<string, string>;
  },
): Fig {
  const off = (bottom - top) / 2;
  const pts: Record<string, XY> = {
    A: [off, height],
    B: [0, 0],
    C: [bottom, 0],
    D: [off + top, height],
  };
  const segments: Record<string, unknown> = {
    AD: { points: ["A", "D"], parallel: 1 },
    AB: { points: ["A", "B"], ticks: 1 },
    DC: { points: ["D", "C"], ticks: 1 },
  };
  const angles: Record<string, unknown> = {};
  const labels: Record<string, string> = { A: "A", B: "B", C: "C", D: "D" };

  if (opts.foot) {
    pts.H = [off + top, 0];
    segments.BH = { points: ["B", "H"], parallel: 1 };
    segments.HC = ["H", "C"];
    segments.DH = ["D", "H"];
    angles.rH = { vertex: "H", points: ["C", "D"], right: true };
    labels.H = "H";
  } else {
    segments.BC = { points: ["B", "C"], parallel: 1 };
  }
  if (opts.diagBD) segments.BD = ["B", "D"];
  if (opts.angA !== undefined) {
    // Type08's A=120°: keep the mark and text inside, away from given AD/AB dimensions.
    // This bounded layout is checked on all54 original (top, leg) pairs with real metrics.
    angles.angA = { vertex: "A", points: ["B", "D"], radius: 14,
      label_distance: 30, label: opts.angA };
  }
  if (opts.angB !== undefined) {
    angles.angB = { vertex: "B", points: ["A", "C"], label: opts.angB };
  }
  if (opts.angADB !== undefined) {
    angles.angADB = { vertex: "D", points: ["A", "B"], label: opts.angADB };
  }
  // 앵커 이름(`top`·`ch`…)은 두 점 이름이 아니다 — 어느 변인지는 이 표만 안다.
  // `ch` 는 수선의 발 H 가 있을 때만 성립한다(`opts.foot`).
  const PAIR: Record<string, string> = {
    top: "AD",
    bottom: "BC",
    left: "AB",
    right: "DC",
    ch: "HC",
  };
  const dims: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(opts.labels ?? {})) {
    const pair = PAIR[k];
    if (!pair) continue;
    // 끝점이 없으면 `withDims` 가 던진다 — 없는 자리는 조용히 건너뛴다.
    if (!pts[pair.slice(0, 1)] || !pts[pair.slice(1)]) continue;
    dims[pair] = v;
  }
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments,
    angles,
    labels,
  };
  return withDims(shape, dims) as Fig;
}

/**
 * 사다리꼴 (AD∥BC) — **등변이 아닌** 배치. 「등변사다리꼴이 되는 조건」을 물을 때
 * 다리가 같은 그림을 그리면 그림이 답을 말해 버린다. tick 도 없다.
 */
function figTrap(
  top: number,
  bottom: number,
  height: number,
  leftOff: number,
  opts: { diagAC?: boolean; diagBD?: boolean },
): Fig {
  const pts: Record<string, XY> = {
    A: [leftOff, height],
    B: [0, 0],
    C: [bottom, 0],
    D: [leftOff + top, height],
  };
  const segments: Record<string, unknown> = {
    AD: { points: ["A", "D"], parallel: 1 },
    BC: { points: ["B", "C"], parallel: 1 },
    AB: ["A", "B"],
    DC: ["D", "C"],
  };
  if (opts.diagAC) {
    segments.AC = ["A", "C"];
  }
  if (opts.diagBD) {
    segments.BD = ["B", "D"];
  }
  return {
    version: 2,
    points: fitPts(pts),
    segments,
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

/**
 * 등변사다리꼴 (AD∥BC) + **두 대각선과 그 교점 O**.
 *
 * ⚠️ 대각선을 통짜로 긋지 않고 **반쪽 넷**(AO·OC·BO·OD)으로 끊는다 — O 를
 *    점으로 세우려면 거기서 끊어야 한다. 그러면 ∠DBC 의 광선 BD 를 덮는
 *    선분이 없어지므로 각은 `BO` 로 가리킨다(`figMidSquare09` 주석의 그 검사).
 *
 * 🔴 **대각선의 치수는 여기에 안 적는다** (2026-08-29, 실물 렌더로 드러났다).
 *    $\overline{AC}=35$ 를 대각선 옆에 놓았더니 배치기가 그것을 오른쪽 변
 *    바깥으로 밀어 지면에서 **$\overline{DC}=35$ 로 읽혔다.** $\overline{OB}$ 도
 *    같은 식으로 밑변 옆에 앉아 $\overline{BC}$ 처럼 보였다. 대각선은 변과 달리
 *    «옆에 놓을 바깥쪽»이 없다 — 어느 쪽으로 밀어도 다른 변이 먼저 있다.
 *    값 검산·KaTeX·렌더 성공 여부가 **셋 다 초록**인 채로 지면만 거짓말한다.
 *    그래서 치수는 발문에만 두고 그림은 **배치**(꼭짓점 이름·평행·교점)만 말한다.
 *
 * O 의 자리는 «중점»이 아니다 — 두 대각선의 교점은 대칭축 위에서 아랫변:윗변
 * 으로 높이를 내분한다. 그것을 여기서 **한 번만** 계산한다.
 */
function figIsoTrapDiags(
  top: number,
  bottom: number,
  height: number,
  opts: { angDBC?: string },
): Fig {
  const off = (bottom - top) / 2;
  const oy = r2((height * bottom) / (bottom + top));
  const pts: Record<string, XY> = {
    A: [off, height],
    B: [0, 0],
    C: [bottom, 0],
    D: [off + top, height],
    O: [r2(bottom / 2), oy],
  };
  const angles: Record<string, unknown> = {};
  const labels: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    O: "O",
  };
  if (opts.angDBC !== undefined) {
    angles.angDBC = { vertex: "B", points: ["O", "C"], label: opts.angDBC };
  }
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AD: { points: ["A", "D"], parallel: 1 },
      BC: { points: ["B", "C"], parallel: 1 },
      AB: { points: ["A", "B"], ticks: 1 },
      DC: { points: ["D", "C"], ticks: 1 },
      AO: ["A", "O"],
      OC: ["O", "C"],
      BO: ["B", "O"],
      OD: ["O", "D"],
    },
    angles,
    labels,
  };
}

/** 정사각형 각 변 위에 AE=BF=CG=DH — 네 조각에 tick, 안쪽 사각형 EFGH. */
function figMidSquare09(s: number, t: number): Fig {
  const pts: Record<string, XY> = {
    ...rectPts(s, s),
    E: [0, s - t],
    F: [t, 0],
    G: [s, t],
    H: [s - t, s],
  };
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AE: { points: ["A", "E"], ticks: 1 },
      EB: ["E", "B"],
      BF: { points: ["B", "F"], ticks: 1 },
      FC: ["F", "C"],
      CG: { points: ["C", "G"], ticks: 1 },
      GD: ["G", "D"],
      DH: { points: ["D", "H"], ticks: 1 },
      HA: ["H", "A"],
      EF: ["E", "F"],
      FG: ["F", "G"],
      GH: ["G", "H"],
      HE: ["H", "E"],
    },
    // ⚠️ AB·BC 를 E·F 에서 끊었으므로 ∠ABC 는 «한 선분이 덮는 광선»이 없다.
    //    같은 직각을 EB·BF 로 가리킨다(엔진이 광선 덮임을 검사한다).
    angles: { rB: { vertex: "B", points: ["E", "F"], right: true } },
    labels: {
      A: "A",
      B: "B",
      C: "C",
      D: "D",
      E: "E",
      F: "F",
      G: "G",
      H: "H",
    },
  };
}

/** 네 변의 중점을 이은 사각형 — 반쪽마다 tick 으로 «중점»을 보인다. */
function figMidpointQuad(
  kind: "square" | "rhombus",
  a: number,
  b: number,
): Fig {
  const pts: Record<string, XY> =
    kind === "square"
      ? rectPts(a, a)
      : { A: [0, b], B: [-a, 0], C: [0, -b], D: [a, 0] };
  const mid = (p: XY, q: XY): XY => [
    r2((p[0] + q[0]) / 2),
    r2((p[1] + q[1]) / 2),
  ];
  pts.P = mid(pts.A!, pts.B!);
  pts.Q = mid(pts.B!, pts.C!);
  pts.R = mid(pts.C!, pts.D!);
  pts.S = mid(pts.D!, pts.A!);
  const segments: Record<string, unknown> = {
    AP: { points: ["A", "P"], ticks: 1 },
    PB: { points: ["P", "B"], ticks: 1 },
    BQ: { points: ["B", "Q"], ticks: 2 },
    QC: { points: ["Q", "C"], ticks: 2 },
    CR: { points: ["C", "R"], ticks: 1 },
    RD: { points: ["R", "D"], ticks: 1 },
    DS: { points: ["D", "S"], ticks: 2 },
    SA: { points: ["S", "A"], ticks: 2 },
    PQ: ["P", "Q"],
    QR: ["Q", "R"],
    RS: ["R", "S"],
    SP: ["S", "P"],
  };
  if (kind === "rhombus") {
    segments.AC = ["A", "C"];
    segments.BD = ["B", "D"];
  }
  return {
    version: 2,
    points: fitPts(pts),
    segments,
    labels: {
      A: "A",
      B: "B",
      C: "C",
      D: "D",
      P: "P",
      Q: "Q",
      R: "R",
      S: "S",
    },
  };
}

/**
 * 직사각형 ABCD 에서 대각선 BD 의 수직이등분선이 AD·BC 와 만나는 점 E·F.
 * □EBFD 는 마름모다. 수직이등분선이라 O 에 직각 기호와 BO=OD tick 을 찍는다.
 */
function figPerpBisect17(
  p: number,
  h: number,
  labels: Record<string, string>,
): Fig {
  const ex = (p * p - h * h) / (2 * p);
  const fx = (p * p + h * h) / (2 * p);
  const pts: Record<string, XY> = {
    A: [0, h],
    B: [0, 0],
    C: [p, 0],
    D: [p, h],
    E: [r2(ex), h],
    F: [r2(fx), 0],
    O: [r2(p / 2), r2(h / 2)],
  };
  const out: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
    F: "F",
    O: "O",
  };
  const shape: Fig = {
    version: 2,
    points: fitPts(pts),
    segments: {
      AE: ["A", "E"],
      ED: ["E", "D"],
      AB: ["A", "B"],
      BF: ["B", "F"],
      FC: ["F", "C"],
      CD: ["C", "D"],
      BO: { points: ["B", "O"], ticks: 1 },
      OD: { points: ["O", "D"], ticks: 1 },
      EO: ["E", "O"],
      OF: ["O", "F"],
      // 마름모 EBFD 의 두 빗변 — 이것이 없으면 «마름모»가 지면에 안 보인다.
      EB: ["E", "B"],
      FD: ["F", "D"],
    },
    angles: {
      rO: { vertex: "O", points: ["D", "E"], right: true },
      rB: { vertex: "B", points: ["A", "F"], right: true },
    },
    labels: out,
  };
  return withDims(shape, { AD: labels.ad, FC: labels.fc }) as Fig;
}

// ── 명제 은행 (10·11 유형) ───────────────────────────────────────────────

/**
 * «여러 가지 사각형 사이의 관계» 명제 은행. `true` = 옳은 명제.
 * 테스트가 **자기 표**로 같은 판정을 다시 세운다(동어반복 방지) — 여기 값을
 * 고치면 테스트가 빨개진다.
 */
export const QUAD10_CLAIMS: readonly (readonly [string, boolean])[] = [
  ["평행사변형은 사다리꼴이다.", true],
  ["마름모는 직사각형이다.", false],
  ["정사각형은 마름모이다.", true],
  ["직사각형은 정사각형이다.", false],
  ["두 대각선의 길이가 같은 평행사변형은 직사각형이다.", true],
  ["두 대각선이 서로 수직인 평행사변형은 마름모이다.", true],
  ["이웃하는 두 변의 길이가 같은 직사각형은 정사각형이다.", true],
  ["한 내각의 크기가 $90^\\circ$인 마름모는 정사각형이다.", true],
  ["이웃하는 두 내각의 크기가 같은 사각형은 직사각형이다.", false],
  ["등변사다리꼴은 평행사변형이다.", false],
  ["정사각형은 직사각형이다.", true],
  ["마름모는 평행사변형이다.", true],
  ["두 대각선이 서로 다른 것을 이등분하는 사각형은 평행사변형이다.", true],
  ["평행사변형은 마름모이다.", false],
] as const;

/**
 * 사각형별 대각선 성질 — `[이름, 길이가 같다, 서로 수직이다, 서로 다른 것을 이등분한다]`.
 * 11 유형이 «개수»를 묻는 근거표다. 테스트가 같은 표를 따로 들고 대조한다.
 */
export const QUAD11_SHAPES: readonly (readonly [
  string,
  boolean,
  boolean,
  boolean,
])[] = [
  ["사다리꼴", false, false, false],
  ["평행사변형", false, false, true],
  ["직사각형", true, false, true],
  ["마름모", false, true, true],
  ["등변사다리꼴", true, false, false],
  ["정사각형", true, true, true],
] as const;

/**
 * 유형 31 이 쓰는 «$\angle A:\angle B$» 의 비 (기약).
 *
 * $\overline{AD}\parallel\overline{BC}$ 라 두 각의 합이 $180^\circ$ 다. 그래서
 * **합 $m+n$ 이 $180$ 의 약수**여야 각이 정수로 떨어진다 — 아무 비나 쓰면
 * $\angle A$ 가 소수점이 되고, 그건 에러가 아니라 지면에 그대로 나간다.
 * 그리고 $m>n$ 으로 둔다: 윗변이 짧은 보통 배치에서 $\angle A$ 가 둔각이다.
 */
const TRAP31_RATIOS: readonly (readonly [number, number])[] = [
  [2, 1],
  [3, 1],
  [3, 2],
  [5, 4],
  [7, 3],
  [7, 5],
  [8, 7],
  [11, 7],
  [11, 9],
  [13, 7],
] as const;

/** 보기 기호 — 발문에 ㄱ·ㄴ·… 으로 늘어놓는다. */
const BOGI = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ"] as const;

/**
 * 서로 다른 색인 `count` 개를 오름차순으로 뽑는다.
 * ⚠️ 「중복이면 다시 뽑기」로 하면 앞쪽 색인이 편중돼 씨앗이 달라도 같은 보기가
 *    나온다(2026-08-23 실측: 씨앗 4개 중 2쌍이 같았다). Fisher–Yates 로 섞는다.
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

/** 넓이 비에 쓰는 «서로소인» 두 수 — 기약이 아니면 해설의 분수가 약분되지 않는다. */
const RATIOS_AREA: readonly (readonly [number, number])[] = [
  [1, 1],
  [1, 2],
  [2, 1],
  [1, 3],
  [3, 1],
  [2, 3],
  [3, 2],
  [3, 4],
  [4, 3],
];

/** 23 — 사다리꼴의 두 평행한 변의 길이의 비 (짧은 쪽이 위, 서로소). */
const TRAP_SIDES: readonly (readonly [number, number])[] = [
  [1, 2],
  [2, 3],
  [3, 4],
  [2, 5],
  [3, 5],
  [4, 5],
];
/** 목록에서 하나 뽑는다 (비 목록처럼 «값을 고르는» 자리에 쓴다). */
function pick<T>(rng: Rng, xs: readonly T[]): T {
  return xs[intBetween(rng, 0, xs.length - 1)]!;
}

/**
 * 18 — 평행한 두 직선 $l$(위) · $m$(아래)과 그 사이의 삼각형 $ABC$.
 *
 * 밑변 $a$ 와 높이 $h$ 를 **발문의 실제 값으로** 그린다(09 §4-20). 두 직선에
 * 평행 » 를 찍고, $A$ 에서 $m$ 에 내린 수선의 발 $H$ 로 «두 직선 사이의 거리»를
 * 보인다 — 그 수선이 곧 삼각형의 높이라는 것이 이 유형의 성질이다.
 */
function figParLines18(a: number, h: number): Fig {
  const pts: Record<string, XY> = {
    A: [r2(a * 0.35), h],
    B: [0, 0],
    C: [a, 0],
    H: [r2(a * 0.35), 0],
    lA: [r2(-a * 0.28), h],
    lB: [r2(a * 1.34), h],
    mA: [r2(-a * 0.28), 0],
    mB: [r2(a * 1.34), 0],
  };
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      lineL: { points: ["lA", "lB"], parallel: 1 },
      lineM: { points: ["mA", "mB"], parallel: 1 },
      AB: ["A", "B"],
      AC: ["A", "C"],
      AH: ["A", "H"],
    },
    angles: { rH: { vertex: "H", points: ["A", "C"], right: true } },
    labels: {
      A: "A",
      B: "B",
      C: "C",
      H: "H",
      lB: { text: "l", italic: true },
      mB: { text: "m", italic: true },
    },
  };
}

/**
 * 19 — 삼각형 $ABC$ 와 중선 $\overline{AD}$. `mode` 1 이면 $\overline{AD}$ 의
 * 중점 $E$ 와 $\overline{BE}$ 도 그린다.
 *
 * tick 은 **주어진 것만** — 밑변의 두 조각은 1개, $\overline{AD}$ 의 두 조각은
 * 2개로 갈라 「무엇과 무엇이 같은지」가 지면에서 섞이지 않게 한다.
 */
function figMedian19(mode: number): Fig {
  const A: XY = [46, 92];
  const B: XY = [0, 0];
  const C: XY = [140, 0];
  const D: XY = [70, 0];
  const pts: Record<string, XY> = { A, B, C, D };
  const segments: Record<string, unknown> = {
    AB: ["A", "B"],
    AC: ["A", "C"],
    BD: { points: ["B", "D"], ticks: 1 },
    DC: { points: ["D", "C"], ticks: 1 },
  };
  const labels: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
  };
  if (mode === 1) {
    pts.E = [r2((A[0] + D[0]) / 2), r2((A[1] + D[1]) / 2)];
    segments.AE = { points: ["A", "E"], ticks: 2 };
    segments.ED = { points: ["E", "D"], ticks: 2 };
    segments.BE = ["B", "E"];
    labels.E = "E";
  } else {
    segments.AD = ["A", "D"];
  }
  return { version: 2, points: fitPts(pts), segments, labels };
}

/**
 * 20 — 평행사변형 $ABCD$ 와 내부의 점 $P$, 그리고 $P$ 에서 네 꼭짓점으로 그은 선.
 *
 * $P$ 를 아무 데나 찍으면 그림이 발문과 다른 말을 한다. 삼각형 $PAB$ 의 넓이가
 * $a$, 평행사변형이 $S$ 이면 $\overline{AB}$ 에서 $P$ 까지의 거리는 두 대변
 * 사이 거리의 $2a/S$ 배다 — 그 값으로 $\overline{BC}$ 방향 성분을 정한다.
 */
function figParaInner20(u: number): Fig {
  const A: XY = [34, 88];
  const B: XY = [0, 0];
  const C: XY = [130, 0];
  const D: XY = [164, 88];
  const v = 0.45;
  const P: XY = [
    r2(B[0] + u * (C[0] - B[0]) + v * (A[0] - B[0])),
    r2(B[1] + u * (C[1] - B[1]) + v * (A[1] - B[1])),
  ];
  return {
    version: 2,
    points: fitPts({ A, B, C, D, P }),
    segments: {
      AB: { points: ["A", "B"], parallel: 2 },
      DC: { points: ["D", "C"], parallel: 2 },
      BC: { points: ["B", "C"], parallel: 1 },
      AD: { points: ["A", "D"], parallel: 1 },
      PA: ["P", "A"],
      PB: ["P", "B"],
      PC: ["P", "C"],
      PD: ["P", "D"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", P: "P" },
  };
}

/** 21 — 삼각형 $ABC$ 의 밑변 위의 점 $D$ (BD:BC = `t`) 와 $\overline{AD}$. */
function figTriSplit21(t: number): Fig {
  const A: XY = [54, 94];
  const B: XY = [0, 0];
  const C: XY = [150, 0];
  return {
    version: 2,
    points: fitPts({ A, B, C, D: [r2(150 * t), 0] }),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BC: ["B", "C"],
      AD: ["A", "D"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

/**
 * 22 — 평행사변형 $ABCD$ 의 두 변 위의 점 $E$(AB 위) · $F$(BC 위)와 삼각형 $EBF$.
 *
 * `ae` 는 $\overline{AE}:\overline{AB}$, `bf` 는 $\overline{BF}:\overline{BC}$ —
 * 둘 다 발문의 비 그대로다. 변이 점으로 끊기므로 평행 » 는 찍지 않는다
 * (한쪽에만 찍히면 지면에서 짝을 잃는다).
 */
function figParaEF22(ae: number, bf: number): Fig {
  const A: XY = [34, 86];
  const B: XY = [0, 0];
  const C: XY = [140, 0];
  const D: XY = [174, 86];
  const E: XY = [r2(A[0] + ae * (B[0] - A[0])), r2(A[1] + ae * (B[1] - A[1]))];
  return {
    version: 2,
    points: fitPts({ A, B, C, D, E, F: [r2(140 * bf), 0] }),
    segments: {
      AE: ["A", "E"],
      EB: ["E", "B"],
      BF: ["B", "F"],
      FC: ["F", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
      EF: ["E", "F"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E", F: "F" },
  };
}

/**
 * 23 — $\overline{AD}\parallel\overline{BC}$ 인 사다리꼴과 두 대각선의 교점 $O$.
 *
 * `adOverBc` 는 두 평행한 변의 길이의 비다. $O$ 는 $\overline{AC}$ 를
 * $\overline{AD}:\overline{BC}$ 로 나누는 점이므로 그 값으로 찍으면 $O$ 가
 * $\overline{BD}$ 위에도 **실제로** 놓인다(테스트가 그것을 잰다).
 */
function figTrapDiag23(adOverBc: number): Fig {
  const BC = 176;
  const ad = BC * adOverBc;
  const A: XY = [r2((BC - ad) / 2 - 8), 88];
  const B: XY = [0, 0];
  const C: XY = [BC, 0];
  const D: XY = [r2(A[0] + ad), 88];
  const f = ad / (ad + BC);
  const O: XY = [r2(A[0] + f * (C[0] - A[0])), r2(A[1] + f * (C[1] - A[1]))];
  return {
    version: 2,
    points: fitPts({ A, B, C, D, O }),
    segments: {
      AD: { points: ["A", "D"], parallel: 1 },
      BC: { points: ["B", "C"], parallel: 1 },
      AB: ["A", "B"],
      DC: ["D", "C"],
      AO: ["A", "O"],
      OC: ["O", "C"],
      BO: ["B", "O"],
      OD: ["O", "D"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", O: "O" },
  };
}

/**
 * 27 — 정사각형 $ABCD$ 의 대각선 $BD$ 위의 점 $P$ 와 $\overline{PA}$·$\overline{PC}$.
 *
 * $P$ 의 자리를 «적당히» 찍으면 그림이 발문과 다른 말을 한다. $\angle PAB=a$ 이면
 * $\overline{BP}:\overline{BD}=\tan a^\circ/(1+\tan a^\circ)$ 이므로 그 값으로 찍는다.
 * 그래야 지면의 각이 발문의 각과 같다 (09 §4-20).
 *
 * `mode` 0 은 $\angle PAB$ 를, 1 은 $\angle APB$ 를 찍는다 — **주어진 것만** 찍는다.
 * $a$ 는 두 모드 모두 $\angle PAB$ 라 $P$ 의 자리는 한 식으로 정해진다.
 */
function figSquareDiagPoint27(a: number, mode: number): Fig {
  const s = 130;
  const ta = Math.tan(a * DEG);
  const t = ta / (1 + ta);
  const pts: Record<string, XY> = {
    ...rectPts(s, s),
    P: [r2(t * s), r2(t * s)],
  };
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: { points: ["A", "B"], ticks: 1 },
      BC: { points: ["B", "C"], ticks: 1 },
      CD: { points: ["C", "D"], ticks: 1 },
      DA: { points: ["D", "A"], ticks: 1 },
      BP: ["B", "P"],
      PD: ["P", "D"],
      PA: ["P", "A"],
      PC: ["P", "C"],
    },
    angles:
      mode === 0
        ? {
            rB: { vertex: "B", points: ["A", "C"], right: true },
            angA: { vertex: "A", points: ["B", "P"], label: `${a}°` },
          }
        : {
            rB: { vertex: "B", points: ["A", "C"], right: true },
            angP: {
              vertex: "P",
              points: ["A", "B"],
              label: `${135 - a}°`,
            },
          },
    labels: { A: "A", B: "B", C: "C", D: "D", P: "P" },
  };
}

// ── 유형 ────────────────────────────────────────────────────────────────

export const M2_GEO_QUAD: TypeEntry[] = [
  def("01", "직사각형의 뜻과 성질", SEC.직사각형류, "기본", (rng): Body => {
    const mode = intBetween(rng, 0, 1);
    if (mode === 0) {
      const a = intBetween(rng, 24, 66);
      const x = 180 - 2 * a;
      return {
        content: `그림과 같은 직사각형 $ABCD$에서 두 대각선의 교점을 $O$라 하자. $\\angle BAO=${a}^\\circ$일 때, $\\angle AOB$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `직사각형의 두 대각선은 길이가 같고 서로 다른 것을 이등분하므로 $\\overline{OA}=\\overline{OB}$이다.\n삼각형 $OAB$는 이등변삼각형이므로 $\\angle OBA=\\angle BAO=${a}^\\circ$이다.\n따라서 $\\angle AOB=180^\\circ-${a}^\\circ-${a}^\\circ=${x}^\\circ$이다.`,
        facts: { mode, a, x },
        figureSpec: figRect01(r2(90 * Math.tan(a * DEG)), 90, a),
      };
    }
    const r = intBetween(rng, 3, 12);
    const x = 2 * r;
    return {
      content: `그림과 같은 직사각형 $ABCD$에서 두 대각선의 교점을 $O$라 하자. $\\overline{AO}=${r}\\,\\mathrm{cm}$일 때, $\\overline{BD}$의 길이를 구하시오.`,
      answer: `$${x}\\,\\mathrm{cm}$`,
      solution: `직사각형의 두 대각선은 길이가 같고 서로 다른 것을 이등분하므로 $\\overline{AO}=\\overline{OC}=\\overline{BO}=\\overline{OD}$이다.\n따라서 $\\overline{BD}=2\\times${r}=${x}\\,(\\mathrm{cm})$이다.`,
      facts: { mode, r, x },
      figureSpec: figRect01(150, 96),
    };
  }),

  def(
    "02",
    "평행사변형이 직사각형이 되는 조건",
    SEC.직사각형류,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const p = intBetween(rng, 2, 6);
        const q = attempt(60, () => {
          const v = intBetween(rng, 2, 40);
          return (90 + v) % p === 0 ? v : null;
        });
        const x = (90 + q) / p;
        return {
          content: `평행사변형 $ABCD$에서 $\\angle A=(${p}x-${q})^\\circ$이다. $\\square ABCD$가 직사각형이 되도록 하는 $x$의 값을 구하시오.`,
          answer: `$${x}$`,
          solution: `평행사변형이 직사각형이 되려면 한 내각의 크기가 $90^\\circ$이어야 한다.\n$${p}x-${q}=90$에서 $${p}x=${90 + q}$이므로 $x=${x}$이다.`,
          facts: { mode, p, q, x },
          figureSpec: figPara(150, 92, 40, true),
        };
      }
      const p = intBetween(rng, 2, 5);
      const q = intBetween(rng, 1, 12);
      const x = attempt(60, () => {
        const v = intBetween(rng, 3, 14);
        return (p - 1) * v - q > 0 ? v : null;
      });
      const s = (p - 1) * x + q;
      const len = p * x + q;
      return {
        content: `평행사변형 $ABCD$에서 두 대각선의 길이가 $\\overline{AC}=(${p}x+${q})\\,\\mathrm{cm}$, $\\overline{BD}=(x+${s})\\,\\mathrm{cm}$이다. $\\square ABCD$가 직사각형일 때, $\\overline{AC}$의 길이를 구하시오.`,
        answer: `$${len}\\,\\mathrm{cm}$`,
        solution: `평행사변형이 직사각형이 되려면 두 대각선의 길이가 같아야 하므로 $${p}x+${q}=x+${s}$이다.\n$${coefTex(p - 1)}x=${s - q}$이므로 $x=${x}$이고, $\\overline{AC}=${p}\\times${x}+${q}=${len}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, p, q, s, x, len },
        figureSpec: figPara(150, 92, 40, true),
      };
    },
  ),

  def("03", "마름모의 뜻과 성질", SEC.직사각형류, "응용", (rng): Body => {
    const mode = intBetween(rng, 0, 1);
    if (mode === 0) {
      const a = intBetween(rng, 26, 70);
      const x = 180 - 2 * a;
      return {
        content: `그림과 같은 마름모 $ABCD$에서 $\\angle BAC=${a}^\\circ$일 때, $\\angle D$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `마름모는 네 변의 길이가 모두 같으므로 $\\overline{AB}=\\overline{BC}$이고 삼각형 $ABC$는 이등변삼각형이다.\n$\\angle BCA=\\angle BAC=${a}^\\circ$이므로 $\\angle B=180^\\circ-2\\times${a}^\\circ=${x}^\\circ$이다.\n마름모는 평행사변형이므로 $\\angle D=\\angle B=${x}^\\circ$이다.`,
        facts: { mode, a, x },
        figureSpec: figRhombus(r2(90 * Math.tan(a * DEG)), 90, {
          angA: { vertex: "A", points: ["B", "O"], label: `${a}°` },
        }),
      };
    }
    const b = intBetween(rng, 22, 62);
    const x = 180 - 2 * b;
    return {
      content: `그림과 같은 마름모 $ABCD$에서 두 대각선의 교점을 $O$라 하자. $\\angle ADB=${b}^\\circ$일 때, $\\angle BCD$의 크기를 구하시오.`,
      answer: `$${x}^\\circ$`,
      solution: `마름모의 대각선은 각을 이등분하므로 $\\angle ADC=2\\times${b}^\\circ=${2 * b}^\\circ$이다.\n마름모는 평행사변형이므로 이웃하는 두 각의 크기의 합은 $180^\\circ$이다.\n따라서 $\\angle BCD=180^\\circ-${2 * b}^\\circ=${x}^\\circ$이다.`,
      facts: { mode, b, x },
      figureSpec: figRhombus(90, r2(90 * Math.tan(b * DEG)), {
        angD: { vertex: "D", points: ["A", "O"], label: `${b}°` },
      }),
    };
  }),

  def(
    "04",
    "평행사변형이 마름모가 되는 조건",
    SEC.직사각형류,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const p = intBetween(rng, 2, 4);
        const x = intBetween(rng, 3, 8);
        const q = intBetween(rng, 1, 7);
        const s = (p - 1) * x + q;
        const side = p * x + q;
        const peri = 4 * side;
        return {
          content: `평행사변형 $ABCD$에서 $\\overline{AB}=(${p}x+${q})\\,\\mathrm{cm}$, $\\overline{BC}=(x+${s})\\,\\mathrm{cm}$이다. $\\square ABCD$가 마름모일 때, 그 둘레의 길이를 구하시오.`,
          answer: `$${peri}\\,\\mathrm{cm}$`,
          solution: `평행사변형이 마름모가 되려면 이웃하는 두 변의 길이가 같아야 하므로 $${p}x+${q}=x+${s}$이다.\n$${coefTex(p - 1)}x=${s - q}$이므로 $x=${x}$이고 한 변의 길이는 $${side}\\,\\mathrm{cm}$이다.\n따라서 둘레의 길이는 $4\\times${side}=${peri}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, p, q, s, x, side, peri },
          figureSpec: figPara(140, 92, 46, false),
        };
      }
      const p = intBetween(rng, 2, 6);
      const q = attempt(60, () => {
        const v = intBetween(rng, 2, 40);
        return 90 - v > 0 && (90 - v) % p === 0 ? v : null;
      });
      const x = (90 - q) / p;
      return {
        content: `평행사변형 $ABCD$에서 두 대각선의 교점을 $O$라 할 때 $\\angle AOB=(${p}x+${q})^\\circ$이다. $\\square ABCD$가 마름모가 되도록 하는 $x$의 값을 구하시오.`,
        answer: `$${x}$`,
        solution: `평행사변형이 마름모가 되려면 두 대각선이 서로 수직이어야 하므로 $\\angle AOB=90^\\circ$이다.\n$${p}x+${q}=90$에서 $${p}x=${90 - q}$이므로 $x=${x}$이다.`,
        facts: { mode, p, q, x },
        figureSpec: figPara(140, 92, 46, true),
      };
    },
  ),

  def("05", "정사각형의 뜻과 성질", SEC.직사각형류, "응용", (rng): Body => {
    const mode = intBetween(rng, 0, 1);
    if (mode === 0) {
      const d = 2 * intBetween(rng, 3, 11);
      const x = (d * d) / 2;
      return {
        content: `그림과 같은 정사각형 $ABCD$에서 대각선 $AC$의 길이가 $${d}\\,\\mathrm{cm}$일 때, $\\square ABCD$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `정사각형의 두 대각선은 길이가 같고 서로 다른 것을 수직이등분하므로 $\\overline{BD}=\\overline{AC}=${d}\\,\\mathrm{cm}$이고 $\\overline{AC}\\perp\\overline{BD}$이다.\n두 대각선이 수직인 사각형의 넓이는 $\\dfrac{1}{2}\\times(\\text{두 대각선의 길이의 곱})$이므로 $\\dfrac{1}{2}\\times${d}\\times${d}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { mode, d, x },
        figureSpec: figSquareDiag(130, `${d} cm`),
      };
    }
    const b = 2 * intBetween(rng, 26, 64);
    const x = b - 45;
    return {
      content: `그림과 같은 정사각형 $ABCD$의 대각선 $AC$ 위에 $\\angle BEC=${b}^\\circ$가 되도록 점 $E$를 잡았다. 이때 $\\angle ADE$의 크기를 구하시오.`,
      answer: `$${x}^\\circ$`,
      solution: `삼각형 $ABE$와 삼각형 $ADE$에서 $\\overline{AB}=\\overline{AD}$, $\\angle BAE=\\angle DAE=45^\\circ$, $\\overline{AE}$는 공통이므로 두 삼각형은 합동이다.\n$\\angle AEB=180^\\circ-${b}^\\circ=${180 - b}^\\circ$이므로 $\\angle AED=\\angle AEB=${180 - b}^\\circ$이다.\n삼각형 $AED$에서 $\\angle ADE=180^\\circ-45^\\circ-${180 - b}^\\circ=${x}^\\circ$이다.`,
      facts: { mode, b, x },
      figureSpec: figSquarePoint05(b),
    };
  }),

  def("06", "정사각형이 되는 조건", SEC.직사각형류, "응용", (rng): Body => {
    const mode = intBetween(rng, 0, 1);
    if (mode === 0) {
      const p = intBetween(rng, 2, 4);
      const x = intBetween(rng, 3, 7);
      const q = intBetween(rng, 1, 6);
      const s = (p - 1) * x + q;
      const side = p * x + q;
      const area = side * side;
      return {
        content: `직사각형 $ABCD$에서 $\\overline{AB}=(${p}x+${q})\\,\\mathrm{cm}$, $\\overline{BC}=(x+${s})\\,\\mathrm{cm}$이다. $\\square ABCD$가 정사각형일 때, 그 넓이를 구하시오.`,
        answer: `$${area}\\,\\mathrm{cm}^2$`,
        solution: `직사각형이 정사각형이 되려면 이웃하는 두 변의 길이가 같아야 하므로 $${p}x+${q}=x+${s}$이다.\n$${coefTex(p - 1)}x=${s - q}$이므로 $x=${x}$이고 한 변의 길이는 $${side}\\,\\mathrm{cm}$이다.\n따라서 넓이는 $${side}\\times${side}=${area}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { mode, p, q, s, x, side, area },
        figureSpec: figRect01(150, 96),
      };
    }
    const p = intBetween(rng, 2, 5);
    const x = 2 * intBetween(rng, 2, 7);
    const q = intBetween(rng, 1, 9);
    const s = (p - 1) * x + q;
    const d = p * x + q;
    const area = (d * d) / 2;
    return {
      content: `마름모 $ABCD$에서 두 대각선의 길이가 $\\overline{AC}=(${p}x+${q})\\,\\mathrm{cm}$, $\\overline{BD}=(x+${s})\\,\\mathrm{cm}$이다. $\\square ABCD$가 정사각형일 때, 그 넓이를 구하시오.`,
      answer: `$${area}\\,\\mathrm{cm}^2$`,
      solution: `마름모가 정사각형이 되려면 두 대각선의 길이가 같아야 하므로 $${p}x+${q}=x+${s}$이다.\n$${coefTex(p - 1)}x=${s - q}$이므로 $x=${x}$이고 두 대각선의 길이는 모두 $${d}\\,\\mathrm{cm}$이다.\n마름모의 두 대각선은 서로 수직이므로 넓이는 $\\dfrac{1}{2}\\times${d}\\times${d}=${area}\\,(\\mathrm{cm}^2)$이다.`,
      facts: { mode, p, q, s, x, d, area },
      figureSpec: figRhombus(96, 96, {}),
    };
  }),

  def(
    "07",
    "등변사다리꼴의 뜻과 성질",
    SEC.등변사다리꼴,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const b = intBetween(rng, 52, 78);
        const x = 180 - b;
        return {
          content: `그림과 같이 $\\overline{AD}\\parallel\\overline{BC}$인 등변사다리꼴 $ABCD$에서 $\\angle B=${b}^\\circ$일 때, $\\angle A$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `등변사다리꼴은 아랫변의 양 끝 각의 크기가 같으므로 $\\angle C=\\angle B=${b}^\\circ$이다.\n$\\overline{AD}\\parallel\\overline{BC}$이므로 $\\angle A+\\angle B=180^\\circ$이다.\n따라서 $\\angle A=180^\\circ-${b}^\\circ=${x}^\\circ$이다.`,
          facts: { mode, b, x },
          figureSpec: figIsoTrap(80, 80 + 2 * r2(96 / Math.tan(b * DEG)), 96, {
            angB: `${b}°`,
          }),
        };
      }
      const t = intBetween(rng, 22, 44);
      const x = 2 * t;
      return {
        content: `그림과 같이 $\\overline{AD}\\parallel\\overline{BC}$인 등변사다리꼴 $ABCD$에서 $\\overline{AB}=\\overline{AD}$이고 $\\angle ADB=${t}^\\circ$일 때, $\\angle C$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `$\\overline{AB}=\\overline{AD}$이므로 삼각형 $ABD$는 이등변삼각형이고 $\\angle ABD=\\angle ADB=${t}^\\circ$이다.\n$\\overline{AD}\\parallel\\overline{BC}$이므로 엇각에서 $\\angle DBC=\\angle ADB=${t}^\\circ$이다.\n따라서 $\\angle B=${t}^\\circ+${t}^\\circ=${x}^\\circ$이고, 등변사다리꼴이므로 $\\angle C=\\angle B=${x}^\\circ$이다.`,
        facts: { mode, t, x },
        // 🔴 **발문이 건 조건($\overline{AB}=\overline{AD}$)을 그림이 지켜야** 한다.
        //    윗변을 80 으로 못 박으면 $\overline{AD}=80$ 인데 $\overline{AB}=h/\sin(2t)$ 라
        //    둘이 안 같고, 그러면 $\angle ADB \neq t$ 가 된다(실측 27° 라 적고 32.7° 를 그렸다).
        //    등변사다리꼴에서 $\angle ADB=\angle DBC$(엇각)이고 $\angle ABD=\angle ADB$
        //    (이등변)이므로 $\angle B=2t$ 는 그대로다 — 바뀌는 것은 윗변뿐이다.
        figureSpec: figIsoTrap(
          r2(96 / Math.sin(2 * t * DEG)),
          r2(96 / Math.sin(2 * t * DEG)) + 2 * r2(96 / Math.tan(2 * t * DEG)),
          96,
          { diagBD: true, angADB: `${t}°` },
        ),
      };
    },
  ),

  def(
    "08",
    "등변사다리꼴의 성질의 응용",
    SEC.등변사다리꼴,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const p = 2 * intBetween(rng, 2, 8);
        const q = attempt(60, () => {
          const v = 2 * intBetween(rng, 3, 12);
          return v > p ? v : null;
        });
        const x = (q - p) / 2;
        return {
          content: `그림과 같이 $\\overline{AD}\\parallel\\overline{BC}$인 등변사다리꼴 $ABCD$의 꼭짓점 $D$에서 $\\overline{BC}$에 내린 수선의 발을 $H$라 하자. $\\overline{AD}=${p}\\,\\mathrm{cm}$, $\\overline{BC}=${q}\\,\\mathrm{cm}$일 때, $\\overline{CH}$의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: `꼭짓점 $A$에서 $\\overline{BC}$에 내린 수선의 발을 $E$라 하면 $\\square AEHD$는 직사각형이므로 $\\overline{EH}=\\overline{AD}=${p}\\,\\mathrm{cm}$이다.\n등변사다리꼴이므로 삼각형 $ABE$와 삼각형 $DCH$는 합동이고 $\\overline{BE}=\\overline{CH}$이다.\n따라서 $\\overline{CH}=\\dfrac{1}{2}\\times(${q}-${p})=${x}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, p, q, x },
          figureSpec: figIsoTrap(p * 9, q * 9, 88, {
            foot: true,
            labels: { top: `${p} cm`, bottom: `${q} cm` },
          }),
        };
      }
      const p = intBetween(rng, 4, 12);
      const c = 2 * intBetween(rng, 2, 7);
      const x = p + c;
      return {
        content: `그림과 같이 $\\overline{AD}\\parallel\\overline{BC}$인 등변사다리꼴 $ABCD$에서 $\\overline{AB}=${c}\\,\\mathrm{cm}$, $\\overline{AD}=${p}\\,\\mathrm{cm}$, $\\angle A=120^\\circ$일 때, $\\overline{BC}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AD}\\parallel\\overline{BC}$이므로 $\\angle B=180^\\circ-120^\\circ=60^\\circ$이다.\n꼭짓점 $A$, $D$에서 $\\overline{BC}$에 내린 수선의 발을 각각 $E$, $H$라 하면 $\\overline{BE}=\\overline{CH}=${c}\\times\\dfrac{1}{2}=${c / 2}\\,(\\mathrm{cm})$이고 $\\overline{EH}=\\overline{AD}=${p}\\,\\mathrm{cm}$이다.\n따라서 $\\overline{BC}=${c / 2}+${p}+${c / 2}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, p, c, x },
        figureSpec: figIsoTrap(p * 9, x * 9, r2(c * 9 * Math.sin(60 * DEG)), {
          angA: "120°",
          labels: { top: `${p} cm`, left: `${c} cm` },
        }),
      };
    },
  ),

  def(
    "09",
    "여러 가지 사각형의 판별 ⑴",
    SEC.등변사다리꼴,
    "심화하",
    (rng): Body => {
      const s = intBetween(rng, 7, 16);
      const t = attempt(60, () => {
        const v = intBetween(rng, 2, s - 2);
        return 2 * v < s ? v : null;
      });
      const x = s * s - 2 * t * (s - t);
      return {
        content: `그림과 같이 한 변의 길이가 $${s}\\,\\mathrm{cm}$인 정사각형 $ABCD$의 각 변 위에 $\\overline{AE}=\\overline{BF}=\\overline{CG}=\\overline{DH}=${t}\\,\\mathrm{cm}$가 되도록 네 점 $E$, $F$, $G$, $H$를 잡았다. 이때 $\\square EFGH$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `네 삼각형 $AEH$, $BFE$, $CGF$, $DHG$는 두 변의 길이가 각각 $${t}\\,\\mathrm{cm}$, $${s - t}\\,\\mathrm{cm}$인 합동인 직각삼각형이므로 $\\square EFGH$는 정사각형이다.\n$\\square EFGH$의 넓이는 정사각형 $ABCD$의 넓이에서 네 직각삼각형의 넓이를 뺀 것이므로 $${s}\\times${s}-4\\times\\dfrac{1}{2}\\times${t}\\times${s - t}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { mode: 0, s, t, x },
        figureSpec: figMidSquare09(s * 11, t * 11),
      };
    },
  ),

  def(
    "10",
    "여러 가지 사각형 사이의 관계",
    SEC.등변사다리꼴,
    "응용",
    (rng): Body => {
      const idx = distinctIndices(rng, QUAD10_CLAIMS.length, 5);
      const x = idx.filter((i) => QUAD10_CLAIMS[i]![1]).length;
      const lines = idx
        .map((i, k) => `${BOGI[k]}. ${QUAD10_CLAIMS[i]![0]}`)
        .join("\n");
      const truth = idx
        .map(
          (i, k) =>
            `${BOGI[k]}. ${QUAD10_CLAIMS[i]![1] ? "옳다" : "옳지 않다"}`,
        )
        .join("\n");
      return {
        content: `다음 보기 중 옳은 것은 모두 몇 개인지 구하시오.\n\n${lines}`,
        answer: `$${x}$개`,
        solution: `사각형 사이의 포함 관계와 판별 조건에 따라 각 명제의 참·거짓을 살피면 다음과 같다.\n${truth}\n따라서 옳은 것은 $${x}$개이다.`,
        facts: {
          mode: 0,
          i0: idx[0]!,
          i1: idx[1]!,
          i2: idx[2]!,
          i3: idx[3]!,
          i4: idx[4]!,
          x,
        },
        figureSpec: null,
      };
    },
  ),

  def(
    "11",
    "여러 가지 사각형의 대각선의 성질",
    SEC.등변사다리꼴,
    "응용",
    (rng): Body => {
      const count = intBetween(rng, 4, QUAD11_SHAPES.length);
      const idx = distinctIndices(rng, QUAD11_SHAPES.length, count);
      const a = idx.filter((i) => QUAD11_SHAPES[i]![1]).length;
      const b = idx.filter((i) => QUAD11_SHAPES[i]![2]).length;
      // 발문 그대로 세 성질을 모두 요구한다. ⚠️ **이 표에서는** «같고 수직»이면
      // 반드시 «이등분»이라 마지막 항이 대수적으로 함의된다(변이 시험이
      // 「산출물이 안 바뀐다」로 알려 줬다). 그 함의는 테스트가 따로 못 박아
      // 두었으니, 표에 새 사각형을 넣어 함의가 깨지면 그때 이 항이 산다.
      const c = idx.filter(
        (i) =>
          QUAD11_SHAPES[i]![1] && QUAD11_SHAPES[i]![2] && QUAD11_SHAPES[i]![3],
      ).length;
      const x = a + b + c;
      const lines = idx
        .map((i, k) => `${BOGI[k]}. ${QUAD11_SHAPES[i]![0]}`)
        .join("\n");
      return {
        content: `다음 보기 중 두 대각선의 길이가 같은 것은 $a$개, 두 대각선이 서로 수직인 것은 $b$개, 두 대각선의 길이가 같고 서로 다른 것을 수직이등분하는 것은 $c$개이다. 이때 $a+b+c$의 값을 구하시오.\n\n${lines}`,
        answer: `$${x}$`,
        solution: `두 대각선의 길이가 같은 것은 직사각형, 등변사다리꼴, 정사각형이고, 두 대각선이 서로 수직인 것은 마름모, 정사각형이다.\n두 조건을 모두 만족하는 것은 정사각형뿐이다.\n주어진 보기에서 $a=${a}$, $b=${b}$, $c=${c}$이므로 $a+b+c=${x}$이다.`,
        facts: {
          mode: 0,
          n: count,
          i0: idx[0]!,
          i1: idx[1]!,
          i2: idx[2]!,
          i3: idx[3]!,
          i4: idx[4] ?? -1,
          i5: idx[5] ?? -1,
          a,
          b,
          c,
          x,
        },
        figureSpec: null,
      };
    },
  ),

  def(
    "12",
    "사각형의 각 변의 중점을 연결하여 만든 사각형",
    SEC.등변사다리꼴,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const k = intBetween(rng, 3, 14);
        const x = k * k;
        return {
          content: `그림과 같은 정사각형 $ABCD$에서 네 변의 중점을 각각 $P$, $Q$, $R$, $S$라 하자. $\\overline{QR}=${k}\\,\\mathrm{cm}$일 때, $\\square PQRS$의 넓이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}^2$`,
          solution: `정사각형의 네 변의 중점을 연결하여 만든 사각형은 정사각형이다.\n따라서 $\\square PQRS$의 넓이는 $${k}\\times${k}=${x}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { mode, k, x },
          figureSpec: figMidpointQuad("square", 120, 120),
        };
      }
      const p = 2 * intBetween(rng, 3, 11);
      const q = attempt(60, () => {
        const v = 2 * intBetween(rng, 3, 11);
        return v !== p ? v : null;
      });
      const x = (p * q) / 4;
      return {
        content: `그림과 같은 마름모 $ABCD$에서 네 변의 중점을 각각 $P$, $Q$, $R$, $S$라 하자. 두 대각선의 길이가 $\\overline{AC}=${p}\\,\\mathrm{cm}$, $\\overline{BD}=${q}\\,\\mathrm{cm}$일 때, $\\square PQRS$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `마름모의 네 변의 중점을 연결하여 만든 사각형은 직사각형이고, 그 두 변의 길이는 각 대각선의 길이의 절반이다.\n$\\square PQRS$의 두 변의 길이는 $\\dfrac{${p}}{2}=${p / 2}\\,(\\mathrm{cm})$, $\\dfrac{${q}}{2}=${q / 2}\\,(\\mathrm{cm})$이므로 넓이는 $${p / 2}\\times${q / 2}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { mode, p, q, x },
        // a=가로 반대각선(BD 쪽)·b=세로 반대각선(AC 쪽) — 비를 발문의 값 그대로.
        figureSpec: figMidpointQuad("rhombus", 5 * q, 5 * p),
      };
    },
  ),

  def(
    "17",
    "여러 가지 사각형의 판별 ⑵",
    SEC.등변사다리꼴,
    "심화하",
    (rng): Body => {
      const q = intBetween(rng, 2, 9);
      const p = attempt(60, () => {
        const v = intBetween(rng, 2 * q + 2, 2 * q + 22);
        return v > 2 * q ? v : null;
      });
      const side = p - q;
      const x = 4 * side;
      return {
        content: `그림과 같은 직사각형 $ABCD$에서 대각선 $BD$의 수직이등분선과 $\\overline{AD}$, $\\overline{BC}$의 교점을 각각 $E$, $F$라 하자. $\\overline{AD}=${p}\\,\\mathrm{cm}$, $\\overline{FC}=${q}\\,\\mathrm{cm}$일 때, $\\square EBFD$의 둘레의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AD}\\parallel\\overline{BC}$이므로 엇각에서 $\\angle EDO=\\angle FBO$이고, $\\overline{OD}=\\overline{OB}$, $\\angle EOD=\\angle FOB=90^\\circ$이므로 삼각형 $EOD$와 삼각형 $FOB$는 합동이다.\n따라서 $\\square EBFD$는 두 대각선이 서로 다른 것을 수직이등분하는 사각형이므로 마름모이다.\n$\\overline{BF}=\\overline{BC}-\\overline{FC}=${p}-${q}=${side}\\,(\\mathrm{cm})$이므로 둘레의 길이는 $4\\times${side}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { mode: 0, p, q, side, x },
        figureSpec: figPerpBisect17(p * 9, r2(Math.sqrt(p * (p - 2 * q)) * 9), {
          ad: `${p} cm`,
          fc: `${q} cm`,
        }),
      };
    },
  ),

  /**
   * **28 — 사다리꼴이 등변사다리꼴이 되는 조건** (2026-08-29 추가).
   *
   * 같은 파일의 직사각형류는 뜻과 성질(01·03·05) 다음에 **되는 조건**(02·04·06)이
   * 있다. 등변사다리꼴은 07 뜻과 성질 · 08 성질의 응용만 있고 **되는 조건이 없었다.**
   *
   * 07 은 이미 등변사다리꼴인 도형에서 각을 구하고, 08 은 변의 길이를 구한다.
   * 여기서는 사다리꼴이 주어지고 「언제 등변이 되는가」를 묻는다 — 시작도 끝도 다르다.
   *
   * ⚠️ 그림에 다리 tick 을 찍지 않는다 — 찍으면 그림이 답을 말한다.
   * ⚠️ 좌표도 등변이 아니게 둔다. figIsoTrap 은 대칭이라 다리가 같고, tick 만
   *    빼도 모양이 답을 말해 버린다.
   */
  def(
    "28",
    "사다리꼴이 등변사다리꼴이 되는 조건",
    SEC.등변사다리꼴,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const p = intBetween(rng, 2, 4);
        const theta = intBetween(rng, 52, 78);
        const x = attempt(80, () => {
          const v = intBetween(rng, theta - 40, theta - 8);
          if (v <= 0 || v >= theta) return null;
          const q = p * v - theta;
          return q > 0 ? v : null;
        });
        const q = p * x - theta;
        const s = theta - x;
        return {
          content: `$\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 $\\angle B=(${p}x-${q})^\\circ$, $\\angle C=(x+${s})^\\circ$이다. $\\square ABCD$가 등변사다리꼴이 되도록 하는 $x$의 값을 구하시오.`,
          answer: `$${x}$`,
          solution: `$\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴이 등변사다리꼴이 되려면 아랫변의 양 끝 각의 크기가 같아야 한다.\n$${p}x-${q}=x+${s}$에서 $${coefTex(p - 1)}x=${q + s}$이므로 $x=${x}$이다.`,
          facts: { mode, p, q, s, theta, x },
          figureSpec: figTrap(80, 160, 90, 20, {}),
        };
      }
      const p = intBetween(rng, 2, 4);
      const x = intBetween(rng, 3, 12);
      const q = intBetween(rng, 1, 8);
      const s = (p - 1) * x + q;
      const len = p * x + q;
      return {
        content: `$\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 $\\overline{AC}=(${p}x+${q})\\,\\mathrm{cm}$, $\\overline{BD}=(x+${s})\\,\\mathrm{cm}$이다. $\\square ABCD$가 등변사다리꼴일 때, $\\overline{AC}$의 길이를 구하시오.`,
        answer: `$${len}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴이 등변사다리꼴이 되려면 두 대각선의 길이가 같아야 한다.\n$${p}x+${q}=x+${s}$에서 $${coefTex(p - 1)}x=${s - q}$이므로 $x=${x}$이다.\n따라서 $\\overline{AC}=${p}\\times${x}+${q}=${len}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, p, q, s, root: x, x: len },
        figureSpec: figTrap(80, 160, 90, 24, { diagAC: true, diagBD: true }),
      };
    },
  ),

  /**
   * **29 — 등변사다리꼴의 넓이와 둘레** (2026-08-29 추가, 밑단 `연산`).
   *
   * 이 소단원에는 `연산` 갈래가 **하나도 없었다.** 밑단이 비면 「쉬운 문항이
   * 없다」가 아니라 **하위반 프리셋(연산 40%)이 이 소단원에서 한 문항도 못
   * 세운다** — 계속 대체만 한다(D-106, `tier.ts` 머리말).
   *
   * 07·08 은 성질을 한 번 거쳐야 수가 나온다(양 끝 각이 같다 · 수선의 발로
   * 자른 두 조각이 합동이다). 여기서는 **필요한 수가 발문에 전부 있다** —
   * 넣어서 계산하는 것이 전부다. 그게 밑단이다.
   *
   * ⚠️ **그림을 붙이지 않는다.** 치수를 발문이 다 말하므로 그림은 아무것도
   *    더하지 않는다. 발문이 그림을 가리키지도 않으므로 지면에서 그대로 풀린다.
   *    (`resolveMiddleTier` 도 그림이 붙은 문항은 밑단으로 안 내린다 — 여기서는
   *    `연산` 을 직접 등록하지만, 그림 없는 쪽이 그 규칙과도 결이 맞는다.)
   */
  def(
    "29",
    "등변사다리꼴의 넓이와 둘레",
    SEC.등변사다리꼴,
    "연산",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const a = intBetween(rng, 3, 12);
      if (mode === 0) {
        // 두 밑변의 **차를 짝수**로 두면 합도 짝수라 넓이가 정수로 떨어진다.
        const b = a + 2 * intBetween(rng, 1, 8);
        const h = intBetween(rng, 4, 14);
        const x = ((a + b) * h) / 2;
        return {
          content: `윗변의 길이가 $${a}\\,\\mathrm{cm}$, 아랫변의 길이가 $${b}\\,\\mathrm{cm}$, 높이가 $${h}\\,\\mathrm{cm}$인 등변사다리꼴의 넓이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}^2$`,
          solution: `사다리꼴의 넓이는 두 밑변의 길이의 합에 높이를 곱한 뒤 $2$로 나눈 것이다.\n따라서 넓이는 $\\dfrac{1}{2}\\times(${a}+${b})\\times${h}=${x}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { mode, a, b, h, x },
          figureSpec: null,
        };
      }
      // 🔴 다리가 밑변 차의 절반보다 **길어야** 등변사다리꼴이 존재한다.
      //    `d < c` 로 두어 높이 $\sqrt{c^2-d^2}$ 가 실수가 되게 못 박는다 —
      //    아니면 지면에 «있을 수 없는 도형»의 둘레가 나간다(값 검산은 통과한다).
      const c = intBetween(rng, 4, 13);
      const d = intBetween(rng, 1, c - 1);
      const b = a + 2 * d;
      const x = a + b + 2 * c;
      return {
        content: `윗변의 길이가 $${a}\\,\\mathrm{cm}$, 아랫변의 길이가 $${b}\\,\\mathrm{cm}$이고 평행하지 않은 한 변의 길이가 $${c}\\,\\mathrm{cm}$인 등변사다리꼴의 둘레의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `등변사다리꼴은 평행하지 않은 두 변의 길이가 같으므로 그 두 변의 길이의 합은 $${c}\\times2=${2 * c}\\,(\\mathrm{cm})$이다.\n따라서 둘레의 길이는 $${a}+${b}+${2 * c}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, a, b, c, d, x },
        figureSpec: null,
      };
    },
  ),

  /**
   * **30 — 등변사다리꼴의 두 대각선** (2026-08-29 추가).
   *
   * 07 은 «각», 08 은 «변»을 묻고 **둘 다 대각선을 안 쓴다**(07 의 mode 1 이
   * $\overline{BD}$ 를 긋지만 이등변삼각형 논증이고 교점은 안 나온다).
   * 여기서 쓰는 성질은 둘이고 그 둘이 이 유형의 전부다:
   *
   *   ⑴ 두 대각선의 길이가 같다 → $\overline{OD}=\overline{AC}-\overline{OB}$
   *   ⑵ $\triangle OBC$ 가 이등변이다 → $\angle BOC=180^\circ-2\angle DBC$
   *
   * 11 이 「어느 사각형이 그 성질을 갖나」를 표로 묻는다면, 여기서는 **그 성질을
   * 실제로 써서** 값을 낸다 — 시작(도형 하나)도 끝(길이·각)도 다르다.
   */
  def(
    "30",
    "등변사다리꼴의 두 대각선",
    SEC.등변사다리꼴,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        // O 는 아랫변 쪽에 치우친다($\overline{AD}<\overline{BC}$) — `x < q` 가
        // 그 조건이고, 동시에 그림의 윗변:아랫변 비이기도 하다.
        const q = intBetween(rng, 8, 20);
        const x = intBetween(rng, 3, q - 2);
        const p = q + x;
        return {
          content: `그림과 같이 $\\overline{AD}\\parallel\\overline{BC}$인 등변사다리꼴 $ABCD$에서 두 대각선의 교점을 $O$라 하자. $\\overline{AC}=${p}\\,\\mathrm{cm}$, $\\overline{OB}=${q}\\,\\mathrm{cm}$일 때, $\\overline{OD}$의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: `등변사다리꼴의 두 대각선의 길이는 같으므로 $\\overline{BD}=\\overline{AC}=${p}\\,\\mathrm{cm}$이다.\n점 $O$는 대각선 $BD$ 위의 점이므로 $\\overline{OD}=\\overline{BD}-\\overline{OB}=${p}-${q}=${x}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, p, q, x },
          // 윗변:아랫변 $=\overline{OD}:\overline{OB}=x:q$ — 지면의 비가 발문과 같아야 한다.
          // 치수는 안 적는다(까닭은 `figIsoTrapDiags` 머리말의 🔴).
          figureSpec: figIsoTrapDiags(x * 8, q * 8, 96, {}),
        };
      }
      const t = intBetween(rng, 25, 55);
      const x = 180 - 2 * t;
      // 그림의 $\angle DBC$ 가 실제로 $t$ 가 되게 높이를 역산한다. 교점 $O$ 는
      // 대칭축 위에 있으므로 $\tan(\angle DBC)=h\div\frac{윗변+아랫변}{2}$ 다.
      const top = 70;
      const bottom = 140;
      return {
        content: `그림과 같이 $\\overline{AD}\\parallel\\overline{BC}$인 등변사다리꼴 $ABCD$에서 두 대각선의 교점을 $O$라 하자. $\\angle DBC=${t}^\\circ$일 때, $\\angle BOC$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `등변사다리꼴에서 $\\triangle ABC$와 $\\triangle DCB$는 합동이므로 $\\angle ACB=\\angle DBC=${t}^\\circ$이다.\n삼각형 $OBC$의 세 각의 크기의 합은 $180^\\circ$이므로 $\\angle BOC=180^\\circ-${t}^\\circ-${t}^\\circ=${x}^\\circ$이다.`,
        facts: { mode, t, x },
        figureSpec: figIsoTrapDiags(
          top,
          bottom,
          r2(((bottom + top) / 2) * Math.tan(t * DEG)),
          { angDBC: `${t}°` },
        ),
      };
    },
  ),

  /**
   * **31 — 등변사다리꼴의 두 각의 크기** (2026-08-29 추가).
   *
   * 07 은 한 각의 **값**을 주고 다른 각을 묻는다. 여기서는 값을 하나도 안 주고
   * **두 각의 관계**(비 · 차)만 준다 — 학생이 $\angle A+\angle B=180^\circ$ 를
   * 세워 연립해야 한다. 07 의 숫자 바꾸기로는 이 자리에 못 온다.
   *
   * ⚠️ **그림을 붙이지 않는다.** 각의 값이 발문에 없는데 그림을 실제 각으로
   *    그리면 그림이 답을 말해 버린다(28 이 다리 tick 을 못 찍는 것과 같은 자리).
   *    조건이 각 관계뿐이라 그림 없이도 완전하다.
   */
  def(
    "31",
    "등변사다리꼴의 두 각의 크기",
    SEC.등변사다리꼴,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const [m, n] =
          TRAP31_RATIOS[intBetween(rng, 0, TRAP31_RATIOS.length - 1)]!;
        const x = (180 * m) / (m + n);
        return {
          content: `$\\overline{AD}\\parallel\\overline{BC}$인 등변사다리꼴 $ABCD$에서 $\\angle A:\\angle B=${m}:${n}$일 때, $\\angle A$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `$\\overline{AD}\\parallel\\overline{BC}$이므로 $\\angle A+\\angle B=180^\\circ$이다.\n$\\angle A:\\angle B=${m}:${n}$이므로 $\\angle A=180^\\circ\\times\\dfrac{${m}}{${m + n}}=${x}^\\circ$이다.`,
          facts: { mode, m, n, x },
          figureSpec: null,
        };
      }
      // 차를 짝수로 두어야 $\angle B=\frac{180-d}{2}$ 가 정수다.
      const d = 2 * intBetween(rng, 5, 40);
      const x = (180 - d) / 2;
      return {
        content: `$\\overline{AD}\\parallel\\overline{BC}$인 등변사다리꼴 $ABCD$에서 $\\angle A$가 $\\angle B$보다 $${d}^\\circ$만큼 클 때, $\\angle B$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `$\\overline{AD}\\parallel\\overline{BC}$이므로 $\\angle A+\\angle B=180^\\circ$이고, 조건에서 $\\angle A=\\angle B+${d}^\\circ$이다.\n두 식에서 $\\angle B+${d}^\\circ+\\angle B=180^\\circ$이므로 $\\angle B=\\dfrac{180^\\circ-${d}^\\circ}{2}=${x}^\\circ$이다.`,
        facts: { mode, d, x },
        figureSpec: null,
      };
    },
  ),

  /**
   * **32 — 대각선의 조건으로 사각형 판별하기** (2026-08-29 추가).
   *
   * 10·11 은 사각형의 **이름을 늘어놓고** 「몇 개인가」를 센다. 여기서는 반대다 —
   * **조건이 먼저 오고 이름이 답이 아니다.** 학생은 조건에서 사각형을 가려낸 뒤
   * 그 사각형의 성질로 값을 낸다. 12 와도 다르다(12 는 중점을 잇는다).
   *
   * ⚠️ **그림을 붙이지 않는다.** 이 유형이 묻는 것이 「어떤 사각형인가」인데
   *    그리는 순간 그림이 답을 말한다 — 28 이 다리 tick 을 못 찍는 것과 같다.
   *    조건이 대각선뿐이라 그림 없이 완전하다.
   */
  def(
    "32",
    "대각선의 조건으로 사각형 판별하기",
    SEC.등변사다리꼴,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      // 대각선을 짝수로 두면 넓이 $\frac{pq}{2}$ 가 정수로 떨어진다.
      const p = 2 * intBetween(rng, 3, 12);
      if (mode === 0) {
        const x = (p * p) / 2;
        return {
          content: `사각형 $ABCD$의 두 대각선이 서로 다른 것을 수직이등분하고, 두 대각선의 길이가 같다. $\\overline{AC}=${p}\\,\\mathrm{cm}$일 때, $\\square ABCD$의 넓이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}^2$`,
          solution: `두 대각선이 서로 다른 것을 이등분하므로 $\\square ABCD$는 평행사변형이고, 두 대각선이 서로 수직이므로 마름모이다.\n여기에 두 대각선의 길이까지 같으므로 $\\square ABCD$는 정사각형이다.\n$\\overline{BD}=\\overline{AC}=${p}\\,\\mathrm{cm}$이므로 넓이는 $\\dfrac{1}{2}\\times${p}\\times${p}=${x}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { mode, p, x },
          figureSpec: null,
        };
      }
      // 두 대각선이 같으면 정사각형이 되어 모드 0 과 같은 도형이 된다 — 가른다.
      const x = attempt(60, () => {
        const v = 2 * intBetween(rng, 3, 12);
        return v !== p ? v : null;
      });
      const area = (p * x) / 2;
      return {
        content: `사각형 $ABCD$의 두 대각선이 서로 다른 것을 수직이등분한다. $\\overline{AC}=${p}\\,\\mathrm{cm}$이고 $\\square ABCD$의 넓이가 $${area}\\,\\mathrm{cm}^2$일 때, $\\overline{BD}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `두 대각선이 서로 다른 것을 수직이등분하므로 $\\square ABCD$는 마름모이다.\n마름모의 넓이는 두 대각선의 길이의 곱의 절반이므로 $\\dfrac{1}{2}\\times${p}\\times\\overline{BD}=${area}$이다.\n따라서 $\\overline{BD}=\\dfrac{2\\times${area}}{${p}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, p, q: x, S: area, x },
        figureSpec: null,
      };
    },
  ),

  // ── 평행선과 삼각형의 넓이 (18~23 — RPM 색인 17 뒤에 우리가 더한 번호) ──

  def(
    "18",
    "평행선 사이에 있는 삼각형의 넓이",
    SEC.평삼넓이,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const a = intBetween(rng, 4, 16);
      const h = 2 * intBetween(rng, 2, 7);
      const area = (a * h) / 2;
      const intro = `그림과 같이 두 직선 $l$, $m$은 서로 평행하고, 점 $A$는 직선 $l$ 위에, 두 점 $B$, $C$는 직선 $m$ 위에 있다.`;
      if (mode === 0) {
        return {
          content: `${intro} $\\overline{BC}=${a}\\,\\mathrm{cm}$이고 두 직선 $l$, $m$ 사이의 거리가 $${h}\\,\\mathrm{cm}$일 때, 삼각형 $ABC$의 넓이를 구하시오.`,
          answer: `$${area}\\,\\mathrm{cm}^2$`,
          solution: `점 $A$에서 직선 $m$에 내린 수선의 발을 $H$라 하면 $\\overline{AH}$의 길이는 두 직선 $l$, $m$ 사이의 거리와 같으므로 삼각형 $ABC$의 높이는 $${h}\\,\\mathrm{cm}$이다.\n따라서 삼각형 $ABC$의 넓이는 $\\dfrac{1}{2}\\times${a}\\times${h}=${area}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { mode, a, h, area, x: area },
          figureSpec: figParLines18(a, h),
        };
      }
      return {
        content: `${intro} $\\overline{BC}=${a}\\,\\mathrm{cm}$이고 삼각형 $ABC$의 넓이가 $${area}\\,\\mathrm{cm}^2$일 때, 두 직선 $l$, $m$ 사이의 거리를 구하시오.`,
        answer: `$${h}\\,\\mathrm{cm}$`,
        solution: `두 직선 $l$, $m$ 사이의 거리는 삼각형 $ABC$의 높이와 같으므로 그 거리를 $x\\,\\mathrm{cm}$라 하면 $\\dfrac{1}{2}\\times${a}\\times x=${area}$이다.\n따라서 $x=\\dfrac{2\\times${area}}{${a}}=${h}$이므로 두 직선 사이의 거리는 $${h}\\,\\mathrm{cm}$이다.`,
        facts: { mode, a, h, area, x: h },
        figureSpec: figParLines18(a, h),
      };
    },
  ),

  def("19", "삼각형의 중선과 넓이", SEC.평삼넓이, "기본", (rng): Body => {
    const mode = intBetween(rng, 0, 1);
    const S = 4 * intBetween(rng, 3, 20);
    if (mode === 0) {
      const x = S / 2;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 점 $D$는 $\\overline{BC}$의 중점이다. 삼각형 $ABC$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 삼각형 $ABD$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `삼각형 $ABD$와 삼각형 $ADC$는 밑변의 길이가 $\\overline{BD}=\\overline{DC}$로 같고 높이도 같으므로 넓이가 같다.\n따라서 삼각형 $ABD$의 넓이는 삼각형 $ABC$의 넓이의 $\\dfrac{1}{2}$인 $${x}\\,\\mathrm{cm}^2$이다.`,
        facts: { mode, S, x },
        figureSpec: figMedian19(0),
      };
    }
    const half = S / 2;
    const x = S / 4;
    return {
      content: `그림과 같은 삼각형 $ABC$에서 점 $D$는 $\\overline{BC}$의 중점이고, 점 $E$는 $\\overline{AD}$의 중점이다. 삼각형 $ABC$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 삼각형 $ABE$의 넓이를 구하시오.`,
      answer: `$${x}\\,\\mathrm{cm}^2$`,
      solution: `중선 $\\overline{AD}$가 삼각형 $ABC$의 넓이를 이등분하므로 삼각형 $ABD$의 넓이는 $${half}\\,\\mathrm{cm}^2$이다.\n삼각형 $ABE$와 삼각형 $EBD$도 밑변의 길이가 $\\overline{AE}=\\overline{ED}$로 같고 높이가 같으므로 삼각형 $ABE$의 넓이는 $${half}$의 $\\dfrac{1}{2}$인 $${x}\\,\\mathrm{cm}^2$이다.`,
      facts: { mode, S, half, x },
      figureSpec: figMedian19(1),
    };
  }),

  def(
    "20",
    "평행사변형의 내부의 한 점과 삼각형의 넓이",
    SEC.평삼넓이,
    "기본",
    (rng): Body => {
      const S = 2 * intBetween(rng, 10, 45);
      const half = S / 2;
      const a = intBetween(rng, 2, half - 2);
      const x = half - a;
      return {
        content: `그림과 같은 평행사변형 $ABCD$의 내부의 한 점 $P$에 대하여 평행사변형 $ABCD$의 넓이가 $${S}\\,\\mathrm{cm}^2$이고 삼각형 $PAB$의 넓이가 $${a}\\,\\mathrm{cm}^2$일 때, 삼각형 $PCD$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `점 $P$에서 $\\overline{AB}$, $\\overline{DC}$에 내린 수선의 길이의 합은 두 대변 사이의 거리와 같다.\n따라서 삼각형 $PAB$와 삼각형 $PCD$의 넓이의 합은 평행사변형 $ABCD$의 넓이의 $\\dfrac{1}{2}$인 $${half}\\,\\mathrm{cm}^2$이므로 삼각형 $PCD$의 넓이는 $${half}-${a}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { S, half, a, x },
        figureSpec: figParaInner20((2 * a) / S),
      };
    },
  ),

  def(
    "21",
    "삼각형의 넓이를 나누는 밑변 위의 점",
    SEC.평삼넓이,
    "응용",
    (rng): Body => {
      const [m, n] = pick(rng, RATIOS_AREA);
      const k = intBetween(rng, 1, 4);
      const s = intBetween(rng, 2, 8);
      const a = (m + n) * k;
      const S = (m + n) * s;
      const t = m * s;
      const x = m * k;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 점 $D$는 $\\overline{BC}$ 위의 점이다. $\\overline{BC}=${a}\\,\\mathrm{cm}$이고 삼각형 $ABC$의 넓이가 $${S}\\,\\mathrm{cm}^2$, 삼각형 $ABD$의 넓이가 $${t}\\,\\mathrm{cm}^2$일 때, $\\overline{BD}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `삼각형 $ABD$와 삼각형 $ABC$는 높이가 같으므로 넓이의 비는 밑변의 길이의 비와 같다.\n$\\overline{BD}:\\overline{BC}=${t}:${S}=${m}:${m + n}$이므로 $\\overline{BD}=${a}\\times\\dfrac{${m}}{${m + n}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { m, n, k, s, a, S, t, x },
        figureSpec: figTriSplit21(m / (m + n)),
      };
    },
  ),

  def(
    "22",
    "평행사변형의 두 변 위의 점과 삼각형의 넓이",
    SEC.평삼넓이,
    "응용",
    (rng): Body => {
      const [p, q] = pick(rng, RATIOS_AREA);
      const [m, n] = pick(rng, RATIOS_AREA);
      const k = intBetween(rng, 1, 2);
      const S = 2 * (p + q) * (m + n) * k;
      const half = S / 2;
      /** 삼각형 $ABF$ — 두 단계로 나눠 «높이가 같은 두 삼각형»을 두 번 쓴다. */
      const mid = (p + q) * m * k;
      const x = q * m * k;
      return {
        content: `그림과 같은 평행사변형 $ABCD$에서 점 $E$는 $\\overline{AB}$ 위의 점으로 $\\overline{AE}:\\overline{EB}=${p}:${q}$이고, 점 $F$는 $\\overline{BC}$ 위의 점으로 $\\overline{BF}:\\overline{FC}=${m}:${n}$이다. 평행사변형 $ABCD$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 삼각형 $EBF$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `대각선 $\\overline{AC}$를 그으면 삼각형 $ABC$의 넓이는 평행사변형 $ABCD$의 넓이의 $\\dfrac{1}{2}$인 $${half}\\,\\mathrm{cm}^2$이다.\n삼각형 $ABF$와 삼각형 $ABC$는 높이가 같고 $\\overline{BF}:\\overline{BC}=${m}:${m + n}$이므로 삼각형 $ABF$의 넓이는 $${half}\\times\\dfrac{${m}}{${m + n}}=${mid}\\,(\\mathrm{cm}^2)$이다.\n삼각형 $EBF$와 삼각형 $ABF$도 높이가 같고 $\\overline{BE}:\\overline{BA}=${q}:${p + q}$이므로 삼각형 $EBF$의 넓이는 $${mid}\\times\\dfrac{${q}}{${p + q}}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { p, q, m, n, k, S, half, mid, x },
        figureSpec: figParaEF22(p / (p + q), m / (m + n)),
      };
    },
  ),

  def(
    "23",
    "사다리꼴의 대각선이 나눈 네 삼각형의 넓이",
    SEC.평삼넓이,
    "응용",
    (rng): Body => {
      const [s, t] = pick(rng, TRAP_SIDES);
      const k = intBetween(rng, 2, 3);
      const p = k * s * s;
      const q = k * t * t;
      const r = k * s * t;
      const x = k * (s + t) * (s + t);
      return {
        content: `그림과 같이 $\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 두 대각선의 교점을 $O$라 하자. 삼각형 $AOD$의 넓이가 $${p}\\,\\mathrm{cm}^2$, 삼각형 $OBC$의 넓이가 $${q}\\,\\mathrm{cm}^2$일 때, 사다리꼴 $ABCD$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `$\\overline{AD}\\parallel\\overline{BC}$이므로 삼각형 $ABD$와 삼각형 $ACD$의 넓이가 같고, 두 삼각형에서 삼각형 $AOD$를 빼면 삼각형 $ABO$와 삼각형 $DOC$의 넓이가 같다.\n삼각형 $ABO$의 넓이를 $S$라 하면 높이가 같은 두 삼각형에서 $\\triangle AOD:\\triangle ABO=\\overline{OD}:\\overline{OB}=\\triangle DOC:\\triangle OBC$이므로 $${p}:S=S:${q}$이다.\n$S\\times S=${p}\\times${q}=${p * q}$에서 $S=${r}$이므로 사다리꼴 $ABCD$의 넓이는 $${p}+${r}+${r}+${q}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { s, t, k, p, q, r, x },
        figureSpec: figTrapDiag23(s / t),
      };
    },
  ),

  // ── 직사각형, 마름모, 정사각형 (24~27 — 색인 17 뒤에 우리가 더한 번호) ──

  def(
    "24",
    "직사각형의 대각선과 삼각형의 둘레",
    SEC.직사각형류,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const b = intBetween(rng, 6, 14);
        // 대각선이 밑변보다 «너무 조금» 길면 지면의 직사각형이 납작해진다.
        const c = attempt(80, () => {
          const v = 2 * intBetween(rng, 4, 14);
          return v > 1.1 * b && v < 1.9 * b ? v : null;
        });
        const x = c + b;
        return {
          content: `그림과 같은 직사각형 $ABCD$에서 두 대각선의 교점을 $O$라 하자. $\\overline{AC}=${c}\\,\\mathrm{cm}$, $\\overline{BC}=${b}\\,\\mathrm{cm}$일 때, 삼각형 $OBC$의 둘레의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: `직사각형의 두 대각선은 길이가 같고 서로 다른 것을 이등분하므로 $\\overline{OB}=\\overline{OC}=\\dfrac{1}{2}\\times${c}=${c / 2}\\,(\\mathrm{cm})$이다.\n따라서 삼각형 $OBC$의 둘레의 길이는 $${c / 2}+${c / 2}+${b}=${x}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, c, b, half: c / 2, x },
          figureSpec: figRect01(b, r2(Math.sqrt(c * c - b * b))),
        };
      }
      const a = intBetween(rng, 5, 13);
      const x = attempt(80, () => {
        const v = intBetween(rng, 8, 26);
        return v > 1.1 * a && v < 1.9 * a ? v : null;
      });
      const p = x + a;
      return {
        content: `그림과 같은 직사각형 $ABCD$에서 두 대각선의 교점을 $O$라 하자. $\\overline{AB}=${a}\\,\\mathrm{cm}$이고 삼각형 $OAB$의 둘레의 길이가 $${p}\\,\\mathrm{cm}$일 때, $\\overline{AC}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `직사각형의 두 대각선은 길이가 같고 서로 다른 것을 이등분하므로 $\\overline{OA}=\\overline{OB}=\\dfrac{1}{2}\\overline{AC}$이다.\n삼각형 $OAB$의 둘레의 길이는 $\\overline{OA}+\\overline{OB}+\\overline{AB}=\\overline{AC}+\\overline{AB}$와 같으므로 $\\overline{AC}=${p}-${a}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, a, p, x },
        figureSpec: figRect01(r2(Math.sqrt(x * x - a * a)), a),
      };
    },
  ),

  def(
    "25",
    "마름모의 두 대각선과 넓이",
    SEC.직사각형류,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const m = 2 * intBetween(rng, 3, 11);
      const n = attempt(80, () => {
        const v = intBetween(rng, 5, 22);
        return v > 0.45 * m && v < 2.2 * m ? v : null;
      });
      const S = (m * n) / 2;
      // 대각선의 직각 기호는 `figRhombus` 가 이미 붙인다 — 여기서 또 주지 않는다.
      const rhombus = figRhombus(n / 2, m / 2, {});
      if (mode === 0) {
        return {
          content: `그림과 같은 마름모 $ABCD$에서 두 대각선의 길이가 $\\overline{AC}=${m}\\,\\mathrm{cm}$, $\\overline{BD}=${n}\\,\\mathrm{cm}$일 때, $\\square ABCD$의 넓이를 구하시오.`,
          answer: `$${S}\\,\\mathrm{cm}^2$`,
          solution: `마름모의 두 대각선은 서로 다른 것을 수직이등분하므로 마름모의 넓이는 두 대각선의 길이의 곱의 절반이다.\n따라서 $\\square ABCD$의 넓이는 $\\dfrac{1}{2}\\times${m}\\times${n}=${S}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { mode, m, n, S, x: S },
          figureSpec: rhombus,
        };
      }
      return {
        content: `그림과 같은 마름모 $ABCD$에서 $\\overline{AC}=${m}\\,\\mathrm{cm}$이고 $\\square ABCD$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, $\\overline{BD}$의 길이를 구하시오.`,
        answer: `$${n}\\,\\mathrm{cm}$`,
        solution: `마름모의 넓이는 두 대각선의 길이의 곱의 절반이므로 $\\dfrac{1}{2}\\times${m}\\times\\overline{BD}=${S}$이다.\n따라서 $\\overline{BD}=\\dfrac{2\\times${S}}{${m}}=${n}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, m, n, S, x: n },
        figureSpec: rhombus,
      };
    },
  ),

  def(
    "26",
    "정사각형의 대각선이 나눈 네 삼각형",
    SEC.직사각형류,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const t = intBetween(rng, 3, 25);
      const S = 4 * t;
      if (mode === 0) {
        return {
          content: `그림과 같은 정사각형 $ABCD$에서 두 대각선의 교점을 $O$라 하자. $\\square ABCD$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 삼각형 $OAB$의 넓이를 구하시오.`,
          answer: `$${t}\\,\\mathrm{cm}^2$`,
          solution: `정사각형의 두 대각선은 길이가 같고 서로 다른 것을 수직이등분하므로 네 삼각형 $OAB$, $OBC$, $OCD$, $ODA$는 모두 합동이다.\n따라서 삼각형 $OAB$의 넓이는 $${S}\\div4=${t}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { mode, S, t, x: t },
          figureSpec: figSquareDiag(120),
        };
      }
      const x = 2 * t;
      return {
        content: `그림과 같은 정사각형 $ABCD$에서 두 대각선의 교점을 $O$라 하자. 삼각형 $OBC$의 넓이가 $${t}\\,\\mathrm{cm}^2$일 때, 삼각형 $ABD$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `두 대각선이 정사각형을 합동인 네 삼각형으로 나누므로 $\\square ABCD$의 넓이는 $4\\times${t}=${S}\\,(\\mathrm{cm}^2)$이다.\n대각선 $\\overline{BD}$가 정사각형의 넓이를 이등분하므로 삼각형 $ABD$의 넓이는 $${S}\\div2=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { mode, S, t, x },
        figureSpec: figSquareDiag(120),
      };
    },
  ),

  def(
    "27",
    "정사각형의 대각선 위의 점",
    SEC.직사각형류,
    "심화하",
    (rng): Body => {
      // $P$ 가 중심 $O$ 와 $D$ 사이에 있어야 $\angle APC$ 가 우각이 되지 않는다
      // ($\angle PAB=45^\circ$ 이면 $A$·$P$·$C$ 가 한 직선 위에 놓인다).
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const a = intBetween(rng, 50, 85);
        const apb = 135 - a;
        const x = 2 * apb;
        return {
          content: `그림과 같은 정사각형 $ABCD$의 대각선 $BD$ 위에 점 $P$가 있다. $\\angle PAB=${a}^\\circ$일 때, $\\angle APC$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `삼각형 $ABP$와 삼각형 $CBP$에서 $\\overline{AB}=\\overline{CB}$이고, 대각선 $BD$가 $\\angle B$를 이등분하므로 $\\angle ABP=\\angle CBP=45^\\circ$이며 $\\overline{BP}$는 공통이다.\n두 삼각형이 합동이므로 $\\angle BPA=\\angle BPC$이고, 삼각형 $ABP$에서 $\\angle APB=180^\\circ-45^\\circ-${a}^\\circ=${apb}^\\circ$이다.\n따라서 $\\angle APC=2\\times${apb}^\\circ=${x}^\\circ$이다.`,
          facts: { mode, a, apb, x },
          figureSpec: figSquareDiagPoint27(a, 0),
        };
      }
      const apb = intBetween(rng, 50, 85);
      const a = 135 - apb;
      const x = 90 - a;
      return {
        content: `그림과 같은 정사각형 $ABCD$의 대각선 $BD$ 위에 점 $P$가 있다. $\\angle APB=${apb}^\\circ$일 때, $\\angle PAD$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `대각선 $BD$가 $\\angle B$를 이등분하므로 $\\angle ABP=45^\\circ$이다.\n삼각형 $ABP$에서 $\\angle PAB=180^\\circ-45^\\circ-${apb}^\\circ=${a}^\\circ$이다.\n정사각형의 한 내각의 크기는 $90^\\circ$이므로 $\\angle PAD=90^\\circ-${a}^\\circ=${x}^\\circ$이다.`,
        facts: { mode, a, apb, x },
        figureSpec: figSquareDiagPoint27(a, 1),
      };
    },
  ),
];
