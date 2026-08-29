/**
 * 중2 기하 55유형 (RPM 2-2 삼각형의 성질·여러 가지 사각형·도형의 닮음·평행선 비)
 * — 독립 검산. 2B 물결(마크 문법)로 **네 중단원 전량**(12+17+15+11)을 덮었다.
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts`(발문의 원 수치)로 유형마다 조건식을
 * **여기서 다시 세워** 만족하는지 본다. 검산식은 「발문이 말하는 성질」을 직접
 * 옮긴 것이고, 생성기가 쓴 식과 **다른 형태**여야 한다 (동어반복 금지).
 *
 * 그림은 존재·모양(version 2 · 유한한 수 · 라벨 수치가 facts 와 일치)까지 잠근다 —
 * 실제 렌더 검증은 엔진이 정본이다(09 §0.1).
 */
import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import { catalogMaxNumber, isCatalogType } from "../helpers/rpmCatalog";
import { M2_TYPES } from "../../lib/middle/m2";
import {
  M2_GEO_QUAD,
  QUAD10_CLAIMS,
  QUAD11_SHAPES,
} from "../../lib/middle/m2GeoQuad";
import { SIM01_PERMS } from "../../lib/middle/m2GeoSim";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260823, 1, 7777, 424242, 99991];

const MINORS = new Set([
  "삼각형의 성질",
  "여러 가지 사각형",
  "도형의 닮음",
  "평행선 사이의 선분의 길이의 비",
]);

// ⚠️ 중단원으로 고르면 2026-08-27 부터 갈래 넷이 같은 중단원에 더하는 «확장 유형»
//    (색인에 없는 번호)까지 쓸어 담아, 남의 유형이 이 검산표에 들이대진다
//    — 실제로 「닮은 도형」이 4 → 10 이 되며 빨개졌다. 몫을 「RPM 색인에 있는가」로
//    한 번 더 좁힌다. 확장 유형의 값 검산은 그것을 지은 갈래의 시험이 들고 있다.
const IN_MINORS = M2_TYPES.filter(
  (e) => e.rpmBook === "2-2" && MINORS.has(e.rpmMinor),
);
const GEO = IN_MINORS.filter((e) => isCatalogType(e));
const GEO_EXTENSIONS = IN_MINORS.filter((e) => !isCatalogType(e));

type P2 = readonly [number, number];

function dist(a: P2, b: P2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** 벡터 b→a 와 b→c 의 내적 — 0 이면 그 각이 직각이다. */
function dot(a: P2, b: P2, c: P2): number {
  return (a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]);
}

function near(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
}

/**
 * 07 — 직각이등변삼각형의 두 꼭짓점에서 직선 l 에 내린 수선.
 * 발문이 말하는 **도형을 여기서 직접 세워** ⑴ AB=AC ⑵ ∠BAC=90° ⑶ DE=x 를
 * 잰다(생성기의 `x=p+q` 를 옮겨 적지 않는다).
 */
function rhaFeetHolds(p: number, q: number, x: number): boolean {
  const D: P2 = [0, 0];
  const A: P2 = [q, 0];
  const E: P2 = [q + p, 0];
  const C: P2 = [0, p];
  const B: P2 = [q + p, q];
  return (
    near(dist(A, B), dist(A, C)) && near(dot(B, A, C), 0) && near(dist(D, E), x)
  );
}

/**
 * 08 — ∠C=90°, AD=AC(D 는 빗변 위), DE⊥AB(E 는 BC 위)일 때 △BED 의 둘레.
 * E 를 **수직 조건으로 직접 풀어** 세 변을 재 돌려준다.
 */
function rhsFoldPerimeter(a: number, b: number, c: number): number | null {
  if (a * a + b * b !== c * c || b >= c) return null;
  const A: P2 = [0, b];
  const B: P2 = [a, 0];
  const ux = a / c;
  const uy = -b / c;
  const D: P2 = [A[0] + b * ux, A[1] + b * uy];
  // D 에서 AB 에 수직인 방향 (-uy, ux) 로 나아가 x축(BC)에 닿는 점이 E.
  const step = -D[1] / ux;
  const E: P2 = [D[0] + step * -uy, 0];
  if (!(E[0] > 0 && E[0] < a)) return null;
  return dist(B, E) + dist(E, D) + dist(D, B);
}

/**
 * 12 — 폭이 일정한 종이접기. AC(=m)·BC(=n) 이 폭까지 정하므로 좌표를 세워
 * ⑴ |AB|=m ⑵ |BC|=n ⑶ **∠ABC=∠ACB**(이등변이 되는 근거)를 확인한다.
 */
function foldIsoscelesHolds(m: number, n: number): boolean {
  const bx = (2 * m * m - n * n) / (2 * m);
  const w2 = m * m - bx * bx;
  if (!(bx > 0 && bx < m && w2 > 0)) return false;
  const w = Math.sqrt(w2);
  const A: P2 = [0, w];
  const C: P2 = [m, w];
  const B: P2 = [bx, 0];
  const cosABC = dot(A, B, C) / (dist(A, B) * dist(B, C));
  const cosACB = dot(A, C, B) / (dist(A, C) * dist(C, B));
  return (
    near(dist(A, B), m) && near(dist(B, C), n) && near(cosABC, cosACB, 1e-8)
  );
}

/**
 * 10 유형 명제의 참·거짓 — **테스트가 손으로 다시 세운 표**.
 * 모듈의 `QUAD10_CLAIMS` 와 갈리면 아래 «두 표가 같다» 검사가 빨개진다
 * (같은 표를 두 벌 두는 것이 목적이다 — 한쪽만 고치면 드러난다).
 */
