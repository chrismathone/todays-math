/**
 * 중2 «채색» 그림 — 회전판(원판 등분)과 색칠하기 부분 나누기.
 * FigureSpec v2 **채색 축**(09-figure-engine-guide §1: `regions` · 호 조각 ·
 * `circles`)만 쓴다. 계층 B(프리미티브 f-string)는 쓰지 않는다.
 *
 * 두 소비자가 있다:
 *  - `m2Prob.ts` 확률 01·03·06 의 **회전판** 소재 — 칸마다 다른 옅은 색 + 칸 안의 수
 *  - `m2Counting.ts` 경우의 수 15 **색칠하는 경우의 수** — 부분 나누기 도형
 *
 * ## 왜 색칠하기 도형은 «칸마다 다른 색»이 아닌가
 * 회전판은 색이 **장식**이다(문항이 묻는 것은 칸에 적힌 수). 색칠하기는 색이
 * **답**이다 — 부분마다 다른 옅은 색을 미리 깔면 「이미 칠해져 있는데?」로 읽힌다.
 * 그래서 색칠하기 도형은 옅은 중립색 하나로 깔고, 부분은 **경계선과 이름표**로
 * 가른다. 지면은 흑백으로 인쇄되므로(절대 규칙 6) 색으로만 갈리는 그림은
 * 애초에 종이에서 못 푼다 — 회전판 칸에 **수를 적는** 것도 같은 이유다.
 *
 * ## 그림이 곧 검산이다
 * 영역(`regions`)의 경계 조각이 **인접 관계를 그대로 담는다** — 두 부분이 이웃하면
 * 반드시 경계 조각 하나(같은 두 점의 선분, 또는 같은 원 위 같은 두 점의 호)를
 * 나눠 갖는다. 테스트는 그 그림에서 인접 그래프를 **되읽어** 색칠 가짓수를
 * 전수 나열로 세고 정답과 맞댄다. 그러므로 도형을 만들 때
 * **이웃한 두 영역의 맞닿은 조각은 반드시 같은 두 점으로 쪼개 적어야 한다**
 * (가운데 원의 경계를 반원 두 개로 적으면 둘레 부채꼴과 조각이 안 맞아
 * 「이웃이 아니다」가 된다 — 그래서 둘레 점 전부를 지나는 호 사슬로 적는다).
 */

/** 회전판 칸 색 — 전부 옅다(엔진 휘도 하한 0.78). 흑백에서는 수가 가른다. */
export const SPIN_FILLS: readonly string[] = [
  "#f7d3d3",
  "#d3e2f7",
  "#f9eecb",
  "#d8f0d8",
  "#e8dff5",
  "#fce1cd",
  "#d9eef1",
  "#f0e3d2",
];

/** 색칠하기 부분의 바탕 — 중립 한 가지 (위 주석의 이유). */
export const SHADE_TINT = "#f3efe7";

/** 부분 이름표 — A 부터. 다섯 부분까지 쓴다. */
export const PART_LETTERS = ["A", "B", "C", "D", "E"] as const;

type Spec = Record<string, unknown>;

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/** 회전판 반지름 — 이름표가 칸 안(0.6R)에 들어가고 지면에서 안 작아지는 크기. */
const SPIN_R = 62;
/** 색칠하기 원 반지름. */
const DISC_R = 58;

/**
 * 회전판 — 원을 `k` 등분해 칸마다 다른 옅은 색을 깔고 칸 안에 `texts[i]` 를 적는다.
 * 위쪽 바깥에 고정 바늘(삼각형)을 둔다. 첫 칸의 시작 경계가 바로 위(90°)이고
 * 칸은 시계 방향으로 돈다 — 바늘이 **경계선**을 가리키므로 어느 칸도 미리
 * 정해지지 않는다(발문의 「경계선을 가리키는 경우는 생각하지 않는다」와 짝).
 */
