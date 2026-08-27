/**
 * 중1 물결 6A — RPM 1-2 **기본 도형 14유형** + **위치 관계 17유형(01~05·09~20)** = 31유형.
 *
 * 위치 관계는 06·07·08 이 이미 `m1Book2.ts` 에 등록돼 있다(공간에서 평면의 위치
 * 관계). 이 파일은 나머지만 낸다 — 겹치면 `generate.ts` 의 key 검사가 던진다.
 *
 * ## 그림 — 「처음 실사용」을 두 자리에만 쓴다
 * 물결 6 공통 계약이 확인한 실렌더 판정(맞꼭지각·평행선과 엇각)을 그대로 쓴다.
 * 나머지는 **말로 다 서술**한다(발문이 배치를 문장으로 정하면 그림은 장식이지
 * 필수가 아니다 — 09 §0.1 「말로 못 하는 배치를 보일 때만」). 그림을 붙인 자리:
 *
 * | 유형 | 그림 |
 * |---|---|
 * | 기본 도형 10 (맞꼭지각의 성질 (1)) | 두 직선이 한 점에서 만나 이루는 맞꼭지각 |
 * | 위치 관계 11·12·13 (동위각·엇각·평행 조건) | 두 직선 + 가로지르는 직선(엇각·동위각) |
 *
 * 두 그림 모두 **씨앗과 무관한 고정 스펙**이다 — 라벨은 구조(어느 각이 서로
 * 마주보는지/대응하는지)만 보이고, 실제 수치는 발문 문장이 말한다(09 §4-20-b:
 * 가르는 축은 「좁아서」가 아니라 「발문이 이미 말했는가」).
 *
 * ## 검산이 «다른 식»이 되게 한 방법 (물결 계약 2)
 * - **맞꼭지각**: 생성기는 두 식을 바로 같다고 놓고 $x$ 를 푼다. 시험은 그 답을
 *   식에 다시 대입해 **두 각의 실측값이 서로 같은지**(맞꼭지각 성질 자체)로 검산한다
 *   — 식을 옮겨 적지 않고 「같아야 한다」는 성질을 다시 확인한다.
 * - **위치 관계 01~05·09·19**: 직육면체 문자 모델(`m1Book2` 와 같은 관례,
 *   $\mathrm{ABCD}$-$\mathrm{EFGH}$)은 **축(0/1/2) + 공유 꼭짓점**으로 판정한다.
 *   시험은 이 표를 옮겨 적지 않고, 축이 같은 모서리 쌍을 실측(m1Extra.test.ts 의
 *   좌표 기하)으로 대조한다.
 * - **위치 관계 04·10**: 사면체 $ABCD$ 의 「마주보는 모서리(꼬인 위치)」는 두
 *   모서리가 나머지 두 글자로 정확히 갈리는가로 판정한다(위상적 사실 — 사면체는
 *   완전그래프 $K_4$ 라 이 규칙이 좌표와 무관하게 항상 성립한다). 시험은
 *   생성기의 짝表를 안 쓰고 "네 글자 중 이 두 모서리가 안 쓴 나머지 두 글자"를
 *   직접 계산해서 댄다.
 * - **평행선 계열(11~18·20)**: `facts` 에 준 각도 원값을 싣고, 시험이
 *   동위각·엇각·삼각형 내각의 합·직선(180°) 중 **생성기가 안 쓴 관계식**으로
 *   다시 유도한다.
 *
 * ## 대분수 금지 (D-73, 물결 6 계약 7)
 * 이 파일의 답은 전부 정수 각도 또는 정수 개수 — 애초에 분수가 안 나온다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt, def } from "./m1Stat";
import type { Body } from "./m1Stat";
import type { TypeEntry } from "./types";

const MINOR_BASE = "기본 도형";
const MINOR_POS = "위치 관계";
const MINOR_SOLID = "다면체와 회전체";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측 2026-08-24) */
const SEC = {
  점선면: "점, 선, 면",
  각: "각",
  두직선: "두 직선의 위치 관계",
  공간평면: "공간에서 평면의 위치 관계",
  평행선: "평행선",
  다면체: "다면체",
} as const;

// ═══════════════════════════════════════════════════════════════════
//  소품
// ═══════════════════════════════════════════════════════════════════

/** 한글 수사 3~12 — 「5각형」이 아니라 「오각형」(`arabicPolygons` 가드). */
const KO_NUM: readonly string[] = [
  "",
  "일",
  "이",
  "삼",
  "사",
  "오",
  "육",
  "칠",
  "팔",
  "구",
  "십",
  "십일",
  "십이",
];
export function koNum(n: number): string {
  const s = KO_NUM[n];
  if (!s) throw new Error(`한글 수사 범위 밖: ${n}`);
  return s;
}
export function gonName(n: number): string {
  return `${koNum(n)}각형`;
}

/** 서로 다른 색인 `count` 개 (오름차순) — m1Solid 와 같은 셔플-자르기. */
function distinctIndices(rng: Rng, total: number, count: number): number[] {
  if (count > total) throw new Error("뽑을 개수가 전체보다 많습니다");
  const bag = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    const t = bag[i]!;
    bag[i] = bag[j]!;
    bag[j] = t;
  }
  return bag.slice(0, count).sort((a, b) => a - b);
}

const BOGI = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ"] as const;

// ── 고정 그림(씨앗 무관) — 09 §4-20-b: 구조만 보이고 수치는 발문이 말한다 ──

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}
function polarPt(deg: number, r = 70, cx = 120, cy = 95): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [r2(cx + r * Math.cos(rad)), r2(cy - r * Math.sin(rad))];
}

/** 기본 도형 10 — 두 직선이 O 에서 만나 이루는 맞꼭지각(∠BOC, ∠AOD). */
const FIGURE_VERTICAL: Record<string, unknown> = {
  version: 2,
  style: { show_points: true },
  points: {
    O: [120, 95],
    A: polarPt(160),
    B: polarPt(340),
    C: polarPt(35),
    D: polarPt(215),
  },
  segments: { AB: ["A", "B"], CD: ["C", "D"] },
  angles: {
    a: { vertex: "O", points: ["B", "C"], label: "a" },
    c: { vertex: "O", points: ["A", "D"], label: "c" },
  },
  labels: { A: "A", B: "B", C: "C", D: "D", O: "O" },
};

/**
 * 위치 관계 11·12·13 — 두 직선 l, m 을 t 가 가로지른다(평행선과 동위각·엇각).
 * probe-wave6-geometry.py `s_position_parallel` 과 같은 좌표(양성 실렌더 확인됨).
 */
const FIGURE_PARALLEL: Record<string, unknown> = {
  version: 2,
  style: { show_points: true },
  points: {
    A: [20, 60],
    B: [220, 60],
    C: [20, 140],
    D: [220, 140],
    P: [60, 20],
    Q: [180, 180],
    X: [90.0, 60.0],
    Y: [150.0, 140.0],
  },
  segments: {
    l: { points: ["A", "B"], parallel: 1 },
    m: { points: ["C", "D"], parallel: 1 },
    t: { points: ["P", "Q"] },
  },
  angles: {
    a: { vertex: "X", points: ["B", "Q"], label: "a" },
    b: { vertex: "Y", points: ["D", "Q"], label: "b" },
  },
  labels: { A: "l", C: "m", P: "t" },
};

// ── 직육면체 문자 모델 소품 (m1Book2 와 같은 관례 — 위치 관계 09 가 쓴다) ──
function sharedCount(x: string, y: string): number {
  return [...x].filter((ch) => y.includes(ch)).length;
}
/** 모서리의 축 — x(AB 방향)=0 · y(AD 방향)=1 · z(AE 방향)=2. m1Book2 와 같은 표. */
function edgeAxis(e: string): number {
  if (["AB", "CD", "EF", "GH"].includes(e)) return 0;
  if (["BC", "DA", "FG", "HE"].includes(e)) return 1;
  return 2;
}

// ═══════════════════════════════════════════════════════════════════
//  기본 도형 01~14
// ═══════════════════════════════════════════════════════════════════

/** 01 — 다면체 꼭짓점(교점)·모서리(교선) 개수. 0 기둥 · 1 뿔 · 2 뿔대 */
function vertsOf01(n: number, fam: number): number {
  return fam === 1 ? n + 1 : 2 * n;
}
function edgesOf01(n: number, fam: number): number {
  return fam === 1 ? 2 * n : 3 * n;
}
const FAM01 = ["기둥", "뿔", "뿔대"] as const;