const QUAD10_TRUTH: readonly boolean[] = [
  true, // 평행사변형은 사다리꼴이다
  false, // 마름모는 직사각형이다
  true, // 정사각형은 마름모이다
  false, // 직사각형은 정사각형이다
  true, // 두 대각선의 길이가 같은 평행사변형은 직사각형이다
  true, // 두 대각선이 서로 수직인 평행사변형은 마름모이다
  true, // 이웃하는 두 변의 길이가 같은 직사각형은 정사각형이다
  true, // 한 내각의 크기가 90°인 마름모는 정사각형이다
  false, // 이웃하는 두 내각의 크기가 같은 사각형은 직사각형이다
  false, // 등변사다리꼴은 평행사변형이다
  true, // 정사각형은 직사각형이다
  true, // 마름모는 평행사변형이다
  true, // 두 대각선이 서로 다른 것을 이등분하는 사각형은 평행사변형이다
  false, // 평행사변형은 마름모이다
];

/** 11 유형 사각형별 [두 대각선의 길이가 같다, 수직이다, 서로 다른 것을 이등분한다]. */
const QUAD11_TRUTH: readonly (readonly [boolean, boolean, boolean])[] = [
  [false, false, false], // 사다리꼴
  [false, false, true], // 평행사변형
  [true, false, true], // 직사각형
  [false, true, true], // 마름모
  [true, false, false], // 등변사다리꼴
  [true, true, true], // 정사각형
];

/** 삼각형 세 각의 합 — 검산이 발문의 성질을 «다시 세운다». */
function angleSum(...angles: number[]): boolean {
  return angles.reduce((s, v) => s + v, 0) === 180;
}

/**
 * 유형별 독립 검산 — 키는 `중단원|번호`.
 *
 * 각 식은 발문이 말하는 성질에서 직접 온다. 예: 이등변삼각형이면 「꼭지각 + 밑각
 * 두 개 = 180」을 세운다(생성기는 `x = (180-a)/2` 로 나눗셈을 썼다 — 형태가 다르다).
 */
const VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
  // 이등변: 꼭지각 + 밑각 둘 = 180. 비율 모드는 a:x = m:n 이 성립하고 세 각의 합.
  "삼각형의 성질|01": (f) =>
    f.mode === 0
      ? angleSum(f.a!, f.x!, f.x!) && f.a! > 0 && f.x! > 0
      : f.n! * (180 - 2 * f.x!) === f.m! * f.x! && f.x! > 0,
  // 꼭지각 이등분선: 밑변을 이등분(x=d) + 삼각형 ABD 의 세 각 (t, y, 90)
  "삼각형의 성질|02": (f) =>
    f.x! === f.d! && angleSum(f.t!, f.y!, 90) && f.sum! === f.x! + f.y!,
  // 이웃한 이등변: ∠A=2a 이고 외각 x = A + a 이므로 x = 3a. 검산은 외각 관계로.
  "삼각형의 성질|03": (f) =>
    f.mode === 0
      ? f.x! === 2 * f.a! + f.a! && f.a! > 0
      : f.e! === 2 * f.a! + f.a! && f.x! === 2 * f.a!,
  // 내각 이등분선 교점: ∠BDC = 180 - (B+C)/2, 그리고 A + B + C = 180.
  // 외각 이등분선 모드: ∠BDC = A/2.
  "삼각형의 성질|04": (f) =>
    f.mode === 0
      ? 2 * (180 - f.x!) + f.a! === 180
      : 2 * f.x! === f.a! && f.a! > 0 && f.x! > 0,
  // 이등변 조건: 둘레 = 2·AB + BC / 각 모드는 B=C 이고 세 각 합 180
  "삼각형의 성질|05": (f) =>
    f.mode === 0
      ? 2 * f.x! + f.k! === f.p!
      : angleSum(f.a!, f.b!, f.b!) && f.x! === f.m!,
  // 각의 이등분선: 두 거리가 같다 / 사각형 OCPD 의 네 각의 합 = 360
  "삼각형의 성질|09": (f) =>
    f.mode === 0
      ? f.x! === f.d!
      : f.w! + f.x! + 90 + 90 === 360 && f.w! > 0 && f.x! > 0,
  // 각의 이등분선 응용: 피타고라스(AB²+BC²=AC²) + BD·(AB+AC)=AB·BC (D 가 이등분선의 발)
  //  + 넓이 2s = AC·BD
  "삼각형의 성질|10": (f) =>
    f.ab! * f.ab! + f.bc! * f.bc! === f.ac! * f.ac! &&
    f.bd! * (f.ab! + f.ac!) === f.ab! * f.bc! &&
    2 * f.s! === f.ac! * f.bd!,
  // 합동 찾기: ∠DEF = ∠B 이므로 A + 2x = 180
  "삼각형의 성질|11": (f) => angleSum(f.a!, f.x!, f.x!) && f.x! > 0,
  // 평행선과 넓이: 사각형 = 두 삼각형의 합 / 직각 모드는 밑변 2w·높이 h 삼각형
  "여러 가지 사각형|13": (f) =>
    f.mode === 0
      ? f.x! === f.s1! + f.s2! && f.s1! > 0 && f.s2! > 0
      : 2 * f.x! === 2 * f.w! * f.h! && f.h! > 0 && f.w! > 0,
  // 높이가 같은 두 삼각형: S:x = (m+n):m  ⇔  x·(m+n) = S·m
  "여러 가지 사각형|14": (f) =>
    f.mode === 0
      ? f.x! * (f.m! + f.n!) === f.S! * f.m!
      : f.x! * (f.m! + f.n!) * (f.p! + f.q!) === f.S! * f.n! * f.q!,
  // 평행사변형: △DBC = S/2, 그 안에서 EC 몫  ⇔  2x(m+n) = S·n
  "여러 가지 사각형|15": (f) => 2 * f.x! * (f.m! + f.n!) === f.S! * f.n!,
  // 사다리꼴: △ABC = △DBC = △OBC + △DOC, 그리고 OBC:DOC = BO:OD
  "여러 가지 사각형|16": (f) =>
    f.mode === 0
      ? f.x! * f.m! === f.s! * (f.m! + f.n!) &&
        f.s! * f.n! === f.m! * (f.x! - f.s!)
      : f.t! === f.x! + f.u! && f.u! > 0 && f.x! > 0,
  // 닮은 도형: 대응 순서표가 실제로 그 자리를 가리키는지 (테스트가 표를 다시 읽는다)
  "도형의 닮음|01": (f) =>
    Number.isInteger(f.perm!) &&
    f.perm! >= 0 &&
    f.perm! < SIM01_PERMS.length &&
    f.si! >= 0 &&
    f.si! < 3 &&
    f.ai! >= 0 &&
    f.ai! < 3,
  // 평면 닮음: AB·EF = DE·BC (비례식을 곱셈꼴로 — 생성기는 나눗셈을 썼다)
  "도형의 닮음|02": (f) => f.ab! * f.ef! === f.x! * f.bc! && f.bc! !== f.ef!,
  // 입체 닮음: (b1+c1)·a2 = x·a1
  "도형의 닮음|03": (f) =>
    (f.b1! + f.c1!) * f.a2! === f.x! * f.a1! && f.a1! !== f.a2!,
  // 원뿔 닮음비: r1·n = R·m, 넓이 = R²
  "도형의 닮음|04": (f) =>
    f.r1! * f.n! === f.R! * f.m! && f.area! === f.R! * f.R! && f.m! < f.n!,
  // 넓이의 비 = 닮음비의 제곱: s·ad² = x·ab²
  "도형의 닮음|05": (f) =>
    f.s! * f.ad! * f.ad! === f.x! * f.ab! * f.ab! && f.ab! < f.ad!,
  // 겉넓이비 = k², 부피비 = k³: (s2/s1) = k², (x/v1) = k³ ⇒ (x/v1)² = (s2/s1)³
  "도형의 닮음|06": (f) =>
    f.x! * f.x! * f.s1! * f.s1! * f.s1! ===
    f.v1! * f.v1! * f.s2! * f.s2! * f.s2!,
  // 넓이 정비례: c1·d2² = x·d1²
  "도형의 닮음|07": (f) => f.c1! * f.d2! * f.d2! === f.x! * f.d1! * f.d1!,
  // 부피비 1:m³ — 더 붓는 양 x = v(m³-1)
  "도형의 닮음|08": (f) =>
    f.x! + f.v! === f.v! * f.m! * f.m! * f.m! && f.m! > 1,
  // 평행선 비: AD·EC = DB·AE / DE·AB = BC·AD
  "평행선 사이의 선분의 길이의 비|01": (f) =>
    f.mode === 0
      ? f.a! * f.x! === f.b! * f.e!
      : f.x! * f.c! === f.bc! * f.a! && f.a! < f.c!,
  // 나비꼴: DE·AB = BC·AE
  "평행선 사이의 선분의 길이의 비|02": (f) =>
    f.x! * f.ab! === f.bc! * f.ae! && f.ae! < f.ab!,
  // DF:FE = BG:GC 이고 DF+FE = DE ⇒ x·(g1+g2) = d·g2
  "평행선 사이의 선분의 길이의 비|03": (f) =>
    f.x! * (f.g1! + f.g2!) === f.d! * f.g2! && f.g1! !== f.g2!,
  // 겹사다리: AF:FD = AD:DB 이고 AD = AF+FD ⇒ f1·x = (f1+f2)·f2
  "평행선 사이의 선분의 길이의 비|04": (f) =>
    f.f1! * f.x! === (f.f1! + f.f2!) * f.f2!,
  // 평행 조건: AD·AC = AB·AE
  "평행선 사이의 선분의 길이의 비|05": (f) =>
    f.a! * f.f! === f.c! * f.x! && f.a! < f.c!,
  // 내각 이등분선: AB·CD = AC·BD / 넓이도 같은 비
  "평행선 사이의 선분의 길이의 비|06": (f) =>
    f.mode === 0
      ? f.ab! * f.x! === f.ac! * f.bd!
      : f.ab! * f.x! === f.ac! * f.s! && f.ab! !== f.ac!,
  // 외각 이등분선: AB·CD = AC·BD, BD = BC + CD
  "평행선 사이의 선분의 길이의 비|07": (f) =>
    f.ab! * f.x! === f.ac! * (f.b! + f.x!) && f.ab! > f.ac!,

  // ── 2B 물결 (마크 문법이 열어 준 28유형) ──────────────────────────
  // 직각삼각형의 두 예각의 합은 90°
  "삼각형의 성질|06": (f) => f.acute! + f.x! === 90 && f.x! > 0,
  // 좌표로 세워 AB=AC·∠BAC=90°·DE=x 를 직접 잰다
  "삼각형의 성질|07": (f) => rhaFeetHolds(f.p!, f.q!, f.x!),
  // 세 변이 피타고라스 세 쌍이고, E 를 수직 조건으로 풀어 둘레를 직접 잰다
  "삼각형의 성질|08": (f) => {
    const peri = rhsFoldPerimeter(f.a!, f.b!, f.c!);
    return peri !== null && near(peri, f.x!);
  },
  // 접은 각·엇각으로 ∠ABC=∠ACB 가 되는지 좌표로 확인 / 넓이는 ½·AC·폭
  "삼각형의 성질|12": (f) =>
    f.mode === 0
      ? foldIsoscelesHolds(f.m!, f.n!) && f.x! === f.m!
      : 2 * f.x! === f.m! * f.w! && f.m! > f.w!,

  // 직사각형: △OAB 가 이등변이므로 세 각의 합 / 대각선은 반쪽의 두 배
  "여러 가지 사각형|01": (f) =>
    f.mode === 0 ? angleSum(f.a!, f.a!, f.x!) : f.x! === 2 * f.r! && f.r! > 0,
  // 직사각형이 되는 조건: 한 내각 90° / 두 대각선의 길이가 같다
  "여러 가지 사각형|02": (f) =>
    f.mode === 0
      ? f.p! * f.x! - f.q! === 90
      : f.p! * f.x! + f.q! === f.x! + f.s! && f.len! === f.p! * f.x! + f.q!,
  // 마름모: △ABC 가 이등변(AB=BC) → 세 각의 합 / 대각선이 각을 이등분
  "여러 가지 사각형|03": (f) =>
    f.mode === 0
      ? angleSum(f.a!, f.a!, f.x!)
      : 2 * f.b! + f.x! === 180 && f.b! > 0,
  // 마름모가 되는 조건: 이웃한 두 변이 같다 / 두 대각선이 수직
  "여러 가지 사각형|04": (f) =>
    f.mode === 0
      ? f.p! * f.x! + f.q! === f.x! + f.s! && f.peri! === 4 * f.side!
      : f.p! * f.x! + f.q! === 90,
  // 정사각형: 두 대각선이 수직이므로 넓이 = ½d² / △AED 의 세 각의 합
  "여러 가지 사각형|05": (f) =>
    f.mode === 0
      ? 2 * f.x! === f.d! * f.d!
      : angleSum(45, 180 - f.b!, f.x!) && f.b! > 45 && f.b! < 135,
  // 정사각형이 되는 조건: 이웃한 두 변이 같다 / 두 대각선의 길이가 같다
  "여러 가지 사각형|06": (f) =>
    f.mode === 0
      ? f.p! * f.x! + f.q! === f.x! + f.s! && f.area! === f.side! * f.side!
      : f.p! * f.x! + f.q! === f.x! + f.s! && 2 * f.area! === f.d! * f.d!,
  // 등변사다리꼴: AD∥BC 이므로 ∠A+∠B=180 / ∠B = 2∠ADB (엇각+이등변)
  "여러 가지 사각형|07": (f) =>
    f.mode === 0 ? f.b! + f.x! === 180 : f.x! === 2 * f.t! && f.t! > 0,
  // 등변사다리꼴의 응용: BC = AD + 2·CH / ∠A=120° 면 BC = AD + AB
  "여러 가지 사각형|08": (f) =>
    f.mode === 0
      ? f.p! + 2 * f.x! === f.q! && f.q! > f.p!
      : f.x! === f.p! + f.c! && f.c! % 2 === 0,
  // 판별⑴: □EFGH 는 정사각형이므로 넓이 = (한 변)² = t² + (s-t)²
  "여러 가지 사각형|09": (f) =>
    f.x! === f.t! * f.t! + (f.s! - f.t!) * (f.s! - f.t!) &&
    f.t! > 0 &&
    f.t! < f.s!,
  // 사이의 관계: 테스트가 **자기 진리표**로 옳은 명제를 다시 센다
  "여러 가지 사각형|10": (f) => {
    const idx = [f.i0!, f.i1!, f.i2!, f.i3!, f.i4!];
    if (new Set(idx).size !== 5) return false;
    return idx.filter((i) => QUAD10_TRUTH[i]).length === f.x!;
  },
  // 대각선의 성질: 테스트가 자기 성질표로 a·b·c 를 다시 센다
  "여러 가지 사각형|11": (f) => {
    const idx = [f.i0!, f.i1!, f.i2!, f.i3!, f.i4!, f.i5!].filter(
      (i) => i >= 0,
    );
    if (new Set(idx).size !== f.n!) return false;
    const a = idx.filter((i) => QUAD11_TRUTH[i]![0]).length;
    const b = idx.filter((i) => QUAD11_TRUTH[i]![1]).length;
    const c = idx.filter(
      (i) => QUAD11_TRUTH[i]![0] && QUAD11_TRUTH[i]![1] && QUAD11_TRUTH[i]![2],
    ).length;
    return a === f.a! && b === f.b! && c === f.c! && f.x! === a + b + c;
  },
  // 중점사각형: 정사각형→정사각형(넓이 k²) / 마름모→직사각형(두 변이 대각선의 절반)
  "여러 가지 사각형|12": (f) =>
    f.mode === 0
      ? f.x! === f.k! * f.k!
      : 4 * f.x! === f.p! * f.q! && f.p! !== f.q!,
  // 판별⑵: □EBFD 는 마름모, BF = AD - FC. 그림이 성립하려면 AD > 2·FC
  "여러 가지 사각형|17": (f) =>
    f.side! === f.p! - f.q! && f.x! === 4 * f.side! && f.p! > 2 * f.q!,
  // 28 등변이 되는 조건: 두 각(또는 두 대각선) 식이 x 에서 같아진다.
  "여러 가지 사각형|28": (f) => {
    if (f.mode === 0) {
      const left = f.p! * f.x! - f.q!;
      const right = f.x! + f.s!;
      return left === right && left > 0 && left < 180 && f.theta === left;
    }
    return (
      f.p! * f.x! + f.q! === f.x! + f.s! &&
      f.len === f.p! * f.x! + f.q! &&
      f.len! > 0
    );
  },

  // 닮음 조건: SAS 는 비례식을 곱셈꼴로 / AA 는 세 내각의 합
  "도형의 닮음|09": (f) =>
    f.mode === 0
      ? f.ab! * f.x! === f.de! * f.bc! && f.ab! !== f.de!
      : angleSum(f.p!, f.q!, f.x!),
  // SAS 닮음: AD·AB = AE·AC 가 닮음비의 근거, BC·AD = DE·AC 가 결론
  "도형의 닮음|10": (f) =>
    f.p! * f.ab! === f.r! * f.ac! &&
    f.x! * f.p! === f.m! * f.ac! &&
    f.p! < f.ab! &&
    f.r! < f.ac!,
  // AA 닮음(엇각): BD·BA = BE·BC, EC = BC - BE. BA=BC 면 DE∥AC 라 다른 유형
  "도형의 닮음|11": (f) =>
    f.d! * (f.d! + f.a!) === f.e! * f.bc! &&
    f.x! === f.bc! - f.e! &&
    f.bc! !== f.d! + f.a!,
  // 두 수선의 발: AD·CE = BE·BD
  "도형의 닮음|12": (f) => f.u! * f.w! === f.v! * f.x!,
  // 빗변 위의 수선: AH² = BH·CH (그리고 AC² = CH·CB)
  "도형의 닮음|13": (f) =>
    f.mode === 0
      ? f.ah! * f.ah! === f.bh! * f.ch! && f.x! === f.ah!
      : f.ah! * f.ah! === f.bh! * f.ch! &&
        f.ac! * f.ac! === f.ch! * (f.bh! + f.ch!) &&
        f.x! === f.ch! + f.ac!,
  // 그림자: (막대 높이):(막대 그림자) = (나무 높이):(나무 그림자) / 축척
  "도형의 닮음|14": (f) =>
    f.mode === 0
      ? f.poleH! * f.treeS! === f.poleS! * f.x!
      : 100 * f.x! === f.l! * f.n!,
  // 접은 직사각형: AE·CD = AB'·B'D 이고 종이라 CD = AE + √(AE²+AB'²)
  "도형의 닮음|15": (f) =>
    f.p! * f.cd! === f.q! * f.x! &&
    (f.cd! - f.p!) * (f.cd! - f.p!) === f.p! * f.p! + f.q! * f.q!,

  // 세 평행선: a·x = b·c (비례식을 곱셈꼴로)
  "평행선 사이의 선분의 길이의 비|08": (f) => f.a! * f.x! === f.b! * f.c!,
  // 사다리꼴 EF: EF·(m+n) = n·AD + m·BC
  "평행선 사이의 선분의 길이의 비|09": (f) =>
    f.x! * (f.m! + f.n!) === f.n! * f.p! + f.m! * f.q! && f.q! > f.p!,
  // 대각선 교점을 지나는 EF: 1/AD + 1/BC = 2/EF (조화평균)
  "평행선 사이의 선분의 길이의 비|10": (f) =>
    f.mode === 0
      ? 2 * f.p! * f.q! === f.x! * (f.p! + f.q!)
      : 2 * f.p! * f.x! === f.ef! * (f.p! + f.x!),
  // 나비꼴: 1/AB + 1/CD = 1/EF / 넓이는 ½·BC·EF
  "평행선 사이의 선분의 길이의 비|11": (f) =>
    f.mode === 0
      ? f.x! * (f.a! + f.b!) === f.a! * f.b!
      : 2 * f.x! * (f.a! + f.b!) === f.bcLen! * f.a! * f.b!,
};