export function spinnerSpec(k: number, texts: readonly string[]): Spec {
  if (k < 3 || k > SPIN_FILLS.length) {
    throw new Error(`회전판 칸 수는 3~${SPIN_FILLS.length} 입니다: ${k}`);
  }
  if (texts.length !== k) {
    throw new Error(
      `회전판 칸 수와 적을 글자 수가 다릅니다: ${k} ≠ ${texts.length}`,
    );
  }
  const points: Record<string, unknown> = { O: [0, 0] };
  const segments: Record<string, unknown> = {};
  const regions: Record<string, unknown> = {};
  const labels: Record<string, unknown> = {};
  for (let i = 0; i < k; i += 1) {
    points[`A${i}`] = {
      type: "on_circle",
      circle: "c",
      angle: r4(90 - (i * 360) / k),
    };
    segments[`r${i}`] = ["O", `A${i}`];
  }
  for (let i = 0; i < k; i += 1) {
    const j = (i + 1) % k;
    regions[`s${i}`] = {
      boundary: [
        { seg: ["O", `A${i}`] },
        { arc: { circle: "c", from: `A${i}`, to: `A${j}`, dir: "cw" } },
        { seg: [`A${j}`, "O"] },
      ],
      fill: SPIN_FILLS[i]!,
    };
    const mid = ((90 - (i + 0.5) * (360 / k)) * Math.PI) / 180;
    points[`L${i}`] = [
      r4(0.6 * SPIN_R * Math.cos(mid)),
      r4(-0.6 * SPIN_R * Math.sin(mid)),
    ];
    labels[`L${i}`] = { text: texts[i]!, dx: 0, dy: 0 };
  }
  // 고정 바늘 — 원 밖 위쪽의 작은 삼각형. 끝이 첫 경계선을 가리킨다.
  points.T1 = [-7, -SPIN_R - 13];
  points.T2 = [7, -SPIN_R - 13];
  points.T3 = [0, -SPIN_R + 3];
  segments.t1 = ["T1", "T2"];
  segments.t2 = ["T2", "T3"];
  segments.t3 = ["T3", "T1"];
  regions.ptr = {
    boundary: [
      { seg: ["T1", "T2"] },
      { seg: ["T2", "T3"] },
      { seg: ["T3", "T1"] },
    ],
    fill: "#dcdcdc",
  };
  return {
    version: 2,
    points,
    circles: { c: { center: "O", radius: SPIN_R } },
    segments,
    regions,
    labels,
  };
}

/** 색칠하기 도형의 종류. */
export type ShadeShape = "disc" | "strip" | "fan" | "wheel";

/** 도형 종류별 부분 개수 — `k` 의 뜻이 종류마다 다르다. */
export function shadeParts(shape: ShadeShape, k: number): number {
  return shape === "disc" || shape === "strip" ? k : k + 1;
}

/**
 * 부분 사이 이웃 관계 (부분 색인 → 이웃 색인들). **그림과 같은 규칙**으로 짠다 —
 * 테스트는 이것을 쓰지 않고 `figureSpec` 에서 되읽어 대조한다(동어반복 금지).
 */
export function shadeAdjacency(shape: ShadeShape, k: number): number[][] {
  const parts = shadeParts(shape, k);
  const adj: number[][] = Array.from({ length: parts }, () => []);
  const link = (a: number, b: number): void => {
    adj[a]!.push(b);
    adj[b]!.push(a);
  };
  if (shape === "strip") {
    for (let i = 0; i + 1 < k; i += 1) link(i, i + 1);
  } else if (shape === "disc") {
    for (let i = 0; i < k; i += 1) link(i, (i + 1) % k);
  } else if (shape === "fan") {
    for (let i = 1; i <= k; i += 1) link(0, i);
    for (let i = 1; i + 1 <= k; i += 1) link(i, i + 1);
  } else {
    for (let i = 1; i <= k; i += 1) link(0, i);
    for (let i = 1; i <= k; i += 1) link(i, (i % k) + 1);
  }
  for (const row of adj) row.sort((a, b) => a - b);
  return adj;
}