const M1_GEO1_BASE: TypeEntry[] = [
  def(MINOR_BASE, "01", "교점 교선의 개수", SEC.점선면, "기본", (rng) =>
    attempt(80, (): Body | null => {
      const fam = pick(rng, [0, 1, 2] as const);
      const n = intBetween(rng, 4, 10);
      const v = vertsOf01(n, fam);
      const e = edgesOf01(n, fam);
      const branch = pick(rng, [0, 1] as const);
      const name = `${koNum(n)}각${FAM01[fam]!}`;
      const ans = branch === 0 ? e - v : e + v;
      return {
        content: `${name}에서 교점의 개수를 $a$, 교선의 개수를 $b$라 할 때, ${branch === 0 ? "$b-a$" : "$a+b$"}의 값을 구하시오.`,
        answer: `$${ans}$`,
        solution: `${name}에서 (교점의 개수)$=$(꼭짓점의 개수)$=${v}$, (교선의 개수)$=$(모서리의 개수)$=${e}$이다.\n따라서 $a=${v}$, $b=${e}$이므로 ${branch === 0 ? `$b-a=${e}-${v}=${ans}$` : `$a+b=${v}+${e}=${ans}$`}이다.`,
        facts: { fam, n, v, e, branch, ans },
      };
    }),
  ),

  // 02 — 직선 l 위 서로 다른 네 점. 반직선/선분/직선의 같음을 좌표(순서)로 판정.
  def(MINOR_BASE, "02", "직선 반직선 선분", SEC.점선면, "응용", (rng) =>
    attempt(200, (): Body | null => {
      const labels = ["A", "B", "C", "D"];
      const pos = distinctIndices(rng, 40, 4).map((v) => v * 3); // 좌표(오름차순)
      // 이름을 좌표 순서에 무작위로 배정 — 알파벳이 늘 왼쪽부터가 아니게(Fisher–Yates).
      const posIdxOfLabel: number[] = [0, 1, 2, 3];
      for (let i = 3; i > 0; i -= 1) {
        const j = intBetween(rng, 0, i);
        const t = posIdxOfLabel[i]!;
        posIdxOfLabel[i] = posIdxOfLabel[j]!;
        posIdxOfLabel[j] = t;
      }
      const posOf = (name: string): number =>
        pos[posIdxOfLabel[labels.indexOf(name)]!]!;
      // 왼쪽부터 실제 순서 — 발문이 알파벳 순(A,B,C,D)으로 고정 나열하면서
      // 좌표만 무작위로 섞으면 발문과 정답이 어긋난다(무엇이 왼쪽인지 학생이
      // 알 길이 없다). 그래서 발문 자체가 **실제 순서**를 말하게 한다.
      const labelAtPos: string[] = [];
      posIdxOfLabel.forEach((posIdx, li) => {
        labelAtPos[posIdx] = labels[li]!;
      });

      type ObjKind = "ray" | "seg" | "line";
      function isEqual(
        k1: ObjKind,
        p1: string,
        q1: string,
        k2: ObjKind,
        p2: string,
        q2: string,
      ): boolean {
        if (k1 !== k2) return false;
        if (k1 === "line") return true;
        if (k1 === "seg") {
          return (p1 === p2 && q1 === q2) || (p1 === q2 && q1 === p2);
        }
        const d1 = Math.sign(posOf(q1) - posOf(p1));
        const d2 = Math.sign(posOf(q2) - posOf(p2));
        return p1 === p2 && d1 === d2;
      }

      // 대상: 무작위 kind + 두 점. 보기 넷: 그중 몇 개가 대상과 같은가.
      // ⚠️ "line" 은 뺐다 — 네 점이 전부 한 직선 위라 직선끼리는 항상 같다
      // (ans 가 늘 4 가 돼 밑의 `ans===4` 가드에 걸려 attempt() 가 늘 헛돈다).
      const kind = pick(rng, ["ray", "seg"] as const);
      const [ta, tb] = distinctIndices(rng, 4, 2).map((i) => labels[i]!);
      const candIdx = distinctIndices(rng, 4, 4);
      const cands: { p: string; q: string }[] = [];
      for (let i = 0; i < 4 && cands.length < 4; i += 1) {
        const a = labels[candIdx[i % 4]!]!;
        const rest = labels.filter((x) => x !== a);
        const b = rest[intBetween(rng, 0, rest.length - 1)]!;
        if (a === ta && b === tb) continue;
        if (!cands.some((c) => c.p === a && c.q === b))
          cands.push({ p: a, q: b });
      }
      if (cands.length < 4) return null;
      const four = cands.slice(0, 4);
      const results = four.map((c) => isEqual(kind, ta!, tb!, kind, c.p, c.q));
      const ans = results.filter(Boolean).length;
      if (ans === 0 || ans === 4) return null;
      const kindWord =
        kind === "ray" ? "반직선" : kind === "seg" ? "선분" : "직선";
      const notate = (p: string, q: string): string =>
        kind === "ray"
          ? `\\overrightarrow{${p}${q}}`
          : kind === "seg"
            ? `\\overline{${p}${q}}`
            : `\\overleftrightarrow{${p}${q}}`;
      const lines = four
        .map((c, i) => `${BOGI[i]!}. $${notate(c.p, c.q)}$`)
        .join("\n");
      const truth = four
        .map(
          (c, i) =>
            `${BOGI[i]!}. $${notate(c.p, c.q)}$은(는) $${notate(ta!, tb!)}$와(과) ${results[i] ? "같다" : "다르다"}.`,
        )
        .join("\n");
      return {
        content: `직선 $l$ 위에 왼쪽부터 순서대로 서로 다른 네 점 $${labelAtPos[0]}$, $${labelAtPos[1]}$, $${labelAtPos[2]}$, $${labelAtPos[3]}$가 있다. 다음 보기 중 ${kindWord} $${notate(ta!, tb!)}$와(과) 같은 것은 모두 몇 개인지 구하시오.\n\n${lines}`,
        answer: `$${ans}$개`,
        solution: `${kindWord}는 시작점과 뻗는 방향(선분은 두 끝점, 직선은 지나는 한 직선 전체)이 같아야 서로 같다.\n${truth}\n따라서 같은 것은 $${ans}$개이다.`,
        facts: {
          kind: kind === "ray" ? 0 : kind === "seg" ? 1 : 2,
          p0: labels.indexOf(labelAtPos[0]!),
          p1: labels.indexOf(labelAtPos[1]!),
          p2: labels.indexOf(labelAtPos[2]!),
          p3: labels.indexOf(labelAtPos[3]!),
          ans,
        },
      };
    }),
  ),

  // 03 — 어느 세 점도 한 직선 위에 있지 않은 n 개의 점.
  def(
    MINOR_BASE,
    "03",
    "직선 반직선 선분의 개수 (1)",
    SEC.점선면,
    "응용",
    (rng) =>
      attempt(80, (): Body | null => {
        const n = intBetween(rng, 3, 6);
        const lines = (n * (n - 1)) / 2;
        const rays = n * (n - 1);
        const segs = lines;
        const branch = pick(rng, [0, 1] as const);
        const ans = branch === 0 ? lines + rays : rays - segs;
        return {
          content: `어느 세 점도 한 직선 위에 있지 않은 서로 다른 $${n}$개의 점이 있다. 이 중 두 점을 지나는 서로 다른 직선의 개수를 $a$, 반직선의 개수를 $b$, 선분의 개수를 $c$라 할 때, ${branch === 0 ? "$a+b$" : "$b-c$"}의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `두 점을 고르는 방법의 수는 $\\dfrac{${n}\\times(${n}-1)}{2}=${lines}$이므로 직선과 선분의 개수는 각각 $a=${lines}$, $c=${segs}$이다.\n반직선은 시작점과 방향이 다르면 다른 것이므로 $b=${n}\\times(${n}-1)=${rays}$이다.\n따라서 ${branch === 0 ? `$a+b=${lines}+${rays}=${ans}$` : `$b-c=${rays}-${segs}=${ans}$`}이다.`,
          facts: { n, lines, rays, segs, branch, ans },
        };
      }),
  ),

  // 04 — 한 직선 위에 있는 n 개의 점.
  def(
    MINOR_BASE,
    "04",
    "직선 반직선 선분의 개수 (2)",
    SEC.점선면,
    "응용",
    (rng) =>
      attempt(80, (): Body | null => {
        const n = intBetween(rng, 3, 7);
        const rays = 2 * (n - 1);
        const segs = (n * (n - 1)) / 2;
        const branch = pick(rng, [0, 1] as const);
        const ans = branch === 0 ? rays - 1 : rays - segs;
        return {
          content: `한 직선 위에 서로 다른 $${n}$개의 점이 있다. 이 중 두 점을 골라 만들 수 있는 서로 다른 직선의 개수를 $a$, 반직선의 개수를 $b$, 선분의 개수를 $c$라 할 때, ${branch === 0 ? "$b-a$" : "$b-c$"}의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `모든 점이 한 직선 위에 있으므로 직선은 $a=1$개이다.\n반직선은 양 끝의 두 점은 $1$개씩, 나머지 $${n - 2}$개의 점은 $2$개씩 만들므로 $b=2+2\\times(${n}-2)=${rays}$이다.\n선분의 개수는 $c=\\dfrac{${n}\\times(${n}-1)}{2}=${segs}$이다.\n따라서 ${branch === 0 ? `$b-a=${rays}-1=${ans}$` : `$b-c=${rays}-${segs}=${ans}$`}이다.`,
          facts: { n, rays, segs, branch, ans },
        };
      }),
  ),

  // 05 — 선분의 중점 연쇄. AB 의 중점 M, MB 의 중점 N.
  def(MINOR_BASE, "05", "선분의 중점", SEC.점선면, "응용", (rng) =>
    attempt(80, (): Body | null => {
      const branch = pick(rng, [0, 1] as const);
      if (branch === 0) {
        const ab = intBetween(rng, 2, 20) * 4;
        const mn = ab / 4;
        const an = (3 * ab) / 4;
        return {
          content: `그림과 같이 $\\overline{AB}$의 중점을 $M$, $\\overline{MB}$의 중점을 $N$이라 하자. $\\overline{AB}=${ab}\\,\\mathrm{cm}$일 때, $\\overline{AN}$의 길이를 구하시오.`,
          answer: `$${an}\\,\\mathrm{cm}$`,
          solution: `$\\overline{AM}=\\overline{MB}=\\dfrac{1}{2}\\overline{AB}=${ab / 2}\\,\\mathrm{cm}$이다.\n$\\overline{MN}=\\dfrac{1}{2}\\overline{MB}=${mn}\\,\\mathrm{cm}$이다.\n따라서 $\\overline{AN}=\\overline{AM}+\\overline{MN}=${ab / 2}+${mn}=${an}\\,(\\mathrm{cm})$이다.`,
          facts: { branch, ab, mn, an, ans: an },
        };
      }
      const mn = intBetween(rng, 2, 20);
      const ab = 4 * mn;
      return {
        content: `그림과 같이 $\\overline{AB}$의 중점을 $M$, $\\overline{MB}$의 중점을 $N$이라 하자. $\\overline{MN}=${mn}\\,\\mathrm{cm}$일 때, $\\overline{AB}$의 길이를 구하시오.`,
        answer: `$${ab}\\,\\mathrm{cm}$`,
        solution: `$\\overline{MN}=\\dfrac{1}{2}\\overline{MB}=\\dfrac{1}{4}\\overline{AB}$이므로 $\\overline{AB}=4\\times\\overline{MN}=4\\times${mn}=${ab}\\,(\\mathrm{cm})$이다.`,
        facts: { branch, mn, ab, ans: ab },
      };
    }),
  ),

  // 06 — 두 점 사이의 거리. M,N 은 각각 AB,BC 의 중점 ⇒ MN = AC/2 (B 위치 무관).
  def(MINOR_BASE, "06", "두 점 사이의 거리", SEC.점선면, "응용", (rng) =>
    attempt(80, (): Body | null => {
      const branch = pick(rng, [0, 1, 2] as const);
      if (branch === 0) {
        const ac = intBetween(rng, 3, 30) * 2;
        const mn = ac / 2;
        return {
          content: `수직선 위에 세 점 $A$, $B$, $C$가 이 순서로 있다. 두 점 $M$, $N$이 각각 $\\overline{AB}$, $\\overline{BC}$의 중점이고 $\\overline{AC}=${ac}\\,\\mathrm{cm}$일 때, $\\overline{MN}$의 길이를 구하시오.`,
          answer: `$${mn}\\,\\mathrm{cm}$`,
          solution: `$\\overline{MN}=\\overline{MB}+\\overline{BN}=\\dfrac{1}{2}\\overline{AB}+\\dfrac{1}{2}\\overline{BC}=\\dfrac{1}{2}(\\overline{AB}+\\overline{BC})=\\dfrac{1}{2}\\overline{AC}=\\dfrac{1}{2}\\times${ac}=${mn}\\,(\\mathrm{cm})$이다.`,
          facts: { branch, ac, mn, ans: mn },
        };
      }
      if (branch === 1) {
        const ab = intBetween(rng, 2, 15) * 2;
        const bc = intBetween(rng, 2, 15) * 2;
        const mn = (ab + bc) / 2;
        return {
          content: `수직선 위에 세 점 $A$, $B$, $C$가 이 순서로 있다. 두 점 $M$, $N$이 각각 $\\overline{AB}$, $\\overline{BC}$의 중점이고 $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{MN}$의 길이를 구하시오.`,
          answer: `$${mn}\\,\\mathrm{cm}$`,
          solution: `$\\overline{MN}=\\overline{MB}+\\overline{BN}=\\dfrac{1}{2}\\overline{AB}+\\dfrac{1}{2}\\overline{BC}=\\dfrac{1}{2}\\times${ab}+\\dfrac{1}{2}\\times${bc}=${ab / 2}+${bc / 2}=${mn}\\,(\\mathrm{cm})$이다.`,
          facts: { branch, ab, bc, mn, ans: mn },
        };
      }
      // AB=3BC, M=AB 의 중점, N=BC 의 중점, AM 이 주어질 때 MN.
      const bc = intBetween(rng, 2, 12);
      const ab = 3 * bc;
      const am = ab / 2;
      const mnVal = ab / 2 + bc / 2;
      return {
        content: `수직선 위에 세 점 $A$, $B$, $C$가 이 순서로 있고 $\\overline{AB}=3\\overline{BC}$이다. 두 점 $M$, $N$이 각각 $\\overline{AB}$, $\\overline{BC}$의 중점이고 $\\overline{AM}=${am}\\,\\mathrm{cm}$일 때, $\\overline{MN}$의 길이를 구하시오.`,
        answer: `$${mnVal}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AM}=\\dfrac{1}{2}\\overline{AB}=${am}\\,\\mathrm{cm}$이므로 $\\overline{AB}=${ab}\\,\\mathrm{cm}$이고, $\\overline{AB}=3\\overline{BC}$이므로 $\\overline{BC}=${bc}\\,\\mathrm{cm}$이다.\n$\\overline{MN}=\\overline{MB}+\\overline{BN}=\\dfrac{1}{2}\\overline{AB}+\\dfrac{1}{2}\\overline{BC}=${ab / 2}+${bc / 2}=${mnVal}\\,(\\mathrm{cm})$이다.`,
        facts: { branch, bc, ab, am, mn: mnVal, ans: mnVal },
      };
    }),
  ),

  // 07 — 평각(180) 또는 직각(90)을 두 인접각으로 가름: a·x+b, c ⇒ 합이 total.
  def(
    MINOR_BASE,
    "07",
    "평각 또는 직각을 이용하여 각의 크기 구하기",
    SEC.각,
    "응용",
    (rng) =>
      attempt(200, (): Body | null => {
        const total = pick(rng, [90, 180] as const);
        const a = pick(rng, [2, 3, 4, 5] as const);
        const c = intBetween(rng, 5, total - 20);
        const x = intBetween(rng, 2, 20);
        const b = total - c - a * x;
        if (b < 0 || b > 60) return null;
        return {
          content: `그림과 같이 한 점 $O$에서 세 반직선 $OA$, $OB$, $OC$를 그었더니 $\\angle AOB=(${a}x+${b})^\\circ$, $\\angle BOC=${c}^\\circ$이고 $\\angle AOC=${total}^\\circ$이다. $x$의 값을 구하시오.`,
          answer: `$${x}$`,
          solution: `$\\angle AOB+\\angle BOC=\\angle AOC$이므로 $(${a}x+${b})+${c}=${total}$이다.\n$${a}x=${total - b - c}$에서 $x=${x}$이다.`,
          facts: { total, a, b, c, x, ans: x },
        };
      }),
  ),

  // 08 — ∠AOB=∠BOC(같음)+∠COD=k×∠BOC, ∠AOD=180.
  def(
    MINOR_BASE,
    "08",
    "각의 크기 사이의 조건이 주어진 경우 각의 크기 구하기",
    SEC.각,
    "응용",
    (rng) =>
      attempt(200, (): Body | null => {
        const k = pick(rng, [2, 3, 4] as const);
        const p = intBetween(rng, 2, 40);
        if ((2 + k) * p !== 180 && (2 + k) * p !== 90) {
          // p 는 자유 변수이므로 total 을 p 로부터 정한다(역산).
        }
        const total = (2 + k) * p;
        if (total !== 90 && total !== 180) return null;
        const cod = k * p;
        return {
          content: `그림과 같이 한 점 $O$에서 세 반직선 $OA$, $OB$, $OC$, $OD$를 그었더니 $\\angle AOB=\\angle BOC$이고 $\\angle COD=${k}\\angle BOC$이다. $\\angle AOD=${total}^\\circ$일 때, $\\angle COD$의 크기를 구하시오.`,
          answer: `$${cod}^\\circ$`,
          solution: `$\\angle BOC=x^\\circ$라 하면 $\\angle AOB=x^\\circ$, $\\angle COD=${k}x^\\circ$이다.\n$\\angle AOD=\\angle AOB+\\angle BOC+\\angle COD=x+x+${k}x=${2 + k}x=${total}$에서 $x=${p}$이다.\n따라서 $\\angle COD=${k}\\times${p}=${cod}^\\circ$이다.`,
          facts: { k, p, total, cod, ans: cod },
        };
      }),
  ),

  // 09 — ∠x:∠y:∠z = a:b:c, 합 180.
  def(
    MINOR_BASE,
    "09",
    "각의 크기의 비가 주어진 경우 각의 크기 구하기",
    SEC.각,
    "기본",
    (rng) =>
      attempt(200, (): Body | null => {
        const ratios: [number, number, number][] = [
          [1, 2, 3],
          [2, 3, 4],
          [1, 3, 5],
          [2, 3, 5],
          [3, 4, 5],
          [1, 2, 6],
          [1, 5, 6],
          [2, 4, 9],
        ];
        const [ra, rb, rc] = pick(rng, ratios);
        const sum = ra + rb + rc;
        const ask = pick(rng, [0, 1, 2] as const);
        const r = [ra, rb, rc][ask]!;
        const ans = (180 * r) / sum;
        const askName = ["\\angle x", "\\angle y", "\\angle z"][ask]!;
        return {
          content: `그림과 같이 한 점 $O$에서 만나는 세 반직선이 이루는 $\\angle x:\\angle y:\\angle z=${ra}:${rb}:${rc}$이고 세 각을 합하면 평각을 이룬다. $${askName}$의 크기를 구하시오.`,
          answer: `$${ans}^\\circ$`,
          solution: `세 각의 크기의 합이 $180^\\circ$이므로 $${askName}=180^\\circ\\times\\dfrac{${r}}{${sum}}=${ans}^\\circ$이다.`,
          facts: { ra, rb, rc, sum, ask, ans },
        };
      }),
  ),

  // 10 — 맞꼭지각의 성질 (1). 두 식이 같다 ⇒ x. 그림 부착.
  def(MINOR_BASE, "10", "맞꼭지각의 성질 (1)", SEC.각, "기본", (rng) =>
    attempt(200, (): Body | null => {
      const a = pick(rng, [2, 3, 4] as const);
      const b2 = pick(rng, [2, 3, 5] as const);
      if (a === b2) return null;
      const x = intBetween(rng, 3, 30);
      const p = intBetween(rng, 5, 60);
      // a x + p = b2 x + q ⇒ q = p + (a-b2) x. 각도가 0~180 이 되도록만 확인.
      const val = a * x + p;
      const q = val - b2 * x;
      if (q < 0 || q > 170 || val <= 0 || val >= 180) return null;
      return {
        content: `그림에서 $\\angle a=(${a}x+${p})^\\circ$, $\\angle c=(${b2}x+${q})^\\circ$는 맞꼭지각이다. $x$의 값을 구하시오.`,
        answer: `$${x}$`,
        solution: `맞꼭지각의 크기는 서로 같으므로 $${a}x+${p}=${b2}x+${q}$이다.\n$${a - b2}x=${q - p}$에서 $x=${x}$이다.`,
        facts: { a, p, b2, q, x, ans: x },
        figureSpec: FIGURE_VERTICAL,
      };
    }),
  ),

  // 11 — 맞꼭지각의 성질 (2): ∠a+∠b=∠c (한 직선 위 인접각의 합이 맞꼭지각).
  def(MINOR_BASE, "11", "맞꼭지각의 성질 (2)", SEC.각, "응용", (rng) =>
    attempt(200, (): Body | null => {
      const a1 = pick(rng, [1, 2, 3] as const);
      const b1 = intBetween(rng, 5, 40);
      const c1 = intBetween(rng, 5, 40);
      const x = intBetween(rng, 3, 25);
      // (a1 x + b1) + c1 = (a1+1) x + d  ⇒ 풀어서 d 를 정한다(간단히 c 를 별 식으로).
      const aVal = a1 * x + b1;
      const bVal = c1;
      const cCoef = a1 + 1;
      const cConst = aVal + bVal - cCoef * x;
      if (cConst < 0 || cConst > 60) return null;
      return {
        content: `그림에서 세 직선이 한 점 $O$에서 만난다. $\\angle a=(${a1}x+${b1})^\\circ$, $\\angle b=${c1}^\\circ$이고 $\\angle a$와 $\\angle b$는 서로 이웃하며, 그 합은 $\\angle a$, $\\angle b$의 맞꼭지각인 $\\angle c=(${cCoef}x+${cConst})^\\circ$와 같다. $x$의 값을 구하시오.`,
        answer: `$${x}$`,
        solution: `맞꼭지각의 성질에 의해 $\\angle a+\\angle b=\\angle c$이므로 $(${a1}x+${b1})+${c1}=${cCoef}x+${cConst}$이다.\n$${a1 - cCoef}x=${cConst - b1 - c1}$에서 $x=${x}$이다.`,
        facts: { a1, b1, c1, cCoef, cConst, x, ans: x },
      };
    }),
  ),

  // 12 — n 개의 직선이 한 점에서 만날 때 맞꼭지각 쌍의 개수 = n(n-1).
  def(MINOR_BASE, "12", "맞꼭지각의 쌍의 개수", SEC.각, "응용", (rng) => {
    const n = intBetween(rng, 2, 8);
    const ans = n * (n - 1);
    return {
      content: `서로 다른 $${n}$개의 직선이 한 점에서 만날 때 생기는 맞꼭지각은 모두 몇 쌍인지 구하시오.`,
      answer: `$${ans}$쌍`,
      solution: `직선 $${n}$개가 한 점에서 만나면 $2\\times${n}=${2 * n}$개의 각이 생긴다.\n직선 두 개씩 짝지을 때마다 맞꼭지각이 $2$쌍씩 생기므로 $\\dfrac{${n}\\times(${n}-1)}{2}\\times2=${n}\\times(${n}-1)=${ans}$(쌍)이다.`,
      facts: { n, ans },
    };
  }),

  // 13 — 수직과 수선(정의) 참·거짓 개수.
  def(
    MINOR_BASE,
    "13",
    "수직과 수선",
    SEC.각,
    "응용",
    (rng) =>
      attempt(200, (): Body | null => {
        // 점 A 에서 직선 l 에 내린 수선의 발이 H, AH=d. 서술 넷.
        const d = intBetween(rng, 3, 15);
        const STMT: readonly [string, boolean][] = [
          [`직선 $AH$는 직선 $l$과 수직으로 만난다.`, true],
          [`점 $H$는 점 $A$에서 직선 $l$에 내린 수선의 발이다.`, true],
          [
            `점 $A$와 직선 $l$ 사이의 거리는 $\\overline{AH}$의 길이와 같다.`,
            true,
          ],
          [`$\\angle AHl=60^\\circ$이다.`, false],
          [
            `점 $A$와 직선 $l$ 사이의 거리는 $\\overline{AH}$의 길이보다 항상 짧다.`,
            false,
          ],
          [`직선 $l$ 위의 점 중 점 $A$에 가장 가까운 점은 $H$이다.`, true],
        ];
        const idx = distinctIndices(rng, STMT.length, 4);
        const rows = idx.map((i) => STMT[i]!);
        const ans = rows.filter(([, t]) => t).length;
        if (ans === 0 || ans === 4) return null;
        const lines = rows.map(([s], i) => `${BOGI[i]!}. ${s}`).join("\n");
        return {
          content: `점 $A$에서 직선 $l$에 내린 수선의 발을 $H$라 하고 $\\overline{AH}=${d}\\,\\mathrm{cm}$라 하자. 다음 보기 중 옳은 것은 모두 몇 개인지 구하시오.\n\n${lines}`,
          answer: `$${ans}$개`,
          solution: `${rows.map(([s, t], i) => `${BOGI[i]!}. ${s} → ${t ? "옳다" : "옳지 않다"}.`).join("\n")}\n따라서 옳은 것은 $${ans}$개이다.`,
          facts: { d, ans },
        };
      }),
    () => [],
  ),

  // 14 — 시계에서 각의 계산. h시 m분(m 짝수), 작은 쪽 각.
  def(MINOR_BASE, "14", "시계에서 각의 계산", SEC.각, "응용", (rng) =>
    attempt(200, (): Body | null => {
      const h = intBetween(rng, 1, 11);
      const m = intBetween(rng, 0, 29) * 2;
      const hourDeg = 30 * h + 0.5 * m;
      const minDeg = 6 * m;
      let diff = Math.abs(hourDeg - minDeg);
      if (diff > 180) diff = 360 - diff;
      if (!Number.isInteger(diff) || diff < 5 || diff > 175) return null;
      return {
        content: `시계가 $${h}$시 $${m}$분을 가리킬 때, 시침과 분침이 이루는 각 중 작은 쪽의 각의 크기를 구하시오.`,
        answer: `$${diff}^\\circ$`,
        solution: `시침은 $1$분에 $0.5^\\circ$씩 움직이므로 $12$시부터 $${h}$시 $${m}$분까지 $30^\\circ\\times${h}+0.5^\\circ\\times${m}=${hourDeg}^\\circ$ 움직였다.\n분침은 $1$분에 $6^\\circ$씩 움직이므로 $6^\\circ\\times${m}=${minDeg}^\\circ$ 움직였다.\n따라서 두 바늘이 이루는 각 중 작은 쪽은 $${diff}^\\circ$이다.`,
        facts: { h, m, hourDeg, minDeg, diff, ans: diff },
      };
    }),
  ),
];

