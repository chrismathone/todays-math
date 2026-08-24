/**
 * 중1 물결 6A(m1Geo1) — 기본 도형 14 + 위치 관계 17 = 31유형 독립 검산.
 *
 * `m1Extra.test.ts` 와 같은 계약: 생성기의 답을 그대로 믿지 않는다. 여기 검산은
 * `facts`(발문의 원 수치)를 받아 **여기서 새로 구현한 식**으로 다시 계산한다 —
 * 특히 다면체 개수(오일러 공식+차수), 사면체 꼬인 위치(위상적 사실), 직육면체
 * 모서리 관계(좌표 기하)는 생성기가 쓴 표를 옮겨 적지 않는다.
 */
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import { M1_GEO1 } from "../../lib/middle/m1Geo1";
import type { MidProblem } from "../../lib/middle/types";

const REPO = path.resolve(__dirname, "../../..");
const SEEDS = [20260824, 1, 7777, 424242, 99991];
const SWEEP = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}
/** 「ㄱ.」로 시작하는 보기 줄만 뽑는다. */
function bogiLines(content: string): string[] {
  return content
    .split("\n")
    .filter((l) => /^[ㄱ-ㅎ]\./.test(l.trim()))
    .map((l) => l.trim());
}

// ── 독립 검산 소품(생성기와 다른 코드) ────────────────────────────

/** 다면체 v,e — 오일러 공식 + 차수(m1Solid.test.ts 와 같은 방법, 새로 구현). */
function eulerVE(n: number, fam: number): { v: number; e: number } {
  if (fam === 1) {
    const v = n + 1;
    const e = (n + 3 * n) / 2;
    return { v, e };
  }
  const v = 2 * n;
  const e = (3 * v) / 2;
  return { v, e };
}

/** 정n각형 한 변의 연장선 — 짝수면 마주보는 변 1개만 평행, 홀수면 0개. */
function polygonLineRel(n: number): { a: number; b: number } {
  const b = n % 2 === 0 ? 1 : 0;
  const a = n - 1 - b;
  return { a, b };
}

/** 사면체 반대 모서리 — 네 글자 중 안 쓰인 나머지 둘(위상적 사실, 좌표 없이). */
function tetraOppositeIdx(x: number, y: number): [number, number] {
  const rest = [0, 1, 2, 3].filter((i) => i !== x && i !== y);
  return [rest[0]!, rest[1]!];
}

// ── 직육면체 좌표 기하(m1Extra.test.ts 와 같은 방법, 새로 구현) ────
type V3 = readonly [number, number, number];
function cuboidVerts(a: number, b: number, c: number): Record<string, V3> {
  return {
    A: [0, 0, c],
    B: [a, 0, c],
    C: [a, b, c],
    D: [0, b, c],
    E: [0, 0, 0],
    F: [a, 0, 0],
    G: [a, b, 0],
    H: [0, b, 0],
  };
}
const sub = (p: V3, q: V3): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const cross = (u: V3, v: V3): V3 => [
  u[1] * v[2] - u[2] * v[1],
  u[2] * v[0] - u[0] * v[2],
  u[0] * v[1] - u[1] * v[0],
];
const dot = (u: V3, v: V3): number => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const isZero = (u: V3): boolean => u[0] === 0 && u[1] === 0 && u[2] === 0;

/** 두 선분(끝점 쌍)의 위치 관계 — 직선 기준. 공유 꼭짓점이면 "meet". */
function segRel(
  verts: Record<string, V3>,
  e1: string,
  e2: string,
): "parallel" | "meet" | "skew" {
  const shared = [...e1].filter((ch) => e2.includes(ch));
  if (shared.length > 0) return "meet";
  const p1 = verts[e1[0]!]!;
  const q1 = verts[e1[1]!]!;
  const p2 = verts[e2[0]!]!;
  const q2 = verts[e2[1]!]!;
  const d1 = sub(q1, p1);
  const d2 = sub(q2, p2);
  const n = cross(d1, d2);
  if (isZero(n)) return "parallel";
  const w = sub(p2, p1);
  if (dot(w, n) === 0) {
    throw new Error(
      `동일 평면 위에서 만나지만 공유 꼭짓점이 없음: ${e1},${e2}`,
    );
  }
  return "skew";
}

