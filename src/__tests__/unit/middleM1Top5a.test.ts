/**
 * 중1 **5차 확대 갈래 (갈래 a)**(`m1Top5a.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `65X` | 「평각의 절반」 공식 $90^\circ+\dfrac{\text{가운데}}{2}$ 한 줄 | 반직선을 **좌표로 실제로 놓는다** — 안 정해지는 각을 $1^\circ$부터 끝까지 **모두** 넣어 보며 이등분선의 각을 재고, 그 값이 늘 같은지까지 본다(공식을 한 번도 안 쓴다) |
 * | `66X` | $C=360L\div a$ 로 **나눗셈**하고 $C\bmod n$ 으로 자른다 | **곱셈만** 쓴다 — $a\times x=360\times L$ 을 만족하는 $x$ 를 $1$부터 찾고, $q\times n=C$ 인 자연수 $q$ 가 있는지를 $q$ 를 훑어 본다(나눗셈·나머지를 한 번도 안 쓴다) |
 * | `67X` | 삼각수 $\dfrac{k(k+1)}{2}$ 로 줄을 뛴다 | 삼각수를 **한 번도 안 쓴다** — $1$부터 수를 실제로 줄에 **채워 넣어** 배열을 만들고, 그 배열에서 $N$ 의 줄·자리를 읽어 아래 줄의 같은 자리를 꺼낸다 |
 * | `68X` | $2n-4$ · $m-2$ 공식을 되짚는다 | 각기둥·각뿔을 **3차원 좌표로 짓고** 모든 모서리 쌍의 «평행이 아니고 한 평면 위에도 없다»를 벡터로 판정해 꼬인 개수를 실제로 센다(공식을 한 번도 안 쓴다) |
 *
 * ## 🔴 앞 물결들이 흘린 것을 여기서 어떻게 막나
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다.** → 제품 `estimateSolutionPx` 로 **660판**을
 *    재어 **700px 미만**을 잠근다. 자가 살아 있는지(긴 글은 넘는다고 답하는지)도 같이 본다.
 * ㉯ **걸음을 건너뛰었다.** → 남의 자(`isThin`)를 **그대로 import** 해서 잰다.
 * ㉰ **기약이 아닌 분수를 찍었다.** → 지면의 `\dfrac{정수}{정수}` 를 **전부** 훑어
 *    기약인지 본다. ⚠️ 「한 자리도 못 찾으면」 그 검사는 구조적으로 0 이므로
 *    **찾은 자리 수도 같이 못 박는다.**
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다.** → 넷 다 `declaredUpperBound` 가
 *    `null` 임을 660판에서 찍는다(그 함수가 «아니오»도 낼 수 있음을 양성으로 보인다).
 * ㉳ **해설의 «말»을 지키는 시험이 없었다.** → 「평행↔꼬인 위치」·「배수가 아니다↔배수이다」·
 *    「하나로 정해지지 않는다↔정해진다」·「바로 아래 줄↔바로 위 줄」을 **낱말과 수를 함께**
 *    판정하고, 낱말을 뒤집으면 빨개지는 눈금을 같이 둔다. `toContain` 만으로 끝내지 않는다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다.** → `65X` 는 「각각은 정해지지
 *    않는다」고 적고 그 뒤로 두 각의 값을 **한 번도 쓰지 않아야** 하고, `67X` 는
 *    「$c$는 $r+1$ 이하」를 적고 그것이 **실제로 참**이어야 한다. 둘 다 판정한다.
 * ㉶ **D-20 손실 원장을 어림하면 안 된다.** → 「가드 하나만 껐을 때」를 **창 전수**로
 *    다시 세어 모듈 머리말의 표와 **글자 그대로** 맞는지 본다.
 *
 * ## 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(모양이 어긋나거나 불변식을 어긴 지면은 **던진다**).
 * 손으로 쓴 지면에는 `facts` 가 없으므로, 검산기가 `facts.x` 를 되읽는 판이었다면
 * 이 눈금은 **통과할 수가 없다**(2026-08-21 「0 은 «깨끗»과 «못 셈»을 안 가른다」).
 *
 * ## 🔴 등록 전에도 이 시험은 **제품과 같은 지면**을 본다
 *
 * `generate.ts` 등록은 리드 몫이라, 이 시험이 쓰일 때 `registeredTypes()` 가 아직 이
 * 넷을 모를 수 있다. 그렇다고 후처리를 여기 다시 적으면 규칙이 두 벌이 된다 —
 * 그래서 `build()` 가 제품의 후처리 **함수 자체**를 그대로 부르고, 등록되면 곧바로
 * `generateMiddleProblem` 으로 갈아탄다(`m1Top2`~`m1Top4` 시험이 선 자리와 같다).
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";

import { bareNumbers } from "@/lib/elementary/rules";
import { createRng } from "@/lib/elementary/rng";
import {
  declaredUpperBound,
  deriveThreeFormats,
  reversesOrder,
} from "@/lib/engine/deriveFormats";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import { estimateSolutionPx } from "@/lib/printOverflow";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import {
  ANGLE_BISECTOR_WINDOW,
  EQUAL_PART_WINDOW,
  M1_TOP_5A,
  PART_MAX,
  PART_MIN,
  SKEW_EDGE_WINDOW,
  TRIANGLE_ROW_WINDOW,
  aboveInTriangle,
  anglePageNums,
  belowInTriangle,
  bisectorAngleFromMiddle,
  circumferenceFromSector,
  equalPartArcs,
  looksLikeShortcut,
  middleSumFromBisector,
  prismFromSkew,
  prismSideSkew,
  pyramidFromSkew,
  pyramidSideSkew,
  rowEnd,
  solidCounts,
  solidPrefix,
  triangleColumn,
  triangularRow,
  bisectorStopShort,
  triangleStopShort,
} from "@/lib/middle/m1Top5a";
import { tidySolution } from "@/lib/middle/solutionText";
import { resolveMiddleTier } from "@/lib/middle/tier";
import type { MidProblem } from "@/lib/middle/types";
import { assertChooseAllAnswerCount } from "@/lib/problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "@/lib/problem/choiceCountRule";
import { wrapDanClause } from "@/lib/problemText";

// 🔴 남의 자를 **그대로 import** 한다 — 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.
import { isThin } from "../../../scripts/qa/probe-middle-solution-depth";
import {
  koreanJaccard,
  numAnswerJaccard,
  obviousCandidates,
  pageNumbers,
} from "../../../scripts/qa/probe-middle-top-m1";
import { extensionNumberReason } from "../helpers/rpmCatalog";
import { josaMismatches, numVowelFinal, pageSmells } from "../helpers/midPage";

const K65 = "1-2|기본 도형|65X";
const K66 = "1-2|원과 부채꼴|66X";
const K67 = "1-1|일차방정식의 활용|67X";
const K68 = "1-2|위치 관계|68X";
const KEYS = [K65, K66, K67, K68] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K65]: "심화중",
  [K66]: "심화상",
  [K67]: "심화상",
  [K68]: "심화중",
};

/** 리드가 준 소단원별 변형 폭 하한. 이 수만큼 **서로 다른** 변형이 나와야 한다. */
const VARIANT_FLOOR: Record<string, number> = {
  [K65]: 4,
  [K66]: 7,
  [K67]: 12,
  [K68]: 12,
};

/** 판정기(`probe-middle-top-m1.ts`)가 겹침을 잴 때 쓰는 씨앗 — 값을 맞춰 둔다. */
const OVERLAP_SEED = 20260827;

/** 지면 높이·쏠림용 — 씨앗 $220$ × 변형 $3$ = **$660$ 판**(브리프의 600 이상). */
const WIDE: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s < 220; s += 1) {
    for (let v = 0; v < 3; v += 1) out.push([1000003 + s * 7919, v]);
  }
  return out;
})();

/** 값 검산용 — 씨앗 $55$ × 변형 $4$ = **$220$ 판**. */
const BULK: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s < 55; s += 1) {
    for (let v = 0; v < 4; v += 1) out.push([1000003 + s * 7919, v]);
  }
  return out;
})();

// ── 제품과 같은 지면을 만드는 자리 (머리말 참조) ────────────────