// ═══════════════════════════════════════════════════════════════════
//  위치 관계 01~05·09~20 — 소품
// ═══════════════════════════════════════════════════════════════════

/** 위치 관계 05 — 삼각기둥 $ABC$-$DEF$. 0 윗면(삼각형) · 1 아랫면 · 2 옆모서리(수선) */
type PrismEdge = { kind: 0 | 1 | 2; i: number };
const PRISM_EDGES: readonly PrismEdge[] = [
  { kind: 0, i: 0 },
  { kind: 0, i: 1 },
  { kind: 0, i: 2 },
  { kind: 1, i: 0 },
  { kind: 1, i: 1 },
  { kind: 1, i: 2 },
  { kind: 2, i: 0 },
  { kind: 2, i: 1 },
  { kind: 2, i: 2 },
];
function prismEdgeName(e: PrismEdge): string {
  if (e.kind === 0) return ["AB", "BC", "CA"][e.i]!;
  if (e.kind === 1) return ["DE", "EF", "FD"][e.i]!;
  return ["AD", "BE", "CF"][e.i]!;
}
/**
 * 두 모서리의 위치 관계 — 직각기둥이므로 축(꼭짓점 순서 문자)이 아니라
 * «같은 삼각형인가 / 대응하는 인덱스인가»로만 갈린다(좌표 불필요, 위상적 사실).
 */