/**
 * 답 문자열의 첫 수가 facts 의 이 값과 같아야 한다.
 * 문자열이면 그 키, 함수면 «모드마다 답이 다른 유형»의 계산이다
 * (예: 「x 를 구하시오」와 「둘레를 구하시오」가 한 유형 안에 있다).
 */
const ANSWER_KEY: Record<
  string,
  string | ((f: Record<string, number>) => number)
> = {
  "삼각형의 성질|01": "x",
  "삼각형의 성질|02": "sum",
  "삼각형의 성질|03": "x",
  "삼각형의 성질|04": "x",
  "삼각형의 성질|05": "x",
  "삼각형의 성질|09": "x",
  "삼각형의 성질|10": "s",
  "삼각형의 성질|11": "x",
  "여러 가지 사각형|13": "x",
  "여러 가지 사각형|14": "x",
  "여러 가지 사각형|15": "x",
  "여러 가지 사각형|16": "x",
  "도형의 닮음|02": "x",
  "도형의 닮음|03": "x",
  "도형의 닮음|04": "area",
  "도형의 닮음|05": "x",
  "도형의 닮음|06": "x",
  "도형의 닮음|07": "x",
  "도형의 닮음|08": "x",
  "평행선 사이의 선분의 길이의 비|01": "x",
  "평행선 사이의 선분의 길이의 비|02": "x",
  "평행선 사이의 선분의 길이의 비|03": "x",
  "평행선 사이의 선분의 길이의 비|04": "x",
  "평행선 사이의 선분의 길이의 비|05": "x",
  "평행선 사이의 선분의 길이의 비|06": "x",
  "평행선 사이의 선분의 길이의 비|07": "x",
  // ── 2B 물결 ────────────────────────────────────────────────────
  "삼각형의 성질|06": "x",
  "삼각형의 성질|07": "x",
  "삼각형의 성질|08": "x",
  "삼각형의 성질|12": "x",
  "여러 가지 사각형|01": "x",
  "여러 가지 사각형|02": (f) => (f.mode === 0 ? f.x! : f.len!),
  "여러 가지 사각형|03": "x",
  "여러 가지 사각형|04": (f) => (f.mode === 0 ? f.peri! : f.x!),
  "여러 가지 사각형|05": "x",
  "여러 가지 사각형|06": (f) => f.area!,
  "여러 가지 사각형|07": "x",
  "여러 가지 사각형|08": "x",
  "여러 가지 사각형|09": "x",
  "여러 가지 사각형|10": "x",
  "여러 가지 사각형|11": "x",
  "여러 가지 사각형|12": "x",
  "여러 가지 사각형|17": "x",
  "도형의 닮음|09": "x",
  "도형의 닮음|10": "x",
  "도형의 닮음|11": "x",
  "도형의 닮음|12": "x",
  "도형의 닮음|13": "x",
  "도형의 닮음|14": "x",
  "도형의 닮음|15": "x",
  "평행선 사이의 선분의 길이의 비|08": "x",
  "평행선 사이의 선분의 길이의 비|09": "x",
  "평행선 사이의 선분의 길이의 비|10": "x",
  "평행선 사이의 선분의 길이의 비|11": "x",
  // 닮음 01 은 답이 «대응변·대응각» 이라 수가 없다 — 아래에서 따로 검사한다.
};

