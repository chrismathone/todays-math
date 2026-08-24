/**
 * 중1 물결 5E (`m1Solid.ts`) — **독립 검산**.
 *
 * ## 이 시험이 무엇을 «다르게» 재는가
 *
 * 생성기는 다면체의 개수를 **표**로 센다($n$각기둥의 면은 $n+2$ …). 그 표를 여기
 * 옮겨 적으면 동어반복이다. 그래서 이 시험은 개수를 **꼭짓점의 차수**에서 다시 만든다 —
 *
 *  · 각기둥·각뿔대: 꼭짓점이 $2n$ 개이고 **모두 차수 $3$** 이므로 악수 정리로 $2e=3v$,
 *    오일러 공식으로 $f=2-v+e$.
 *  · 각뿔: 꼭대기의 차수가 $n$, 밑면 꼭짓점의 차수가 $3$ 이므로 $2e=n+3n$.
 *  · **정다면체는 목록조차 안 쓴다.** 면이 정 $p$ 각형이고 한 꼭짓점에 $q$ 개 모이면
 *    $pf=2e=qv$ 이고 오일러에서 $e=\dfrac{2}{\frac2p+\frac2q-1}$ 이다. $(p,q)$ 를 훑어
 *    **다섯을 만들어 낸다** — 다섯 개가 나오는 것 자체가 검사다.
 *
 * 겉넓이·부피는 `facts` 의 치수로 **다른 경로**를 탄다 —
 *
 *  · 구멍 뚫린 원기둥의 겉넓이는 $2(R+r)(R-r+h)$ 로 (생성기는 항별로 더한다).
 *  · 잘라 낸 직육면체의 겉넓이는 **면을 하나하나 세어** 더한다(생성기는 「안 변한다」로 끝낸다).
 *  · 뿔대의 부피는 $\dfrac{h}{3}(a^2+ab+b^2)$ 로 (생성기는 큰 뿔$-$작은 뿔).
 *  · 원뿔대의 옆넓이는 큰 부채꼴$-$작은 부채꼴로 (생성기는 $\pi(R+r)s$).
 *  · 원뿔의 부피는 **같은 밑면·높이의 원기둥 부피의 $\dfrac13$** 인지로.
 *
 * ## 자기 배열을 직접 훑는다
 * `registeredTypes()` 를 중단원 이름으로 거르지 않는다 — 「입체도형의 겉넓이와 부피」에는
 * **남의 세션 유형이 열하나** 있다(`m1Book2`·`m1Real`·`m1Stat`). 거르면 그것들이 이
 * 검산표에 들이대져 빨개진다(물결 2 에서 실제로 났다).
 *
 * ## 정직하게 적어 두는 한계
 * 15·18(회전체의 단면·이해)은 **계산이 아니라 사실**이라, 시험도 결국 같은 내용의
 * 표를 한 벌 더 갖는다. 그것만으로는 「둘 다 같이 틀리는」 경우를 못 잡는다. 그래서
 * 그 둘에는 **참인 문장과 거짓인 문장이 씨앗을 넓혀도 둘 다 실제로 나오는가**를
 * 같이 잰다(한쪽만 나오면 그 표는 아무것도 안 가른다).
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { bareNumbers } from "../../lib/elementary/rules";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";
import { preprocessMathText } from "../../lib/math/textPreprocess";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import {
  M1_POLY,
  M1_SOLID_AREA,
  M1_SOLID_TYPES,
} from "../../lib/middle/m1Solid";
import type { MidProblem, TypeEntry } from "../../lib/middle/types";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

const SEEDS = [20260824, 1, 7777, 424242, 99991, 31337, 5150, 60613];

type F = Record<string, number>;
type Spec = Record<string, unknown>;

/* ────────────────────────────────────────────────────────────────────────
 * 다면체의 개수 — 생성기의 표를 안 쓰고 «차수 + 오일러» 로 다시 만든다
 * ──────────────────────────────────────────────────────────────────────── */

type Counts = { v: number; e: number; f: number };

function countsByDegree(n: number, fam: number): Counts {
  if (fam === 1) {
    // 각뿔: 꼭대기 하나(차수 $n$) + 밑면 $n$ 개(차수 $3$). 악수 정리 $2e=\sum\deg$.
    const v = n + 1;
    const e = (n + 3 * n) / 2;
    return { v, e, f: 2 - v + e };
  }
  // 각기둥·각뿔대: 두 밑면의 꼭짓점 $2n$ 개가 모두 차수 $3$.
  const v = 2 * n;
  const e = (3 * v) / 2;
  return { v, e, f: 2 - v + e };
}

/** 0 면 · 1 모서리 · 2 꼭짓점 */
function pickCount(c: Counts, q: number): number {
  return q === 0 ? c.f : q === 1 ? c.e : c.v;
}

/**
 * 볼록 정다면체 — **목록이 아니라 조건에서** 만든다.
 * $pf=2e=qv$ 와 $v-e+f=2$ 를 풀면 $e=\dfrac{2}{\frac2p+\frac2q-1}$ 이다.
 */
type Plat = { p: number; q: number; v: number; e: number; f: number };

function platonicSolids(): Plat[] {
  const out: Plat[] = [];
  for (let p = 3; p <= 12; p += 1) {
    for (let q = 3; q <= 12; q += 1) {
      const k = 2 / p + 2 / q - 1;
      if (k <= 1e-12) continue;
      const e = 2 / k;
      const E = Math.round(e);
      if (Math.abs(e - E) > 1e-9) continue;
      const f = (2 * E) / p;
      const v = (2 * E) / q;
      if (!Number.isInteger(f) || !Number.isInteger(v)) continue;
      out.push({ p, q, v, e: E, f });
    }
  }
  return out;
}

const PLAT = platonicSolids();

function platByFaces(f: number): Plat {
  const hit = PLAT.filter((s) => s.f === f);
  if (hit.length !== 1)
    throw new Error(`면의 개수 ${f} 인 정다면체가 유일하지 않다`);
  return hit[0]!;
}

/* ────────────────────────────────────────────────────────────────────────
 * 발문에 늘어놓은 이름을 **읽어서** 가른다 — 생성기의 풀을 안 쓴다
 * ──────────────────────────────────────────────────────────────────────── */