function prismRel(
  e1: PrismEdge,
  e2: PrismEdge,
): "parallel" | "perp" | "meet" | "skew" {
  if (e1.kind === e2.kind) {
    return e1.kind === 2 ? "parallel" : "meet";
  }
  if (e1.kind !== 2 && e2.kind !== 2) {
    return e1.i === e2.i ? "parallel" : "skew";
  }
  const tri = e1.kind === 2 ? e2 : e1;
  const vert = e1.kind === 2 ? e1 : e2;
  return vert.i === tri.i || vert.i === (tri.i + 1) % 3 ? "perp" : "skew";
}

/** 위치 관계 09 — 직육면체 $\mathrm{ABCD}$-$\mathrm{EFGH}$의 꼭짓점 B 를
 * 세 꼭짓점 A, C, F 를 지나는 평면으로 잘라 낸다(모서리 AB·BC·BF 소실). */
const CUT_EDGES_09 = ["AC", "CF", "FA"] as const;
const ORIG_REMAIN_09 = [
  "CD",
  "DA",
  "EF",
  "FG",
  "GH",
  "HE",
  "AE",
  "CG",
  "DH",
] as const;
const ALL_EDGES_09: readonly string[] = [...ORIG_REMAIN_09, ...CUT_EDGES_09];
function rel09(e1: string, e2: string): "parallel" | "meet" | "skew" {
  const isCut1 = (CUT_EDGES_09 as readonly string[]).includes(e1);
  const isCut2 = (CUT_EDGES_09 as readonly string[]).includes(e2);
  const shared = sharedCount(e1, e2) > 0;
  if (!isCut1 && !isCut2) {
    if (shared) return "meet";
    return edgeAxis(e1) === edgeAxis(e2) ? "parallel" : "skew";
  }
  return shared ? "meet" : "skew";
}

/** 위치 관계 04 — 사면체 $ABCD$. 모서리(두 글자)의 반대 모서리 = 나머지 두 글자. */
const TETRA_LETTERS = ["A", "B", "C", "D"] as const;
function tetraOpposite(x: string, y: string): [string, string] {
  const rest = TETRA_LETTERS.filter((l) => l !== x && l !== y);
  return [rest[0]!, rest[1]!];
}

/**
 * 위치 관계 10 — 삼각뿔의 전개도(밑면 $A,B,C$ + 꼭짓점으로 접히는 세 날개
 * $D$(모서리 AB 쪽) · $E$(BC 쪽) · $F$(CA 쪽)). 접으면 D=E=F=꼭짓점.
 * `NET_PHYS`: 각 전개도 모서리가 나타내는 실제 입체 모서리(꼭짓점을 `*`로 표시).
 */