/** 그림이 있어야 하는 유형. 나머지는 발문이 그림 없이 완결된다(모듈 주석). */
const FIGURE_KEYS = new Set([
  "삼각형의 성질|01",
  "삼각형의 성질|02",
  "삼각형의 성질|03",
  "삼각형의 성질|05",
  "삼각형의 성질|09",
  "삼각형의 성질|10",
  "삼각형의 성질|11",
  "여러 가지 사각형|13",
  "여러 가지 사각형|14",
  "여러 가지 사각형|15",
  "여러 가지 사각형|16",
  "도형의 닮음|02",
  "도형의 닮음|05",
  "평행선 사이의 선분의 길이의 비|01",
  "평행선 사이의 선분의 길이의 비|02",
  "평행선 사이의 선분의 길이의 비|03",
  "평행선 사이의 선분의 길이의 비|04",
  "평행선 사이의 선분의 길이의 비|05",
  "평행선 사이의 선분의 길이의 비|06",
  "평행선 사이의 선분의 길이의 비|07",
  // ── 2B 물결 — 마크 문법이 있어야 그려지는 것들 ─────────────────
  "삼각형의 성질|06",
  "삼각형의 성질|07",
  "삼각형의 성질|08",
  "삼각형의 성질|12",
  "여러 가지 사각형|01",
  "여러 가지 사각형|02",
  "여러 가지 사각형|03",
  "여러 가지 사각형|04",
  "여러 가지 사각형|05",
  "여러 가지 사각형|06",
  "여러 가지 사각형|07",
  "여러 가지 사각형|08",
  "여러 가지 사각형|09",
  "여러 가지 사각형|12",
  "여러 가지 사각형|17",
  "도형의 닮음|09",
  "도형의 닮음|10",
  "도형의 닮음|11",
  "도형의 닮음|12",
  "도형의 닮음|13",
  "도형의 닮음|15",
  "평행선 사이의 선분의 길이의 비|08",
  "평행선 사이의 선분의 길이의 비|09",
  "평행선 사이의 선분의 길이의 비|10",
  "평행선 사이의 선분의 길이의 비|11",
]);