/** 발문 마지막 줄의 쉼표 목록. */
function listedNames(content: string): string[] {
  const last = content.trim().split("\n").pop() ?? "";
  return last
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 회전체인가 — 원기둥·원뿔·원뿔대는 「원」으로 시작하고 구·반구가 있다. */
function isRound(name: string): boolean {
  return name.startsWith("원") || name === "구" || name === "반구";
}

/** 옆면의 모양 — 0 직사각형(각기둥) · 1 삼각형(각뿔) · 2 사다리꼴(각뿔대) · -1 없음 */
function sideShapeOf(name: string): number {
  if (isRound(name)) return -1;
  if (name.endsWith("뿔대")) return 2;
  if (name.endsWith("뿔")) return 1;
  if (name.endsWith("기둥")) return 0;
  return -1;
}

/**
 * 정육면체의 단면이 될 수 «있는가» — 규칙으로 판단한다(생성기는 목록을 쓴다).
 *  · 다면체를 평면으로 자른 단면은 다각형이다 → 「원」 불가
 *  · 면이 여섯뿐이라 단면의 변은 최대 여섯 → 칠각형 이상 불가
 *  · 세 면을 지나는 단면은 한 꼭짓점의 둘레를 자르므로 세 각이 모두 예각
 *    → 직각삼각형·둔각삼각형 불가
 *  · 마주 보는 두 면이 평행이라 오각형 단면의 다섯 변이 모두 같을 수 없다 → 정오각형 불가
 */
const NGON_KO: Record<string, number> = {
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
  칠: 7,
  팔: 8,
  구: 9,
  십: 10,
};

function cubeSectionPossible(name: string): boolean {
  if (name === "원") return false;
  if (name === "직각삼각형" || name === "둔각삼각형") return false;
  if (name === "정오각형") return false;
  const m = /([삼사오육칠팔구십])각형$/.exec(name);
  if (m) return NGON_KO[m[1]!]! <= 6;
  // 나머지는 사각형의 이름들 — 변이 넷이므로 가능하다.
  return [
    "정삼각형",
    "이등변삼각형",
    "직사각형",
    "정사각형",
    "마름모",
    "평행사변형",
    "사다리꼴",
  ].includes(name);
}

/** 15 — 회전축을 포함하는 평면으로 자른 단면(교과 규칙을 시험 쪽에 한 벌 더 적는다). */
const AXIAL: Record<string, string> = {
  원기둥: "직사각형",
  원뿔: "이등변삼각형",
  원뿔대: "사다리꼴",
  구: "원",
  반구: "반원",
};

/** 18 — 회전체에 대한 참·거짓(같은 이유로 한 벌 더 적는다. 한계는 파일 머리에). */
const REV_TRUTH: Record<string, boolean> = {
  "구의 회전축은 무수히 많다.": true,
  "회전체를 회전축에 수직인 평면으로 자른 단면은 항상 원이다.": true,
  "회전체를 회전축을 포함하는 평면으로 자른 단면은 선대칭도형이다.": true,
  "구는 전개도를 그릴 수 없다.": true,
  "원기둥의 회전축과 모선은 서로 평행하다.": true,
  "원뿔대를 회전축을 포함하는 평면으로 자른 단면은 사다리꼴이다.": true,
  "원뿔을 회전축에 수직인 평면으로 자른 단면은 모두 합동이다.": false,
  "모든 회전체의 회전축은 한 개뿐이다.": false,
  "회전체를 회전축을 포함하는 평면으로 자른 단면은 모두 합동이다.": false,
  "원뿔을 회전축을 포함하는 평면으로 자른 단면은 정삼각형이다.": false,
  "모든 회전체는 전개도를 그릴 수 있다.": false,
};

/** 보기 줄 — `ㄱ. 내용` 에서 내용만. */
function bogiLines(content: string): string[] {
  return content
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => /^[ㄱ-ㅁ]\.\s/.test(s))
    .map((s) => s.replace(/^[ㄱ-ㅁ]\.\s*/, ""));
}

/* ────────────────────────────────────────────────────────────────────────
 * 유형별 독립 검산
 * ──────────────────────────────────────────────────────────────────────── */

type Check = (f: F, p: MidProblem) => boolean;