const NET_PHYS: Record<string, string> = {
  AB: "AB",
  BC: "BC",
  CA: "CA",
  AD: "A*",
  BD: "B*",
  BE: "B*",
  CE: "C*",
  CF: "C*",
  AF: "A*",
};
const NET_POOL = Object.keys(NET_PHYS);
function netEndpoints(label: string): [string, string] {
  const p = NET_PHYS[label]!;
  return [p[0]!, p[1]!];
}
/** 두 전개도 모서리가 (접었을 때) 한 점에서 만나는가 — 같은 물리 모서리면 null. */
function netMeets(l1: string, l2: string): boolean | null {
  if (NET_PHYS[l1] === NET_PHYS[l2]) return null;
  const [a1, b1] = netEndpoints(l1);
  const [a2, b2] = netEndpoints(l2);
  return a1 === a2 || a1 === b2 || b1 === a2 || b1 === b2;
}
/** 전개도의 **접는 선** 점선 무늬 — 시험이 이 값을 그대로 읽는다(두 벌 금지). */
export const NET_FOLD_DASH = "5 4";

/** 접는 선 = 접었을 때 겹치는 가운데 삼각형의 세 변. 날개 여섯은 자르는 선이다. */
export const NET_FOLD_EDGES = ["AB", "BC", "CA"] as const;

export const FIGURE_TETRA_NET: Record<string, unknown> = {
  version: 2,
  style: { show_points: true },
  points: {
    A: [65, 145],
    B: [175, 145],
    C: [120, 55],
    D: [120, 215],
    E: [205, 110],
    F: [35, 110],
  },
  // 접는 선(가운데 삼각형 세 변)은 **점선**, 날개 여섯은 실선이다.
  // 전개도에서 실선은 «자르는 선»이라, 접는 선을 실선으로 그리면 그림이 전개도가
  // 아니게 된다(초5 교과 규약. 원장님이 J10504-A05-005·006 화면에서 짚으셨다).
  // 점선 문법은 v2 엔진의 `segments.<이름>.dash` 다 —
  // `vendor/figure-engine/core/figure_scene.py:2506` 이 받는 키를 못 박아 두었고,
  // 모르는 키를 넣으면 조용히 무시되는 게 아니라 **던진다**(`_strict_keys`).
  segments: {
    AB: { points: ["A", "B"], dash: NET_FOLD_DASH },
    BC: { points: ["B", "C"], dash: NET_FOLD_DASH },
    CA: { points: ["C", "A"], dash: NET_FOLD_DASH },
    AD: ["A", "D"],
    BD: ["B", "D"],
    BE: ["B", "E"],
    CE: ["C", "E"],
    CF: ["C", "F"],
    AF: ["A", "F"],
  },
  labels: { A: "A", B: "B", C: "C", D: "D", E: "E", F: "F" },
};

/** 위치 관계 03 — 평면이 하나로 정해질 조건. 표준 교과 사실(참·거짓 고정). */
const PLANE_COND: readonly [string, boolean][] = [
  ["한 직선 위에 있지 않은 서로 다른 세 점은 하나의 평면을 정한다.", true],
  ["한 직선과 그 직선 위에 있지 않은 한 점은 하나의 평면을 정한다.", true],
  ["한 점에서 만나는 두 직선은 하나의 평면을 정한다.", true],
  ["평행한 두 직선은 하나의 평면을 정한다.", true],
  ["한 직선 위에 있는 서로 다른 세 점은 하나의 평면을 정한다.", false],
  ["꼬인 위치에 있는 두 직선은 하나의 평면을 정한다.", false],
  ["공간에 있는 서로 다른 네 점은 항상 하나의 평면을 정한다.", false],
  ["일치하는 두 직선은 하나의 평면을 정한다.", false],
];

/** 위치 관계 19 — 공간에서 여러 가지 위치 관계. 표준 교과 사실(참·거짓 고정). */
const SPACE_CLAIMS: readonly [string, boolean][] = [
  ["한 평면에 수직인 서로 다른 두 직선은 서로 평행하다.", true],
  ["한 직선에 수직인 서로 다른 두 평면은 서로 평행하다.", true],
  ["한 평면에 평행한 서로 다른 두 평면은 서로 평행하다.", true],
  ["한 직선에 평행한 서로 다른 두 직선은 서로 평행하다.", true],
  ["한 평면에 평행한 서로 다른 두 직선은 서로 평행하다.", false],
  ["한 직선에 수직인 서로 다른 두 직선은 서로 평행하다.", false],
  ["공간에서 두 직선이 만나지 않으면 서로 평행하다.", false],
  ["한 평면에 수직인 서로 다른 두 평면은 서로 평행하다.", false],
];

/** 위치 관계 13 — 두 직선이 평행할 조건. 표준 교과 사실(참·거짓 고정). */
const PARALLEL_COND: readonly [string, boolean][] = [
  ["동위각의 크기가 같으면 두 직선은 평행하다.", true],
  ["엇각의 크기가 같으면 두 직선은 평행하다.", true],
  [
    "한쪽으로 같은 위치에 있는 두 내각의 크기의 합이 $180^\\circ$이면 두 직선은 평행하다.",
    true,
  ],
  ["맞꼭지각의 크기가 같으면 두 직선은 평행하다.", false],
  [
    "한 직선과 만나 생기는 인접한 두 각의 크기의 합이 $180^\\circ$이면 두 직선은 평행하다.",
    false,
  ],
  ["엇각의 크기의 합이 $180^\\circ$이면 두 직선은 평행하다.", false],
];