/** 그림이 «있을 수도, 없을 수도» 있는 유형 — mode 가 가른다. */
const FIGURE_BY_MODE: Record<string, (f: Record<string, number>) => boolean> = {
  // 04 는 내각 이등분선 모드(0)만 그림. 외각 이등분선 모드(1)는 v2 로 못 그린다.
  "삼각형의 성질|04": (f) => f.mode === 0,
  // 닮음 14 는 그림자 모드(0)만 그림. 축척 모드(1)는 발문이 전부 말한다.
  "도형의 닮음|14": (f) => f.mode === 0,
  // 사각형 10·11 은 보기 나열 문항이라 그림이 없다.
  "여러 가지 사각형|10": () => false,
  "여러 가지 사각형|11": () => false,
};

function vkey(e: { rpmMinor: string; rpmType: string }): string {
  return `${e.rpmMinor}|${e.rpmType}`;
}

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

/** 스펙 JSON 안의 모든 수가 유한한지 — NaN 이 조용히 새는 것을 막는다. */
function everyNumberFinite(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(everyNumberFinite);
  if (v !== null && typeof v === "object") {
    return Object.values(v).every(everyNumberFinite);
  }
  return true;
}

/** 스펙의 labels 에서 «숫자 라벨»만 뽑는다 (`12 cm` → 12). */
function numericLabels(spec: Record<string, unknown>): number[] {
  // ⚠️ 라벨 값은 문자열일 수도, `{text, italic}` 객체일 수도 있다(엔진 스키마).
  //    객체에 `.trim()` 을 부르면 여기서 터진다 — 문자열만 본다.
  const labels = (spec.labels ?? {}) as Record<string, unknown>;
  const out: number[] = [];
  for (const value of Object.values(labels)) {
    const text =
      typeof value === "string"
        ? value
        : typeof (value as { text?: unknown })?.text === "string"
          ? (value as { text: string }).text
          : null;
    if (text === null) continue;
    const m = /^(\d+(?:\.\d+)?)(?:\s*(?:cm|m|°))?$/.exec(text.trim());
    if (m) out.push(Number(m[1]));
  }
  return out;
}