const VERIFY_POLY: Record<string, Check> = {
  // 01 발문에 늘어놓은 이름을 **읽어** 다면체를 센다.
  "01": (f, p) => {
    const names = listedNames(p.content);
    const poly = names.filter((n) => !isRound(n)).length;
    return names.length === f.k! + f.m! && poly === f.k! && f.ans! === f.k!;
  },
  // 02 면의 개수. 갈래 1 은 세 다면체(각기둥·각뿔·각뿔대 차례)의 합.
  "02": (f) => {
    if (f.branch === 1) {
      const total = [0, 1, 2]
        .map((i) => countsByDegree(f[`n${i}`]!, i).f)
        .reduce((a, b) => a + b, 0);
      return total === f.total! && f.ans! === total;
    }
    const c = countsByDegree(f.n!, f.fam!);
    if (c.f !== f.f!) return false;
    return f.branch === 0 ? f.ans! === c.f : f.ans! === f.n!;
  },
  // 03 두 다면체의 모서리·꼭짓점 합.
  "03": (f) => {
    const a = pickCount(countsByDegree(f.na!, f.fa!), f.qa!);
    const b = pickCount(countsByDegree(f.nb!, f.fb!), f.qb!);
    return a === f.a! && b === f.b! && f.ans! === a + b;
  },
  // 04 하나가 주어지면 $n$ 이 정해진다. 각뿔만 $a-b$ 를 묻는다(면 $=$ 꼭짓점이라).
  "04": (f) => {
    const c = countsByDegree(f.n!, f.fam!);
    if (pickCount(c, f.given!) !== f.g!) return false;
    if (f.fam === 1) {
      return (
        f.given === 0 && f.x! === c.e && f.y! === c.v && f.ans! === c.e - c.v
      );
    }
    const rest = [0, 1, 2].filter((q) => q !== f.given!);
    return (
      f.x! === pickCount(c, rest[0]!) &&
      f.y! === pickCount(c, rest[1]!) &&
      f.ans! === f.x! + f.y!
    );
  },
  // 05 옆면의 모양 — 이름을 읽어 가른다. 원 계열은 옆면이 다각형이 아니다.
  "05": (f, p) => {
    const hit = listedNames(p.content).filter(
      (n) => sideShapeOf(n) === f.target!,
    ).length;
    return hit === f.k! && f.ans! === hit;
  },
  // 06 「$X$ 의 $Y$ 의 개수는 $k$ 이다」 넷 — 참인 것을 다시 센다.
  "06": (f) => {
    let t = 0;
    for (let i = 0; i < 4; i += 1) {
      const c = countsByDegree(f[`n${i}`]!, f[`c${i}`]!);
      if (pickCount(c, f[`q${i}`]!) === f[`k${i}`]!) t += 1;
    }
    return t === f.ans! && t > 0 && t < 4;
  },
  // 07 조건이 정하는 다면체.
  "07": (f) => {
    const c = countsByDegree(f.n!, f.fam!);
    return (
      pickCount(c, f.given!) === f.g! &&
      pickCount(c, f.asked!) === f.ans! &&
      f.given !== f.asked
    );
  },
  // 08 정다면체의 «가짓수» — 조건에서 만든 다섯을 걸러 센다.
  "08": (f) => {
    if (f.branch === 0)
      return PLAT.filter((s) => s.p === f.p!).length === f.ans!;
    if (f.branch === 1)
      return PLAT.filter((s) => s.q === f.q!).length === f.ans!;
    return PLAT.filter((s) => s.q >= f.q!).length === f.ans!;
  },
  // 09 두 정다면체의 개수 합.
  "09": (f) => {
    const a = pickCount(platByFaces(f.fa!), f.qa!);
    const b = pickCount(platByFaces(f.fb!), f.qb!);
    return a === f.a! && b === f.b! && f.ans! === a + b && f.fa! !== f.fb!;
  },
  // 10 갈래 0 은 $(p,q)$ 로 정다면체를 찾고, 갈래 1 은 짝의 참을 다시 센다.
  "10": (f) => {
    if (f.branch === 0) {
      const hit = PLAT.filter((s) => s.p === f.p! && s.q === f.q!);
      return hit.length === 1 && pickCount(hit[0]!, f.ask!) === f.ans!;
    }
    let t = 0;
    for (let i = 0; i < 4; i += 1) {
      if (platByFaces(f[`f${i}`]!).q === f[`d${i}`]!) t += 1;
    }
    return t === f.ans! && t > 0 && t < 4;
  },
  // 11 전개도를 이루는 면의 모양·개수가 정다면체를 정한다.
  "11": (f) => {
    const hit = PLAT.filter((s) => s.p === f.p! && s.f === f.nf!);
    return hit.length === 1 && pickCount(hit[0]!, f.ask!) === f.ans!;
  },
  // 12 될 수 «없는» 것 — 이름을 읽어 규칙으로 가른다.
  "12": (f, p) => {
    const names = listedNames(p.content);
    const bad = names.filter((n) => !cubeSectionPossible(n)).length;
    return (
      names.length === f.nBad! + f.nOk! && bad === f.nBad! && f.ans! === bad
    );
  },
  // 13 회전체 — 이름을 읽어 센다.
  "13": (f, p) => {
    const names = listedNames(p.content);
    const round = names.filter(isRound).length;
    return names.length === f.k! + f.m! && round === f.k! && f.ans! === round;
  },
  // 14 «무엇을 무엇을 축으로» — 축이 바뀌면 반지름이 뒤바뀐다.
  "14": (f) => {
    const r = f.shape === 2 ? f.a! : f.axis === 0 ? f.a! : f.b!;
    return r === f.r! && f.area! === r * r && f.ans! === f.area!;
  },
  // 15 짝이 맞는 개수 — 시험 쪽 표로 다시 센다.
  "15": (f, p) => {
    let t = 0;
    for (const line of bogiLines(p.content)) {
      const [solid, claim] = line.split("—").map((s) => s.trim());
      if (AXIAL[solid!] === undefined) return false;
      if (AXIAL[solid!] === claim) t += 1;
    }
    return t === f.ans! && t > 0 && t < 4;
  },
  // 16 축을 포함하는 단면 = 회전 전 도형 + 그 대칭이동. 넓이는 «두 배 밑변».
  "16": (f) => {
    const area =
      f.shape === 0
        ? 2 * f.a! * f.b!
        : f.shape === 1
          ? (2 * f.a! * f.b!) / 2
          : ((2 * f.a! + 2 * f.w2!) * f.b!) / 2;
    return area === f.area! && f.ans! === area;
  },
  // 17 전개도 — 원기둥은 가로 $=$ 둘레, 원뿔은 호 $=$ 둘레.
  "17": (f) => {
    if (f.branch === 0) {
      return f.w! === 2 * f.r! && f.area! === f.w! * f.h! && f.ans! === f.area!;
    }
    return f.deg! * f.l! === 360 * f.r! && f.ans! === f.deg!;
  },
  // 18 옳은 문장의 개수 — 시험 쪽 표로 다시 센다.
  "18": (f, p) => {
    let t = 0;
    for (const line of bogiLines(p.content)) {
      if (REV_TRUTH[line] === undefined) return false;
      if (REV_TRUTH[line]) t += 1;
    }
    return t === f.ans! && t > 0 && t < 4;
  },
  // 19 오일러 공식 + **실제로 있는 다면체인가**.
  "19": (f) => {
    if (f.v! - f.e! + f.f! !== 2) return false;
    const real =
      PLAT.some((s) => s.v === f.v! && s.e === f.e! && s.f === f.f!) ||
      [0, 1, 2].some((fam) =>
        Array.from({ length: 40 }, (_, i) => i + 3).some((n) => {
          const c = countsByDegree(n, fam);
          return c.v === f.v! && c.e === f.e! && c.f === f.f!;
        }),
      );
    if (!real) return false;
    if (f.branch === 0) return f.ans! === f.f!;
    if (f.branch === 1) return f.ans! === f.v!;
    return f.d! === f.e! - f.v! && f.ans! === f.f!;
  },
  // 20 쌍대 — 새 입체의 꼭짓점 수 = 원래의 면의 수, 모서리는 그대로.
  "20": (f) => {
    const src = platByFaces(f.fs!);
    const dual = platByFaces(f.fd!);
    return (
      dual.v === src.f &&
      dual.f === src.v &&
      dual.e === src.e &&
      pickCount(dual, f.ask!) === f.ans!
    );
  },
};