function discSpec(k: number): Spec {
  const points: Record<string, unknown> = { O: [0, 0] };
  const segments: Record<string, unknown> = {};
  const regions: Record<string, unknown> = {};
  const labels: Record<string, unknown> = {};
  for (let i = 0; i < k; i += 1) {
    points[`A${i}`] = {
      type: "on_circle",
      circle: "c",
      angle: r4(90 - (i * 360) / k),
    };
    segments[`r${i}`] = ["O", `A${i}`];
  }
  for (let i = 0; i < k; i += 1) {
    const j = (i + 1) % k;
    regions[`g${i}`] = {
      boundary: [
        { seg: ["O", `A${i}`] },
        { arc: { circle: "c", from: `A${i}`, to: `A${j}`, dir: "cw" } },
        { seg: [`A${j}`, "O"] },
      ],
      fill: SHADE_TINT,
    };
    const mid = ((90 - (i + 0.5) * (360 / k)) * Math.PI) / 180;
    points[`L${i}`] = [
      r4(0.6 * DISC_R * Math.cos(mid)),
      r4(-0.6 * DISC_R * Math.sin(mid)),
    ];
    labels[`L${i}`] = { text: PART_LETTERS[i]!, dx: 0, dy: 0 };
  }
  return {
    version: 2,
    points,
    circles: { c: { center: "O", radius: DISC_R } },
    segments,
    regions,
    labels,
  };
}

function stripSpec(k: number): Spec {
  const W = 42;
  const H = 48;
  const points: Record<string, unknown> = {};
  const segments: Record<string, unknown> = {};
  const regions: Record<string, unknown> = {};
  const labels: Record<string, unknown> = {};
  for (let i = 0; i <= k; i += 1) {
    points[`T${i}`] = [i * W, 0];
    points[`B${i}`] = [i * W, H];
    segments[`v${i}`] = [`T${i}`, `B${i}`];
  }
  segments.top = ["T0", `T${k}`];
  segments.bot = ["B0", `B${k}`];
  for (let i = 0; i < k; i += 1) {
    regions[`g${i}`] = {
      boundary: [
        { seg: [`T${i}`, `T${i + 1}`] },
        { seg: [`T${i + 1}`, `B${i + 1}`] },
        { seg: [`B${i + 1}`, `B${i}`] },
        { seg: [`B${i}`, `T${i}`] },
      ],
      fill: SHADE_TINT,
    };
    points[`L${i}`] = [i * W + W / 2, H / 2];
    labels[`L${i}`] = { text: PART_LETTERS[i]!, dx: 0, dy: 0 };
  }
  return { version: 2, points, segments, regions, labels };
}

function fanSpec(k: number): Spec {
  const W = 44;
  const HT = 40;
  const HB = 44;
  const points: Record<string, unknown> = {};
  const segments: Record<string, unknown> = {};
  const regions: Record<string, unknown> = {};
  const labels: Record<string, unknown> = {};
  for (let i = 0; i <= k; i += 1) {
    points[`M${i}`] = [i * W, 0];
    points[`B${i}`] = [i * W, HB];
    segments[`v${i}`] = [`M${i}`, `B${i}`];
  }
  points.T0 = [0, -HT];
  points[`T${k}`] = [k * W, -HT];
  segments.top = ["T0", `T${k}`];
  segments.left = ["T0", "M0"];
  segments.right = [`T${k}`, `M${k}`];
  segments.mid = ["M0", `M${k}`];
  segments.bot = ["B0", `B${k}`];
  // 윗칸의 아랫변은 아랫칸마다 하나씩 쪼개 적는다 — 그래야 «맞닿은 조각»이 같다.
  const topBoundary: Record<string, unknown>[] = [];
  for (let i = 0; i < k; i += 1) {
    topBoundary.push({ seg: [`M${i}`, `M${i + 1}`] });
  }
  topBoundary.push({ seg: [`M${k}`, `T${k}`] });
  topBoundary.push({ seg: [`T${k}`, "T0"] });
  topBoundary.push({ seg: ["T0", "M0"] });
  regions.g0 = { boundary: topBoundary, fill: SHADE_TINT };
  points.L0 = [(k * W) / 2, -HT / 2];
  labels.L0 = { text: PART_LETTERS[0]!, dx: 0, dy: 0 };
  for (let i = 0; i < k; i += 1) {
    regions[`g${i + 1}`] = {
      boundary: [
        { seg: [`M${i}`, `M${i + 1}`] },
        { seg: [`M${i + 1}`, `B${i + 1}`] },
        { seg: [`B${i + 1}`, `B${i}`] },
        { seg: [`B${i}`, `M${i}`] },
      ],
      fill: SHADE_TINT,
    };
    points[`L${i + 1}`] = [i * W + W / 2, HB / 2];
    labels[`L${i + 1}`] = { text: PART_LETTERS[i + 1]!, dx: 0, dy: 0 };
  }
  return { version: 2, points, segments, regions, labels };
}