describe("중2 기하 55유형 (RPM 2-2)", () => {
  it("🔴 **「등변사다리꼴, 여러 가지 사각형」이 8문항 일일테스트를 채운다**", () => {
    const trap = M2_GEO_QUAD.filter(
      (e) => e.unitSection === "등변사다리꼴, 여러 가지 사각형",
    );
    expect(
      trap.length,
      "유형이 8 미만이면 8문항 일일테스트를 못 채운다",
    ).toBeGreaterThanOrEqual(8);
    expect(new Set(trap.map((e) => e.key)).size).toBe(trap.length);
  });

  it("확장 유형은 색인 번호대를 **넘는다** — 번호대 안이면 오타이지 확장이 아니다", () => {
    for (const e of GEO_EXTENSIONS) {
      const maxNo = catalogMaxNumber(e.rpmBook, e.rpmMinor);
      expect(
        maxNo,
        `${e.key}: 색인에 없는 중단원 ${JSON.stringify(e.rpmMinor)}`,
      ).not.toBeNull();
      expect(
        Number(e.rpmType),
        `${e.key}: 색인 번호대(최대 ${maxNo}) 안이다 — 확장이 아니라 오타로 보인다`,
      ).toBeGreaterThan(maxNo!);
    }
  });

  it("네 중단원의 계획된 번호가 전부 등록돼 있다", () => {
    const byMinor = new Map<string, string[]>();
    for (const e of GEO) {
      byMinor.set(e.rpmMinor, [...(byMinor.get(e.rpmMinor) ?? []), e.rpmType]);
    }
    // 2B 물결로 네 중단원이 **빠짐없이** 등록됐다 — RPM 색인의 번호 전량.
    const seq = (n: number): string[] =>
      Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, "0"));
    expect(GEO.length).toBe(55);
    expect(byMinor.get("삼각형의 성질")!.sort()).toEqual(seq(12));
    expect(byMinor.get("여러 가지 사각형")!.sort()).toEqual(seq(17));
    expect(byMinor.get("도형의 닮음")!.sort()).toEqual(seq(15));
    expect(byMinor.get("평행선 사이의 선분의 길이의 비")!.sort()).toEqual(
      seq(11),
    );
  });

  it("2B 대기였던 유형이 이제 전부 등록돼 있다 (마크 문법 병합 후)", () => {
    // 2A 세션이 «직각 기호·같음 tick·평행 표시가 없어 못 그린다»며 남긴 목록.
    // 2B 에서 그 문법이 들어왔으므로 **하나도 빠짐없이** 등록돼야 한다.
    const wasWaiting = [
      "삼각형의 성질|06",
      "삼각형의 성질|07",
      "삼각형의 성질|08",
      "삼각형의 성질|12",
      "여러 가지 사각형|01",
      "여러 가지 사각형|09",
      "여러 가지 사각형|17",
      "도형의 닮음|09",
      "도형의 닮음|12",
      "도형의 닮음|15",
      "평행선 사이의 선분의 길이의 비|08",
      "평행선 사이의 선분의 길이의 비|09",
      "평행선 사이의 선분의 길이의 비|11",
    ];
    const registered = new Set(GEO.map(vkey));
    for (const k of wasWaiting) {
      expect(registered.has(k), `${k} 가 아직 없다`).toBe(true);
    }
  });

  it("우리 단원 이름은 DB 실측 리터럴과 일치한다 (공유 DB 2026-08-23)", () => {
    const count = new Map<string, number>();
    for (const e of GEO) {
      count.set(e.unitSection, (count.get(e.unitSection) ?? 0) + 1);
    }
    expect(count).toEqual(
      new Map([
        ["이등변삼각형의 성질", 7],
        ["직각삼각형의 합동", 5],
        ["평행선과 삼각형의 넓이", 4],
        ["닮은 도형", 4],
        ["닮은 도형의 넓이의 비와 부피의 비", 4],
        ["삼각형에서 평행선 사이의 선분의 길이의 비", 5],
        ["삼각형의 각의 이등분선", 2],
        ["직사각형, 마름모, 정사각형", 6],
        ["등변사다리꼴, 여러 가지 사각형", 7],
        ["삼각형의 닮음 조건", 7],
        ["평행선 사이의 선분의 길이의 비", 4],
      ]),
    );
  });

  it("RPM 색인의 실제 제목을 쓴다 (지어낸 제목 금지 — 표본 대조)", () => {
    const byKey = new Map(GEO.map((e) => [vkey(e), e.rpmTitle]));
    // scripts/rpm/rpm-type-catalog.json 2-2 색인 그대로.
    expect(byKey.get("삼각형의 성질|01")).toBe("이등변삼각형의 성질 ⑴");
    expect(byKey.get("삼각형의 성질|03")).toBe(
      "이등변삼각형의 성질의 응용 이웃한 이등변삼각형",
    );
    expect(byKey.get("삼각형의 성질|11")).toBe(
      "합동인 삼각형을 찾아 각의 크기 구하기",
    );
    expect(byKey.get("여러 가지 사각형|16")).toBe(
      "사다리꼴에서 높이가 같은 두 삼각형의 넓이",
    );
    expect(byKey.get("도형의 닮음|08")).toBe(
      "닮은 두 입체도형의 겉넓이의 비와 부피의 비의 활용",
    );
    expect(byKey.get("평행선 사이의 선분의 길이의 비|01")).toBe(
      "삼각형에서 평행선 사이의 선분의 길이의 비⑴",
    );
    expect(byKey.get("평행선 사이의 선분의 길이의 비|07")).toBe(
      "삼각형의 외각의 이등분선의 성질",
    );
    // 2B 물결 몫
    expect(byKey.get("삼각형의 성질|06")).toBe("직각삼각형의 합동 조건");
    expect(byKey.get("삼각형의 성질|12")).toBe("폭이 일정한 종이접기");
    expect(byKey.get("여러 가지 사각형|03")).toBe("마름모의 뜻과 성질");
    expect(byKey.get("여러 가지 사각형|12")).toBe(
      "사각형의 각 변의 중점을 연결하여 만든 사각형",
    );
    expect(byKey.get("여러 가지 사각형|17")).toBe("여러 가지 사각형의 판별 ⑵");
    expect(byKey.get("도형의 닮음|13")).toBe("직각삼각형의 닮음의 응용");
    expect(byKey.get("도형의 닮음|15")).toBe("접은 도형에서의 닮은 삼각형");
    expect(byKey.get("평행선 사이의 선분의 길이의 비|10")).toBe(
      "사다리꼴에서 평행선 사이의 선분의 길이의 비의 응용",
    );
  });

  it("명제·성질 표는 모듈과 테스트가 **따로 들고** 같은 값이어야 한다", () => {
    // 한쪽만 고치면 여기서 드러난다(2026-08-23: 표를 두 벌 두는 것이 목적).
    expect(QUAD10_CLAIMS.length).toBe(QUAD10_TRUTH.length);
    QUAD10_CLAIMS.forEach(([text, ok], i) => {
      expect(ok, `명제 ${i}: ${text}`).toBe(QUAD10_TRUTH[i]);
    });
    expect(QUAD11_SHAPES.length).toBe(QUAD11_TRUTH.length);
    QUAD11_SHAPES.forEach(([name, eq, perp, bisect], i) => {
      expect([eq, perp, bisect], `사각형 ${name}`).toEqual(QUAD11_TRUTH[i]);
    });
    // 11 유형의 c 는 «길이가 같고 + 수직이고 + 이등분»인데, 이 표에서는 앞 둘이면
    // 셋째가 따라온다 — 그래서 셋째 항을 지워도 답이 안 변한다(변이 시험이
    // 「산출물이 안 바뀐다」로 알려 줬다). 그 함의를 여기서 못 박는다: 표에
    // 새 사각형을 넣어 이 관계가 깨지면 **이 검사가 먼저 빨개진다.**
    QUAD11_SHAPES.forEach(([name, eq, perp, bisect]) => {
      if (eq && perp) {
        expect(bisect, `${name}: 같고 수직인데 이등분이 아니다`).toBe(true);
      }
    });
  });

  for (const e of GEO) {
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260823)).toEqual(
          generateMiddleProblem(e.key, 20260823),
        );
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[vkey(e)];
        expect(verify, `검산식 누락: ${vkey(e)}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}`,
          ).toBe(true);
        }
      });

      it("답의 수가 facts 와 일치한다", () => {
        const key = ANSWER_KEY[vkey(e)];
        if (key === undefined) return; // 닮음 01 — 아래 전용 검사
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const want = typeof key === "string" ? p.facts[key] : key(p.facts);
          expect(
            firstNumber(p.answer),
            `${p.answer} vs ${JSON.stringify(p.facts)}`,
          ).toBe(want);
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

      it("그림: 있어야 하는 유형에만 있고, 스펙의 수는 전부 유한하다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const byMode = FIGURE_BY_MODE[vkey(e)];
          const want = byMode ? byMode(p.facts) : FIGURE_KEYS.has(vkey(e));
          if (want) {
            expect(p.figureSpec, `${vkey(e)} 그림 누락`).toBeTruthy();
            const spec = p.figureSpec as Record<string, unknown>;
            expect(spec.version).toBe(2);
            expect(everyNumberFinite(spec), "스펙에 NaN/무한대").toBe(true);
            expect(
              Object.keys(spec.segments as Record<string, unknown>).length,
              "선분이 없는 도형",
            ).toBeGreaterThan(0);
          } else {
            expect(
              p.figureSpec ?? null,
              `${vkey(e)} seed ${seed} 는 그림이 없어야 한다`,
            ).toBe(null);
          }
        }
      });

      it("그림의 숫자 라벨은 전부 facts 에 있는 값이다 (그림 따로 발문 따로 금지)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          if (!p.figureSpec) continue;
          const spec = p.figureSpec as Record<string, unknown>;
          const values = new Set(Object.values(p.facts));
          for (const n of numericLabels(spec)) {
            expect(
              values.has(n),
              `${vkey(e)} seed ${seed}: 그림 라벨 ${n} 이 facts 에 없다 (${JSON.stringify(p.facts)})`,
            ).toBe(true);
          }
        }
      });
    });
  }

  it("닮음 01 의 답은 색인표가 가리키는 대응변·대응각이다", () => {
    const e = GEO.find((x) => vkey(x) === "도형의 닮음|01")!;
    const lhs = ["A", "B", "C"] as const;
    const sidePairs = [
      [0, 1],
      [1, 2],
      [2, 0],
    ] as const;
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(e.key, seed);
      const rhs = SIM01_PERMS[p.facts.perm!]!;
      const [i1, i2] = sidePairs[p.facts.si!]!;
      // 발문이 묻는 것 · 답이 말하는 것을 테스트가 다시 만든다.
      expect(p.content).toContain(`\\triangle ${rhs.join("")}`);
      expect(p.content).toContain(`\\overline{${lhs[i1]}${lhs[i2]}}`);
      expect(p.content).toContain(`\\angle ${lhs[p.facts.ai!]}`);
      expect(p.answer).toBe(
        `$\\overline{${rhs[i1]}${rhs[i2]}}$, $\\angle ${rhs[p.facts.ai!]}$`,
      );
    }
  });

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of GEO) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  it("변형 공간이 모자라면 조용히 넘기지 않고 던진다", () => {
    // 닮음 01 은 유한 조합(6×3×3=54) — 그보다 큰 요구는 던져야 한다.
    const e = GEO.find((x) => vkey(x) === "도형의 닮음|01")!;
    expect(() => generateMiddleSet(e.key, 1, 200)).toThrow(/변형 공간/);
  });
});