const REGISTERED = new Set(registeredTypes().map((t) => t.key));
const ENTRY = new Map(M1_TOP_5A.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중1 5차a ${key}`);
  assertChoiceCount(content, `중1 5차a ${key}`);
  assertChoiceMarks(content, `중1 5차a ${key}`);
  return {
    ...p,
    content,
    solution: tidySolution(p.solution),
    difficulty: resolveMiddleTier(p.difficulty, content, !!p.figureSpec),
  };
}

// ── 소품 ────────────────────────────────────────────────────

/** 파싱이 안 되면 **던진다** — 조용히 통과시키면 그 유형은 분모 밖이 된다. */
function grab(re: RegExp, content: string, who: string): string[] {
  const m = re.exec(content);
  if (m === null) throw new Error(`${who}: 지면 모양이 다르다 — ${content}`);
  return m.slice(1);
}

function answerNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (m === null) throw new Error(`답에 수가 없다: ${text}`);
  return Number(m[0]);
}

// ═══════════════════════════════════════════════════════════
// 검산기 — **지면 글자만** 보고 다른 알고리즘으로 다시 푼다
// ═══════════════════════════════════════════════════════════

/**
 * `65X` — 반직선을 **좌표로 실제로 놓아** 이등분선이 이루는 각을 잰다.
 *
 * 「안 정해지는 두 각」을 $1^\circ$부터 끝까지 **모두** 넣어 보고, 나온 값이 하나로
 * 모이는지까지 확인한다(모이지 않으면 던진다 — 그러면 이 유형의 전제가 거짓이다).
 * 공식 $90+\dfrac{\text{가운데}}{2}$ 는 한 번도 쓰지 않는다.
 */
function angleFromRays(middleSum: number): number {
  const seen = new Set<number>();
  for (let alpha = 1; alpha + middleSum < 180; alpha += 1) {
    const last = 180 - middleSum - alpha;
    if (last <= 0) continue;
    // 반직선의 방향(도) — $OA$ 를 $0$ 으로 놓는다.
    const at = { A: 0, B: alpha, D: alpha + middleSum, E: 180 };
    const p = (at.A + at.B) / 2; // $\angle AOB$ 의 이등분선
    const q = (at.D + at.E) / 2; // 마지막 각의 이등분선
    seen.add(q - p);
  }
  if (seen.size !== 1) {
    throw new Error(
      `angleFromRays: 값이 하나로 안 모인다 — ${[...seen].join(",")}`,
    );
  }
  const only = [...seen][0]!;
  if (!Number.isInteger(only)) {
    throw new Error(`angleFromRays: 각이 정수가 아니다 — ${only}`);
  }
  return only;
}

function verify65(content: string): number {
  if (/다섯 반직선/.test(content)) {
    const [c1, c2] = grab(
      /\\angle BOC=(\d+)\^\\circ\$, \$\\angle COD=(\d+)\^\\circ\$/,
      content,
      "65X-C",
    );
    return angleFromRays(Number(c1) + Number(c2));
  }
  if (/\\angle POQ=/.test(content)) {
    const [f] = grab(/\\angle POQ=(\d+)\^\\circ\$일 때/, content, "65X-B");
    const target = Number(f);
    const hits: number[] = [];
    for (let mid = 1; mid < 180; mid += 1) {
      let got: number;
      try {
        got = angleFromRays(mid);
      } catch {
        continue;
      }
      if (got === target) hits.push(mid);
    }
    if (hits.length !== 1) {
      throw new Error(`65X-B: 답이 하나가 아니다 — ${hits.join(",")}`);
    }
    return hits[0]!;
  }
  const [c] = grab(/\\angle BOC=(\d+)\^\\circ\$일 때/, content, "65X-A");
  return angleFromRays(Number(c));
}

/**
 * `66X` — **곱셈만** 쓴다. 나눗셈도 나머지도 한 번 안 쓴다.
 */
function verify66(content: string): number {
  const [aTex, lTex] = grab(
    /중심각의 크기가 \$(\d+)\^\\circ\$인 부채꼴의 호의 길이는 \$(\d+)\\,\\mathrm\{cm\}\$/,
    content,
    "66X",
  );
  const [lo, hi] = grab(
    /단, \$n\$은 \$(\d+)\$ 이상 \$(\d+)\$ 이하의 자연수이다/,
    content,
    "66X 범위",
  );
  const a = Number(aTex);
  const L = Number(lTex);
  let C = -1;
  for (let x = 1; x <= 4000; x += 1) {
    if (a * x === 360 * L) {
      C = x;
      break;
    }
  }
  if (C < 0) throw new Error(`66X: 둘레가 자연수가 아니다 — ${a}, ${L}`);
  let sum = 0;
  let kept = 0;
  for (let n = Number(lo); n <= Number(hi); n += 1) {
    for (let q = 1; q <= C; q += 1) {
      if (q * n === C) {
        sum += q;
        kept += 1;
        break;
      }
    }
  }
  if (kept < 2) throw new Error(`66X: 견줄 후보가 모자란다 — ${kept}`);
  return sum;
}

/**
 * `67X` — 배열을 **실제로 채워 넣는다**. 삼각수 공식을 한 번도 안 쓴다.
 */
function verify67(content: string): number {
  const [nTex, dir] = grab(
    /이때 \$(\d+)\$[이가] 있는 줄의 바로 (아래|위) 줄에서/,
    content,
    "67X",
  );
  const N = Number(nTex);
  const rows: number[][] = [];
  let next = 1;
  while (true) {
    const len = rows.length + 1;
    const row: number[] = [];
    for (let i = 0; i < len; i += 1) {
      row.push(next);
      next += 1;
    }
    rows.push(row);
    if (rows.length > 60) throw new Error("67X: 배열이 너무 길다");
    if (rows[rows.length - 1]![len - 1]! > N + 100) break;
  }
  const r = rows.findIndex((row) => row.includes(N));
  if (r < 0) throw new Error(`67X: ${N} 을 못 찾았다`);
  const col = rows[r]!.indexOf(N);
  const target = rows[dir === "아래" ? r + 1 : r - 1]?.[col];
  if (target === undefined)
    throw new Error(`67X: 바로 ${dir} 줄에 같은 자리가 없다`);
  return target;
}

// ── 68X — 각기둥·각뿔을 3차원 좌표로 짓고 꼬인 위치를 벡터로 센다 ──

type Vec = readonly [number, number, number];
type Edge = readonly [Vec, Vec];

function sub(a: Vec, b: Vec): Vec {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: Vec, b: Vec): Vec {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function dot(a: Vec, b: Vec): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function norm(a: Vec): number {
  return Math.sqrt(dot(a, a));
}

/** 두 선분이 **꼬인 위치**인가 — 평행하지 않고 한 평면 위에도 없다. */
export function isSkew(e1: Edge, e2: Edge): boolean {
  const d1 = sub(e1[1], e1[0]);
  const d2 = sub(e2[1], e2[0]);
  const c = cross(d1, d2);
  const cn = norm(c);
  // 평행하면 꼬인 위치가 아니다 — 방향 벡터의 외적이 $0$ 이다.
  if (cn / (norm(d1) * norm(d2)) < 1e-9) return false;
  // 한 평면 위에 있으면(만나거나 만날 수 있으면) 꼬인 위치가 아니다.
  const gap = Math.abs(dot(sub(e2[0], e1[0]), c)) / cn;
  return gap > 1e-9;
}

function regularBase(n: number, z: number): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = (2 * Math.PI * i) / n;
    out.push([Math.cos(t), Math.sin(t), z]);
  }
  return out;
}

/** $n$각기둥의 모서리 전부와, 그중 옆모서리 하나의 색인. */
function prismEdges(n: number): { edges: Edge[]; side: number } {
  const bot = regularBase(n, 0);
  const top = regularBase(n, 1);
  const edges: Edge[] = [];
  for (let i = 0; i < n; i += 1) edges.push([bot[i]!, bot[(i + 1) % n]!]);
  for (let i = 0; i < n; i += 1) edges.push([top[i]!, top[(i + 1) % n]!]);
  const side = edges.length;
  for (let i = 0; i < n; i += 1) edges.push([bot[i]!, top[i]!]);
  return { edges, side };
}

/** $m$각뿔의 모서리 전부와, 그중 옆모서리 하나의 색인. */
function pyramidEdges(m: number): { edges: Edge[]; side: number } {
  const bot = regularBase(m, 0);
  const apex: Vec = [0, 0, 1];
  const edges: Edge[] = [];
  for (let i = 0; i < m; i += 1) edges.push([bot[i]!, bot[(i + 1) % m]!]);
  const side = edges.length;
  for (let i = 0; i < m; i += 1) edges.push([bot[i]!, apex]);
  return { edges, side };
}

function countSkew(edges: Edge[], at: number): number {
  let k = 0;
  for (let i = 0; i < edges.length; i += 1) {
    if (i === at) continue;
    if (isSkew(edges[at]!, edges[i]!)) k += 1;
  }
  return k;
}

/** 모서리 목록에서 꼭짓점 개수 — 좌표를 반올림해 겹치는 것을 하나로 센다. */
function countVertices(edges: Edge[]): number {
  const seen = new Set<string>();
  for (const e of edges) {
    for (const v of e) seen.add(v.map((x) => x.toFixed(6)).join(","));
  }
  return seen.size;
}

/**
 * 면의 개수는 **오일러의 다면체 정리**로 센다 — $V-E+F=2$.
 *
 * 🔴 「각기둥의 면은 $n+2$」를 여기 다시 적으면 동어반복이다. 꼭짓점과 모서리는
 * 좌표에서 실제로 세었으므로, 그 둘에서 면을 유도하는 것은 **다른 길**이다.
 */
function countFaces(edges: Edge[]): number {
  return 2 - countVertices(edges) + edges.length;
}

function verify68(content: string): number {
  const [pTex, qTex] = grab(
    /각기둥에서 한 옆모서리와 꼬인 위치에 있는 모서리는 \$(\d+)\$개이고, 어떤 각뿔에서 한 옆모서리와 꼬인 위치에 있는 모서리는 \$(\d+)\$개이다/,
    content,
    "68X",
  );
  const [ask] = grab(
    /이 각기둥의 (모서리|꼭짓점|면)의 개수와/,
    content,
    "68X 물음",
  );
  const p = Number(pTex);
  const q = Number(qTex);
  const n1: number[] = [];
  const n2: number[] = [];
  for (let n = 3; n <= 34; n += 1) {
    const pr = prismEdges(n);
    if (countSkew(pr.edges, pr.side) === p) n1.push(n);
    const py = pyramidEdges(n);
    if (countSkew(py.edges, py.side) === q) n2.push(n);
  }
  if (n1.length !== 1 || n2.length !== 1) {
    throw new Error(
      `68X: 입체도형이 하나로 안 정해진다 — ${n1.length}/${n2.length}`,
    );
  }
  const pr = prismEdges(n1[0]!).edges;
  const py = pyramidEdges(n2[0]!).edges;
  if (ask === "모서리") return pr.length + py.length;
  if (ask === "꼭짓점") return countVertices(pr) + countVertices(py);
  return countFaces(pr) + countFaces(py);
}

const VERIFY: Record<string, (content: string) => number> = {
  [K65]: verify65,
  [K66]: verify66,
  [K67]: verify67,
  [K68]: verify68,
};

// ═══════════════════════════════════════════════════════════
// 해설의 «말» — ㉳. 낱말을 뒤집으면 빨개진다
// ═══════════════════════════════════════════════════════════

/**
 * 해설이 **판정을 옳게 진술하는가** — 낱말과 수를 함께 본다.
 *
 * 🔴 `toContain` 한 줄로 끝내면 「배수가 아니므로」를 「배수이므로」로 바꿔도 초록이다
 * (4차 물결에서 중1 10줄이 그렇게 무방비였다). 여기서는 «그 낱말이 가리키는 사실»을
 * 지면의 수로 **다시 계산해** 맞대고, 아래 눈금이 낱말을 하나씩 뒤집어 본다.
 */
export function claimFaults(
  key: string,
  content: string,
  solution: string,
): string[] {
  const bad: string[] = [];
  const need = (re: RegExp, why: string): void => {
    if (!re.test(solution)) bad.push(why);
  };
  if (key === K65) {
    need(/평각이므로/, "평각이라는 근거가 없다");
    need(/이등분선/, "이등분선이라는 말이 없다");
    need(/각각 하나로 정해지지 않지만/, "«각각은 안 정해진다»를 안 적었다");
    // 🔴 ㉴ 제약을 세웠으면 그 뒤로 두 각의 «값»을 쓰면 안 된다.
    //    ⚠️ 첫 판은 `/\\angle COD=\d/` 한 줄이었는데 **합**을 적은 줄
    //    (`$\angle AOB+\angle COD=180^\circ-\dots$`)까지 물어 660판이 통째로 빨갰다.
    //    가르는 축은 낱말이 아니라 **바로 앞 글자가 `+` 인가**다 — 합이면 그 앞이 `+`다.
    //    ⚠️ 그리고 **어느 각이 안 정해지는지는 판마다 다르다** — 반직선이 넷이면
    //    $\angle AOB$·$\angle COD$ 이고 다섯이면 $\angle AOB$·$\angle DOE$ 다.
    //    첫 판은 `COD` 를 늘 금지해 «다섯 반직선» 판의 **주어진 값**까지 물었다.
    const loose = /다섯 반직선/.test(content)
      ? /\\angle (?:AOB|DOE)=\d/g
      : /\\angle (?:AOB|COD)=\d/g;
    for (const m of solution.matchAll(loose)) {
      const before = solution.slice(Math.max(0, m.index - 1), m.index);
      if (before !== "+") bad.push("정해지지 않는다고 적고 그 각의 값을 썼다");
    }
    // 합은 실제로 $180$ 에서 나온 값이어야 한다.
    const m =
      /\\angle AOB\+\\angle (?:COD|DOE)=180\^\\circ-(\d+)\^\\circ=(\d+)\^\\circ/.exec(
        solution,
      );
    if (m && 180 - Number(m[1]) !== Number(m[2]))
      bad.push("두 각의 합이 틀렸다");
  }
  if (key === K66) {
    need(/중심각의 크기에 정비례한다/, "정비례라는 근거가 없다");
    const m = /\$(\d+)\$[은는] ((?:\$\d+\$(?:, )?)+)의 배수가 아니므로/.exec(
      solution,
    );
    if (!m) bad.push("«배수가 아니다»를 안 적었다");
    else {
      const C = Number(m[1]);
      for (const t of m[2]!.matchAll(/\d+/g)) {
        if (C % Number(t[0]) === 0)
          bad.push(`$${C}$는 $${t[0]}$의 배수인데 아니라 적었다`);
      }
    }
    for (const g of solution.matchAll(/\$(\d+)\\div(\d+)=(\d+)\$/g)) {
      if (Number(g[3]) * Number(g[2]) !== Number(g[1])) {
        bad.push(`나눗셈이 틀렸다 — ${g[0]}`);
      }
    }
    if (!/모두 자연수이지만|자연수이지만/.test(solution)) {
      bad.push("«자연수이다»를 안 적었다");
    }
  }
  if (key === K67) {
    need(/왼쪽으로부터/, "자리를 세는 방향을 안 적었다");
    // 🔴 발문의 «아래/위»와 해설의 «아래/위»가 **같아야** 한다. 낱말 하나만 보면
    //    둘을 같이 뒤집었을 때 초록이 되고, 한쪽만 봐도 다른 쪽 결함을 못 본다.
    const dirC = /바로 (아래|위) 줄에서/.exec(content);
    const dirS = /바로 (아래|위) 줄인 \$(\d+)\$째 줄/.exec(solution);
    const here = /\$(\d+)\$째 줄에 있다/.exec(solution);
    if (!dirC || !dirS || !here) bad.push("방향이나 줄 번호를 안 적었다");
    else {
      if (dirC[1] !== dirS[1]) bad.push("발문과 해설의 방향이 다르다");
      const step = dirS[1] === "아래" ? 1 : -1;
      if (Number(dirS[2]) !== Number(here[1]) + step) {
        bad.push("방향과 줄 번호가 어긋난다");
      }
    }
    // ㉴ 「$c$는 $r+1$ 이하」를 적었으면 그것이 실제로 참이어야 한다.
    const m = /\$(\d+)\$[은는] \$(\d+)\$ 이하이므로/.exec(solution);
    if (!m) bad.push("«자리가 줄 길이 이하»를 안 적었다");
    else if (Number(m[1]) > Number(m[2])) bad.push("이하라고 적었는데 크다");
    const r = /\$(\d+)<(\d+)\\le(\d+)\$이므로/.exec(solution);
    if (!r) bad.push("줄을 고르는 범위 판정이 없다");
    else if (!(Number(r[1]) < Number(r[2]) && Number(r[2]) <= Number(r[3]))) {
      bad.push("범위 판정이 거짓이다");
    }
  }
  if (key === K68) {
    need(
      /나머지 옆모서리 \$\(n-1\)\$개와 각각 평행하고/,
      "각기둥 옆모서리가 «평행»이 아니다",
    );
    need(/꼭대기의 꼭짓점에서 만나고/, "각뿔 옆모서리가 «만난다»가 아니다");
    need(/한 점에서 만난다/, "«한 점에서 만난다»를 안 적었다");
    for (const g of solution.matchAll(/\$(\d)n-4=(\d+)\$에서 \$n=(\d+)\$/g)) {
      if (Number(g[1]) * Number(g[3]) - 4 !== Number(g[2]))
        bad.push("각기둥 되짚기가 틀렸다");
    }
    for (const g of solution.matchAll(/\$m-2=(\d+)\$에서 \$m=(\d+)\$/g)) {
      if (Number(g[2]) - 2 !== Number(g[1])) bad.push("각뿔 되짚기가 틀렸다");
    }
  }
  void content;
  return bad;
}

// ═══════════════════════════════════════════════════════════
// 눈금 — 이 자가 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

describe("중1 5차a 확대 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it("🔴 양성 — 손으로 쓴 지면에서 사람이 계산한 답을 그대로 낸다", () => {
    // 65X-A: 가운데 $80^\circ$ → $\angle AOB+\angle COD=100^\circ$, 이등분선의 각 $50+80=130$.
    expect(
      verify65(
        "한 점 $O$에서 네 반직선 $OA$, $OB$, $OC$, $OD$를 이 차례로 그었더니 $\\angle AOD$가 평각이 되었다. $\\angle BOC=80^\\circ$일 때, $\\angle AOB$의 이등분선 $OP$와 $\\angle COD$의 이등분선 $OQ$가 이루는 각의 크기를 구하시오.",
      ),
    ).toBe(130);
    // 65X-B: 이등분선의 각 $130^\circ$ → 가운데 $80^\circ$.
    expect(
      verify65(
        "한 점 $O$에서 네 반직선 $OA$, $OB$, $OC$, $OD$를 이 차례로 그었더니 $\\angle AOD$가 평각이 되었다. $\\angle AOB$의 이등분선을 $OP$, $\\angle COD$의 이등분선을 $OQ$라 하자. $\\angle POQ=130^\\circ$일 때, $\\angle BOC$의 크기를 구하시오.",
      ),
    ).toBe(80);
    // 65X-C: 가운데 $30+50=80$ → $130$.
    expect(
      verify65(
        "한 점 $O$에서 다섯 반직선 $OA$, $OB$, $OC$, $OD$, $OE$를 이 차례로 그었더니 $\\angle AOE$가 평각이 되었다. $\\angle BOC=30^\\circ$, $\\angle COD=50^\\circ$일 때, $\\angle AOB$의 이등분선 $OP$와 $\\angle DOE$의 이등분선 $OQ$가 이루는 각의 크기를 구하시오.",
      ),
    ).toBe(130);
    // 66X: 중심각 $90^\circ$·호 $30$ → 둘레 $120$. $3,4,5,6,8$ 이 나누어 $40+30+24+20+15=129$.
    expect(
      verify66(
        "한 원에서 중심각의 크기가 $90^\\circ$인 부채꼴의 호의 길이는 $30\\,\\mathrm{cm}$이다. 어쩌고. (단, $n$은 $3$ 이상 $9$ 이하의 자연수이다.)",
      ),
    ).toBe(129);
    // 67X: $12$ 는 넷째 줄($7$~$10$)이 아니라 다섯째 줄($11$~$15$)의 둘째. 아래 줄 여섯째 줄은
    //      $16$~$21$ 이고 그 둘째는 $17$ = $12+5$.
    expect(
      verify67(
        "자연수를 $1$부터 차례로 늘어놓는다. 이때 $12$가 있는 줄의 바로 아래 줄에서 왼쪽으로부터 $12$와 같은 번째에 있는 수를 구하시오.",
      ),
    ).toBe(17);
    // 68X: 각기둥 꼬인 $8$ → 육각기둥(모서리 $18$), 각뿔 꼬인 $5$ → 칠각뿔(모서리 $14$) → $32$.
    expect(
      verify68(
        "어떤 각기둥에서 한 옆모서리와 꼬인 위치에 있는 모서리는 $8$개이고, 어떤 각뿔에서 한 옆모서리와 꼬인 위치에 있는 모서리는 $5$개이다. 이 각기둥의 모서리의 개수와 이 각뿔의 모서리의 개수의 합을 구하시오.",
      ),
    ).toBe(32);
  });

  it("🔴 음성 — 모양이 어긋나거나 불변식을 어긴 지면은 반드시 던진다", () => {
    expect(() => verify65("한 점 $O$에서 네 반직선을 그었다.")).toThrow();
    expect(() =>
      verify66(
        "한 원에서 중심각의 크기가 $7^\\circ$인 부채꼴의 호의 길이는 $5\\,\\mathrm{cm}$이다. (단, $n$은 $3$ 이상 $9$ 이하의 자연수이다.)",
      ),
    ).toThrow();
    expect(() => verify67("이때 $9$가 있는 줄의 바로 옆 줄에서")).toThrow(); // 모양이 다르다
    // 🔴 $10$ 은 넷째 줄의 **마지막** 수라 위 줄에는 그 자리가 없다 — 값이 아니라
    //    «없다»를 내야 한다. 이 음성이 없으면 위 방향 축이 무엇을 못 하는지 안 보인다.
    expect(() => verify67("이때 $10$이 있는 줄의 바로 위 줄에서")).toThrow();
    expect(() =>
      verify68(
        "어떤 각기둥에서 한 옆모서리와 꼬인 위치에 있는 모서리는 $7$개이고, 어떤 각뿔에서 한 옆모서리와 꼬인 위치에 있는 모서리는 $5$개이다. 이 각기둥의 모서리의 개수와 이 각뿔의 모서리의 개수의 합을 구하시오.",
      ),
    ).toThrow(); // 홀수는 $2n-4$ 가 될 수 없다
  });

  it("🔴 3차원 꼬인 위치 판정 자체의 눈금 — 평행·만남·꼬임을 각각 가른다", () => {
    const P: Vec = [0, 0, 0];
    const Q: Vec = [1, 0, 0];
    const R: Vec = [0, 1, 0];
    expect(isSkew([P, Q], [R, [1, 1, 0]])).toBe(false); // 평행 (같은 평면)
    expect(isSkew([P, Q], [P, R])).toBe(false); // 한 점에서 만난다
    expect(
      isSkew(
        [P, Q],
        [
          [0, 1, 1],
          [1, 1, 1],
        ],
      ),
    ).toBe(false); // 평행 (높이만 다르다)
    expect(
      isSkew(
        [P, Q],
        [
          [2, 0, 0],
          [3, 0, 0],
        ],
      ),
    ).toBe(false); // 같은 직선 위
    expect(
      isSkew(
        [P, Q],
        [
          [0, 0, 1],
          [0, 1, 1],
        ],
      ),
    ).toBe(true); // 꼬인 위치
    // ⚠️ 첫 판은 «$x$축 방향과 $y$축 방향인데 높이가 다르면 평행»이라고 적었다 —
    //    그건 **꼬인 위치**다. 자가 그것을 바로 잡아 줬다(양성 하나가 늘었다).
    expect(
      isSkew(
        [P, Q],
        [
          [0, 1, 1],
          [0, 2, 1],
        ],
      ),
    ).toBe(true);
  });

  it("🔴 해설의 «말» 자가 낱말을 뒤집으면 빨개진다 (양성 4 · 음성 8)", () => {
    for (const key of KEYS) {
      const p = build(key, 20260903, 0);
      expect(claimFaults(key, p.content, p.solution), `${key} 양성`).toEqual(
        [],
      );
    }
    // 🔴 `67X` 의 방향은 판마다 다르므로 **지면에서 읽어** 뒤집는다 — 낱말을 손으로
    //    적어 두면 반대 방향 판에서 「원문에 그 낱말이 없다」로 헛돈다.
    const dir67 = /바로 (아래|위) 줄인/.exec(
      build(K67, 20260903, 0).solution,
    )![1]!;
    const flips: ReadonlyArray<readonly [string, string, string]> = [
      [K65, "평각이므로", "직각이므로"],
      [K65, "각각 하나로 정해지지 않지만", "각각 하나로 정해지고"],
      [K66, "중심각의 크기에 정비례한다", "중심각의 크기에 반비례한다"],
      [K66, "의 배수가 아니므로", "의 배수이므로"],
      [
        K67,
        `바로 ${dir67} 줄인`,
        `바로 ${dir67 === "아래" ? "위" : "아래"} 줄인`,
      ],
      [K67, " 이하이므로", " 미만이므로"],
      [K68, "각각 평행하고", "각각 꼬인 위치에 있고"],
      [K68, "꼭대기의 꼭짓점에서 만나고", "꼭대기의 꼭짓점에서 꼬여 있고"],
    ];
    for (const [key, from, to] of flips) {
      const p = build(key, 20260903, 0);
      expect(p.solution, `${key} 원문에 «${from}» 이 없다`).toContain(from);
      const bent = p.solution.replace(from, to);
      expect(bent, `${key} 변이가 안 먹었다`).not.toBe(p.solution);
      expect(
        claimFaults(key, p.content, bent).length,
        `${key} «${from}» → «${to}» 가 초록이다`,
      ).toBeGreaterThan(0);
    }
  });

  it("🔴 수를 흔들어도 빨개진다 — 낱말만 보는 자가 아니다", () => {
    // 🔴 나눗셈 줄의 몫을 하나 올린다. ⚠️ 첫 판은 `\div` 만 보고 바꿨는데 그러면
    //    둘레를 구하는 줄(`$x=360\times160\div288=200$`)이 먼저 걸려 «후보 나열»이
    //    안 바뀌었고 자가 «초록»을 냈다 — 앞에 `$` 가 오는 것만 골라야 후보 줄이다.
    const p66 = build(K66, 20260903, 0);
    const bent66 = p66.solution.replace(
      /\$(\d+)\\div(\d+)=(\d+)\$/,
      (_m, c, n, q) => `$${c}\\div${n}=${Number(q) + 1}$`,
    );
    expect(bent66).not.toBe(p66.solution);
    expect(claimFaults(K66, p66.content, bent66).length).toBeGreaterThan(0);
    // 67X — 범위 판정을 거짓으로 만든다.
    const p67 = build(K67, 20260903, 0);
    const bent67 = p67.solution.replace(
      /\$(\d+)<(\d+)\\le(\d+)\$이므로/,
      (_m, _a, b, c) => `$${Number(c) + 5}<${b}\\le${c}$이므로`,
    );
    expect(bent67).not.toBe(p67.solution);
    expect(claimFaults(K67, p67.content, bent67).length).toBeGreaterThan(0);
    // 68X — 되짚기를 어긋나게 한다.
    const p68 = build(K68, 20260903, 0);
    const bent68 = p68.solution.replace(
      /\$m-2=(\d+)\$에서 \$m=(\d+)\$/,
      (_m, q, mm) => `$m-2=${q}$에서 $m=${Number(mm) + 1}$`,
    );
    expect(bent68).not.toBe(p68.solution);
    expect(claimFaults(K68, p68.content, bent68).length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수와 음성 대조 (㉡)
// ═══════════════════════════════════════════════════════════

describe("중1 5차a 확대 갈래 — 굳힘 함수와 음성 대조", () => {
  it("`bisectorAngleFromMiddle` 은 손 계산과 맞고 되짚기와 왕복한다", () => {
    expect(bisectorAngleFromMiddle(80)).toBe(130);
    expect(bisectorAngleFromMiddle(20)).toBe(100);
    expect(middleSumFromBisector(130)).toBe(80);
    for (let mid = 2; mid < 180; mid += 2) {
      expect(middleSumFromBisector(bisectorAngleFromMiddle(mid))).toBe(mid);
    }
  });

  it("🔴 음성 대조 — 홀수·범위 밖은 던진다 (자가 «아니오»를 낸다)", () => {
    expect(() => bisectorAngleFromMiddle(81)).toThrow();
    expect(() => bisectorAngleFromMiddle(180)).toThrow();
    expect(() => bisectorAngleFromMiddle(0)).toThrow();
    expect(() => middleSumFromBisector(90)).toThrow();
    expect(() => middleSumFromBisector(180)).toThrow();
  });

  it("`equalPartArcs`·`circumferenceFromSector` 는 손 계산과 맞는다", () => {
    expect(circumferenceFromSector(90, 30)).toBe(120);
    expect(equalPartArcs(120).map((e) => e.n)).toEqual([3, 4, 5, 6, 8]);
    expect(equalPartArcs(120).reduce((s, e) => s + e.arc, 0)).toBe(129);
  });

  it("🔴 음성 대조 — 살아남는 $n$ 이 **하나도 없는** 둘레가 실재한다 (빈 배열)", () => {
    expect(equalPartArcs(11)).toEqual([]);
    // ⚠️ $C=7$ 은 음성이 **아니다** — $7$ 은 $7$ 로 나누어진다. 모듈 주석이 한때
    //    그렇게 적혀 있었고 계량기가 그것을 잡았다. 그 사실을 여기 못 박는다.
    expect(equalPartArcs(7)).toEqual([{ n: 7, arc: 1 }]);
    expect(() => circumferenceFromSector(7, 5)).toThrow();
  });

  it("`triangularRow`·`belowInTriangle` 은 손 계산과 맞는다", () => {
    expect(rowEnd(4)).toBe(10);
    expect(triangularRow(10)).toBe(4);
    expect(triangularRow(11)).toBe(5);
    expect(belowInTriangle(12)).toBe(17);
  });

  it("🔴 음성 대조 — 삼각수 자리에서 앞뒤가 **같은 줄**을 낸다 (늘 갈리지 않는다)", () => {
    expect(triangularRow(9)).toBe(triangularRow(10));
    expect(triangularRow(10)).not.toBe(triangularRow(11));
    expect(() => triangularRow(0)).toThrow();
  });

  it("`aboveInTriangle`·`triangleColumn` — 위 줄은 한 칸 짧아 «없다»도 낸다", () => {
    expect(triangleColumn(12)).toBe(2);
    expect(triangleColumn(11)).toBe(1);
    expect(aboveInTriangle(12)).toBe(8);
    // 🔴 $10$ 은 넷째 줄($7,8,9,10$)의 **마지막** 수라 셋째 줄에는 그 자리가 없다.
    expect(triangleColumn(10)).toBe(4);
    expect(aboveInTriangle(10)).toBeNull();
    expect(aboveInTriangle(1)).toBeNull();
    // 줄 안의 마지막 수는 늘 위 줄에 자리가 없다 — 표본이 아니라 전수로 본다.
    for (let r = 2; r <= 18; r += 1)
      expect(aboveInTriangle(rowEnd(r))).toBeNull();
  });

  it("`solidPrefix` — 도형 이름을 아라비아 숫자로 쓰지 않는다", () => {
    expect(solidPrefix(3)).toBe("삼");
    expect(solidPrefix(10)).toBe("십");
    expect(solidPrefix(15)).toBe("십오");
    expect(solidPrefix(20)).toBe("이십");
    expect(solidPrefix(24)).toBe("이십사");
    expect(() => solidPrefix(2)).toThrow();
  });

  it("`prismSideSkew`·`pyramidSideSkew` 와 되짚기가 3차원 셈과 맞는다", () => {
    for (let n = 3; n <= 20; n += 1) {
      const pr = prismEdges(n);
      expect(countSkew(pr.edges, pr.side), `${n}각기둥`).toBe(prismSideSkew(n));
      const py = pyramidEdges(n);
      expect(countSkew(py.edges, py.side), `${n}각뿔`).toBe(pyramidSideSkew(n));
      expect(prismFromSkew(prismSideSkew(n))).toBe(n);
      expect(pyramidFromSkew(pyramidSideSkew(n))).toBe(n);
    }
  });

  it("🔴 음성 대조 — 되짚기가 «못 한다»도 낸다", () => {
    expect(prismFromSkew(7)).toBeNull(); // 홀수는 $2n-4$ 가 아니다
    expect(prismFromSkew(0)).toBeNull();
    expect(pyramidFromSkew(0)).toBeNull();
    expect(prismSideSkew(2)).toBe(0); // 각기둥이 아니다 — 창이 $n\ge3$ 인 까닭
    expect(() => prismSideSkew(1)).toThrow();
  });

  it("`looksLikeShortcut` 이 «아니오» 도 낸다 (양성·음성 한 쌍)", () => {
    expect(looksLikeShortcut(12, [3, 4])).toBe(true); // $3\times4$
    expect(looksLikeShortcut(120, [60])).toBe(true); // $60\times2$
    expect(looksLikeShortcut(131, [60])).toBe(false);
    expect(looksLikeShortcut(97, [3, 4])).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 배선
// ═══════════════════════════════════════════════════════════

describe("중1 5차a 확대 갈래 — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M1_TOP_5A).toHaveLength(4);
    expect(M1_TOP_5A.map((e) => e.key).sort()).toEqual([...KEYS].sort());
    expect(new Set(M1_TOP_5A.map((e) => e.key)).size).toBe(4);
  });

  it("번호가 `X` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M1_TOP_5A) {
      expect(e.rpmType).toMatch(/^\d+X$/);
      expect(
        extensionNumberReason({
          rpmBook: e.rpmBook,
          rpmMinor: e.rpmMinor,
          rpmType: e.rpmType,
        }),
        `${e.key}`,
      ).toBeNull();
    }
  });

  it("소단원 이름이 교육과정 정본에 글자 그대로 있다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_TOP_5A) {
      expect(e.grade).toBe("중1");
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
    // 🔴 색인 밖 유형이 아니라 **소단원 이름**이 정본과 다른 것이 가장 조용한 결함이다.
    expect([...new Set(M1_TOP_5A.map((e) => e.unitSection))].sort()).toEqual(
      [
        "각",
        "공간에서 평면의 위치 관계",
        "원과 부채꼴",
        "일차방정식의 활용(비율, 시계, 규칙)",
      ].sort(),
    );
  });

  it("🔴 등록 상태가 넷 다 같다 — 절반만 등록되면 절반은 제품을, 절반은 대역을 탄다", () => {
    const hit = KEYS.filter((k) => REGISTERED.has(k)).length;
    expect(hit === 0 || hit === 4, `등록된 것 ${hit}/4`).toBe(true);
  });

  it("🔴 제품 후처리가 이 넷에 대해 항등이다 — 그래서 대역이 제품과 같은 지면을 낸다", () => {
    for (const e of M1_TOP_5A) {
      for (const [seed, v] of BULK.slice(0, 24)) {
        const raw = e.handler(createRng(seed + v * 0x9e37));
        expect(wrapDanClause(raw.content), `${e.key} 단 절`).toBe(
          e.key === K66 ? wrapDanClause(raw.content) : raw.content,
        );
        expect(tidySolution(raw.solution), `${e.key} 되풀이`).toBe(
          raw.solution,
        );
        expect(
          resolveMiddleTier(raw.difficulty, raw.content, !!raw.figureSpec),
          `${e.key} 갈래`,
        ).toBe(raw.difficulty);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 지면과 값
// ═══════════════════════════════════════════════════════════

describe("중1 5차a 확대 갈래 — 지면과 값", () => {
  it("🔴 중1에 `심화중`·`심화상` 이 더 생겼다 (D-116 ⑴)", () => {
    for (const key of KEYS) {
      expect(build(key, 20260903, 0).difficulty).toBe(EXPECTED_TIER[key]);
    }
    const tiers = KEYS.map((k) => EXPECTED_TIER[k]);
    expect(tiers.filter((t) => t === "심화중").length).toBeGreaterThan(0);
    expect(tiers.filter((t) => t === "심화상").length).toBeGreaterThan(0);
  });

  for (const e of M1_TOP_5A) {
    describe(`${e.rpmType} — ${e.rpmTitle}`, () => {
      it("🔴 값이 맞다 — 지면만 보고 다른 알고리즘으로 다시 푼다 (220판)", () => {
        let done = 0;
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(VERIFY[e.key]!(p.content), `${e.key} ${seed}/${v}`).toBe(
            answerNumber(p.answer),
          );
          done += 1;
        }
        expect(done).toBe(220);
      });

      it("갈래가 늘 같고 그림을 가리키지 않으며 맨 숫자가 없다 (660판)", () => {
        for (const [seed, v] of WIDE) {
          const p = build(e.key, seed, v);
          expect(p.difficulty).toBe(EXPECTED_TIER[e.key]);
          expect(pointsAtFigure(p.content), `${e.key} ${seed}/${v}`).toBeNull();
          expect(p.figureSpec ?? null).toBeNull();
          expect(bareNumbers(p.content)).toEqual([]);
          expect(bareNumbers(p.solution)).toEqual([]);
        }
      });

      it("🔴 «이/가» 자리를 직접 잰다 — 공용 자의 사각이다 (660판)", () => {
        // 공용 `josaMismatches` 는 「이」를 **안 본다**(서술격 「$5$이다」와 안 갈린다).
        // 그래서 「$65$이 있는 줄」처럼 **가를 써야 할 자리에 이를 쓴** 결함은 그 자가
        // 구조적으로 못 본다 — 실제로 이 유형의 첫 판이 그랬다. 여기서 직접 잰다.
        for (const [seed, v] of WIDE) {
          const p = build(e.key, seed, v);
          for (const m of p.content.matchAll(/\$(\d+)\$([이가])/g)) {
            const want = numVowelFinal(Number(m[1])) ? "가" : "이";
            expect(m[2], `${e.key} ${seed}/${v} — $${m[1]}$${m[2]}`).toBe(want);
          }
        }
        // 그 자가 «아니오»도 낼 수 있음을 양성으로 보인다.
        expect(numVowelFinal(65)).toBe(true);
        expect(numVowelFinal(11)).toBe(false);
      });

      it("조사·냄새·걸음이 깨끗하다 (660판)", () => {
        for (const [seed, v] of WIDE) {
          const p = build(e.key, seed, v);
          expect(josaMismatches(p.content), `${e.key} 발문 조사`).toEqual([]);
          expect(josaMismatches(p.solution), `${e.key} 해설 조사`).toEqual([]);
          expect(pageSmells(p.content), `${e.key} 발문 냄새`).toEqual([]);
          expect(pageSmells(p.solution), `${e.key} 해설 냄새`).toEqual([]);
          expect(isThin(p.content, p.solution), `${e.key} 걸음 부족`).toBe(
            false,
          );
        }
      });

      it("KaTeX 가 붉은 글자를 안 낸다 (220판)", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          const html = renderMathHtml(p.content) + renderMathHtml(p.solution);
          expect(html.includes("katex-error"), `${e.key}`).toBe(false);
          expect(html.includes("#cc0000"), `${e.key}`).toBe(false);
          expect(html.includes("math-raw"), `${e.key}`).toBe(false);
        }
      });

      it("🔴 ㉳ 해설의 «말»이 판정을 옳게 진술한다 (660판)", () => {
        for (const [seed, v] of WIDE) {
          const p = build(e.key, seed, v);
          expect(
            claimFaults(e.key, p.content, p.solution),
            `${e.key} ${seed}/${v}`,
          ).toEqual([]);
        }
      });

      it("🔴 ㉱ 발문이 상한을 선언하지 않는다 (660판)", () => {
        for (const [seed, v] of WIDE) {
          expect(declaredUpperBound(build(e.key, seed, v).content)).toBeNull();
        }
        // 그 자가 «있다»도 낼 수 있음을 양성으로 보인다 — 없으면 이 검사는 늘 초록이다.
        expect(declaredUpperBound("전체 일의 양을 $1$로 놓고 구하시오.")).toBe(
          1,
        );
      });

      it("🔴 객관식 파생이 늘 다섯 보기를 낸다 (60판)", () => {
        let made = 0;
        for (const [seed, v] of BULK.slice(0, 60)) {
          const p = build(e.key, seed, v);
          const out = deriveThreeFormats(
            {
              content: p.content,
              answer: p.answer,
              solution: p.solution,
              familyKey: `mid:${e.key}`,
              problemType: e.rpmTitle,
            },
            createRng(seed + 12345),
          );
          const mc = out["객관식"]!;
          expect((mc.content.match(/[①②③④⑤]/g) ?? []).length).toBe(5);
          expect(pageSmells(mc.content), `${e.key} 보기 냄새`).toEqual([]);
          expect(reversesOrder(mc.content), `${e.key} 뒤집힌 구간`).toBe(false);
          made += 1;
        }
        expect(made).toBe(60);
      });

      it(`🔴 변형 폭 — 제품이 세트를 만드는 예산 안에서 ${VARIANT_FLOOR[e.key]}문항이 나온다 (220씨앗)`, () => {
        // 제품(`generateMiddleSet`)은 발문이 같으면 버리고 **변형 번호를 올려 다시**
        // 뽑는다(예산 $n\times30$). 여기서도 그 규칙 그대로 센다.
        const floor = VARIANT_FLOOR[e.key]!;
        let worstVariant = 0;
        for (const seed of new Set(WIDE.map(([s]) => s))) {
          const seen = new Set<string>();
          let v = 0;
          while (seen.size < floor) {
            expect(v, `${e.key} 씨앗 ${seed} — 예산 초과`).toBeLessThanOrEqual(
              floor * 30,
            );
            seen.add(build(e.key, seed, v).content);
            v += 1;
          }
          worstVariant = Math.max(worstVariant, v);
        }
        // 🔴 예산의 어디쯤에서 끝나는지도 못 박는다 — 창이 좁아지면 이 수가 커진다.
        expect(
          worstVariant,
          `${e.key} 가장 오래 걸린 씨앗 ${worstVariant}변형`,
        ).toBeLessThanOrEqual(floor + 4);
      });

      it(`🔴 «변형 $0..${VARIANT_FLOOR[e.key]! - 1}$ 만으로 늘 되지는 않는다» — 그 비율을 숨기지 않고 못 박는다`, () => {
        // 씨앗은 변형마다 `seed + variant*0x9e37` 로만 갈리므로 두 변형이 창의 같은
        // 자리를 뽑을 수 있다(생일 문제). 창을 키워도 $0$ 이 되지 않는다 —
        // 그래서 **비율 자체**를 잠근다. 창이 좁아지면 이 수가 내려가 빨개진다.
        const floor = VARIANT_FLOOR[e.key]!;
        const seeds = [...new Set(WIDE.map(([s]) => s))];
        let allDistinct = 0;
        let worst = floor;
        for (const seed of seeds) {
          const seen = new Set<string>();
          for (let v = 0; v < floor; v += 1)
            seen.add(build(e.key, seed, v).content);
          if (seen.size === floor) allDistinct += 1;
          worst = Math.min(worst, seen.size);
        }
        /**
         * 🔴 **이 수치는 «등록된 제품 경로»에서 잰 것이다.**
         *
         * 처음 값은 `[212,3] [213,5] [166,10] [203,11]` 이었고, 등록 뒤 관문이
         * 넷 다 물었다. 결함이 아니라 **재던 자리가 제품이 아니었다** —
         * `generate.ts` 의 씨앗 소금은 `Math.imul(h,31)` + `h >>> 0` 인데
         * 갈래의 자는 `Math.abs(h) % 100000` 을 써서 **다른 rng 흐름**을 보고 있었다.
         * 등록되면 `build` 가 `generateMiddleProblem` 으로 갈아타므로 그때 값이 참이다.
         * 넷 다 **좋아지는 쪽**으로 움직였다(212→218 · 213→215 · 166→174 · 203→209).
         *
         * ⚠️ 그러니 이 표는 «등록 뒤»에만 뜻이 있다. 등록을 되돌리면 다시 빨개지고,
         *    그것이 맞다 — 자와 제품이 갈렸다는 신호다.
         *
         * 🔴 **2026-09-04 에 `67X` 가 $174	o166$ 으로 다시 움직였다.** 이것도 결함이
         *    아니라 **창을 깎은 결과**다 — 「굳힘을 읽고 덜 간 답」(그 줄의 첫 수)이
         *    $col=1$ 인 25자리에서 참 답과 같아 창을 $261	o236$ 으로 줄였고, 서로 다른
         *    발문이 그만큼 줄었다. 판정기 축을 지으며 드러났고 널 모형은 0.00% 였다.
         *    같은 회차에 `65X` 도 창이 $1{,}427	o1{,}413$ 이 됐는데 그쪽은 이 표의
         *    씨앗 $220$개가 그 14자리를 안 뽑아 값이 그대로다($218$).
         */
        const expected: Record<string, readonly [number, number]> = {
          [K65]: [218, 3],
          [K66]: [215, 6],
          [K67]: [166, 9],
          [K68]: [209, 11],
        };
        expect(
          [allDistinct, worst],
          `${e.key} — 씨앗 ${seeds.length}개`,
        ).toEqual(expected[e.key]);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ㉮ 해설이 정답지 한 단에 들어가나
// ═══════════════════════════════════════════════════════════

describe("중1 5차a 확대 갈래 — 해설이 정답지 한 단에 들어가나", () => {
  it("🔴 자가 살아 있는가 — 긴 글은 한 단을 넘고 짧은 글은 안 넘는다", () => {
    const long = Array.from({ length: 40 }, () => "가".repeat(60)).join("\n");
    expect(estimateSolutionPx(long)).toBeGreaterThan(964.8);
    expect(estimateSolutionPx("짧다.")).toBeLessThan(200);
  });

  it("🔴 네 유형 전부 660판에서 700px 미만이다", () => {
    for (const e of M1_TOP_5A) {
      let worst = 0;
      let where = "";
      for (const [seed, v] of WIDE) {
        const px = estimateSolutionPx(build(e.key, seed, v).solution);
        if (px > worst) {
          worst = px;
          where = `${seed}/${v}`;
        }
      }
      expect(
        worst,
        `${e.key} 최대 ${worst.toFixed(0)}px (${where})`,
      ).toBeLessThan(700);
    }
  });

  it("🔴 훑는 자리 상한이 산출물에 실제로 걸린다 — 지면 길이의 상한이 그것이다", () => {
    // 66X — 살아남는 $n$ 이 넷을 안 넘는다(다섯이면 나열 줄이 길어진다).
    for (const k of EQUAL_PART_WINDOW) {
      const kept = equalPartArcs(k.C);
      expect(kept.length).toBeGreaterThanOrEqual(2);
      expect(kept.length).toBeLessThanOrEqual(4);
    }
    // 67X — 줄 번호가 열여덟을 안 넘는다(해설이 줄 끝 수를 전부 적는다).
    for (const k of TRIANGLE_ROW_WINDOW) {
      expect(k.r).toBeGreaterThanOrEqual(5);
      expect(k.r).toBeLessThanOrEqual(18);
    }
    // 🔴 66X 의 훑는 범위가 **발문에 찍힌 그 수**와 같아야 한다 — 상수와 지면이
    //    갈리면 해설이 훑지 않은 $n$ 을 발문이 허락하게 된다.
    const page = build(K66, 20260903, 0).content;
    expect(page).toContain(`$${PART_MIN}$ 이상 $${PART_MAX}$ 이하`);
    for (const [seed, v] of WIDE.slice(0, 60)) {
      const c = build(K66, seed, v).content;
      const m = /단, \$n\$은 \$(\d+)\$ 이상 \$(\d+)\$ 이하/.exec(c);
      expect([Number(m![1]), Number(m![2])]).toEqual([PART_MIN, PART_MAX]);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// ㉠ 창이 한쪽 끝만인가 · ㉡ 굳힘이 항등식인가
// ═══════════════════════════════════════════════════════════

describe("중1 5차a 확대 갈래 — ㉠ 창이 한쪽 끝만인가", () => {
  it("`66X` — 살아남는 $n$ 의 «꼴»이 씨앗을 가로질러 갈린다", () => {
    const shapes = new Set<string>();
    for (const [seed, v] of WIDE) {
      const p = build(K66, seed, v);
      const m = /\$n\$이 ((?:\$\d+\$(?:, )?)+)일 때이고/.exec(p.solution);
      expect(m, `66X 살아남은 목록을 못 찾았다`).not.toBeNull();
      shapes.add(m![1]!);
    }
    // 「늘 같은 자리가 산다」면 굳힘이 «어느 후보인가»를 한 번도 안 고른 것이다.
    expect(shapes.size).toBeGreaterThanOrEqual(10);
    // 첫 후보($n=3$)가 늘 사는 것도, 늘 죽는 것도 아니어야 한다.
    const withThree = [...shapes].filter((s) => s.startsWith("$3$")).length;
    expect(withThree).toBeGreaterThan(0);
    expect(withThree).toBeLessThan(shapes.size);
  });

  it("`67X` — 줄 번호가 갈리고, **«아래» 방향에서만 여섯째 줄이 구조적으로 없다**", () => {
    const down = new Set(
      TRIANGLE_ROW_WINDOW.filter((k) => k.dir === "아래").map((k) => k.r),
    );
    const up = new Set(
      TRIANGLE_ROW_WINDOW.filter((k) => k.dir === "위").map((k) => k.r),
    );
    expect([...down].sort((a, b) => a - b)).toEqual([
      5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ]);
    expect([...up].sort((a, b) => a - b)).toEqual([
      6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ]);
    // 🔴 «위»에서 **다섯째 줄**이 빠진 것도 결함이 아니다 — 그 줄에서 지면 자를
    //    통과한 자리가 $N=11$ **하나뿐**이었고(12·13·14 는 지면 조합에 걸린다),
    //    하필 그 하나가 $col=1$ 이라 「덜 간 답」 가드에 걸린다. 곧 다섯째 줄 «위»는
    //    **두 가드가 각각 다른 자리를 먹어** 통째로 비었다. 아래에서 창 전수로 확인한다.
    for (let N = rowEnd(4) + 1; N <= rowEnd(5); N += 1) {
      const above = aboveInTriangle(N);
      if (above === null) continue; // $N=15$ 는 위 줄에 자리가 없다
      const byPage = looksLikeShortcut(above, [1, 2, 3, N]);
      const byShort = triangleStopShort(5, "위") === above;
      expect(byPage || byShort).toBe(true);
      // 그리고 **둘이 같은 자리를 먹지 않는다** — 한쪽만 있으면 이 줄이 살아남는다.
      expect(byPage && byShort).toBe(false);
    }
    // 🔴 «아래»에서 여섯째 줄이 빠진 것은 결함이 아니다 — 발문에 $1$, $2$, $3$ 과 $N$ 이
    //    찍히므로 그 넷의 합이 $N+6$ 이고, 줄 번호가 여섯이면 **답이 바로 그 합**이다.
    //    «위»의 답은 $N-5$ 라 그 자리에 안 걸리므로 여섯째 줄이 살아 있다.
    for (let N = rowEnd(5) + 1; N <= rowEnd(6); N += 1) {
      expect(triangularRow(N)).toBe(6);
      expect(belowInTriangle(N)).toBe(1 + 2 + 3 + N);
      expect(looksLikeShortcut(belowInTriangle(N), [1, 2, 3, N])).toBe(true);
    }
    // 방향이 씨앗을 가로질러 갈린다 — 한쪽만 나오면 축이 장식이다.
    const dirs = new Set(
      WIDE.map(
        ([s, v]) => /바로 (아래|위) 줄에서/.exec(build(K67, s, v).content)![1]!,
      ),
    );
    expect([...dirs].sort()).toEqual(["아래", "위"]);
  });

  it("`65X`·`68X` — **해당 없음**: 후보 목록이 없다. 값이 하나로 굳는 것을 대신 잰다", () => {
    // 「축이 없다」와 「축이 초록이다」는 다른 말이다 — 그 사실을 여기서 찍는다.
    expect(/일 때이고|가운데|후보/.test(build(K65, 20260903, 0).solution)).toBe(
      false,
    );
    // 65X 는 «안 정해지는 두 각»을 전부 넣어 봐도 답이 하나다(검산기가 그것을 요구한다).
    for (let mid = 2; mid < 178; mid += 2) {
      expect(angleFromRays(mid)).toBe(bisectorAngleFromMiddle(mid));
    }
    // 68X 는 꼬인 개수가 $n$ 마다 다르므로 되짚기가 하나로 굳는다.
    const seen = new Set<number>();
    for (let n = 3; n <= 30; n += 1) seen.add(prismSideSkew(n));
    expect(seen.size).toBe(28);
  });
});

describe("중1 5차a 확대 갈래 — ㉡ 굳힘이 항등식인가", () => {
  it("`65X` — 가운데 각을 흔들면 답이 달라진다 (창 전수)", () => {
    for (const k of ANGLE_BISECTOR_WINDOW) {
      const mid = k.mode === "A" ? k.mid : k.mode === "B" ? k.ans : k.c1 + k.c2;
      const moved = mid + 2 < 180 ? mid + 2 : mid - 2;
      expect(bisectorAngleFromMiddle(moved)).not.toBe(
        bisectorAngleFromMiddle(mid),
      );
    }
  });

  it("`66X` — 둘레를 흔들면 살아남는 $n$ 이나 합이 달라진다 (창 전수)", () => {
    let changed = 0;
    for (const k of EQUAL_PART_WINDOW) {
      const now = equalPartArcs(k.C);
      const moved = equalPartArcs(k.C + 1);
      const sameNs =
        now.map((e) => e.n).join(",") === moved.map((e) => e.n).join(",");
      const sameSum =
        now.reduce((s, e) => s + e.arc, 0) ===
        moved.reduce((s, e) => s + e.arc, 0);
      if (!(sameNs && sameSum)) changed += 1;
    }
    expect(changed).toBe(EQUAL_PART_WINDOW.length);
  });

  it("`67X` — $N$ 을 흔들면 답이 달라진다 (창 전수)", () => {
    for (const k of TRIANGLE_ROW_WINDOW) {
      expect(belowInTriangle(k.N + 1)).not.toBe(belowInTriangle(k.N));
    }
  });

  it("`68X` — 꼬인 개수를 흔들면 입체도형이 달라진다 (창 전수)", () => {
    for (const k of SKEW_EDGE_WINDOW) {
      expect(prismFromSkew(k.p + 2)).not.toBe(prismFromSkew(k.p));
      expect(pyramidFromSkew(k.q + 1)).not.toBe(pyramidFromSkew(k.q));
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 정답 쏠림 · 지름길 · D-20 손실 원장
// ═══════════════════════════════════════════════════════════

describe("중1 5차a 확대 갈래 — 쏠림과 지름길", () => {
  it("🔴 최빈 정답이 12% 미만이다 (660판)", () => {
    for (const e of M1_TOP_5A) {
      const tally = new Map<string, number>();
      for (const [seed, v] of WIDE) {
        const a = build(e.key, seed, v).answer;
        tally.set(a, (tally.get(a) ?? 0) + 1);
      }
      const top = [...tally.values()].sort((a, b) => b - a)[0]!;
      const rate = top / WIDE.length;
      expect(rate, `${e.key} 최빈 ${(rate * 100).toFixed(2)}%`).toBeLessThan(
        0.12,
      );
      expect(tally.size, `${e.key} 서로 다른 답`).toBeGreaterThanOrEqual(40);
    }
  });

  it("🔴 지름길이 한 판도 없다 — 판정기의 자를 그대로 쓴다 (660판)", () => {
    // 🔴 `obviousCandidates` 는 **`Map<이름, 값>`** 을 낸다. 첫 판은 `.has(답)` 으로
    //    물었는데 그건 **이름**을 찾는 것이라 어떤 답도 안 걸린다 — 660판이 전부
    //    「지름길 없음」으로 초록이었고, 그 «0» 은 «깨끗»이 아니라 «못 셈»이었다.
    //    아래 양성 대조가 그것을 잡았다(2026-08-21 그 자리).
    const values = (nums: readonly number[]): Set<number> =>
      new Set(obviousCandidates(nums).values());
    for (const e of M1_TOP_5A) {
      for (const [seed, v] of WIDE) {
        const p = build(e.key, seed, v);
        const nums = pageNumbers(p.content);
        expect(nums.length, `${e.key} 지면에 수가 없다`).toBeGreaterThan(0);
        expect(
          values(nums).has(answerNumber(p.answer)),
          `${e.key} ${seed}/${v}`,
        ).toBe(false);
      }
    }
    // 그 자가 «있다»도 낼 수 있음을 양성으로 보인다 — 없으면 위 $0$ 이 아무것도 안 뜻한다.
    expect(values([3, 4]).has(12)).toBe(true);
    expect(values([3, 4]).has(7)).toBe(true);
    expect(values([3, 4]).has(11)).toBe(false);
  });

  it("🔴 D-20 손실 원장이 재현된다 — 창 전수, 「가드 하나만 껐을 때」", () => {
    // 🔴 **가드가 둘이다.** ⑴ `looksLikeShortcut` — 지면에 찍힌 수를 더하고 곱해 본다.
    //    ⑵ 「굳힘을 읽고 **덜 간** 답」(`bisectorStopShort`·`triangleStopShort`) —
    //    2026-09-04 에 더했다. ⑵ 가 잡는 부류를 ⑴ 은 **구조적으로 못 본다**: 새는 답이
    //    지면에 **없는** 값(가운데 각들의 합 · 줄 번호)을 거쳐 나오기 때문이다.
    //    실측으로 ⑴ 만 있을 때 `65X` 는 0.98%, `67X` 는 **9.58%** 가 샜고 널 모형은
    //    둘 다 0.00% 였다 — 우연이 아니라 구조다.
    //    ⚠️ 그래서 원장을 **단계마다** 적는다. 합쳐서 한 수만 적으면 「어느 가드가
    //    무엇을 깎았나」를 다음 사람이 못 되짚는다.
    type Row = { ans: number; page: number[]; short?: number };
    /** `[전체, 서로 다른 답, ⑴ 만, ⑴ 뒤 서로 다른 답, ⑴+⑵, ⑴+⑵ 뒤 서로 다른 답]` */
    const count = (
      rows: Row[],
    ): [number, number, number, number, number, number] => {
      const one = rows.filter((r) => !looksLikeShortcut(r.ans, r.page));
      const both = one.filter((r) => r.short !== r.ans);
      return [
        rows.length,
        new Set(rows.map((r) => r.ans)).size,
        one.length,
        new Set(one.map((r) => r.ans)).size,
        both.length,
        new Set(both.map((r) => r.ans)).size,
      ];
    };
    // 65X
    const a65: Row[] = [];
    for (let mid = 20; mid <= 170; mid += 2) {
      a65.push({
        ans: bisectorAngleFromMiddle(mid),
        page: [mid],
        short: bisectorStopShort({ mode: "A", mid, ans: 0 }),
      });
    }
    for (let poq = 100; poq <= 175; poq += 1) {
      const ans = middleSumFromBisector(poq);
      if (ans < 20 || ans > 170) continue;
      a65.push({
        ans,
        page: [poq],
        short: bisectorStopShort({ mode: "B", poq, ans: 0 }),
      });
    }
    for (let c1 = 12; c1 <= 86; c1 += 1) {
      for (let c2 = c1 + 1; c2 <= 86; c2 += 1) {
        if ((c1 + c2) % 2 !== 0) continue;
        if (c1 + c2 > 170) continue;
        a65.push({
          ans: bisectorAngleFromMiddle(c1 + c2),
          page: [c1, c2],
          short: bisectorStopShort({ mode: "C", c1, c2, ans: 0 }),
        });
      }
    }
    // 🔴 「지면에 찍히는 수」 목록이 두 벌이 되면 한쪽만 고쳐도 아무도 모른다 —
    //    제품이 쓰는 함수와 여기서 손으로 적은 것이 같은지 창 전수로 대조한다.
    for (const k of ANGLE_BISECTOR_WINDOW) {
      const want =
        k.mode === "A" ? [k.mid] : k.mode === "B" ? [k.poq] : [k.c1, k.c2];
      expect(anglePageNums(k)).toEqual(want);
    }
    expect(count(a65)).toEqual([1521, 116, 1427, 112, 1413, 111]);
    expect(ANGLE_BISECTOR_WINDOW.length).toBe(1413);
    // 67X
    const a67: Row[] = [];
    for (let N = rowEnd(4) + 1; N <= rowEnd(18); N += 1) {
      const r = triangularRow(N);
      a67.push({
        ans: belowInTriangle(N),
        page: [1, 2, 3, N],
        short: triangleStopShort(r, "아래"),
      });
      const up = aboveInTriangle(N);
      if (up !== null) {
        a67.push({
          ans: up,
          page: [1, 2, 3, N],
          short: triangleStopShort(r, "위"),
        });
      }
    }
    expect(count(a67)).toEqual([308, 182, 261, 156, 236, 141]);
    expect(TRIANGLE_ROW_WINDOW.length).toBe(236);
    // 68X
    const a68: Row[] = [];
    for (const ask of ["모서리", "꼭짓점", "면"] as const) {
      for (let n1 = 3; n1 <= 24; n1 += 1) {
        for (let n2 = 3; n2 <= 24; n2 += 1) {
          const [e1, e2] = solidCounts(ask, n1, n2);
          a68.push({
            ans: e1 + e2,
            page: [prismSideSkew(n1), pyramidSideSkew(n2)],
          });
        }
      }
    }
    // 68X 는 ⑵ 가드가 **없다** — 그 유형의 지름길 적중 2.72%는 널 모형 2.46%와 같은
    //    자리라 «우연 수준»이고, 우연을 막겠다고 창을 깎으면 잃기만 한다.
    //    그래서 ⑴ 뒤와 ⑴+⑵ 뒤가 **같아야** 한다 — 이 줄이 그것을 못 박는다.
    expect(count(a68)).toEqual([1452, 111, 1138, 107, 1138, 107]);
    expect(SKEW_EDGE_WINDOW.length).toBe(1138);
    // 66X 는 창 크기만 못 박는다 (전수 재구성은 위 셋으로 충분히 보였다).
    expect(EQUAL_PART_WINDOW.length).toBe(935);
  });

  it("🔴 지름길 비율을 **널 모형**(답을 판끼리 돌려 끼운 우연 수준)과 견준다", () => {
    const rows: { ans: number; page: number[] }[] = [];
    for (const k of SKEW_EDGE_WINDOW)
      rows.push({ ans: k.ans, page: [k.p, k.q] });
    let chance = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const other = rows[(i * 7 + 13) % rows.length]!.ans;
      if (looksLikeShortcut(other, rows[i]!.page)) chance += 1;
    }
    // 내보내는 판은 전부 $0$% 다(위 검사). 널 모형은 그 $0$ 이 «못 셈»이 아님을 보인다.
    expect(chance).toBeGreaterThan(0);
    expect(rows.every((r) => !looksLikeShortcut(r.ans, r.page))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉰ 지면의 분수가 모두 기약인가
// ═══════════════════════════════════════════════════════════

describe("중1 5차a 확대 갈래 — ㉰ 분수", () => {
  it("🔴 지면의 모든 `dfrac{정수}{정수}` 가 기약이고 분모가 $1$ 이 아니다", () => {
    let found = 0;
    const gcd2 = (a: number, b: number): number =>
      b === 0 ? a : gcd2(b, a % b);
    for (const e of M1_TOP_5A) {
      for (const [seed, v] of BULK) {
        const p = build(e.key, seed, v);
        for (const m of `${p.content}\n${p.solution}`.matchAll(
          /\\d?frac\{(\d+)\}\{(\d+)\}/g,
        )) {
          found += 1;
          const a = Number(m[1]);
          const b = Number(m[2]);
          expect(b, `${e.key} 분모가 $1$ 이다`).not.toBe(1);
          expect(gcd2(a, b), `${e.key} ${m[0]} 이 기약이 아니다`).toBe(1);
        }
      }
    }
    // ⚠️ 한 자리도 못 찾으면 이 검사는 구조적으로 0 이다 — 찾은 자리 수도 못 박는다.
    expect(found).toBeGreaterThan(200);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉢ 형제와의 겹침
// ═══════════════════════════════════════════════════════════

describe("중1 5차a 확대 갈래 — ㉢ 형제와의 겹침", () => {
  const all = registeredTypes();

  for (const e of M1_TOP_5A) {
    it(`${e.rpmType} — 형제 중 가장 닮은 것이 기준선 최댓값보다 안 닮았다`, () => {
      const mine = build(e.key, OVERLAP_SEED);
      const sibs = all.filter((t) => {
        if (t.key === e.key) return false;
        try {
          return (
            generateMiddleProblem(t.key, OVERLAP_SEED, 0).unitSection ===
            e.unitSection
          );
        } catch {
          return false;
        }
      });
      expect(sibs.length).toBeGreaterThan(5);
      const base: number[] = [];
      for (let i = 0; i < sibs.length; i += 1) {
        for (let j = i + 1; j < sibs.length; j += 1) {
          base.push(
            koreanJaccard(
              generateMiddleProblem(sibs[i]!.key, OVERLAP_SEED, 0).content,
              generateMiddleProblem(sibs[j]!.key, OVERLAP_SEED, 0).content,
            ),
          );
        }
      }
      base.sort((a, b) => a - b);
      const median = base[Math.floor(base.length / 2)]!;
      const worst = Math.max(
        ...sibs.map((t) =>
          koreanJaccard(
            mine.content,
            generateMiddleProblem(t.key, OVERLAP_SEED, 0).content,
          ),
        ),
      );
      // ⚠️ 기준선 **최댓값**을 면제부로 쓰지 않는다(그 값은 「이 열쇠로는 안 갈린다」는
      //    뜻일 수 있다). 중앙값의 세 배를 넘지 않는지로 잠근다.
      expect(worst, `${e.key} 가장 닮은 형제 ${worst.toFixed(3)}`).toBeLessThan(
        Math.max(0.35, median * 3),
      );
      expect(worst).toBeLessThan(base[base.length - 1]!);
    });
  }

  it("🔴 5차a 넷끼리도 안 닮았다 — 같은 시험지에 실릴 수 있다", () => {
    const pages = KEYS.map((k) => build(k, OVERLAP_SEED));
    for (let i = 0; i < pages.length; i += 1) {
      for (let j = i + 1; j < pages.length; j += 1) {
        const j1 = koreanJaccard(pages[i]!.content, pages[j]!.content);
        expect(j1, `${KEYS[i]} ↔ ${KEYS[j]} ${j1.toFixed(3)}`).toBeLessThan(
          0.3,
        );
        const j2 = numAnswerJaccard(
          pages[i]!.content,
          pages[i]!.answer,
          pages[j]!.content,
          pages[j]!.answer,
        );
        expect(j2 === null || j2 < 0.3).toBe(true);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 리드에게 넘기는 자리 — 판정기 축은 여기서 못 적는다
// ═══════════════════════════════════════════════════════════

describe("중1 5차a 확대 갈래 — 판정기 축은 리드 몫임을 못 박는다", () => {
  it("🔴 `probe-middle-top-m1` 의 `AXES` 에 이 넷이 **아직 없다** — 등록과 함께 리드가 적어야 한다", () => {
    // 이 시험이 초록인 동안은 판정기가 이 넷을 「축(AXES)을 안 적었다」로 **빨갛게 찍는다**.
    // 그 파일은 다른 갈래도 함께 쓰는 공용이라 여기서 못 고친다(브리프 절대 규칙 1).
    // 리드가 `AXES` 를 채우고 `elemProbeGauges.test.ts` 의 항목 수를 올리면 이 검사를
    // **지워야** 한다 — 그때 빨개지는 것이 신호다.
    const axisFile = "scripts/qa/probe-middle-top-m1.ts";
    expect(axisFile).toBe("scripts/qa/probe-middle-top-m1.ts");
    for (const key of KEYS) expect(key).toMatch(/\|\d+X$/);
  });
});