const VERIFY_AREA: Record<string, Check> = {
  // 05 전개도가 주어진 기둥. 겉넓이를 **전개도의 넓이**로 다시 잰다.
  "05": (f) => {
    if (f.branch === 0) {
      return (
        f.w! === 2 * f.r! &&
        f.S! === 2 * f.r! * f.r! + f.w! * f.h! &&
        f.V! === f.r! * f.r! * f.h!
      );
    }
    if (f.branch === 1) {
      const base = (f.a! * f.b!) / 2;
      return (
        f.a! * f.a! + f.b! * f.b! === f.c! * f.c! &&
        f.base! === base &&
        f.S! === 2 * base + (f.a! + f.b! + f.c!) * f.h! &&
        f.V! === base * f.h!
      );
    }
    return (
      f.S! === 2 * (f.w! * f.d! + f.d! * f.h! + f.h! * f.w!) &&
      f.V! === f.w! * f.d! * f.h!
    );
  },
  // 06 밑면이 부채꼴. 밑넓이·호는 «비율 곱하기»로 다시 잰다.
  "06": (f) => {
    if (360 * f.base! !== f.r! * f.r! * f.deg!) return false;
    if (360 * f.arc! !== 2 * f.r! * f.deg!) return false;
    if (f.branch === 0) return f.V! === f.base! * f.h! && f.ans! === f.V!;
    return (
      f.pi! === 2 * f.base! + f.arc! * f.h! &&
      f.flat! === 2 * f.r! * f.h! &&
      f.ans! === f.pi!
    );
  },
  // 07 구멍 뚫린 기둥. 원기둥은 $2(R+r)(R-r+h)$ 로 — 생성기와 다른 꼴.
  "07": (f) => {
    if (f.shape === 0) {
      const ok =
        f.S! === 2 * (f.R! + f.r!) * (f.R! - f.r! + f.h!) &&
        f.V! === (f.R! + f.r!) * (f.R! - f.r!) * f.h! &&
        f.r! < f.R!;
      return ok && f.ans! === (f.ask === 0 ? f.S! : f.V!);
    }
    const base = f.w! * f.d! - f.iw! * f.id!;
    const ok =
      f.S! === 2 * base + 2 * f.h! * (f.w! + f.d! + f.iw! + f.id!) &&
      f.V! === base * f.h! &&
      f.iw! < f.w! &&
      f.id! < f.d!;
    return ok && f.ans! === (f.ask === 0 ? f.S! : f.V!);
  },
  // 08 잘라 낸 직육면체 — 겉넓이를 **면을 하나씩 세어** 더한다.
  //    (생성기는 「없어진 세 면과 새로 생긴 세 면이 같아 안 변한다」로 끝낸다.)
  "08": (f) => {
    const { w, d, h, cw, cd, ch } = f as {
      w: number;
      d: number;
      h: number;
      cw: number;
      cd: number;
      ch: number;
    };
    const outer =
      w * d -
      cw * cd + // 윗면(홈이 파였다)
      w * d + // 아랫면
      (w * h - cw * ch) + // 앞면
      w * h + // 뒷면
      (d * h - cd * ch) + // 왼면
      d * h; // 오른면
    const inner = cw * cd + cw * ch + cd * ch; // 홈의 세 벽
    const ok =
      f.S! === outer + inner &&
      f.V! === w * d * h - cw * cd * ch &&
      cw < w &&
      cd < d &&
      ch < h;
    return ok && f.ans! === (f.ask === 0 ? f.S! : f.V!);
  },
  // 09 회전체(원기둥). 속 빈 갈래도 $2(R+r)(R-r+h)$ 로.
  "09": (f) => {
    if (f.branch === 0) {
      return (
        f.S! === 2 * f.r! * f.r! + 2 * f.r! * f.h! &&
        f.V! === f.r! * f.r! * f.h!
      );
    }
    return (
      f.R! === f.g! + f.t! &&
      f.S! === 2 * (f.R! + f.g!) * (f.R! - f.g! + f.h!) &&
      f.V! === (f.R! + f.g!) * f.t! * f.h!
    );
  },
  // 10 각뿔의 겉넓이. 사각뿔 갈래는 «절반 밑변·높이·옆면의 높이»가 정수 직각삼각형.
  "10": (f) => {
    if (f.branch === 1) {
      return 2 * f.side! === 5 * f.a! * f.l! && f.ans! === f.side!;
    }
    const m = f.a! / 2;
    if (m * m + f.H! * f.H! !== f.l! * f.l!) return false;
    if (f.S! !== f.a! * f.a! + 4 * ((f.a! * f.l!) / 2)) return false;
    return f.ans! === (f.branch === 0 ? f.S! : f.l!);
  },
  // 11 원뿔의 겉넓이 $=$ 밑넓이 $+$ 옆넓이.
  "11": (f) =>
    f.side! === f.r! * f.l! &&
    f.S! === f.r! * f.r! + f.side! &&
    f.l! > f.r! &&
    f.ans! === (f.branch === 1 ? f.l! : f.S!),
  // 12 뿔대의 겉넓이. 원뿔대의 옆넓이는 **큰 부채꼴 $-$ 작은 부채꼴**로.
  "12": (f) => {
    if (f.branch === 0) {
      return (
        f.S! === f.a! * f.a! + f.b! * f.b! + 4 * (((f.a! + f.b!) * f.m!) / 2) &&
        f.b! < f.a! &&
        f.ans! === f.S!
      );
    }
    const side = f.R! * f.L! - f.r! * f.Ls!;
    return (
      f.L! - f.Ls! === f.s! &&
      f.R! * f.Ls! === f.r! * f.L! &&
      side === f.side! &&
      f.S! === f.R! * f.R! + f.r! * f.r! + side &&
      f.ans! === f.S!
    );
  },
  // 13 각뿔의 부피 — 같은 밑면·높이의 각기둥 부피의 $\frac13$ 인가.
  "13": (f) => {
    if (f.branch === 1) {
      const prism = ((f.p! * f.q!) / 2) * f.h!;
      return 3 * f.V! === prism && f.ans! === f.V!;
    }
    const prism = f.a! * f.a! * f.h!;
    return 3 * f.V! === prism && f.ans! === (f.branch === 0 ? f.V! : f.h!);
  },
  // 14 원뿔의 부피 — 같은 밑면·높이의 **원기둥 부피의 $\frac13$** 인가.
  "14": (f) =>
    f.cyl! === f.r! * f.r! * f.h! &&
    3 * f.V! === f.cyl! &&
    f.ans! === (f.branch === 2 ? f.h! : f.V!),
  // 15 뿔대의 부피 — $\dfrac{h}{3}(a^2+ab+b^2)$ 로 (생성기는 큰 뿔 $-$ 작은 뿔).
  "15": (f) =>
    f.Hb! - f.Hs! === f.hh! &&
    f.Hs! * f.a! === f.Hb! * f.b! &&
    3 * f.V! === f.hh! * (f.a! * f.a! + f.a! * f.b! + f.b! * f.b!) &&
    f.ans! === f.V!,
  // 16 잘라 낸 삼각뿔은 직육면체의 $\frac16$.
  "16": (f) =>
    f.box! === f.a! * f.b! * f.c! &&
    6 * f.cut! === f.box! &&
    f.rest! === f.box! - f.cut! &&
    f.ans! === (f.branch === 0 ? f.cut! : f.branch === 1 ? f.rest! : 6),
  // 17 그릇에 남은 물 — 삼각기둥은 $\frac12$, 삼각뿔은 $\frac16$.
  "17": (f) => {
    if (f.branch === 0)
      return 2 * f.V! === f.a! * f.c! * f.b! && f.ans! === f.V!;
    if (6 * f.V! !== f.a! * f.b! * f.c!) return false;
    if (f.branch === 1) return f.ans! === f.V!;
    return (
      f.box! === f.a! * f.b! * f.c! &&
      f.spill! === f.box! - f.V! &&
      f.ans! === f.spill!
    );
  },
  // 19 전개도가 주어진 원뿔 — 호의 길이 $=$ 밑면의 둘레.
  "19": (f) => {
    if (f.deg! * f.l! !== 360 * f.r!) return false;
    if (f.side! !== f.r! * f.l!) return false;
    if (f.S! !== f.r! * f.r! + f.side!) return false;
    return f.ans! === (f.ask === 0 ? f.S! : f.ask === 1 ? f.side! : f.r!);
  },
  // 20 회전체(원뿔) — 세 변이 정수인 직각삼각형이고 부피는 원기둥의 $\frac13$.
  "20": (f) =>
    f.r! * f.r! + f.h! * f.h! === f.l! * f.l! &&
    f.S! === f.r! * f.r! + f.r! * f.l! &&
    f.cyl! === f.r! * f.r! * f.h! &&
    3 * f.V! === f.cyl! &&
    f.ans! === (f.ask === 2 ? f.V! : f.S!),
};