describe("등변사다리꼴 확장 28 — 사다리꼴이 등변사다리꼴이 되는 조건", () => {
  const KEY = "2-2|여러 가지 사각형|28";

  it("같은 씨앗이면 같은 문항", () => {
    expect(generateMiddleProblem(KEY, 20260823)).toEqual(
      generateMiddleProblem(KEY, 20260823),
    );
  });

  it("씨앗별 독립 검산 — 두 각 또는 두 대각선이 x 에서 같아진다", () => {
    const verify = VERIFY["여러 가지 사각형|28"];
    expect(verify).toBeDefined();
    for (const seed of SEEDS) {
      for (let v = 0; v < 8; v += 1) {
        const p = generateMiddleProblem(KEY, seed, v);
        expect(
          verify!(p.facts),
          `seed ${seed} v${v} 검산 실패: ${JSON.stringify(p.facts)}`,
        ).toBe(true);
      }
    }
  });

  it("답의 수가 facts 와 일치한다", () => {
    for (const seed of SEEDS) {
      for (let v = 0; v < 8; v += 1) {
        const p = generateMiddleProblem(KEY, seed, v);
        const want = p.facts.mode === 0 ? p.facts.x : p.facts.len;
        expect(firstNumber(p.answer), p.answer).toBe(want);
      }
    }
  });

  it("숫자가 KaTeX 밖에 없다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(KEY, seed);
      expect(bareNumbers(p.content)).toEqual([]);
      expect(bareNumbers(p.answer)).toEqual([]);
      expect(bareNumbers(p.solution)).toEqual([]);
    }
  });

  it("그림이 있고 스펙의 수는 유한하다 — 다리 tick 으로 답을 말하지 않는다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(KEY, seed);
      expect(p.figureSpec, "그림 누락").toBeTruthy();
      const spec = p.figureSpec as Record<string, unknown>;
      expect(spec.version).toBe(2);
      expect(everyNumberFinite(spec)).toBe(true);
      const segs = spec.segments as Record<string, unknown>;
      for (const seg of Object.values(segs)) {
        if (seg && typeof seg === "object" && "ticks" in seg) {
          throw new Error("다리 tick 이 있으면 그림이 등변을 말해 버린다");
        }
      }
    }
  });
});
