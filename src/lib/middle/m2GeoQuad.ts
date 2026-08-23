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

import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-2";
const MINOR = "여러 가지 사각형";

/** 우리 `Unit.section` 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC = {
  직사각형류: "직사각형, 마름모, 정사각형",
  등변사다리꼴: "등변사다리꼴, 여러 가지 사각형",
} as const;

const DEG = Math.PI / 180;

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
  if (acLabel !== undefined) {
    pts.n1 = [0.31 * s, 0.62 * s];
    labels.n1 = acLabel;
  }
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
      rB: { vertex: "B", points: ["A", "C"], right: true },
      rO: { vertex: "O", points: ["A", "B"], right: true },
    },
    labels,
  };
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
  if (opts.angB !== undefined) {
    angles.angB = { vertex: "B", points: ["A", "C"], label: opts.angB };
  }
  if (opts.angADB !== undefined) {
    angles.angADB = { vertex: "D", points: ["A", "B"], label: opts.angADB };
  }
  for (const [k, v] of Object.entries(opts.labels ?? {})) {
    const anchor: Record<string, XY> = {
      top: [off + top / 2, height + 15],
      bottom: [bottom / 2, -15],
      left: [off / 2 - 16, height / 2],
      right: [bottom - off / 2 + 16, height / 2],
      ch: [bottom - off / 2, -15],
    };
    if (anchor[k]) {
      pts[`n_${k}`] = anchor[k]!;
      labels[`n_${k}`] = v;
    }
  }
  return { version: 2, points: fitPts(pts), segments, angles, labels };
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
  if (labels.ad !== undefined) {
    pts.n1 = [p / 2, h + 15];
    out.n1 = labels.ad;
  }
  if (labels.fc !== undefined) {
    pts.n2 = [(fx + p) / 2, -15];
    out.n2 = labels.fc;
  }
  return {
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

// ── 유형 ────────────────────────────────────────────────────────────────

export const M2_GEO_QUAD: TypeEntry[] = [
  def("01", "직사각형의 뜻과 성질", SEC.직사각형류, "easy", (rng): Body => {
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
    "mid",
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
        solution: `평행사변형이 직사각형이 되려면 두 대각선의 길이가 같아야 하므로 $${p}x+${q}=x+${s}$이다.\n$${p - 1}x=${s - q}$이므로 $x=${x}$이고, $\\overline{AC}=${p}\\times${x}+${q}=${len}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, p, q, s, x, len },
        figureSpec: figPara(150, 92, 40, true),
      };
    },
  ),

  def("03", "마름모의 뜻과 성질", SEC.직사각형류, "mid", (rng): Body => {
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
    "mid",
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
          solution: `평행사변형이 마름모가 되려면 이웃하는 두 변의 길이가 같아야 하므로 $${p}x+${q}=x+${s}$이다.\n$${p - 1}x=${s - q}$이므로 $x=${x}$이고 한 변의 길이는 $${side}\\,\\mathrm{cm}$이다.\n따라서 둘레의 길이는 $4\\times${side}=${peri}\\,(\\mathrm{cm})$이다.`,
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

  def("05", "정사각형의 뜻과 성질", SEC.직사각형류, "mid", (rng): Body => {
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

  def("06", "정사각형이 되는 조건", SEC.직사각형류, "mid", (rng): Body => {
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
        solution: `직사각형이 정사각형이 되려면 이웃하는 두 변의 길이가 같아야 하므로 $${p}x+${q}=x+${s}$이다.\n$${p - 1}x=${s - q}$이므로 $x=${x}$이고 한 변의 길이는 $${side}\\,\\mathrm{cm}$이다.\n따라서 넓이는 $${side}\\times${side}=${area}\\,(\\mathrm{cm}^2)$이다.`,
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
      solution: `마름모가 정사각형이 되려면 두 대각선의 길이가 같아야 하므로 $${p}x+${q}=x+${s}$이다.\n$${p - 1}x=${s - q}$이므로 $x=${x}$이고 두 대각선의 길이는 모두 $${d}\\,\\mathrm{cm}$이다.\n마름모의 두 대각선은 서로 수직이므로 넓이는 $\\dfrac{1}{2}\\times${d}\\times${d}=${area}\\,(\\mathrm{cm}^2)$이다.`,
      facts: { mode, p, q, s, x, d, area },
      figureSpec: figRhombus(96, 96, {}),
    };
  }),

  def(
    "07",
    "등변사다리꼴의 뜻과 성질",
    SEC.등변사다리꼴,
    "mid",
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
        figureSpec: figIsoTrap(
          80,
          80 + 2 * r2(96 / Math.tan(2 * t * DEG)),
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
    "mid",
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
          angB: "60°",
          labels: { top: `${p} cm`, left: `${c} cm` },
        }),
      };
    },
  ),

  def(
    "09",
    "여러 가지 사각형의 판별 ⑴",
    SEC.등변사다리꼴,
    "hard",
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
    "mid",
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
    "mid",
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
    "mid",
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
    "hard",
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
];