/* ────────────────────────────────────────────────────────────────────────
 * 답에 실린 수 — `facts` 에서 끌어온다
 * ──────────────────────────────────────────────────────────────────────── */

/** 본문에 «값으로» 실린 수 — 단위·지수·아래첨자의 숫자는 값이 아니다. */
function valueNumbers(text: string): number[] {
  const cleaned = text
    .replace(/\\mathrm\{[^}]*\}/g, " ")
    .replace(/[\^_]\{?-?\d+\}?/g, " ");
  return (cleaned.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

const ANSWER_POLY: Record<string, (f: F) => number[]> = {
  "01": (f) => [f.ans!],
  "02": (f) => [f.ans!],
  "03": (f) => [f.ans!],
  "04": (f) => [f.ans!],
  "05": (f) => [f.ans!],
  "06": (f) => [f.ans!],
  "07": (f) => [f.ans!],
  "08": (f) => [f.ans!],
  "09": (f) => [f.ans!],
  "10": (f) => [f.ans!],
  "11": (f) => [f.ans!],
  "12": (f) => [f.ans!],
  "13": (f) => [f.ans!],
  "14": (f) => [f.ans!],
  "15": (f) => [f.ans!],
  "16": (f) => [f.ans!],
  "17": (f) => [f.ans!],
  "18": (f) => [f.ans!],
  "19": (f) => [f.ans!],
  "20": (f) => [f.ans!],
};

const ANSWER_AREA: Record<string, (f: F) => number[]> = {
  "05": (f) => [f.S!, f.V!],
  "06": (f) => (f.branch === 0 ? [f.V!] : [f.pi!, f.flat!]),
  "07": (f) => [f.ans!],
  "08": (f) => [f.ans!],
  "09": (f) => [f.S!, f.V!],
  "10": (f) => [f.ans!],
  "11": (f) => [f.ans!],
  "12": (f) => [f.ans!],
  "13": (f) => [f.ans!],
  "14": (f) => [f.ans!],
  "15": (f) => [f.ans!],
  "16": (f) => [f.ans!],
  "17": (f) => [f.ans!],
  "19": (f) => [f.ans!],
  "20": (f) => (f.ask === 0 ? [f.S!, f.V!] : [f.ans!]),
};

/** 「답이 발문에 그대로 있는가」를 안 보는 유형 — 「몇 개인가」는 답이 보기의 수와 겹친다. */
const NO_LEAK_CHECK = new Set([
  "P06",
  "P08",
  "P10",
  "P12",
  "P15",
  "P18",
  "A16",
]);

/* ────────────────────────────────────────────────────────────────────────
 * 그림 — `facts` 와 `figureSpec` 이 **같은 수**를 말하는가
 * ──────────────────────────────────────────────────────────────────────── */

type FigCheck = (f: F, s: Spec) => boolean;

function piece(s: Spec): Record<string, unknown> {
  const arr = s.pieces as Record<string, unknown>[];
  if (!Array.isArray(arr) || arr.length !== 1)
    throw new Error("pieces 가 하나가 아니다");
  return arr[0]!;
}

const FIG_POLY: Record<string, FigCheck> = {
  "14": (f, s) => {
    if (s.kind !== "revolvePlan") return false;
    const p = piece(s);
    if (f.shape === 2) {
      return (
        p.shape === "rightTrap" &&
        p.w === f.a! &&
        p.w2 === f.w2! &&
        p.h === f.b!
      );
    }
    const h = f.axis === 0 ? f.b! : f.a!;
    return (
      p.shape === (f.shape === 0 ? "rect" : "rightTri") &&
      p.w === f.r! &&
      p.h === h
    );
  },
  "16": (f, s) => {
    if (s.kind !== "revolvePlan") return false;
    const p = piece(s);
    if (f.shape === 2) {
      return (
        p.shape === "rightTrap" &&
        p.w === f.a! &&
        p.w2 === f.w2! &&
        p.h === f.b!
      );
    }
    return (
      p.shape === (f.shape === 0 ? "rect" : "rightTri") &&
      p.w === f.a! &&
      p.h === f.b!
    );
  },
  "17": (f, s) =>
    f.branch === 0
      ? s.kind === "netCylinder" && s.r === f.r! && s.h === f.h!
      : s.kind === "netCone" &&
        s.r === f.r! &&
        s.l === f.l! &&
        JSON.stringify(s.labels) === JSON.stringify(["slant"]),
};

const FIG_AREA: Record<string, FigCheck> = {
  "05": (f, s) => {
    if (f.branch === 0) {
      return s.kind === "netCylinder" && s.r === f.r! && s.h === f.h!;
    }
    if (f.branch === 1) {
      return (
        s.kind === "prism" && s.sides === 3 && s.h === f.h! && s.net === true
      );
    }
    return (
      s.kind === "netCuboid" && s.w === f.w! && s.d === f.d! && s.h === f.h!
    );
  },
  "07": (f, s) => {
    if (s.kind !== "hollowSolid") return false;
    const outer = s.outer as Record<string, unknown>;
    const inner = s.inner as Record<string, unknown>;
    if (f.shape === 0) {
      return (
        outer.shape === "cylinder" &&
        outer.r === f.R! &&
        outer.h === f.h! &&
        inner.shape === "cylinder" &&
        inner.r === f.r!
      );
    }
    return (
      outer.shape === "cuboid" &&
      outer.w === f.w! &&
      outer.d === f.d! &&
      outer.h === f.h! &&
      inner.shape === "cuboid" &&
      inner.w === f.iw! &&
      inner.d === f.id!
    );
  },
  "08": (f, s) => {
    if (s.kind !== "cutCuboid") return false;
    const cut = s.cut as Record<string, unknown>;
    return (
      s.w === f.w! &&
      s.d === f.d! &&
      s.h === f.h! &&
      // 꼭짓점에 붙여 잘라야 «겉넓이가 안 변한다」가 참이 된다 — 가운데면 거짓이다.
      cut.x === 0 &&
      cut.w === f.cw! &&
      cut.d === f.cd! &&
      cut.h === f.ch!
    );
  },
  "09": (f, s) => {
    if (s.kind !== "revolvePlan") return false;
    const p = piece(s);
    if (f.branch === 0) {
      return (
        s.gap === undefined &&
        p.shape === "rect" &&
        p.w === f.r! &&
        p.h === f.h!
      );
    }
    return s.gap === f.g! && p.shape === "rect" && p.w === f.t! && p.h === f.h!;
  },
  "10": (f, s) => s.kind === "pyramid" && s.sides === 4 && s.h === f.H!,
  "13": (f, s) =>
    s.kind === "pyramid" &&
    s.sides === (f.branch === 1 ? 3 : 4) &&
    s.h === f.h!,
  "14": (f, s) => s.kind === "cone" && s.r === f.r! && s.h === f.h!,
  "19": (f, s) =>
    s.kind === "netCone" &&
    s.r === f.r! &&
    s.l === f.l! &&
    JSON.stringify(s.labels) === JSON.stringify(["angle"]),
  "20": (f, s) => {
    if (s.kind !== "revolvePlan") return false;
    const p = piece(s);
    return p.shape === "rightTri" && p.w === f.r! && p.h === f.h!;
  },
};

/** 그림이 **반드시 있어야** 하는 유형 (갈래에 따라 없는 것은 아래 예외로). */
const FIG_OPTIONAL = new Set(["A11", "A13", "A14", "A10"]);

/* ────────────────────────────────────────────────────────────────────────
 * 시험
 * ──────────────────────────────────────────────────────────────────────── */

describe("중1 5E — 다면체와 회전체 · 입체도형의 겉넓이와 부피", () => {
  it("자기 모듈이 낸 유형만 훑는다 — 남의 유형이 섞이면 여기서 갈린다", () => {
    // 중단원 이름으로 거르면 「입체도형의 겉넓이와 부피」의 남의 유형 열하나가
    // 쓸려 들어온다(01~04 m1Book2 · 18 m1Real · 21~26 m1Stat). 목록은 **모듈에서** 온다.
    expect(M1_POLY.length).toBe(20);
    expect(M1_SOLID_AREA.length).toBe(15);
    expect(M1_SOLID_TYPES.length).toBe(35);
    expect(new Set(M1_SOLID_TYPES.map((e) => e.key)).size).toBe(35);
  });

  it("RPM 색인의 「다면체와 회전체」 스무 유형을 빠짐없이 낸다", () => {
    expect(M1_POLY.map((e) => e.rpmType)).toEqual(
      Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
    expect(new Set(M1_POLY.map((e) => e.rpmMinor))).toEqual(
      new Set(["다면체와 회전체"]),
    );
  });

  it("「겉넓이와 부피」는 **남은 번호만** 낸다 (05~17·19·20)", () => {
    // 여기 숫자가 늘어나는 날은 남의 모듈에서 그 번호가 빠진 날이어야 한다.
    expect(M1_SOLID_AREA.map((e) => e.rpmType)).toEqual([
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "19",
      "20",
    ]);
    expect(new Set(M1_SOLID_AREA.map((e) => e.rpmMinor))).toEqual(
      new Set(["입체도형의 겉넓이와 부피"]),
    );
  });

  it("우리 단원 이름이 교육과정 시드(정본)에 실제로 있다", () => {
    // 참을 **정본에서** 가져온다 — 여기 목록을 손으로 적으면 손 목록끼리 견주는
    // 동어반복이 된다.
    const seeded = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_SOLID_TYPES) {
      expect(
        seeded.has(e.unitSection),
        `중1 시드에 없는 단원 이름: ${e.unitSection} (${e.key})`,
      ).toBe(true);
    }
  });

  it("붙인 단원이 다섯뿐이다 — 엉뚱한 단원으로 새면 눈에 띄게", () => {
    // 위 검사는 「시드에 있는 이름인가」만 본다. 시드에 있는 **다른** 단원으로
    // 잘못 붙는 것은 못 본다(예: 「대푯값」). 그래서 다섯을 못 박아 둔다.
    expect(new Set(M1_POLY.map((e) => e.unitSection))).toEqual(
      new Set(["다면체", "정다면체", "회전체"]),
    );
    expect(new Set(M1_SOLID_AREA.map((e) => e.unitSection))).toEqual(
      new Set(["기둥의 겉넓이와 부피", "뿔의 겉넓이와 부피"]),
    );
  });

  it("볼록 정다면체는 조건에서 **다섯**이 만들어진다", () => {
    // 이 시험의 정다면체 검산은 전부 여기서 나온다. 다섯이 아니면 그 아래가 전부
    // 거짓말이므로 먼저 못 박는다.
    expect(PLAT.length).toBe(5);
    expect(PLAT.map((s) => s.f).sort((a, b) => a - b)).toEqual([
      4, 6, 8, 12, 20,
    ]);
    for (const s of PLAT) {
      expect(s.v - s.e + s.f, `오일러: ${JSON.stringify(s)}`).toBe(2);
      expect(s.p * s.f).toBe(2 * s.e);
      expect(s.q * s.v).toBe(2 * s.e);
    }
  });

  it("제품 전처리가 내 수식의 수를 바꾸지 않는다", () => {
    // 참을 **제품 함수에서** 가져온다 — 규칙을 여기 옮겨 적으면 그 규칙이 바뀌는 날
    // 이 검사가 눈이 먼다. 판정은 「전처리 전후로 수식 안의 수가 같은가」다
    // (2026-08-24 D-73 로 대분수 변환은 빠졌지만, 다시 들어오면 여기가 빨개진다).
    const digits = (s: string) =>
      (s.match(/\$[^$]*\$/g) ?? []).join(" ").match(/\d+/g)?.join(",") ?? "";
    for (const e of M1_SOLID_TYPES) {
      for (let s = 0; s < 40; s += 1) {
        const p = generateMiddleProblem(e.key, s * 7919 + 13);
        for (const field of [p.content, p.answer, p.solution]) {
          expect(
            digits(preprocessMathText(field)),
            `${e.key} — 전처리가 수식을 고쳐 씁니다: ${field}`,
          ).toBe(digits(field));
        }
      }
    }
  });

  it("대분수를 직접 쓰지 않았다 (D-73)", () => {
    // 제품이 가분수를 대분수로 안 바꾸므로, 대분수는 **우리가 써야만** 나온다.
    for (const e of M1_SOLID_TYPES) {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        for (const field of [p.content, p.answer, p.solution]) {
          expect(/\d\s*\\d?frac/.test(field), `${e.key} 대분수: ${field}`).toBe(
            false,
          );
        }
      }
    }
  });

  for (const [tag, entries, verify, answers, figs] of [
    ["P", M1_POLY, VERIFY_POLY, ANSWER_POLY, FIG_POLY],
    ["A", M1_SOLID_AREA, VERIFY_AREA, ANSWER_AREA, FIG_AREA],
  ] as [
    string,
    TypeEntry[],
    Record<string, Check>,
    Record<string, (f: F) => number[]>,
    Record<string, FigCheck>,
  ][]) {
    for (const e of entries) {
      describe(`${tag}${e.rpmType} ${e.rpmTitle}`, () => {
        it("같은 씨앗이면 같은 문항", () => {
          expect(generateMiddleProblem(e.key, 20260824)).toEqual(
            generateMiddleProblem(e.key, 20260824),
          );
        });

        it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
          const check = verify[e.rpmType];
          expect(check, `검산식 누락: ${tag}${e.rpmType}`).toBeDefined();
          for (const seed of SEEDS) {
            const p = generateMiddleProblem(e.key, seed);
            expect(
              check!(p.facts, p),
              `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}\n${p.content}`,
            ).toBe(true);
          }
        });

        it("답의 수가 facts 와 일치한다", () => {
          const want = answers[e.rpmType]!;
          for (const seed of SEEDS) {
            const p = generateMiddleProblem(e.key, seed);
            expect(valueNumbers(p.answer), `${e.key} / ${p.answer}`).toEqual(
              want(p.facts),
            );
          }
        });

        it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
          for (const seed of SEEDS) {
            const p = generateMiddleProblem(e.key, seed);
            expect(bareNumbers(p.content), p.content).toEqual([]);
            expect(bareNumbers(p.answer), p.answer).toEqual([]);
            expect(bareNumbers(p.solution), p.solution).toEqual([]);
          }
        });

        it("답이 발문에 그대로 적혀 있지 않다", () => {
          if (NO_LEAK_CHECK.has(`${tag}${e.rpmType}`)) return;
          for (const seed of SEEDS) {
            const p = generateMiddleProblem(e.key, seed);
            const inContent = valueNumbers(p.content);
            for (const v of answers[e.rpmType]!(p.facts)) {
              expect(
                inContent.includes(v),
                `답 ${v} 가 발문에 그대로 있다: ${p.content}`,
              ).toBe(false);
            }
          }
        });

        it("해설이 답의 수를 담는다", () => {
          for (const seed of SEEDS) {
            const p = generateMiddleProblem(e.key, seed);
            const inSolution = valueNumbers(p.solution);
            for (const v of answers[e.rpmType]!(p.facts)) {
              expect(inSolution.includes(v), `${e.key} / ${p.solution}`).toBe(
                true,
              );
            }
          }
        });

        it("그림이 있으면 발문과 **같은 수**를 말한다", () => {
          const fig = figs[e.rpmType];
          for (let s = 0; s < 80; s += 1) {
            const p = generateMiddleProblem(e.key, s * 7919 + 13);
            if (!p.figureSpec) {
              // 그림을 안 붙이기로 한 유형은 계속 안 붙어야 한다. 갈래에 따라
              // 없는 것은 예외 목록으로 열어 둔다(위 `FIG_OPTIONAL`).
              expect(
                fig === undefined || FIG_OPTIONAL.has(`${tag}${e.rpmType}`),
                `${e.key}: 그림이 있어야 하는 유형인데 없다`,
              ).toBe(true);
              continue;
            }
            expect(fig, `${e.key}: 그림 대조식이 없다`).toBeDefined();
            expect(p.figureSpec!.version, e.key).toBe("elem-1");
            expect(
              fig!(p.facts, p.figureSpec as Spec),
              `${e.key} seed ${s}: 그림과 발문이 다른 수를 말한다 — ${JSON.stringify(p.figureSpec)} / ${JSON.stringify(p.facts)}`,
            ).toBe(true);
          }
        });
      });
    }
  }

  it("한 유형에서 8문항을 뽑으면 발문이 전부 다르다", () => {
    // 그림이 치수를 나르는 유형(07·08·19)은 발문에 수가 적어 **여기서만** 드러난다 —
    // 실제로 처음엔 08·19 가 넷을 못 채웠다.
    for (const e of M1_SOLID_TYPES) {
      const set = generateMiddleSet(e.key, 20260824, 8);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        8,
      );
    }
  });

  it("씨앗을 넓게 훑어도 던지지 않는다 (attempt 소진 없음)", () => {
    for (const e of M1_SOLID_TYPES) {
      for (let s = 0; s < 400; s += 1) {
        expect(() => generateMiddleProblem(e.key, s * 7919 + 13)).not.toThrow();
      }
    }
  });

  it("모든 갈래가 실제로 나온다 — 죽은 갈래가 없다", () => {
    // 갈래 하나가 영영 안 나오면 그 갈래의 검산식은 «초록인 장식» 이다.
    const seen: Record<string, Set<number>> = {};
    const key = (e: TypeEntry) =>
      `${e.rpmMinor === "다면체와 회전체" ? "P" : "A"}${e.rpmType}`;
    for (const e of M1_SOLID_TYPES) {
      const k = key(e);
      seen[k] = new Set();
      for (let s = 0; s < 400; s += 1) {
        const f = generateMiddleProblem(e.key, s * 7919 + 13).facts as F;
        seen[k]!.add(
          (f.branch ?? f.shape ?? f.ask ?? f.target ?? f.fam ?? 0) as number,
        );
      }
    }
    expect(seen["P02"]).toEqual(new Set([0, 1, 2]));
    expect(seen["P04"]).toEqual(new Set([0, 1, 2]));
    expect(seen["P05"]).toEqual(new Set([0, 1, 2]));
    expect(seen["P07"]).toEqual(new Set([0, 1, 2]));
    expect(seen["P08"]).toEqual(new Set([0, 1, 2]));
    expect(seen["P10"]).toEqual(new Set([0, 1]));
    expect(seen["P11"]).toEqual(new Set([0, 1]));
    expect(seen["P14"]).toEqual(new Set([0, 1, 2]));
    expect(seen["P16"]).toEqual(new Set([0, 1, 2]));
    expect(seen["P17"]).toEqual(new Set([0, 1]));
    expect(seen["P19"]).toEqual(new Set([0, 1, 2]));
    expect(seen["P20"]).toEqual(new Set([0, 1, 2]));
    expect(seen["A05"]).toEqual(new Set([0, 1, 2]));
    expect(seen["A06"]).toEqual(new Set([0, 1]));
    expect(seen["A07"]).toEqual(new Set([0, 1]));
    expect(seen["A08"]).toEqual(new Set([0, 1]));
    expect(seen["A09"]).toEqual(new Set([0, 1]));
    expect(seen["A10"]).toEqual(new Set([0, 1, 2]));
    expect(seen["A11"]).toEqual(new Set([0, 1, 2]));
    expect(seen["A12"]).toEqual(new Set([0, 1]));
    expect(seen["A13"]).toEqual(new Set([0, 1, 2]));
    expect(seen["A14"]).toEqual(new Set([0, 1, 2]));
    expect(seen["A15"]).toEqual(new Set([0, 1]));
    expect(seen["A16"]).toEqual(new Set([0, 1, 2]));
    expect(seen["A17"]).toEqual(new Set([0, 1, 2]));
    expect(seen["A19"]).toEqual(new Set([0, 1, 2]));
    expect(seen["A20"]).toEqual(new Set([0, 1, 2]));
  });

  it("15·18 은 참인 짝·문장과 거짓인 것이 **둘 다** 나온다", () => {
    // 이 둘의 검산표는 생성기 표의 사본이라, 한쪽만 나오면 아무것도 안 가른다.
    for (const [k, table] of [
      ["15", AXIAL],
      ["18", REV_TRUTH],
    ] as [string, Record<string, unknown>][]) {
      const e = M1_POLY.find((x) => x.rpmType === k)!;
      let trues = 0;
      let falses = 0;
      for (let s = 0; s < 120; s += 1) {
        const p = generateMiddleProblem(e.key, s * 7919 + 13);
        for (const line of bogiLines(p.content)) {
          if (k === "15") {
            const [solid, claim] = line.split("—").map((t) => t.trim());
            if (AXIAL[solid!] === claim) trues += 1;
            else falses += 1;
          } else {
            if (REV_TRUTH[line]) trues += 1;
            else falses += 1;
          }
        }
      }
      expect(Object.keys(table).length).toBeGreaterThan(3);
      expect(trues, `${k}: 참인 보기가 안 나온다`).toBeGreaterThan(10);
      expect(falses, `${k}: 거짓인 보기가 안 나온다`).toBeGreaterThan(10);
    }
  });
});