function wheelSpec(k: number): Spec {
  const RO = 66;
  const RI = 26;
  const points: Record<string, unknown> = { O: [0, 0] };
  const segments: Record<string, unknown> = {};
  const regions: Record<string, unknown> = {};
  const labels: Record<string, unknown> = {};
  for (let i = 0; i < k; i += 1) {
    const angle = r4(90 - (i * 360) / k);
    points[`A${i}`] = { type: "on_circle", circle: "out", angle };
    points[`B${i}`] = { type: "on_circle", circle: "inn", angle };
    segments[`r${i}`] = [`B${i}`, `A${i}`];
  }
  // 가운데 원의 경계를 **둘레 점 전부를 지나는 호 사슬**로 적는다 —
  // 반원 둘로 적으면 둘레 부채꼴과 조각이 안 맞아 이웃이 사라진다.
  regions.g0 = {
    boundary: Array.from({ length: k }, (_v, i) => ({
      arc: { circle: "inn", from: `B${i}`, to: `B${(i + 1) % k}`, dir: "cw" },
    })),
    fill: SHADE_TINT,
  };
  labels.O = { text: PART_LETTERS[0]!, dx: 0, dy: 0 };
  for (let i = 0; i < k; i += 1) {
    const j = (i + 1) % k;
    regions[`g${i + 1}`] = {
      boundary: [
        { seg: [`B${i}`, `A${i}`] },
        { arc: { circle: "out", from: `A${i}`, to: `A${j}`, dir: "cw" } },
        { seg: [`A${j}`, `B${j}`] },
        { arc: { circle: "inn", from: `B${j}`, to: `B${i}`, dir: "ccw" } },
      ],
      fill: SHADE_TINT,
    };
    const mid = ((90 - (i + 0.5) * (360 / k)) * Math.PI) / 180;
    const rr = (RO + RI) / 2;
    points[`L${i}`] = [r4(rr * Math.cos(mid)), r4(-rr * Math.sin(mid))];
    labels[`L${i}`] = { text: PART_LETTERS[i + 1]!, dx: 0, dy: 0 };
  }
  return {
    version: 2,
    points,
    circles: {
      out: { center: "O", radius: RO },
      inn: { center: "O", radius: RI },
    },
    segments,
    regions,
    labels,
  };
}

/**
 * 색칠하기 부분 나누기 도형 — 영역 이름은 `g0`..`g{부분수-1}` 이고
 * 그 차례가 이름표 A, B, C, … 의 차례다.
 */
export function shadePartsSpec(shape: ShadeShape, k: number): Spec {
  const parts = shadeParts(shape, k);
  if (parts > PART_LETTERS.length) {
    throw new Error(
      `부분이 ${PART_LETTERS.length}개를 넘습니다: ${shape} ${k}`,
    );
  }
  if (k < 3) throw new Error(`나누는 수가 너무 작습니다: ${shape} ${k}`);
  if (shape === "disc") return discSpec(k);
  if (shape === "strip") return stripSpec(k);
  if (shape === "fan") return fanSpec(k);
  return wheelSpec(k);
}