const M1_GEO1_POS: TypeEntry[] = [
  // 01 — 점과 직선/평면의 위치 관계(참·거짓 개수).
  def(
    MINOR_POS,
    "01",
    "점과 직선 점과 평면의 위치 관계",
    SEC.두직선,
    "기본",
    (rng) =>
      attempt(200, (): Body | null => {
        const kind = pick(rng, [0, 1] as const);
        const objName = kind === 0 ? "직선 $l$" : "평면 $P$";
        const labels = ["A", "B", "C", "D", "E"];
        const onCount = pick(rng, [2, 3] as const);
        const onIdx = new Set(distinctIndices(rng, 5, onCount));
        const onLabels = labels.filter((_, i) => onIdx.has(i));
        const offLabels = labels.filter((_, i) => !onIdx.has(i));
        const stmtIdx = distinctIndices(rng, 5, 4);
        const rows = stmtIdx.map((i) => {
          const isOn = onIdx.has(i);
          const neg = pick(rng, [true, false] as const);
          const claim = neg ? !isOn : isOn;
          return {
            s: `점 $${labels[i]}$는 ${objName} 위에 ${neg ? "있지 않다" : "있다"}.`,
            t: claim,
          };
        });
        const ans = rows.filter((r) => r.t).length;
        if (ans === 0 || ans === 4) return null;
        return {
          content: `${objName} 위에 점 ${onLabels.map((l) => `$${l}$`).join(", ")}이 있고, ${objName} 위에 있지 않은 점 ${offLabels.map((l) => `$${l}$`).join(", ")}이 있다. 다음 보기 중 옳은 것은 모두 몇 개인지 구하시오.\n\n${rows.map((r, i) => `${BOGI[i]!}. ${r.s}`).join("\n")}`,
          answer: `$${ans}$개`,
          solution: `${rows.map((r, i) => `${BOGI[i]!}. ${r.t ? "옳다" : "옳지 않다"}.`).join("\n")}\n따라서 옳은 것은 $${ans}$개이다.`,
          facts: { kind, onCount, ans },
        };
      }),
    () => [],
  ),

  // 02 — 정n각형의 각 변을 연장한 직선 중 한 변과의 위치 관계.
  def(
    MINOR_POS,
    "02",
    "평면에서 두 직선의 위치 관계",
    SEC.두직선,
    "응용",
    (rng) => {
      const n = intBetween(rng, 5, 12);
      const even = n % 2 === 0;
      const b = even ? 1 : 0;
      const a = n - 1 - b;
      const branch = pick(rng, [0, 1] as const);
      const ans = branch === 0 ? a - b : a + b;
      return {
        content: `정${gonName(n)}에서 한 변을 연장한 직선을 $l$이라 하자. 나머지 변을 각각 연장한 직선 중에서 $l$과 한 점에서 만나는 직선의 개수를 $a$, $l$과 평행한 직선의 개수를 $b$라 할 때, ${branch === 0 ? "$a-b$" : "$a+b$"}의 값을 구하시오.`,
        answer: `$${ans}$`,
        solution: `정${gonName(n)}은 변이 $${n}$개이므로 $l$을 제외한 나머지 직선은 $${n - 1}$개이다.\n${even ? `$n=${n}$이 짝수이므로 $l$과 평행한 직선은 마주 보는 변 하나뿐이다.` : `$n=${n}$이 홀수이므로 $l$과 평행한 변이 없다.`}\n따라서 $b=${b}$, $a=${n - 1}-${b}=${a}$이므로 ${branch === 0 ? `$a-b=${a}-${b}=${ans}$` : `$a+b=${a}+${b}=${ans}$`}이다.`,
        facts: { n, even: even ? 1 : 0, a, b, branch, ans },
      };
    },
  ),

  // 03 — 평면이 하나로 정해질 조건(참·거짓 개수).
  def(
    MINOR_POS,
    "03",
    "평면이 하나로 정해질 조건",
    SEC.두직선,
    "응용",
    (rng) =>
      attempt(200, (): Body | null => {
        const idx = distinctIndices(rng, PLANE_COND.length, 4);
        const rows = idx.map((i) => PLANE_COND[i]!);
        const ans = rows.filter(([, t]) => t).length;
        if (ans === 0 || ans === 4) return null;
        return {
          content: `다음 보기 중 평면이 하나로 정해지는 것은 모두 몇 개인지 구하시오.\n\n${rows.map(([s], i) => `${BOGI[i]!}. ${s}`).join("\n")}`,
          answer: `$${ans}$개`,
          solution: `${rows.map(([s, t], i) => `${BOGI[i]!}. ${s} → ${t ? "하나로 정해진다" : "하나로 정해지지 않는다"}.`).join("\n")}\n따라서 하나로 정해지는 것은 $${ans}$개이다.`,
          facts: { ans },
        };
      }),
    () => [],
  ),

  // 04 — 사면체 ABCD 의 꼬인 위치(위상적 사실 — 나머지 두 글자).
  def(MINOR_POS, "04", "꼬인 위치", SEC.두직선, "기본", (rng) => {
    const idx = distinctIndices(rng, 4, 2);
    const x = TETRA_LETTERS[idx[0]!]!;
    const y = TETRA_LETTERS[idx[1]!]!;
    const [o1, o2] = tetraOpposite(x, y);
    return {
      content: `사면체 $ABCD$에서 모서리 $${x}${y}$와 꼬인 위치에 있는 모서리를 구하시오.`,
      answer: `모서리 $${o1}${o2}$`,
      solution: `사면체의 여섯 모서리 중, 서로 만나지도 평행하지도 않은 두 모서리는 네 꼭짓점을 정확히 둘씩 나눠 가진다.\n모서리 $${x}${y}$가 지나지 않는 나머지 두 꼭짓점 $${o1}$, $${o2}$를 잇는 모서리 $${o1}${o2}$가 $${x}${y}$와 꼬인 위치에 있다.`,
      facts: { x: idx[0]!, y: idx[1]! },
    };
  }),

  // 05 — 삼각기둥 ABC-DEF 의 위치 관계 종합(평행 a·수직 b·꼬인위치 c의 합).
  def(
    MINOR_POS,
    "05",
    "공간에서 두 직선의 위치 관계",
    SEC.두직선,
    "응용",
    (rng) => {
      const refIdx = intBetween(rng, 0, PRISM_EDGES.length - 1);
      const ref = PRISM_EDGES[refIdx]!;
      let a = 0;
      let b = 0;
      let c = 0;
      for (const e of PRISM_EDGES) {
        if (e === ref) continue;
        const rel = prismRel(ref, e);
        if (rel === "parallel") a += 1;
        else if (rel === "perp") b += 1;
        else if (rel === "skew") c += 1;
      }
      const ans = a + b + c;
      return {
        content: `그림과 같은 삼각기둥 $ABC$-$DEF$에서 모서리 $${prismEdgeName(ref)}$와 평행한 모서리의 개수를 $a$, 수직으로 만나는 모서리의 개수를 $b$, 꼬인 위치에 있는 모서리의 개수를 $c$라 할 때, $a+b+c$의 값을 구하시오.`,
        answer: `$${ans}$`,
        solution: `모서리 $${prismEdgeName(ref)}$에 대하여, 평행한 모서리는 $${a}$개, 수직으로 만나는 모서리는 $${b}$개, 꼬인 위치에 있는 모서리는 $${c}$개이다.\n따라서 $a+b+c=${a}+${b}+${c}=${ans}$이다.`,
        facts: { refIdx, a, b, c, ans },
      };
    },
  ),

  // 09 — 잘라 낸 입체도형에서의 꼬인 위치 개수.
  def(
    MINOR_POS,
    "09",
    "일부를 잘라 낸 입체도형에서의 위치 관계",
    SEC.공간평면,
    "심화",
    (rng) => {
      const refIdx = intBetween(rng, 0, ALL_EDGES_09.length - 1);
      const ref = ALL_EDGES_09[refIdx]!;
      let ans = 0;
      for (const e of ALL_EDGES_09) {
        if (e === ref) continue;
        if (rel09(ref, e) === "skew") ans += 1;
      }
      return {
        content: `직육면체 $\\mathrm{ABCD}$-$\\mathrm{EFGH}$의 꼭짓점 $\\mathrm{B}$를 세 꼭짓점 $\\mathrm{A}$, $\\mathrm{C}$, $\\mathrm{F}$를 지나는 평면으로 잘라 내고 남은 입체도형이 있다. 이 입체도형에서 모서리 $\\mathrm{${ref}}$와 꼬인 위치에 있는 모서리의 개수를 구하시오.`,
        answer: `$${ans}$개`,
        solution: `잘라 낸 자리에는 새 모서리 $\\mathrm{AC}$, $\\mathrm{CF}$, $\\mathrm{FA}$가 생기고, 모서리 $\\mathrm{AB}$, $\\mathrm{BC}$, $\\mathrm{BF}$는 없어진다.\n남은 모서리 중 $\\mathrm{${ref}}$와 만나지도 평행하지도 않은 모서리를 세면 $${ans}$개이다.`,
        facts: { refIdx, ans },
      };
    },
  ),

  // 10 — 삼각뿔 전개도. 접었을 때 만나는가(참·거짓 개수). 그림 없이도 되지만
  // 전개도 자체가 «말로 못 하는 배치»라 FIGURE_TETRA_NET 을 붙인다.
  def(
    MINOR_POS,
    "10",
    "전개도가 주어졌을 때의 위치 관계",
    SEC.공간평면,
    "심화",
    (rng) =>
      attempt(300, (): Body | null => {
        const pairs: [string, string][] = [];
        while (pairs.length < 4) {
          const i = intBetween(rng, 0, NET_POOL.length - 1);
          const j = intBetween(rng, 0, NET_POOL.length - 1);
          if (i === j) continue;
          const l1 = NET_POOL[i]!;
          const l2 = NET_POOL[j]!;
          const m = netMeets(l1, l2);
          if (m === null) continue;
          if (pairs.some(([p, q]) => p === l1 && q === l2)) continue;
          pairs.push([l1, l2]);
        }
        const rows = pairs.map(([l1, l2]) => {
          const actual = netMeets(l1, l2)!;
          const askMeet = pick(rng, [true, false] as const);
          const claim = askMeet ? actual : !actual;
          const relWord = askMeet ? "한 점에서 만난다" : "꼬인 위치에 있다";
          return {
            s: `모서리 $${l1}$와 모서리 $${l2}$는 접었을 때 ${relWord}.`,
            t: claim,
          };
        });
        const ans = rows.filter((r) => r.t).length;
        if (ans === 0 || ans === 4) return null;
        return {
          content: `그림은 삼각뿔의 전개도이다. 접어서 삼각뿔을 만들 때, 다음 보기 중 옳은 것은 모두 몇 개인지 구하시오.\n\n${rows.map((r, i) => `${BOGI[i]!}. ${r.s}`).join("\n")}`,
          answer: `$${ans}$개`,
          solution: `점 $D$, $E$, $F$는 접었을 때 모두 삼각뿔의 꼭짓점 한 점으로 겹친다.\n${rows.map((r, i) => `${BOGI[i]!}. ${r.t ? "옳다" : "옳지 않다"}.`).join("\n")}\n따라서 옳은 것은 $${ans}$개이다.`,
          facts: { ans },
          figureSpec: FIGURE_TETRA_NET,
        };
      }),
    () => [],
  ),

  // 11 — 동위각과 엇각(정의) — l∥m 일 때 두 식이 같다 ⇒ x.
  def(MINOR_POS, "11", "동위각과 엇각", SEC.평행선, "응용", (rng) =>
    attempt(200, (): Body | null => {
      const relKind = pick(rng, [0, 1] as const);
      const a = pick(rng, [2, 3, 4] as const);
      const b2 = pick(rng, [2, 3, 5] as const);
      if (a === b2) return null;
      const x = intBetween(rng, 3, 25);
      const p = intBetween(rng, 5, 60);
      const val = a * x + p;
      const q = val - b2 * x;
      if (q < 0 || q > 170 || val <= 10 || val >= 170) return null;
      const relWord = relKind === 0 ? "동위각" : "엇각";
      return {
        content: `두 직선 $l$, $m$이 다른 한 직선 $t$와 만나고 $l\\parallel m$이다. $l$과 $t$의 교점에서 생기는 $\\angle a=(${a}x+${p})^\\circ$이고, $\\angle a$의 ${relWord}인 $\\angle b=(${b2}x+${q})^\\circ$일 때, $x$의 값을 구하시오.`,
        answer: `$${x}$`,
        solution: `$l\\parallel m$이므로 ${relWord}의 크기는 서로 같다. 따라서 $${a}x+${p}=${b2}x+${q}$이다.\n$${a - b2}x=${q - p}$에서 $x=${x}$이다.`,
        facts: { relKind, a, p, b2, q, x, ans: x },
        figureSpec: FIGURE_PARALLEL,
      };
    }),
  ),

  // 12 — 평행선에서 동위각·엇각의 크기: θ 주어지면 이웃(평각)인 각은 180-θ.
  def(
    MINOR_POS,
    "12",
    "평행선에서 동위각 엇각의 크기",
    SEC.평행선,
    "기본",
    (rng) =>
      attempt(200, (): Body | null => {
        const relKind = pick(rng, [0, 1] as const);
        const theta = intBetween(rng, 20, 160);
        const ans = 180 - theta;
        if (ans === theta) return null;
        const relWord = relKind === 0 ? "동위각" : "엇각";
        return {
          content: `그림에서 $l\\parallel m$이고 $\\angle a=${theta}^\\circ$이다. $\\angle a$의 ${relWord}과 이웃하며 그 두 각의 크기의 합이 평각을 이루는 각의 크기를 구하시오.`,
          answer: `$${ans}^\\circ$`,
          solution: `$l\\parallel m$이므로 $\\angle a$의 ${relWord}의 크기는 $\\angle a$와 같은 $${theta}^\\circ$이다.\n구하는 각은 그 각과 이웃하여 합이 평각($180^\\circ$)을 이루므로 $180^\\circ-${theta}^\\circ=${ans}^\\circ$이다.`,
          facts: { relKind, theta, ans },
          figureSpec: FIGURE_PARALLEL,
        };
      }),
  ),

  // 13 — 두 직선이 평행할 조건(참·거짓 개수).
  def(
    MINOR_POS,
    "13",
    "두 직선이 평행할 조건",
    SEC.평행선,
    "응용",
    (rng) =>
      attempt(200, (): Body | null => {
        const idx = distinctIndices(rng, PARALLEL_COND.length, 4);
        const rows = idx.map((i) => PARALLEL_COND[i]!);
        const ans = rows.filter(([, t]) => t).length;
        if (ans === 0 || ans === 4) return null;
        return {
          content: `다음 보기 중 두 직선 $l$, $m$이 다른 한 직선과 만날 때, $l\\parallel m$임을 알 수 있는 것은 모두 몇 개인지 구하시오.\n\n${rows.map(([s], i) => `${BOGI[i]!}. ${s}`).join("\n")}`,
          answer: `$${ans}$개`,
          solution: `${rows.map(([s, t], i) => `${BOGI[i]!}. ${s} → ${t ? "평행하다고 할 수 있다" : "평행하다고 할 수 없다"}.`).join("\n")}\n따라서 옳은 것은 $${ans}$개이다.`,
          facts: { ans },
          figureSpec: FIGURE_PARALLEL,
        };
      }),
    () => [],
  ),

  // 14 — 평행선 + 삼각형의 성질: 두 평행선 사이의 꺾인 점 하나, x=a+b.
  def(
    MINOR_POS,
    "14",
    "평행선에서 각의 크기 구하기 삼각형의 성질 이용",
    SEC.평행선,
    "응용",
    (rng) =>
      attempt(200, (): Body | null => {
        const a = intBetween(rng, 15, 80);
        const b = intBetween(rng, 15, 80);
        const x = a + b;
        if (x >= 175) return null;
        return {
          content: `그림과 같이 $l\\parallel m$이고, 두 직선 사이의 점 $P$에서 $l$ 위의 점과 $m$ 위의 점을 각각 이었다. $l$과 이루는 각이 $${a}^\\circ$, $m$과 이루는 각이 $${b}^\\circ$일 때, 점 $P$에서 꺾인 각 $x$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `점 $P$를 지나고 $l$, $m$에 평행한 보조선을 그으면, 엇각에 의해 $x$는 $${a}^\\circ$와 $${b}^\\circ$인 두 각으로 나뉜다.\n따라서 $x=${a}+${b}=${x}$이므로 $${x}^\\circ$이다.`,
          facts: { a, b, x, ans: x },
        };
      }),
  ),

  // 15 — 보조선을 긋는 경우(1): 꺾인 점 셋, x=a+b+c.
  def(
    MINOR_POS,
    "15",
    "평행선에서 각의 크기 구하기 평행한 보조선을 긋는 경우 (1)",
    SEC.평행선,
    "응용",
    (rng) =>
      attempt(200, (): Body | null => {
        const a = intBetween(rng, 10, 50);
        const b = intBetween(rng, 10, 50);
        const c = intBetween(rng, 10, 50);
        const x = a + b + c;
        if (x >= 175) return null;
        return {
          content: `그림과 같이 $l\\parallel m$이고, 두 직선 사이에 꺾인 점이 세 개 있는 선이 있다. 각 꺾인 점에서 보조선(각각 $l$, $m$에 평행)을 그었을 때 생기는 세 엇각의 크기가 각각 $${a}^\\circ$, $${b}^\\circ$, $${c}^\\circ$이다. 전체 꺾인 각 $x$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `각 꺾인 점을 지나고 $l$, $m$에 평행한 보조선을 그으면 엇각에 의해 $x$는 $${a}^\\circ$, $${b}^\\circ$, $${c}^\\circ$인 세 각으로 나뉜다.\n따라서 $x=${a}+${b}+${c}=${x}$이므로 $${x}^\\circ$이다.`,
          facts: { a, b, c, x, ans: x },
        };
      }),
  ),

  // 16 — 보조선을 긋는 경우(2): 가운데 꺾임이 반대 방향, x=b-a+c.
  def(
    MINOR_POS,
    "16",
    "평행선에서 각의 크기 구하기 평행한 보조선을 긋는 경우 (2)",
    SEC.평행선,
    "심화",
    (rng) =>
      attempt(200, (): Body | null => {
        const a = intBetween(rng, 10, 50);
        const c = intBetween(rng, 10, 50);
        const b = intBetween(rng, a + 20, a + 90);
        const x = b - a + c;
        if (x <= 0 || x >= 175) return null;
        return {
          content: `그림과 같이 $l\\parallel m$이고, 두 직선 사이에 꺾인 점이 세 개 있는데 가운데 꺾인 점은 바깥쪽으로 꺾여 있다. 보조선을 그었을 때 생기는 세 엇각의 크기가 각각 $${a}^\\circ$, $${b}^\\circ$, $${c}^\\circ$($${b}^\\circ$는 가운데 꺾인 점의 각)이다. 전체 꺾인 각 $x$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `가운데 점이 바깥쪽으로 꺾여 있으므로 그 점의 각은 나머지 둘과 반대로 작용한다.\n따라서 $x=${b}-${a}+${c}=${x}$이므로 $${x}^\\circ$이다.`,
          facts: { a, b, c, x, ans: x },
        };
      }),
  ),

  // 17 — 평행선에서의 활용(1): 네 꺾인 각의 합 = 180.
  def(MINOR_POS, "17", "평행선에서의 활용 (1)", SEC.평행선, "응용", (rng) =>
    attempt(200, (): Body | null => {
      const a = intBetween(rng, 10, 50);
      const b = intBetween(rng, 10, 50);
      const c = intBetween(rng, 10, 50);
      const x = 180 - a - b - c;
      if (x <= 5 || x >= 150) return null;
      return {
        content: `그림과 같이 $l\\parallel m$이고, 두 직선 사이에 네 개의 꺾인 점이 있는 지그재그 선이 있다. 그중 세 꺾인 각의 크기가 각각 $${a}^\\circ$, $${b}^\\circ$, $${c}^\\circ$일 때, 나머지 한 꺾인 각 $x$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `두 평행선 사이에 있는 지그재그 선의 네 꺾인 각의 크기의 합은 항상 $180^\\circ$이다.\n따라서 $x=180-${a}-${b}-${c}=${x}$이므로 $${x}^\\circ$이다.`,
        facts: { a, b, c, x, ans: x },
      };
    }),
  ),

  // 18 — 직사각형 접기: ∠DAC=β(엇각=접은각), 직각(90°)에서 ∠B'AC=90-β.
  def(
    MINOR_POS,
    "18",
    "직사각형 모양의 종이를 접은 경우",
    SEC.평행선,
    "응용",
    (rng) =>
      attempt(200, (): Body | null => {
        const beta = intBetween(rng, 10, 80);
        const x = 90 - beta;
        if (x === beta || x <= 0) return null;
        return {
          content: `직사각형 모양의 종이 $ABCD$를 대각선 $AC$를 접는 선으로 하여 꼭짓점 $B$가 사각형 내부의 점 $B'$에 오도록 접었다. $\\angle DAC=${beta}^\\circ$일 때, $\\angle B'AC$의 크기 $x$를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `$\\overline{AD}\\parallel\\overline{BC}$이므로 엇각에 의해 $\\angle BCA=\\angle DAC=${beta}^\\circ$이고, 삼각형 $ABC$에서 $\\angle BAC=90^\\circ-\\angle BCA=${x}^\\circ$이다.\n접은 각의 크기는 같으므로 $\\angle B'AC=\\angle BAC=${x}^\\circ$이다.`,
          facts: { beta, x, ans: x },
        };
      }),
  ),

  // 19 — 공간에서 여러 가지 위치 관계(참·거짓 개수).
  def(
    MINOR_POS,
    "19",
    "공간에서 여러 가지 위치 관계",
    SEC.공간평면,
    "심화",
    (rng) =>
      attempt(200, (): Body | null => {
        const idx = distinctIndices(rng, SPACE_CLAIMS.length, 4);
        const rows = idx.map((i) => SPACE_CLAIMS[i]!);
        const ans = rows.filter(([, t]) => t).length;
        if (ans === 0 || ans === 4) return null;
        return {
          content: `공간에서 서로 다른 직선과 평면에 대하여, 다음 보기 중 옳은 것은 모두 몇 개인지 구하시오.\n\n${rows.map(([s], i) => `${BOGI[i]!}. ${s}`).join("\n")}`,
          answer: `$${ans}$개`,
          solution: `${rows.map(([s, t], i) => `${BOGI[i]!}. ${s} → ${t ? "옳다" : "옳지 않다"}.`).join("\n")}\n따라서 옳은 것은 $${ans}$개이다.`,
          facts: { ans },
        };
      }),
    () => [],
  ),

  // 20 — 평행선에서의 활용(2): 두 평행선 위 점에서 각을 1:(n-1)로 나눌 때
  // 교점의 각 = 180/n (n=2 는 이등분선의 직각 성질과 같은 자리).
  def(MINOR_POS, "20", "평행선에서의 활용 (2)", SEC.평행선, "심화", (rng) => {
    const n = pick(rng, [2, 3, 4, 5, 6] as const);
    const ans = 180 / n;
    return {
      content: `그림과 같이 $l\\parallel m$이고, $l$ 위의 점 $A$, $m$ 위의 점 $B$에서 각각 그은 두 직선이 점 $C$에서 만난다. $\\angle DAC=\\dfrac{1}{${n}}\\angle DAB$, $\\angle EBC=\\dfrac{1}{${n}}\\angle EBA$일 때, $\\angle ACB$의 크기를 구하시오.`,
      answer: `$${ans}^\\circ$`,
      solution: `$\\angle DAC=\\alpha$, $\\angle EBC=\\beta$라 하면 $\\angle CAB=(${n}-1)\\alpha$, $\\angle CBA=(${n}-1)\\beta$이다.\n$l\\parallel m$이므로 $\\angle DAB+\\angle EBA=180^\\circ$, 즉 $${n}\\alpha+${n}\\beta=180^\\circ$에서 $\\alpha+\\beta=\\dfrac{180^\\circ}{${n}}$이다.\n삼각형 $ABC$의 세 각의 크기의 합이 $180^\\circ$이므로 $\\angle ACB=180^\\circ-(${n}-1)\\alpha-(${n}-1)\\beta=180^\\circ-(${n}-1)(\\alpha+\\beta)=180^\\circ-\\dfrac{(${n}-1)\\times180^\\circ}{${n}}=\\dfrac{180^\\circ}{${n}}=${ans}^\\circ$이다.`,
      facts: { n, ans },
    };
  }),
];