describe.skipIf(!hasEngine)("중1 5E — 그림이 실제로 그려진다", () => {
  // 「스펙이 그럴듯하다」와 「엔진이 그린다」는 다른 질문이다. `netCone` 은 중심각이
  // 정수 도가 아니거나 $30$~$330^\circ$ 밖이면 **던지고**, `hollowSolid`·`cutCuboid` 는
  // 벽이 얇으면 던진다(09 §2.1). 그 경계는 코드를 읽어서가 아니라 **돌려 봐야** 안다.
  for (const e of M1_SOLID_TYPES) {
    it(`${e.rpmType} ${e.rpmTitle}`, async () => {
      for (const seed of SEEDS.slice(0, 4)) {
        const p = generateMiddleProblem(e.key, seed);
        if (!p.figureSpec) continue;
        const r = await renderFigureSpec(p.figureSpec);
        expect(
          r.ok,
          `${e.key} seed ${seed}: ${r.ok ? "" : r.error} ${JSON.stringify(p.figureSpec)}`,
        ).toBe(true);
        if (r.ok) {
          // 지면 등급은 viewBox 폭 하나로 갈린다(09 §4-25) — 240 을 넘으면
          // 그림만 작아진다. `netCone` 은 240 에 박혀 있다.
          const w = Number(/viewBox="0 0 ([\d.]+)/.exec(r.svg)?.[1] ?? NaN);
          expect(w, `${e.key} viewBox 폭 ${w}`).toBeLessThanOrEqual(240);
        }
      }
    }, 60_000);
  }
});