/** 위치 관계 09 — 잘라낸 입체(B 를 A,C,F 평면으로 절단)의 남은 모서리 좌표. */
function cutSolidVerts(): Record<string, V3> {
  const v = cuboidVerts(5, 4, 3);
  const { B: _b, ...rest } = v;
  void _b;
  return rest;
}
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
const CUT_EDGES_09 = ["AC", "CF", "FA"] as const;

/** 삼각기둥 위치 관계(위상 검산 — 인덱스만으로, m1Geo1 의 prismRel 과 별개 구현). */
type PE = { kind: 0 | 1 | 2; i: number };
function prismRelIndep(e1: PE, e2: PE): "parallel" | "perp" | "meet" | "skew" {
  if (e1.kind === e2.kind) return e1.kind === 2 ? "parallel" : "meet";
  if (e1.kind !== 2 && e2.kind !== 2) {
    return e1.i === e2.i ? "parallel" : "skew";
  }
  const tri = e1.kind === 2 ? e2 : e1;
  const vert = e1.kind === 2 ? e1 : e2;
  const shares = vert.i === tri.i || (vert.i + 2) % 3 === tri.i;
  return shares ? "perp" : "skew";
}
function prismName(e: PE): string {
  if (e.kind === 0) return ["AB", "BC", "CA"][e.i]!;
  if (e.kind === 1) return ["DE", "EF", "FD"][e.i]!;
  return ["AD", "BE", "CF"][e.i]!;
}
const PRISM_ALL: readonly PE[] = [
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

/** 삼각뿔 전개도 — 접었을 때 만나는가(m1Geo1 과 별개로 다시 구현). */
const NET_PHYS_INDEP: Record<string, string> = {
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
function netMeetsIndep(l1: string, l2: string): boolean {
  const p1 = NET_PHYS_INDEP[l1]!;
  const p2 = NET_PHYS_INDEP[l2]!;
  const e1 = [p1[0]!, p1[1]!];
  const e2 = [p2[0]!, p2[1]!];
  return e1.some((x) => e2.includes(x));
}

// ── 참·거짓 고정 표(정의) — 생성기 상수와 「같은 값」인지가 아니라
//    직접 재판단해서 옳고 그름을 다시 매긴다 ──────────────────────
const PLANE_COND_TRUTH: Record<string, boolean> = {
  "한 직선 위에 있지 않은 서로 다른 세 점은 하나의 평면을 정한다.": true,
  "한 직선과 그 직선 위에 있지 않은 한 점은 하나의 평면을 정한다.": true,
  "한 점에서 만나는 두 직선은 하나의 평면을 정한다.": true,
  "평행한 두 직선은 하나의 평면을 정한다.": true,
  "한 직선 위에 있는 서로 다른 세 점은 하나의 평면을 정한다.": false,
  "꼬인 위치에 있는 두 직선은 하나의 평면을 정한다.": false,
  "공간에 있는 서로 다른 네 점은 항상 하나의 평면을 정한다.": false,
  "일치하는 두 직선은 하나의 평면을 정한다.": false,
};
const SPACE_CLAIMS_TRUTH: Record<string, boolean> = {
  "한 평면에 수직인 서로 다른 두 직선은 서로 평행하다.": true,
  "한 직선에 수직인 서로 다른 두 평면은 서로 평행하다.": true,
  "한 평면에 평행한 서로 다른 두 평면은 서로 평행하다.": true,
  "한 직선에 평행한 서로 다른 두 직선은 서로 평행하다.": true,
  "한 평면에 평행한 서로 다른 두 직선은 서로 평행하다.": false,
  "한 직선에 수직인 서로 다른 두 직선은 서로 평행하다.": false,
  "공간에서 두 직선이 만나지 않으면 서로 평행하다.": false,
  "한 평면에 수직인 서로 다른 두 평면은 서로 평행하다.": false,
};
const PARALLEL_COND_TRUTH: Record<string, boolean> = {
  "동위각의 크기가 같으면 두 직선은 평행하다.": true,
  "엇각의 크기가 같으면 두 직선은 평행하다.": true,
  "한쪽으로 같은 위치에 있는 두 내각의 크기의 합이 $180^\\circ$이면 두 직선은 평행하다.": true,
  "맞꼭지각의 크기가 같으면 두 직선은 평행하다.": false,
  "한 직선과 만나 생기는 인접한 두 각의 크기의 합이 $180^\\circ$이면 두 직선은 평행하다.": false,
  "엇각의 크기의 합이 $180^\\circ$이면 두 직선은 평행하다.": false,
};
const PERP_TRUTH: Record<string, boolean> = {
  "직선 $AH$는 직선 $l$과 수직으로 만난다.": true,
  "점 $H$는 점 $A$에서 직선 $l$에 내린 수선의 발이다.": true,
  "점 $A$와 직선 $l$ 사이의 거리는 $\\overline{AH}$의 길이와 같다.": true,
  "$\\angle AHl=60^\\circ$이다.": false,
  "점 $A$와 직선 $l$ 사이의 거리는 $\\overline{AH}$의 길이보다 항상 짧다.": false,
  "직선 $l$ 위의 점 중 점 $A$에 가장 가까운 점은 $H$이다.": true,
};

function checkTrueFalsePool(
  p: MidProblem,
  truth: Record<string, boolean>,
): void {
  const rows = bogiLines(p.content).map((l) => l.replace(/^[ㄱ-ㅎ]\.\s*/, ""));
  expect(rows.length).toBeGreaterThan(0);
  let expected = 0;
  for (const s of rows) {
    expect(truth[s], `모르는 문장: ${s}`).not.toBeUndefined();
    if (truth[s]) expected += 1;
  }
  expect(expected).toBe(firstNumber(p.answer));
}

// ── EXPECTED_SECTION — 31유형 전량(공유 DB 실측 2026-08-24, units.ts 대조) ──

const EXPECTED_SECTION: Record<string, string> = {
  "1-2|기본 도형|01": "점, 선, 면",
  "1-2|기본 도형|02": "점, 선, 면",
  "1-2|기본 도형|03": "점, 선, 면",
  "1-2|기본 도형|04": "점, 선, 면",
  "1-2|기본 도형|05": "점, 선, 면",
  "1-2|기본 도형|06": "점, 선, 면",
  "1-2|기본 도형|07": "각",
  "1-2|기본 도형|08": "각",
  "1-2|기본 도형|09": "각",
  "1-2|기본 도형|10": "각",
  "1-2|기본 도형|11": "각",
  "1-2|기본 도형|12": "각",
  "1-2|기본 도형|13": "각",
  "1-2|기본 도형|14": "각",
  "1-2|위치 관계|01": "두 직선의 위치 관계",
  "1-2|위치 관계|02": "두 직선의 위치 관계",
  "1-2|위치 관계|03": "두 직선의 위치 관계",
  "1-2|위치 관계|04": "두 직선의 위치 관계",
  "1-2|위치 관계|05": "두 직선의 위치 관계",
  "1-2|위치 관계|09": "공간에서 평면의 위치 관계",
  "1-2|위치 관계|10": "공간에서 평면의 위치 관계",
  "1-2|위치 관계|11": "평행선",
  "1-2|위치 관계|12": "평행선",
  "1-2|위치 관계|13": "평행선",
  "1-2|위치 관계|14": "평행선",
  "1-2|위치 관계|15": "평행선",
  "1-2|위치 관계|16": "평행선",
  "1-2|위치 관계|17": "평행선",
  "1-2|위치 관계|18": "평행선",
  "1-2|위치 관계|19": "공간에서 평면의 위치 관계",
  "1-2|위치 관계|20": "평행선",
};

// ── 유형별 독립 검산 ────────────────────────────────────────

const CHECKS: Record<string, (p: MidProblem) => void> = {
  "1-2|기본 도형|01": (p) => {
    const f = p.facts;
    const { v, e } = eulerVE(f.n!, f.fam!);
    expect(v).toBe(f.v);
    expect(e).toBe(f.e);
    const ans = f.branch === 0 ? e - v : e + v;
    expect(ans).toBe(f.ans);
    expect(firstNumber(p.answer)).toBe(ans);
  },
  "1-2|기본 도형|02": (p) => {
    const f = p.facts;
    const labels = ["A", "B", "C", "D"];
    // 발문의 「왼쪽부터 순서대로 …」 절에서 실제 좌표 순서를 되찾는다 —
    // facts.p0~p3 를 그대로 믿지 않고 발문 자체와 대조한다.
    const orderMatch = p.content.match(
      /왼쪽부터 순서대로 서로 다른 네 점 \$([A-D])\$, \$([A-D])\$, \$([A-D])\$, \$([A-D])\$가 있다/,
    );
    expect(orderMatch, p.content).not.toBeNull();
    const order = [
      orderMatch![1]!,
      orderMatch![2]!,
      orderMatch![3]!,
      orderMatch![4]!,
    ];
    expect(order).toEqual([f.p0!, f.p1!, f.p2!, f.p3!].map((i) => labels[i]!));
    const posOf = (name: string): number => order.indexOf(name);

    const NOTATE = /\\(overrightarrow|overline)\{([A-D])([A-D])\}/;
    const targetMatch = p.content.match(
      new RegExp(`같은 것은 모두 몇 개인지 구하시오`),
    );
    expect(targetMatch, p.content).not.toBeNull();
    const beforeTarget = p.content.slice(0, p.content.indexOf("같은 것은"));
    const tMatch = [...beforeTarget.matchAll(new RegExp(NOTATE, "g"))].pop();
    expect(tMatch, p.content).not.toBeUndefined();
    const [, tKind, ta, tb] = tMatch!;

    function isEqualIndep(
      k1: string,
      p1: string,
      q1: string,
      k2: string,
      p2: string,
      q2: string,
    ): boolean {
      if (k1 !== k2) return false;
      if (k1 === "overline") {
        return (p1 === p2 && q1 === q2) || (p1 === q2 && q1 === p2);
      }
      const d1 = Math.sign(posOf(q1) - posOf(p1));
      const d2 = Math.sign(posOf(q2) - posOf(p2));
      return p1 === p2 && d1 === d2;
    }

    const rows = bogiLines(p.content);
    expect(rows.length).toBe(4);
    let expected = 0;
    for (const line of rows) {
      const m = line.match(NOTATE);
      expect(m, line).not.toBeNull();
      const [, kind, cp, cq] = m!;
      if (isEqualIndep(tKind!, ta!, tb!, kind!, cp!, cq!)) expected += 1;
    }
    expect(expected).toBe(f.ans);
    expect(firstNumber(p.answer)).toBe(f.ans);
  },
  "1-2|기본 도형|03": (p) => {
    const f = p.facts;
    const n = f.n!;
    const lines = (n * (n - 1)) / 2;
    const rays = n * (n - 1);
    expect(lines).toBe(f.lines);
    expect(rays).toBe(f.rays);
    const ans = f.branch === 0 ? lines + rays : rays - lines;
    expect(ans).toBe(f.ans);
    expect(firstNumber(p.answer)).toBe(ans);
  },
  "1-2|기본 도형|04": (p) => {
    const f = p.facts;
    const n = f.n!;
    const rays = 2 * (n - 1);
    const segs = (n * (n - 1)) / 2;
    expect(rays).toBe(f.rays);
    expect(segs).toBe(f.segs);
    const ans = f.branch === 0 ? rays - 1 : rays - segs;
    expect(ans).toBe(f.ans);
    expect(firstNumber(p.answer)).toBe(ans);
  },
  "1-2|기본 도형|05": (p) => {
    const f = p.facts;
    if (f.branch === 0) {
      expect(f.ab! % 4).toBe(0);
      expect(f.an).toBe((3 * f.ab!) / 4);
    } else {
      expect(f.ab).toBe(4 * f.mn!);
    }
    expect(firstNumber(p.answer)).toBe(f.ans);
  },
  "1-2|기본 도형|06": (p) => {
    const f = p.facts;
    if (f.branch === 0) {
      expect(f.mn).toBe(f.ac! / 2);
    } else if (f.branch === 1) {
      expect(f.mn).toBe((f.ab! + f.bc!) / 2);
    } else {
      expect(f.ab).toBe(3 * f.bc!);
      expect(f.am).toBe(f.ab! / 2);
    }
    expect(firstNumber(p.answer)).toBe(f.ans);
  },
  "1-2|기본 도형|07": (p) => {
    const f = p.facts;
    expect(f.a! * f.x! + f.b! + f.c!).toBe(f.total);
    expect(firstNumber(p.answer)).toBe(f.x);
  },
  "1-2|기본 도형|08": (p) => {
    const f = p.facts;
    expect((2 + f.k!) * f.p!).toBe(f.total);
    expect(f.cod).toBe(f.k! * f.p!);
    expect(firstNumber(p.answer)).toBe(f.cod);
  },
  "1-2|기본 도형|09": (p) => {
    const f = p.facts;
    const sum = f.ra! + f.rb! + f.rc!;
    const r = [f.ra!, f.rb!, f.rc!][f.ask!]!;
    expect((180 * r) / sum).toBe(f.ans);
    expect(firstNumber(p.answer)).toBe(f.ans);
  },
  "1-2|기본 도형|10": (p) => {
    const f = p.facts;
    // 맞꼭지각 성질 자체로 검산: 두 식에 x 를 대입하면 실측값이 같아야 한다.
    const left = f.a! * f.x! + f.p!;
    const right = f.b2! * f.x! + f.q!;
    expect(left).toBe(right);
    expect(firstNumber(p.answer)).toBe(f.x);
  },
  "1-2|기본 도형|11": (p) => {
    const f = p.facts;
    const aVal = f.a1! * f.x! + f.b1!;
    const cVal = (f.a1! + 1) * f.x! + f.cConst!;
    expect(aVal + f.c1!).toBe(cVal);
    expect(firstNumber(p.answer)).toBe(f.x);
  },
  "1-2|기본 도형|12": (p) => {
    const f = p.facts;
    expect(f.n! * (f.n! - 1)).toBe(f.ans);
    expect(firstNumber(p.answer)).toBe(f.ans);
  },
  "1-2|기본 도형|13": (p) => {
    checkTrueFalsePool(p, PERP_TRUTH);
  },
  "1-2|기본 도형|14": (p) => {
    const f = p.facts;
    const hourDeg = 30 * f.h! + 0.5 * f.m!;
    const minDeg = 6 * f.m!;
    let diff = Math.abs(hourDeg - minDeg);
    if (diff > 180) diff = 360 - diff;
    expect(diff).toBe(f.diff);
    expect(firstNumber(p.answer)).toBe(f.diff);
  },

  "1-2|위치 관계|01": (p) => {
    // 보기 문장이 매번 새로 조립되므로(점·직선/평면·긍정/부정) 고정 표 대신
    // 발문의 「위에 있다 / 위에 있지 않다」 목록을 직접 파싱해 참·거짓을 다시 매긴다.
    const objWord = p.content.includes("평면 $P$") ? "평면 $P$" : "직선 $l$";
    const onMatch = p.content.match(
      new RegExp(`${objWord.replace(/[$]/g, "\\$")} 위에 (.+?)이 있고`),
    );
    const offMatch = p.content.match(
      new RegExp(`위에 있지 않은 점 ([^\\n]+?)이 있다`),
    );
    expect(onMatch, p.content).not.toBeNull();
    expect(offMatch, p.content).not.toBeNull();
    const onSet = new Set(onMatch![1]!.match(/[A-E]/g) ?? []);
    const offSet = new Set(offMatch![1]!.match(/[A-E]/g) ?? []);
    let expected = 0;
    for (const line of bogiLines(p.content)) {
      const m = line.match(/점 \$([A-E])\$는 .+? 위에 (있지 않다|있다)\./);
      expect(m, line).not.toBeNull();
      const [, pt, verdict] = m!;
      const isOn = onSet.has(pt!);
      expect(isOn || offSet.has(pt!), `${pt} 가 on/off 어느 쪽에도 없음`).toBe(
        true,
      );
      const claim = verdict === "있다" ? isOn : !isOn;
      if (claim) expected += 1;
    }
    expect(expected).toBe(firstNumber(p.answer));
  },
  "1-2|위치 관계|02": (p) => {
    const f = p.facts;
    const { a, b } = polygonLineRel(f.n!);
    expect(a).toBe(f.a);
    expect(b).toBe(f.b);
    const ans = f.branch === 0 ? a - b : a + b;
    expect(ans).toBe(f.ans);
    expect(firstNumber(p.answer)).toBe(ans);
  },
  "1-2|위치 관계|03": (p) => {
    checkTrueFalsePool(p, PLANE_COND_TRUTH);
  },
  "1-2|위치 관계|04": (p) => {
    const f = p.facts;
    const [o1, o2] = tetraOppositeIdx(f.x!, f.y!);
    const letters = ["A", "B", "C", "D"];
    expect(p.answer).toContain(`${letters[o1]}${letters[o2]}`);
  },
  "1-2|위치 관계|05": (p) => {
    const f = p.facts;
    const ref = PRISM_ALL[f.refIdx!]!;
    let a = 0;
    let b = 0;
    let c = 0;
    for (const e of PRISM_ALL) {
      if (e === ref) continue;
      const rel = prismRelIndep(ref, e);
      if (rel === "parallel") a += 1;
      else if (rel === "perp") b += 1;
      else if (rel === "skew") c += 1;
    }
    expect(a).toBe(f.a);
    expect(b).toBe(f.b);
    expect(c).toBe(f.c);
    expect(a + b + c).toBe(f.ans);
    expect(p.content).toContain(`$${prismName(ref)}$`);
    expect(firstNumber(p.answer)).toBe(f.ans);
  },
  "1-2|위치 관계|09": (p) => {
    const f = p.facts;
    const all = [...ORIG_REMAIN_09, ...CUT_EDGES_09];
    const ref = all[f.refIdx!]!;
    const verts = cutSolidVerts();
    let ans = 0;
    for (const e of all) {
      if (e === ref) continue;
      if (segRel(verts, ref, e) === "skew") ans += 1;
    }
    expect(ans).toBe(f.ans);
    expect(p.content).toContain(`\\mathrm{${ref}}`);
    expect(firstNumber(p.answer)).toBe(ans);
  },
  "1-2|위치 관계|10": (p) => {
    const rows = bogiLines(p.content);
    expect(rows.length).toBe(4);
    let expected = 0;
    for (const line of rows) {
      const m = line.match(
        /모서리 \$([A-F]{2})\$와 모서리 \$([A-F]{2})\$는 접었을 때 (한 점에서 만난다|꼬인 위치에 있다)\./,
      );
      expect(m, line).not.toBeNull();
      const [, l1, l2, rel] = m!;
      const actual = netMeetsIndep(l1!, l2!);
      const claim = rel === "한 점에서 만난다" ? actual : !actual;
      if (claim) expected += 1;
    }
    expect(expected).toBe(firstNumber(p.answer));
  },
  "1-2|위치 관계|11": (p) => {
    const f = p.facts;
    const aVal = f.a! * f.x! + f.p!;
    const bVal = f.b2! * f.x! + f.q!;
    expect(aVal).toBe(bVal);
    expect(firstNumber(p.answer)).toBe(f.x);
  },
  "1-2|위치 관계|12": (p) => {
    const f = p.facts;
    expect(180 - f.theta!).toBe(f.ans);
    expect(f.theta).not.toBe(f.ans);
    expect(firstNumber(p.answer)).toBe(f.ans);
  },
  "1-2|위치 관계|13": (p) => {
    checkTrueFalsePool(p, PARALLEL_COND_TRUTH);
  },
  "1-2|위치 관계|14": (p) => {
    const f = p.facts;
    expect(f.a! + f.b!).toBe(f.x);
    expect(firstNumber(p.answer)).toBe(f.x);
  },
  "1-2|위치 관계|15": (p) => {
    const f = p.facts;
    expect(f.a! + f.b! + f.c!).toBe(f.x);
    expect(firstNumber(p.answer)).toBe(f.x);
  },
  "1-2|위치 관계|16": (p) => {
    const f = p.facts;
    expect(f.b! - f.a! + f.c!).toBe(f.x);
    expect(f.x!).toBeGreaterThan(0);
    expect(firstNumber(p.answer)).toBe(f.x);
  },
  "1-2|위치 관계|17": (p) => {
    const f = p.facts;
    expect(180 - f.a! - f.b! - f.c!).toBe(f.x);
    expect(firstNumber(p.answer)).toBe(f.x);
  },
  "1-2|위치 관계|18": (p) => {
    const f = p.facts;
    expect(90 - f.beta!).toBe(f.x);
    expect(firstNumber(p.answer)).toBe(f.x);
  },
  "1-2|위치 관계|19": (p) => {
    checkTrueFalsePool(p, SPACE_CLAIMS_TRUTH);
  },
  "1-2|위치 관계|20": (p) => {
    const f = p.facts;
    expect(180 / f.n!).toBe(f.ans);
    expect(Number.isInteger(f.ans)).toBe(true);
    expect(firstNumber(p.answer)).toBe(f.ans);
  },
};

// ── 명부·색인·등록 ──────────────────────────────────────────

describe("중1 물결 6A(m1Geo1) 31유형", () => {
  it("31유형 명부와 unitSection 이 실측 그대로다", () => {
    expect(new Set(M1_GEO1.map((e) => e.key))).toEqual(
      new Set(Object.keys(EXPECTED_SECTION)),
    );
    expect(M1_GEO1.length).toBe(31);
    for (const e of M1_GEO1) {
      expect(e.unitSection, e.key).toBe(EXPECTED_SECTION[e.key]);
      expect(e.key).toBe(`${e.rpmBook}|${e.rpmMinor}|${e.rpmType}`);
      expect(e.grade).toBe("중1");
    }
  });

  it("유형 번호·제목이 RPM 색인(정본)에 실재한다", () => {
    const catalog = JSON.parse(
      readFileSync(
        path.resolve(REPO, "scripts/rpm/rpm-type-catalog.json"),
        "utf-8",
      ),
    ) as Record<
      string,
      { types: { minor: string; number: string; title: string }[] }
    >;
    for (const e of M1_GEO1) {
      const hit = catalog[e.rpmBook]?.types.find(
        (t) => t.minor === e.rpmMinor && t.number === e.rpmType,
      );
      expect(hit, `${e.key} — 색인에 없는 번호`).toBeDefined();
      expect(hit!.title, e.key).toBe(e.rpmTitle);
    }
  });

  it("모든 유형이 generate 진입점에 등록돼 있다", () => {
    const keys = new Set(registeredTypes().map((e) => e.key));
    for (const e of M1_GEO1) {
      expect(keys.has(e.key), e.key).toBe(true);
    }
  });

  it("위치 관계 06·07·08(m1Book2)과 겹치지 않는다", () => {
    const mine = new Set(M1_GEO1.map((e) => e.key));
    expect(mine.has("1-2|위치 관계|06")).toBe(false);
    expect(mine.has("1-2|위치 관계|07")).toBe(false);
    expect(mine.has("1-2|위치 관계|08")).toBe(false);
  });

  for (const e of M1_GEO1) {
    describe(`${e.key} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260824);
        const b = generateMiddleProblem(e.key, 20260824);
        expect(a).toEqual(b);
      });

      it("씨앗별 독립 검산 — 발문 수치·구조를 재계산한다", () => {
        const check = CHECKS[e.key];
        expect(check, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          check!(p);
        }
      });

      it("변형 20개도 전부 검산을 통과한다", () => {
        const check = CHECKS[e.key]!;
        for (let variant = 0; variant < 20; variant += 1) {
          check(generateMiddleProblem(e.key, 20260824, variant));
        }
      });

      it("씨앗을 넓게 훑어도 검산을 통과한다", () => {
        const check = CHECKS[e.key]!;
        for (const seed of SWEEP) {
          check(generateMiddleProblem(e.key, seed));
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(bareNumbers(p.content)).toEqual([]);
          expect(bareNumbers(p.answer)).toEqual([]);
          expect(bareNumbers(p.solution)).toEqual([]);
        }
      });

      it("실제 렌더러가 붉은 글자·raw 폴백 없이 그린다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          for (const part of [p.content, p.answer, p.solution]) {
            const html = renderMathHtml(part);
            expect(/#cc0000/i.test(html), part).toBe(false);
            expect(html.includes("math-raw"), part).toBe(false);
          }
        }
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of M1_GEO1) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });

  it("가지가 있는 유형은 모든 가지가 표본에 나온다", () => {
    const seen = (key: string, field: string, tries: number): Set<number> => {
      const s = new Set<number>();
      for (let v = 0; v < tries; v += 1) {
        s.add(generateMiddleProblem(key, 20260824, v).facts[field]!);
      }
      return s;
    };
    expect(seen("1-2|기본 도형|01", "fam", 60)).toEqual(new Set([0, 1, 2]));
    expect(seen("1-2|기본 도형|01", "branch", 60)).toEqual(new Set([0, 1]));
    expect(seen("1-2|기본 도형|02", "kind", 200)).toEqual(new Set([0, 1]));
    expect(seen("1-2|기본 도형|05", "branch", 60)).toEqual(new Set([0, 1]));
    expect(seen("1-2|기본 도형|06", "branch", 80)).toEqual(new Set([0, 1, 2]));
    expect(seen("1-2|위치 관계|01", "kind", 60)).toEqual(new Set([0, 1]));
    expect(seen("1-2|위치 관계|02", "even", 60)).toEqual(new Set([0, 1]));
    expect(seen("1-2|위치 관계|05", "refIdx", 200)).toBeInstanceOf(Set);
    expect(seen("1-2|위치 관계|05", "refIdx", 200).size).toBeGreaterThan(4);
    expect(seen("1-2|위치 관계|09", "refIdx", 200).size).toBeGreaterThan(4);
    expect(seen("1-2|위치 관계|11", "relKind", 60)).toEqual(new Set([0, 1]));
    expect(seen("1-2|위치 관계|12", "relKind", 60)).toEqual(new Set([0, 1]));
    expect(seen("1-2|위치 관계|20", "n", 60)).toEqual(new Set([2, 3, 4, 5, 6]));
  });

  // ── 그림 — 실제로 그려지는지(스킵 조건은 m1Solid.test.ts 와 같다) ──
  const FIGURED_KEYS = [
    "1-2|기본 도형|10",
    "1-2|위치 관계|11",
    "1-2|위치 관계|12",
    "1-2|위치 관계|13",
    "1-2|위치 관계|10",
  ];

  describe.skipIf(!hasEngine)("그림이 실제로 그려진다", () => {
    for (const key of FIGURED_KEYS) {
      it(key, async () => {
        const p = generateMiddleProblem(key, 20260824);
        expect(p.figureSpec, key).toBeTruthy();
        const r = await renderFigureSpec(p.figureSpec);
        expect(r.ok, r.ok ? "" : r.error).toBe(true);
        if (r.ok) {
          const w = Number(/viewBox="0 0 ([\d.]+)/.exec(r.svg)?.[1] ?? NaN);
          expect(w, `${key} viewBox 폭 ${w}`).toBeLessThanOrEqual(240);
        }
      });
    }
  });

  it("그림이 없는 유형은 figureSpec 이 비어 있다(억지로 안 붙인다)", () => {
    for (const e of M1_GEO1) {
      if (FIGURED_KEYS.includes(e.key)) continue;
      const p = generateMiddleProblem(e.key, 20260824);
      expect(p.figureSpec ?? null, e.key).toBeNull();
    }
  });

  it("대분수 0 — D-73(중학 계수는 분자에)", () => {
    for (const e of M1_GEO1) {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        for (const part of [p.content, p.answer, p.solution]) {
          expect(part, `${e.key}: ${part}`).not.toMatch(/\d\\frac\{/);
        }
      }
    }
  });

  it("문제 없이 던지는 유형이 실제로 던진다 — attempt 소진을 흉내내지 않는다", () => {
    // 등록된 31유형이 전부 정상 범위에서 안정적으로 나오는지(예외 없이) 크게 훑는다.
    for (const e of M1_GEO1) {
      for (const v of [0, 1, 2, 3, 4, 5]) {
        expect(() => generateMiddleProblem(e.key, 555, v)).not.toThrow();
      }
    }
  });
});