export const M1_GEO1_EXT: TypeEntry[] = [
  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 「위치 관계」를 20, 「기본 도형」을 14, 「다면체와 회전체」를 20 까지만
  // 담는다. 130소단원을 10유형으로 올리려면 색인에 없는 유형을 지어야 하므로
  // 번호를 갈래마다 나눠 쓴다 — 갈래 C 는 70번대.

  def(
    MINOR_POS,
    "70",
    "각뿔에서 밑면의 한 모서리와 꼬인 위치에 있는 모서리",
    SEC.두직선,
    "기본",
    (rng): Body => {
      const n = intBetween(rng, 4, 8);
      return {
        content: `${koNum(n)}각뿔에서 밑면의 한 모서리와 꼬인 위치에 있는 모서리의 개수를 구하시오.`,
        answer: `$${n - 2}$개`,
        solution: `밑면의 모서리는 다른 밑면의 모서리와 한 평면 위에 있으므로 꼬인 위치가 아니다.\n옆모서리 $${n}$개 중 그 모서리의 양 끝점에서 만나는 $2$개를 빼면 $${n}-2=${n - 2}$개가 꼬인 위치에 있다.`,
        facts: { n, ans: n - 2, kind: 0 },
      };
    },
  ),

  def(
    MINOR_POS,
    "71",
    "각뿔에서 한 옆모서리와 만나는 모서리",
    SEC.두직선,
    "기본",
    (rng): Body => {
      const n = intBetween(rng, 4, 8);
      return {
        content: `${koNum(n)}각뿔에서 한 옆모서리와 만나는 모서리의 개수를 구하시오.`,
        answer: `$${n + 1}$개`,
        solution: `꼭짓점에서 나머지 옆모서리 $${n - 1}$개와 만나고, 밑면의 꼭짓점에서 밑면의 모서리 $2$개와 만난다.\n따라서 $${n - 1}+2=${n + 1}$개이다.`,
        facts: { n, ans: n + 1, kind: 1 },
      };
    },
  ),

  def(
    MINOR_POS,
    "72",
    "각기둥에서 한 옆모서리와 평행한 모서리",
    SEC.두직선,
    "기본",
    (rng): Body => {
      const n = intBetween(rng, 4, 9);
      return {
        content: `${koNum(n)}각기둥에서 한 옆모서리와 평행한 모서리의 개수를 구하시오.`,
        answer: `$${n - 1}$개`,
        solution: `각기둥의 옆모서리는 모두 서로 평행하다.\n옆모서리는 $${n}$개이므로 자기 자신을 뺀 $${n}-1=${n - 1}$개가 평행하다.`,
        facts: { n, ans: n - 1, kind: 2 },
      };
    },
  ),

  def(
    MINOR_POS,
    "73",
    "각기둥에서 한 밑면 모서리와 꼬인 위치에 있는 모서리",
    SEC.두직선,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 4, 8);
      return {
        content: `${koNum(n)}각기둥에서 한 밑면의 모서리와 꼬인 위치에 있는 모서리의 개수를 구하시오.`,
        answer: `$${2 * n - 3}$개`,
        solution: `같은 밑면의 모서리는 한 평면 위에 있으므로 꼬인 위치가 아니다.\n다른 밑면의 모서리 $${n}$개 중 평행한 $1$개를 뺀 $${n - 1}$개, 옆모서리 $${n}$개 중 양 끝에서 만나는 $2$개를 뺀 $${n - 2}$개가 꼬인 위치에 있다.\n따라서 $${n - 1}+${n - 2}=${2 * n - 3}$개이다.`,
        facts: { n, ans: 2 * n - 3, kind: 3 },
      };
    },
  ),

  def(
    MINOR_POS,
    "74",
    "각뿔에서 꼬인 위치에 있는 모서리의 쌍의 개수",
    SEC.두직선,
    "심화",
    (rng): Body => {
      const n = intBetween(rng, 4, 7);
      return {
        content: `${koNum(n)}각뿔에서 서로 꼬인 위치에 있는 두 모서리의 쌍은 모두 몇 쌍인지 구하시오.`,
        answer: `$${n * (n - 2)}$쌍`,
        solution: `밑면의 모서리끼리는 한 평면 위에 있고, 옆모서리끼리는 꼭짓점에서 만나므로 꼬인 위치가 아니다.\n밑면의 모서리 하나마다 꼬인 위치인 옆모서리가 $${n - 2}$개이므로 $${n}\\times${n - 2}=${n * (n - 2)}$쌍이다.`,
        facts: { n, ans: n * (n - 2), kind: 4 },
      };
    },
  ),

  def(
    MINOR_BASE,
    "70",
    "선분을 삼등분하는 점",
    SEC.점선면,
    "기본",
    (rng): Body => {
      const unit = intBetween(rng, 2, 9);
      const ab = 3 * unit;
      return {
        content: `선분 $AB$ 위의 두 점 $P$, $Q$가 $\\overline{AB}$를 삼등분한다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$일 때, $\\overline{AQ}$의 길이를 구하시오.`,
        answer: `$${2 * unit}\\,\\mathrm{cm}$`,
        solution: `삼등분한 한 도막의 길이는 $\\dfrac{${ab}}{3}=${unit}\\,\\mathrm{cm}$이다.\n$\\overline{AQ}$는 그 두 도막이므로 $2\\times${unit}=${2 * unit}\\,\\mathrm{cm}$이다.`,
        facts: { ab, unit, ans: 2 * unit },
      };
    },
  ),

  def(
    MINOR_BASE,
    "71",
    "두 점 사이의 거리의 비",
    SEC.점선면,
    "응용",
    (rng): Body => {
      const m = intBetween(rng, 1, 5);
      const k = intBetween(rng, 1, 5);
      const unit = intBetween(rng, 2, 8);
      const ac = (m + k) * unit;
      return {
        content: `수직선 위에 세 점 $A$, $B$, $C$가 이 순서로 있고 $\\overline{AB}:\\overline{BC}=${m}:${k}$이다. $\\overline{AC}=${ac}\\,\\mathrm{cm}$일 때, $\\overline{AB}$의 길이를 구하시오.`,
        answer: `$${m * unit}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AC}$를 $${m}+${k}=${m + k}$등분한 한 도막은 $\\dfrac{${ac}}{${m + k}}=${unit}\\,\\mathrm{cm}$이다.\n$\\overline{AB}$는 그 $${m}$도막이므로 $${m}\\times${unit}=${m * unit}\\,\\mathrm{cm}$이다.`,
        facts: { m, k, unit, ac, ans: m * unit },
      };
    },
  ),

  def(
    MINOR_BASE,
    "72",
    "직선 위의 점들이 나누는 부분의 개수",
    SEC.점선면,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 3, 9);
      return {
        content: `한 직선 위에 서로 다른 $${n}$개의 점이 있다. 이 점들에 의해 직선이 나누어지는 부분은 모두 몇 개인지 구하시오.`,
        answer: `$${n + 1}$개`,
        solution: `점 $${n}$개 사이에 생기는 선분이 $${n - 1}$개이고, 양 끝에 반직선이 $2$개 생긴다.\n따라서 $${n - 1}+2=${n + 1}$개이다.`,
        facts: { n, ans: n + 1 },
      };
    },
  ),

  def(
    MINOR_BASE,
    "73",
    "중점이 겹칠 때 선분의 길이",
    SEC.점선면,
    "심화",
    (rng): Body => {
      const unit = intBetween(rng, 2, 8);
      const ab = 4 * unit; // M=AB중점, N=AM중점, P=NB중점 이 정수가 되게
      return {
        content: `선분 $AB$의 중점을 $M$, $\\overline{AM}$의 중점을 $N$, $\\overline{NB}$의 중점을 $P$라 하자. $\\overline{AB}=${ab}\\,\\mathrm{cm}$일 때, $\\overline{NP}$의 길이를 구하시오.`,
        answer: `$${(3 * unit) / 2}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AM}=${2 * unit}$, $\\overline{AN}=${unit}\\,\\mathrm{cm}$이다.\n$\\overline{NB}=${ab}-${unit}=${ab - unit}\\,\\mathrm{cm}$이므로 $\\overline{NP}=\\dfrac{${ab - unit}}{2}=${(3 * unit) / 2}\\,\\mathrm{cm}$이다.`,
        facts: { ab, unit, ans: (3 * unit) / 2 },
      };
    },
  ),

  def(
    MINOR_SOLID,
    "70",
    "면의 개수가 주어진 각기둥의 모서리와 꼭짓점",
    SEC.다면체,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 4, 10);
      const faces = n + 2;
      return {
        content: `면의 개수가 $${faces}$인 각기둥의 모서리의 개수와 꼭짓점의 개수의 합을 구하시오.`,
        answer: `$${5 * n}$`,
        solution: `${koNum(n)}각기둥의 면의 개수는 $${n}+2=${faces}$이므로 밑면은 ${gonName(n)}이다.\n모서리는 $3\\times${n}=${3 * n}$개, 꼭짓점은 $2\\times${n}=${2 * n}$개이므로 합은 $${5 * n}$이다.`,
        facts: { n, faces, edges: 3 * n, vertices: 2 * n, ans: 5 * n },
      };
    },
  ),

  def(
    MINOR_SOLID,
    "71",
    "각뿔대의 면·모서리·꼭짓점의 개수",
    SEC.다면체,
    "기본",
    (rng): Body => {
      const n = intBetween(rng, 3, 9);
      return {
        content: `${koNum(n)}각뿔대의 면의 개수를 $a$, 모서리의 개수를 $b$, 꼭짓점의 개수를 $c$라 할 때, $a+b-c$의 값을 구하시오.`,
        answer: `$${n + 2 + 3 * n - 2 * n}$`,
        solution: `${koNum(n)}각뿔대는 두 밑면과 옆면 $${n}$개로 면이 $${n + 2}$개, 모서리가 $3\\times${n}=${3 * n}$개, 꼭짓점이 $2\\times${n}=${2 * n}$개이다.\n따라서 $a+b-c=${n + 2}+${3 * n}-${2 * n}=${n + 2 + n}$이다.`,
        facts: { n, a: n + 2, b: 3 * n, c: 2 * n, ans: n + 2 + n },
      };
    },
  ),
];

export const M1_GEO1: TypeEntry[] = [
  ...M1_GEO1_BASE,
  ...M1_GEO1_POS,
  ...M1_GEO1_EXT,
];
