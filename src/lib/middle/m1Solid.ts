/**
 * 중1 물결 5E — RPM 1-2 **다면체와 회전체 20유형** + **입체도형의 겉넓이와 부피
 * 남은 15유형(05~17·19·20)**.
 *
 * ## 이 파일이 «남은 번호»만 내는 이유
 * 「입체도형의 겉넓이와 부피」는 26유형 중 **11이 이미 등록돼 있었다** —
 * 01~04 는 `m1Book2.ts`(기둥), 18 은 `m1Real.ts`(원뿔 그릇), 21~26 은 `m1Stat.ts`(구).
 * 그래서 여기는 **05~17·19·20 만** 낸다. 겹치면 `generate.ts` 의 key 검사가 던진다.
 * 착수 전에 `npx tsx scripts/middle/type-census.ts` 로 «남은:» 을 실제로 셌다.
 *
 * ## 검산이 «다른 식»이 되게 한 방법 (물결 계약 2)
 * 다면체 계열의 생성기는 **표**(`facesOf`·`edgesOf`·`vertsOf` = $n+2$·$3n$·$2n$ …)로
 * 센다. 시험은 그 표를 옮겨 적지 않고 **꼭짓점의 차수와 오일러 공식**에서 다시 만든다 —
 * 각기둥·각뿔대는 모든 꼭짓점의 차수가 $3$ 이므로 $2e=3v$, 각뿔은 꼭대기 차수 $n$ ·
 * 밑면 차수 $3$ 이므로 $2e=4(v-1)$, 그리고 $f=2-v+e$. 정다면체는 아예 **목록이 없다** —
 * 시험이 $\dfrac1p+\dfrac1q>\dfrac12$ 인 $(p,q)$ 를 훑어 다섯을 **만들어 낸다**.
 * 겉넓이·부피 계열은 `facts` 에 치수를 낱개로 싣고, 시험이 **다른 경로**로 다시 잰다
 * (원뿔의 부피는 같은 밑면·높이의 원기둥 부피의 $\dfrac13$ 인가, 각기둥의 겉넓이는
 * 전개도의 넓이인가 …).
 *
 * ## 그림 — 엔진에 아무것도 안 더했다. 왜 그런지 적어 둔다
 * 브리프가 지목한 구멍은 `octahedron`(정팔면체 겨냥도)이었다. **RPM 원본을 렌더해
 * 보고 안 만들기로 했다** — 정다면체 유형 08·09·10 의 지면(p107·p108)은 표와 보기뿐이고
 * 겨냥도가 **한 장도 없다**. 11(전개도)·12(단면)·20(쌍대)도 지면에는 그림이 있지만
 * 그림 없이 성립하는 발문이 원본에 실제로 있다(0730 「단면의 모양이 될 수 없는 것」,
 * 0757·0758 쌍대, 0724 를 뒤집은 「전개도가 정삼각형 여덟 장」). 안 쓰는 kind 는 빚이다.
 *
 * 대신 **이미 있는 kind 만** 쓴다. 붙인 자리와 근거:
 *
 * | 유형 | kind | 왜 붙였나 |
 * |---|---|---|
 * | 회전체 14·16 · 겉넓이 09·20 | `revolvePlan` | 「무엇을 무엇을 축으로」가 이 유형의 전부다 |
 * | 회전체 17 · 겉넓이 05 | `netCylinder`·`prism{net}`·`netCuboid` | 전개도 유형은 펼친 그림이 발문이다 |
 * | 겉넓이 07 | `hollowSolid` | 이 유형(RPM 07)을 위해 만든 kind다 |
 * | 겉넓이 08 | `cutCuboid` | 이 유형(RPM 08)을 위해 만든 kind다 |
 * | 겉넓이 10·13 | `pyramid` | 치수를 안 그리므로 발문과 이중표기가 안 난다 |
 * | 겉넓이 14·19 | `cone`·`netCone` | `cone` 은 $(r,h)$ 를 그대로 받는다 |
 *
 * ⚠️ **`cone` 을 「모선이 주어진」 갈래(11·20)에 붙이지 않았다.** `cone` 은 $(r,h)$ 만
 * 받는데 그 유형이 주는 것은 $(r,l)$ 이라, $h=\sqrt{l^2-r^2}$ 를 우리가 지어내면
 * 그림이 발문과 다른 입체를 그린다. 20 은 세 변이 다 정수인 직각삼각형이라
 * `revolvePlan` 으로 **회전 전 도형**을 그린다(그게 발문이 말하는 것이기도 하다).
 * ⚠️ **`pyramid {sides:3}` 을 정사면체로 쓰지 않았다** — 높이를 우리가 정하므로
 * 모서리가 다 같다는 보장이 없다(09 지침 §8.1).
 *
 * ## 지면에 치수를 적는 kind 는 발문이 그 수를 되풀이하지 않는다 (09 §4-20-b)
 * `hollowSolid`·`cutCuboid`·`netCuboid`·`netCone` 은 **엔진이 치수를 쓴다**. 그 자리는
 * 원본과 같이 「오른쪽 그림과 같이 …」로 두고 수를 발문에 안 적는다. 반대로
 * `prism`·`pyramid`·`cone`·`netCylinder`·`revolvePlan`(라벨 없음)은 한 글자도 안 적으므로
 * **발문이 치수를 다 말한다.** 시험이 `facts` ↔ `figureSpec` 을 전량 대조한다.
 *
 * ## 생성 규칙 (본보기 `m1Stat.ts` 와 같은 계약)
 * 1. **정답을 먼저 정하고 발문을 만든다.** 겉넓이·부피는 늘 정수(또는 정수$\pi$)다.
 * 2. `facts` 에 발문의 원 수치를 낱개로 남긴다 — 시험이 **다른 관계식**으로 다시 유도한다.
 * 3. 수는 전부 `$...$` 안에 (`bareNumbers` 가드).
 * 4. 조건이 안 맞으면 `attempt()` 재시도, 소진되면 **던진다**.
 * 5. $\pi$ 는 **기호로 남긴다**(중1). $\dfrac{4}{3}\pi$ 를 대분수로 쓰지 않는다(D-73).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt, def } from "./m1Stat";
import type { Body } from "./m1Stat";
import type { TypeEntry } from "./types";

const MINOR_POLY = "다면체와 회전체";
const MINOR_AREA = "입체도형의 겉넓이와 부피";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측 2026-08-24) */
const SEC = {
  다면체: "다면체",
  정다면체: "정다면체",
  회전체: "회전체",
  기둥: "기둥의 겉넓이와 부피",
  뿔: "뿔의 겉넓이와 부피",
} as const;

// ═══════════════════════════════════════════════════════════════════
//  소품 — 다면체의 이름과 개수
//
//  ⚠️ 아래 세 함수는 **생성기 쪽 표**다. 시험은 이 표를 부르지 않고
//  꼭짓점의 차수 + 오일러 공식에서 따로 만든다(파일 머리 참조).
// ═══════════════════════════════════════════════════════════════════

/** 한글 수사 — 「$8$각기둥」이 아니라 「팔각기둥」(elementary/rules `arabicPolygons`). */
export function koNum(n: number): string {
  const ones = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const tens = ["", "십", "이십", "삼십"];
  if (n < 10) return ones[n]!;
  return `${tens[Math.floor(n / 10)]!}${ones[n % 10]!}`;
}

/** 0 각기둥 · 1 각뿔 · 2 각뿔대 */
const FAM = ["기둥", "뿔", "뿔대"] as const;

export function solidName(n: number, fam: number): string {
  return `${koNum(n)}각${FAM[fam]!}`;
}

function facesOf(n: number, fam: number): number {
  return fam === 1 ? n + 1 : n + 2;
}
function edgesOf(n: number, fam: number): number {
  return fam === 1 ? 2 * n : 3 * n;
}
function vertsOf(n: number, fam: number): number {
  return fam === 1 ? n + 1 : 2 * n;
}

/** 0 면 · 1 모서리 · 2 꼭짓점 */
const COUNT_KO = ["면", "모서리", "꼭짓점"] as const;

function countOf(n: number, fam: number, q: number): number {
  return q === 0
    ? facesOf(n, fam)
    : q === 1
      ? edgesOf(n, fam)
      : vertsOf(n, fam);
}

/** 옆면의 모양 — 각기둥 직사각형 · 각뿔 삼각형 · 각뿔대 사다리꼴 */
const SIDE_SHAPE = ["직사각형", "삼각형", "사다리꼴"] as const;

/**
 * 정다면체 다섯. `p` 는 면의 변의 개수, `q` 는 한 꼭짓점에 모인 면의 개수.
 * 시험은 이 표를 **안 쓴다** — $(p,q)$ 조건에서 다시 만든다.
 */
type Plato = {
  name: string;
  face: string;
  f: number;
  e: number;
  v: number;
  p: number;
  q: number;
};

const PLATO: readonly Plato[] = [
  { name: "정사면체", face: "정삼각형", f: 4, e: 6, v: 4, p: 3, q: 3 },
  { name: "정육면체", face: "정사각형", f: 6, e: 12, v: 8, p: 4, q: 3 },
  { name: "정팔면체", face: "정삼각형", f: 8, e: 12, v: 6, p: 3, q: 4 },
  { name: "정십이면체", face: "정오각형", f: 12, e: 30, v: 20, p: 5, q: 3 },
  { name: "정이십면체", face: "정삼각형", f: 20, e: 30, v: 12, p: 3, q: 5 },
] as const;

function platoByFaces(f: number): Plato {
  const hit = PLATO.find((s) => s.f === f);
  if (!hit) throw new Error(`정다면체가 아닌 면의 개수: ${f}`);
  return hit;
}

function platoCount(s: Plato, q: number): number {
  return q === 0 ? s.f : q === 1 ? s.e : s.v;
}

/** 보기 기호 — 발문에 ㄱ·ㄴ·… 으로 늘어놓는다. */
const BOGI = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ"] as const;

/**
 * 서로 다른 색인 `count` 개 (오름차순).
 * ⚠️ 「중복이면 다시 뽑기」로 하면 앞쪽 색인이 편중된다(m2GeoQuad 실측) — 섞어서 자른다.
 */
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

/** 계수 $1$ 은 안 쓴다 — `1\pi` 가 아니라 `\pi`. */
function piTerm(k: number): string {
  return k === 1 ? "\\pi" : `${k}\\pi`;
}

/**
 * 보조사 「은/는」 — 「원뿔대은(는)」이 지면에 나가지 않게.
 * `m1Stat` 의 `obj`(을/를)·`subj`(이/가) 와 같은 판단이지만 조사가 달라 여기 하나 더 둔다.
 * 도형 이름은 전부 한글 음절로 끝난다 — 숫자 뒤 조사는 `m2Josa` 가 따로 본다.
 */
function topic(word: string): string {
  const ch = word.charCodeAt(word.length - 1);
  const hasFinal = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
  return `${word}${hasFinal ? "은" : "는"}`;
}

// ═══════════════════════════════════════════════════════════════════
//  다면체와 회전체 — RPM 1-2 「다면체와 회전체」 01~20
// ═══════════════════════════════════════════════════════════════════

/** 01·05 의 보기 풀. 시험은 이름을 **파싱해** 스스로 갈라낸다(규칙은 시험 쪽에). */
const POLY_POOL: readonly string[] = [
  "삼각기둥",
  "사각기둥",
  "오각기둥",
  "육각기둥",
  "팔각기둥",
  "삼각뿔",
  "사각뿔",
  "오각뿔",
  "칠각뿔",
  "구각뿔",
  "삼각뿔대",
  "사각뿔대",
  "오각뿔대",
  "육각뿔대",
] as const;

const ROUND_POOL: readonly string[] = [
  "원기둥",
  "원뿔",
  "구",
  "반구",
  "원뿔대",
] as const;

/** 12 의 보기 풀 — 정육면체의 단면이 될 수 «있는» 것. */
const CUT_OK: readonly string[] = [
  "정삼각형",
  "이등변삼각형",
  "직사각형",
  "정사각형",
  "마름모",
  "평행사변형",
  "사다리꼴",
  "오각형",
  "육각형",
  "정육각형",
] as const;

/**
 * 12 의 보기 풀 — 될 수 «없는» 것. 근거는 셋뿐이고 시험이 그 근거를 따로 적는다.
 *  · 면이 여섯뿐이라 단면의 변은 최대 여섯 → 칠각형·팔각형 불가
 *  · 세 면을 지나는 단면은 한 꼭짓점 둘레를 자르므로 세 각이 모두 예각 → 직각·둔각삼각형 불가
 *  · 마주 보는 면이 평행이라 오각형 단면의 다섯 변이 다 같을 수 없다 → 정오각형 불가
 *  · 다면체를 평면으로 자른 단면은 다각형 → 원 불가
 */
const CUT_NO: readonly string[] = [
  "직각삼각형",
  "둔각삼각형",
  "칠각형",
  "팔각형",
  "정오각형",
  "원",
] as const;

/** 15 — 회전축을 포함하는 평면으로 자른 단면. */
const AXIAL_SECTION: readonly (readonly [string, string])[] = [
  ["원기둥", "직사각형"],
  ["원뿔", "이등변삼각형"],
  ["원뿔대", "사다리꼴"],
  ["구", "원"],
  ["반구", "반원"],
] as const;

/** 15 의 «틀린 짝» 후보 — 위 표의 다른 칸에서 가져온다(엉뚱한 말은 안 쓴다). */
const SECTION_WRONG: readonly string[] = [
  "직사각형",
  "이등변삼각형",
  "사다리꼴",
  "원",
  "반원",
  "평행사변형",
] as const;

/**
 * 18 — 회전체에 대한 참·거짓. 시험이 **자기 표**로 다시 매긴다(정직하게 적자면
 * 이 부류는 계산이 아니라 사실이라 두 표가 결국 같은 것을 말한다 — 그래서
 * 이 유형의 시험은 「참인 문장과 거짓인 문장이 둘 다 실제로 나오는가」까지 본다).
 */
const REV_CLAIMS: readonly (readonly [string, boolean])[] = [
  ["구의 회전축은 무수히 많다.", true],
  ["회전체를 회전축에 수직인 평면으로 자른 단면은 항상 원이다.", true],
  ["회전체를 회전축을 포함하는 평면으로 자른 단면은 선대칭도형이다.", true],
  ["구는 전개도를 그릴 수 없다.", true],
  ["원기둥의 회전축과 모선은 서로 평행하다.", true],
  ["원뿔대를 회전축을 포함하는 평면으로 자른 단면은 사다리꼴이다.", true],
  ["원뿔을 회전축에 수직인 평면으로 자른 단면은 모두 합동이다.", false],
  ["모든 회전체의 회전축은 한 개뿐이다.", false],
  ["회전체를 회전축을 포함하는 평면으로 자른 단면은 모두 합동이다.", false],
  ["원뿔을 회전축을 포함하는 평면으로 자른 단면은 정삼각형이다.", false],
  ["모든 회전체는 전개도를 그릴 수 있다.", false],
] as const;

export const M1_POLY: TypeEntry[] = [
  def(MINOR_POLY, "01", "다면체", SEC.다면체, "easy", (rng) =>
    attempt(60, (): Body | null => {
      const k = intBetween(rng, 3, 4);
      const m = intBetween(rng, 2, 3);
      const poly = distinctIndices(rng, POLY_POOL.length, k).map(
        (i) => POLY_POOL[i]!,
      );
      const round = distinctIndices(rng, ROUND_POOL.length, m).map(
        (i) => ROUND_POOL[i]!,
      );
      const items = [...poly, ...round];
      // 자리를 섞는다 — 다면체가 늘 앞에 서면 세지 않고도 답이 보인다.
      for (let i = items.length - 1; i > 0; i -= 1) {
        const j = intBetween(rng, 0, i);
        const t = items[i]!;
        items[i] = items[j]!;
        items[j] = t;
      }
      return {
        content: `다음 입체도형 중 다면체는 모두 몇 개인지 구하시오.\n\n${items.join(", ")}`,
        answer: `$${k}$개`,
        solution: `다면체는 다각형인 면으로만 둘러싸인 입체도형이다.\n${topic(round.join(", "))} 곡면으로 둘러싸여 있으므로 다면체가 아니다.\n따라서 다면체는 ${poly.join(", ")}의 $${k}$개이다.`,
        facts: { k, m, ans: k },
      };
    }),
  ),

  def(MINOR_POLY, "02", "다면체의 면의 개수", SEC.다면체, "easy", (rng) =>
    attempt(80, (): Body | null => {
      const branch = pick(rng, [0, 1, 2] as const);
      if (branch === 0) {
        const fam = pick(rng, [0, 1, 2] as const);
        const n = intBetween(rng, 5, 12);
        const f = facesOf(n, fam);
        return {
          content: `${solidName(n, fam)}는 몇 면체인지 구하시오.`,
          answer: `$${f}$면체`,
          solution: `${solidName(n, fam)}의 옆면은 $${n}$개이고 밑면은 $${fam === 1 ? 1 : 2}$개이므로 면의 개수는 $${n}+${fam === 1 ? 1 : 2}=${f}$이다.\n따라서 $${f}$면체이다.`,
          facts: { branch, n, fam, f, ans: f },
        };
      }
      if (branch === 1) {
        const picks = [0, 1, 2].map((i) => ({
          fam: i,
          n: intBetween(rng, 4, 11),
        }));
        const each = picks.map((s) => facesOf(s.n, s.fam));
        const total = each.reduce((a, b) => a + b, 0);
        return {
          content: `다음 다면체의 면의 개수의 합을 구하시오.\n\n${picks.map((s) => solidName(s.n, s.fam)).join(", ")}`,
          answer: `$${total}$`,
          solution: `${picks.map((s, i) => `${solidName(s.n, s.fam)}의 면의 개수는 $${each[i]!}$`).join(", ")}이다.\n따라서 합은 $${each.join("+")}=${total}$이다.`,
          facts: {
            branch,
            n0: picks[0]!.n,
            n1: picks[1]!.n,
            n2: picks[2]!.n,
            total,
            ans: total,
          },
        };
      }
      const fam = pick(rng, [0, 1, 2] as const);
      const n = intBetween(rng, 5, 12);
      const f = facesOf(n, fam);
      return {
        content: `면의 개수가 $${f}$인 ${`각${FAM[fam]!}`}의 밑면은 몇 각형인지, 그 변의 개수를 구하시오.`,
        answer: `$${n}$`,
        solution: `밑면을 $n$각형이라 하면 면의 개수는 $${fam === 1 ? "n+1" : "n+2"}$이므로 $${fam === 1 ? `n+1=${f}` : `n+2=${f}`}$에서 $n=${n}$이다.\n따라서 밑면은 ${koNum(n)}각형이고 변의 개수는 $${n}$이다.`,
        facts: { branch, n, fam, f, ans: n },
      };
    }),
  ),

  def(
    MINOR_POLY,
    "03",
    "다면체의 모서리 꼭짓점의 개수",
    SEC.다면체,
    "easy",
    (rng) =>
      attempt(80, (): Body | null => {
        const fa = pick(rng, [0, 1, 2] as const);
        const fb = pick(rng, [0, 1, 2] as const);
        const na = intBetween(rng, 4, 11);
        const nb = intBetween(rng, 4, 11);
        const qa = pick(rng, [1, 2] as const);
        const qb = pick(rng, [1, 2] as const);
        if (fa === fb && na === nb && qa === qb) return null;
        const a = countOf(na, fa, qa);
        const b = countOf(nb, fb, qb);
        const total = a + b;
        return {
          content: `${solidName(na, fa)}의 ${COUNT_KO[qa]!}의 개수를 $a$, ${solidName(nb, fb)}의 ${COUNT_KO[qb]!}의 개수를 $b$라 할 때, $a+b$의 값을 구하시오.`,
          answer: `$${total}$`,
          solution: `${solidName(na, fa)}의 ${COUNT_KO[qa]!}의 개수는 $${a}$이므로 $a=${a}$이다.\n${solidName(nb, fb)}의 ${COUNT_KO[qb]!}의 개수는 $${b}$이므로 $b=${b}$이다.\n따라서 $a+b=${a}+${b}=${total}$이다.`,
          facts: { na, fa, qa, nb, fb, qb, a, b, ans: total },
        };
      }),
  ),

  def(
    MINOR_POLY,
    "04",
    "다면체의 면 모서리 꼭짓점의 개수의 활용",
    SEC.다면체,
    "mid",
    (rng) =>
      attempt(80, (): Body | null => {
        const fam = pick(rng, [0, 1, 2] as const);
        const n = intBetween(rng, 5, 12);
        // 주어지는 개수는 $n$ 을 혼자 결정해야 한다 — 셋 다 그렇다.
        const given = fam === 1 ? 0 : pick(rng, [0, 1, 2] as const);
        const g = countOf(n, fam, given);
        const rest = [0, 1, 2].filter((q) => q !== given);
        const x = countOf(n, fam, rest[0]!);
        const y = countOf(n, fam, rest[1]!);
        const nEq =
          given === 0
            ? fam === 1
              ? "n+1"
              : "n+2"
            : given === 1
              ? fam === 1
                ? "2n"
                : "3n"
              : fam === 1
                ? "n+1"
                : "2n";
        // 각뿔은 면의 개수와 꼭짓점의 개수가 **같다**. 그 둘을 더하게 하면 문항이
        // 아니므로(RPM 0699 도 각뿔에서는 뺀다) 각뿔만 $x-y$ 를 묻는다.
        if (fam === 1) {
          const a = countOf(n, fam, 1); // 모서리 $2n$
          const b = countOf(n, fam, 2); // 꼭짓점 $n+1$
          const diff = a - b;
          return {
            content: `면의 개수가 $${g}$인 각뿔의 모서리의 개수를 $a$, 꼭짓점의 개수를 $b$라 할 때, $a-b$의 값을 구하시오.`,
            answer: `$${diff}$`,
            solution: `밑면을 $n$각형이라 하면 각뿔의 면의 개수는 $n+1$이므로 $n+1=${g}$에서 $n=${n}$이다.\n따라서 $a=2\\times${n}=${a}$, $b=${n}+1=${b}$이므로 $a-b=${a}-${b}=${diff}$이다.`,
            facts: { fam, n, given, g, x: a, y: b, ans: diff },
          };
        }
        const total = x + y;
        return {
          content: `${COUNT_KO[given]!}의 개수가 $${g}$인 ${`각${FAM[fam]!}`}의 ${COUNT_KO[rest[0]!]!}의 개수를 $x$, ${COUNT_KO[rest[1]!]!}의 개수를 $y$라 할 때, $x+y$의 값을 구하시오.`,
          answer: `$${total}$`,
          solution: `밑면을 $n$각형이라 하면 ${`각${FAM[fam]!}`}의 ${COUNT_KO[given]!}의 개수는 $${nEq}$이므로 $n=${n}$, 즉 ${solidName(n, fam)}이다.\n따라서 $x=${x}$, $y=${y}$이므로 $x+y=${x}+${y}=${total}$이다.`,
          facts: { fam, n, given, g, x, y, ans: total },
        };
      }),
  ),

  def(MINOR_POLY, "05", "다면체의 옆면의 모양", SEC.다면체, "easy", (rng) =>
    attempt(80, (): Body | null => {
      const target = pick(rng, [0, 1, 2] as const);
      const idx = distinctIndices(rng, POLY_POOL.length, 5);
      const items = idx.map((i) => POLY_POOL[i]!);
      const round = distinctIndices(rng, ROUND_POOL.length, 1).map(
        (i) => ROUND_POOL[i]!,
      );
      const all = [...items, ...round];
      for (let i = all.length - 1; i > 0; i -= 1) {
        const j = intBetween(rng, 0, i);
        const t = all[i]!;
        all[i] = all[j]!;
        all[j] = t;
      }
      const hit = items.filter((name) =>
        target === 2
          ? name.endsWith("뿔대")
          : target === 1
            ? name.endsWith("뿔")
            : name.endsWith("기둥"),
      );
      if (hit.length === 0) return null;
      return {
        content: `다음 입체도형 중 옆면의 모양이 ${SIDE_SHAPE[target]!}인 것은 모두 몇 개인지 구하시오.\n\n${all.join(", ")}`,
        answer: `$${hit.length}$개`,
        solution: `각기둥의 옆면은 직사각형, 각뿔의 옆면은 삼각형, 각뿔대의 옆면은 사다리꼴이다.\n원기둥·원뿔·원뿔대·구·반구는 옆면이 다각형이 아니다.\n따라서 옆면의 모양이 ${SIDE_SHAPE[target]!}인 것은 ${hit.join(", ")}의 $${hit.length}$개이다.`,
        facts: { target, k: hit.length, ans: hit.length },
      };
    }),
  ),

  def(
    MINOR_POLY,
    "06",
    "다면체의 이해",
    SEC.다면체,
    "mid",
    (rng) =>
      attempt(120, (): Body | null => {
        // 「$n$각기둥의 모서리의 개수는 $k$이다」 꼴 넷. 참·거짓을 시험이 다시 센다.
        const picks: { n: number; fam: number; q: number; k: number }[] = [];
        const seen = new Set<string>();
        for (let i = 0; i < 4; i += 1) {
          const n = intBetween(rng, 4, 11);
          const fam = pick(rng, [0, 1, 2] as const);
          const q = pick(rng, [0, 1, 2] as const);
          const tag = `${n}|${fam}|${q}`;
          if (seen.has(tag)) return null;
          seen.add(tag);
          const real = countOf(n, fam, q);
          const wrong = rng() < 0.5;
          const off = pick(rng, [1, 2, 3, -1, -2] as const);
          const k = wrong ? real + off : real;
          if (k <= 0) return null;
          picks.push({ n, fam, q, k });
        }
        const ans = picks.filter(
          (s) => s.k === countOf(s.n, s.fam, s.q),
        ).length;
        if (ans === 0 || ans === 4) return null; // 전부 참·전부 거짓이면 셀 것이 없다
        const lines = picks
          .map(
            (s, i) =>
              `${BOGI[i]!}. ${solidName(s.n, s.fam)}의 ${COUNT_KO[s.q]!}의 개수는 $${s.k}$이다.`,
          )
          .join("\n");
        const truth = picks
          .map(
            (s, i) =>
              `${BOGI[i]!}. ${solidName(s.n, s.fam)}의 ${COUNT_KO[s.q]!}의 개수는 $${countOf(s.n, s.fam, s.q)}$이므로 ${s.k === countOf(s.n, s.fam, s.q) ? "옳다" : "옳지 않다"}.`,
          )
          .join("\n");
        return {
          content: `다음 보기 중 옳은 것은 모두 몇 개인지 구하시오.\n\n${lines}`,
          answer: `$${ans}$개`,
          solution: `${truth}\n따라서 옳은 것은 $${ans}$개이다.`,
          facts: {
            n0: picks[0]!.n,
            c0: picks[0]!.fam,
            q0: picks[0]!.q,
            k0: picks[0]!.k,
            n1: picks[1]!.n,
            c1: picks[1]!.fam,
            q1: picks[1]!.q,
            k1: picks[1]!.k,
            n2: picks[2]!.n,
            c2: picks[2]!.fam,
            q2: picks[2]!.q,
            k2: picks[2]!.k,
            n3: picks[3]!.n,
            c3: picks[3]!.fam,
            q3: picks[3]!.q,
            k3: picks[3]!.k,
            ans,
          },
        };
      }),
    // 「몇 개인가」 유형은 답이 보기 안의 수와 우연히 같기 마련이다 — 새는 게 아니다.
    () => [],
  ),

  def(
    MINOR_POLY,
    "07",
    "주어진 조건을 만족시키는 다면체",
    SEC.다면체,
    "mid",
    (rng) =>
      attempt(80, (): Body | null => {
        const fam = pick(rng, [0, 1, 2] as const);
        const n = intBetween(rng, 5, 12);
        const given = pick(rng, [0, 1, 2] as const);
        const asked = pick(rng, [0, 1, 2] as const);
        if (given === asked) return null;
        // 각뿔은 면과 꼭짓점의 개수가 같다 — 그 짝은 문항이 아니다.
        if (fam === 1 && given !== 1 && asked !== 1) return null;
        const g = countOf(n, fam, given);
        const a = countOf(n, fam, asked);
        const cond =
          fam === 0
            ? "㈎ 두 밑면은 서로 평행하고 합동인 다각형이다.\n㈏ 옆면의 모양은 모두 직사각형이다."
            : fam === 1
              ? "㈎ 밑면은 $1$개이다.\n㈏ 옆면의 모양은 모두 삼각형이다."
              : "㈎ 두 밑면은 서로 평행하지만 합동은 아니다.\n㈏ 옆면의 모양은 모두 사다리꼴이다.";
        return {
          content: `다음 조건을 모두 만족시키는 입체도형의 ${COUNT_KO[asked]!}의 개수를 구하시오.\n\n${cond}\n㈐ ${COUNT_KO[given]!}의 개수는 $${g}$이다.`,
          answer: `$${a}$`,
          solution: `㈎, ㈏에서 이 입체도형은 ${`각${FAM[fam]!}`}이다.\n밑면을 $n$각형이라 하면 ${COUNT_KO[given]!}의 개수가 $${g}$이므로 $n=${n}$, 즉 ${solidName(n, fam)}이다.\n따라서 ${COUNT_KO[asked]!}의 개수는 $${a}$이다.`,
          facts: { fam, n, given, g, asked, ans: a },
        };
      }),
  ),

  def(
    MINOR_POLY,
    "08",
    "정다면체",
    SEC.정다면체,
    "easy",
    (rng) =>
      attempt(80, (): Body | null => {
        const branch = pick(rng, [0, 1, 2] as const);
        if (branch === 0) {
          const p = pick(rng, [3, 4, 5] as const);
          const hit = PLATO.filter((s) => s.p === p);
          return {
            content: `정다면체 중에서 면의 모양이 ${p === 3 ? "정삼각형" : p === 4 ? "정사각형" : "정오각형"}인 것은 모두 몇 가지인지 구하시오.`,
            answer: `$${hit.length}$가지`,
            solution: `정다면체는 정사면체, 정육면체, 정팔면체, 정십이면체, 정이십면체의 다섯 가지뿐이다.\n이 중 면의 모양이 ${p === 3 ? "정삼각형" : p === 4 ? "정사각형" : "정오각형"}인 것은 ${hit.map((s) => s.name).join(", ")}이다.\n따라서 $${hit.length}$가지이다.`,
            facts: { branch, p, ans: hit.length },
          };
        }
        if (branch === 1) {
          const q = pick(rng, [3, 4, 5] as const);
          const hit = PLATO.filter((s) => s.q === q);
          return {
            content: `정다면체 중에서 한 꼭짓점에 모인 면의 개수가 $${q}$인 것은 모두 몇 가지인지 구하시오.`,
            answer: `$${hit.length}$가지`,
            solution: `한 꼭짓점에 모인 면의 개수는 정사면체 $3$, 정육면체 $3$, 정팔면체 $4$, 정십이면체 $3$, 정이십면체 $5$이다.\n따라서 $${q}$인 것은 ${hit.map((s) => s.name).join(", ")}의 $${hit.length}$가지이다.`,
            facts: { branch, q, ans: hit.length },
          };
        }
        const q = pick(rng, [4, 5] as const);
        const hit = PLATO.filter((s) => s.q >= q);
        return {
          content: `정다면체 중에서 한 꼭짓점에 모인 면의 개수가 $${q}$ 이상인 것은 모두 몇 가지인지 구하시오.`,
          answer: `$${hit.length}$가지`,
          solution: `한 꼭짓점에 모인 면의 개수는 정사면체 $3$, 정육면체 $3$, 정팔면체 $4$, 정십이면체 $3$, 정이십면체 $5$이다.\n따라서 $${q}$ 이상인 것은 ${hit.map((s) => s.name).join(", ")}의 $${hit.length}$가지이다.`,
          facts: { branch, q, ans: hit.length },
        };
      }),
    // 「몇 가지인가」의 답($1$~$3$)은 발문의 $p$·$q$($3$~$5$)와 겹치기 마련이다.
    () => [],
  ),

  def(
    MINOR_POLY,
    "09",
    "정다면체의 면 모서리 꼭짓점의 개수",
    SEC.정다면체,
    "easy",
    (rng) =>
      attempt(80, (): Body | null => {
        const sa = pick(rng, PLATO);
        const sb = pick(rng, PLATO);
        const qa = pick(rng, [0, 1, 2] as const);
        const qb = pick(rng, [0, 1, 2] as const);
        if (sa.name === sb.name) return null;
        const a = platoCount(sa, qa);
        const b = platoCount(sb, qb);
        const total = a + b;
        return {
          content: `${sa.name}의 ${COUNT_KO[qa]!}의 개수를 $a$, ${sb.name}의 ${COUNT_KO[qb]!}의 개수를 $b$라 할 때, $a+b$의 값을 구하시오.`,
          answer: `$${total}$`,
          solution: `${sa.name}의 ${COUNT_KO[qa]!}의 개수는 $${a}$이고 ${sb.name}의 ${COUNT_KO[qb]!}의 개수는 $${b}$이다.\n따라서 $a+b=${a}+${b}=${total}$이다.`,
          facts: { fa: sa.f, qa, fb: sb.f, qb, a, b, ans: total },
        };
      }),
  ),

  def(
    MINOR_POLY,
    "10",
    "정다면체의 이해",
    SEC.정다면체,
    "mid",
    (rng) =>
      attempt(120, (): Body | null => {
        const branch = pick(rng, [0, 1] as const);
        if (branch === 0) {
          const s = pick(rng, PLATO);
          const q = pick(rng, [0, 1, 2] as const);
          const a = platoCount(s, q);
          return {
            content: `면의 모양이 ${s.face}이고 한 꼭짓점에 모인 면의 개수가 $${s.q}$인 정다면체가 있다. 이 정다면체의 ${COUNT_KO[q]!}의 개수를 구하시오.`,
            answer: `$${a}$`,
            solution: `면의 모양이 ${s.face}이고 한 꼭짓점에 모인 면의 개수가 $${s.q}$인 정다면체는 ${s.name}이다.\n${s.name}의 면의 개수는 $${s.f}$, 모서리의 개수는 $${s.e}$, 꼭짓점의 개수는 $${s.v}$이다.\n따라서 ${COUNT_KO[q]!}의 개수는 $${a}$이다.`,
            facts: { branch, p: s.p, q: s.q, ask: q, ans: a },
          };
        }
        // 「정다면체 — 면의 모양 — 한 꼭짓점에 모인 면의 개수」 짝이 몇 개 맞는가.
        const idx = distinctIndices(rng, PLATO.length, 4);
        const rows = idx.map((i) => {
          const s = PLATO[i]!;
          const bad = rng() < 0.5;
          const q = bad ? (s.q === 3 ? 4 : 3) : s.q;
          return { i, s, q, ok: q === s.q };
        });
        const ans = rows.filter((r) => r.ok).length;
        if (ans === 0 || ans === 4) return null;
        const lines = rows
          .map((r, k) => `${BOGI[k]!}. ${r.s.name} — ${r.s.face} — $${r.q}$`)
          .join("\n");
        return {
          content: `다음은 정다면체와 그 면의 모양, 한 꼭짓점에 모인 면의 개수를 짝지은 것이다. 바르게 짝지어진 것은 모두 몇 개인지 구하시오.\n\n${lines}`,
          answer: `$${ans}$개`,
          solution: `한 꼭짓점에 모인 면의 개수는 정사면체 $3$, 정육면체 $3$, 정팔면체 $4$, 정십이면체 $3$, 정이십면체 $5$이다.\n${rows.map((r, k) => `${BOGI[k]!}. ${topic(r.s.name)} $${r.s.q}$이므로 ${r.ok ? "옳다" : "옳지 않다"}.`).join("\n")}\n따라서 바르게 짝지어진 것은 $${ans}$개이다.`,
          facts: {
            branch,
            f0: rows[0]!.s.f,
            d0: rows[0]!.q,
            f1: rows[1]!.s.f,
            d1: rows[1]!.q,
            f2: rows[2]!.s.f,
            d2: rows[2]!.q,
            f3: rows[3]!.s.f,
            d3: rows[3]!.q,
            ans,
          },
        };
      }),
    // 갈래 1 은 보기에 $3$·$4$·$5$ 가 늘어서므로 「몇 개인가」의 답과 겹친다.
    () => [],
  ),

  def(MINOR_POLY, "11", "정다면체의 전개도", SEC.정다면체, "mid", (rng) =>
    attempt(80, (): Body | null => {
      const branch = pick(rng, [0, 1] as const);
      const s = pick(rng, PLATO);
      if (branch === 0) {
        const q = pick(rng, [1, 2] as const);
        const a = platoCount(s, q);
        return {
          content: `어떤 정다면체의 전개도가 합동인 ${s.face} $${s.f}$개로 이루어져 있다. 이 정다면체의 ${COUNT_KO[q]!}의 개수를 구하시오.`,
          answer: `$${a}$`,
          solution: `전개도를 이루는 면이 ${s.face} $${s.f}$개이므로 이 정다면체는 ${s.name}이다.\n따라서 ${COUNT_KO[q]!}의 개수는 $${a}$이다.`,
          facts: { branch, p: s.p, nf: s.f, ask: q, ans: a },
        };
      }
      return {
        content: `${s.name}의 전개도는 합동인 ${s.face} 몇 개로 이루어져 있는지 구하시오.`,
        answer: `$${s.f}$개`,
        solution: `전개도를 이루는 면의 개수는 그 정다면체의 면의 개수와 같다.\n${s.name}의 면의 개수는 $${s.f}$이다.\n따라서 ${s.face} $${s.f}$개로 이루어져 있다.`,
        facts: { branch, p: s.p, nf: s.f, ask: 0, ans: s.f },
      };
    }),
  ),

  def(MINOR_POLY, "12", "정다면체의 단면", SEC.정다면체, "mid", (rng) =>
    attempt(80, (): Body | null => {
      const nBad = intBetween(rng, 1, 3);
      const nOk = intBetween(rng, 2, 4);
      const bad = distinctIndices(rng, CUT_NO.length, nBad).map(
        (i) => CUT_NO[i]!,
      );
      const ok = distinctIndices(rng, CUT_OK.length, nOk).map(
        (i) => CUT_OK[i]!,
      );
      const all = [...bad, ...ok];
      for (let i = all.length - 1; i > 0; i -= 1) {
        const j = intBetween(rng, 0, i);
        const t = all[i]!;
        all[i] = all[j]!;
        all[j] = t;
      }
      return {
        content: `다음 중 정육면체를 한 평면으로 자를 때 생기는 단면의 모양이 될 수 없는 것은 모두 몇 개인지 구하시오.\n\n${all.join(", ")}`,
        answer: `$${nBad}$개`,
        solution: `정육면체의 면은 $6$개이므로 단면은 변이 $6$개 이하인 다각형이다.\n세 면을 지나는 단면은 한 꼭짓점의 둘레를 자르므로 세 각이 모두 예각이고, 마주 보는 두 면이 평행하므로 오각형 단면의 다섯 변이 모두 같을 수는 없다.\n따라서 될 수 없는 것은 ${bad.join(", ")}의 $${nBad}$개이다.`,
        facts: { nBad, nOk, ans: nBad },
      };
    }),
  ),

  def(MINOR_POLY, "13", "회전체", SEC.회전체, "easy", (rng) =>
    attempt(80, (): Body | null => {
      const k = intBetween(rng, 2, 4);
      const m = intBetween(rng, 2, 4);
      const round = distinctIndices(rng, ROUND_POOL.length, k).map(
        (i) => ROUND_POOL[i]!,
      );
      const poly = distinctIndices(rng, POLY_POOL.length, m).map(
        (i) => POLY_POOL[i]!,
      );
      const all = [...round, ...poly];
      for (let i = all.length - 1; i > 0; i -= 1) {
        const j = intBetween(rng, 0, i);
        const t = all[i]!;
        all[i] = all[j]!;
        all[j] = t;
      }
      return {
        content: `다음 입체도형 중 회전체는 모두 몇 개인지 구하시오.\n\n${all.join(", ")}`,
        answer: `$${k}$개`,
        solution: `회전체는 평면도형을 한 직선을 축으로 하여 $1$회전 시킬 때 생기는 입체도형이다.\n${topic(poly.join(", "))} 다면체이므로 회전체가 아니다.\n따라서 회전체는 ${round.join(", ")}의 $${k}$개이다.`,
        facts: { k, m, ans: k },
      };
    }),
  ),

  def(
    MINOR_POLY,
    "14",
    "평면도형을 회전시킬 때 생기는 회전체",
    SEC.회전체,
    "mid",
    (rng) =>
      attempt(120, (): Body | null => {
        // 「무엇을 무엇을 축으로」가 이 유형의 전부다 — 축을 facts 에 싣는다.
        const shape = pick(rng, [0, 1, 2] as const); // 0 직사각형 · 1 직각삼각형 · 2 사다리꼴
        const a = intBetween(rng, 2, 9); // 가로(축에 수직인 변)
        const b = intBetween(rng, 3, 12); // 세로(축에 나란한 변)
        if (shape !== 2 && a === b) return null;
        // axis 0 = 세로변을 축으로(반지름 = a) · 1 = 가로변을 축으로(반지름 = b)
        const axis = shape === 2 ? 0 : pick(rng, [0, 1] as const);
        const r = axis === 0 ? a : b;
        const h = axis === 0 ? b : a;
        const w2 = shape === 2 ? intBetween(rng, 1, a - 1) : 0;
        if (shape === 2 && w2 >= a) return null;
        const area = r * r;
        const name = shape === 0 ? "원기둥" : shape === 1 ? "원뿔" : "원뿔대";
        const plan =
          shape === 0
            ? `가로의 길이가 $${a}\\,\\mathrm{cm}$, 세로의 길이가 $${b}\\,\\mathrm{cm}$인 직사각형`
            : shape === 1
              ? `직각을 낀 두 변의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$인 직각삼각형`
              : `평행한 두 변의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${w2}\\,\\mathrm{cm}$이고 그 사이의 거리가 $${b}\\,\\mathrm{cm}$인 사다리꼴`;
        const axisText =
          shape === 2
            ? `길이가 $${b}\\,\\mathrm{cm}$인 변`
            : axis === 0
              ? `길이가 $${b}\\,\\mathrm{cm}$인 변`
              : `길이가 $${a}\\,\\mathrm{cm}$인 변`;
        const piece =
          shape === 0
            ? { shape: "rect", w: r, h }
            : shape === 1
              ? { shape: "rightTri", w: r, h }
              : { shape: "rightTrap", w: a, w2, h: b };
        const baseKo = shape === 2 ? "큰 밑면인 원" : "밑면인 원";
        return {
          content: `오른쪽 그림과 같이 ${plan}을 ${axisText}을 회전축으로 하여 $1$회전 시킬 때 생기는 회전체의 이름을 말하고, 이 회전체의 ${baseKo}의 넓이를 구하시오.`,
          answer: `${name}, $${piTerm(area)}\\,\\mathrm{cm}^2$`,
          solution: `${axisText}을 회전축으로 하면 ${name}이 생긴다.\n회전축에서 가장 멀리 떨어진 변까지의 거리가 $${r}\\,\\mathrm{cm}$이므로 ${baseKo}의 반지름의 길이는 $${r}\\,\\mathrm{cm}$이다.\n따라서 그 넓이는 $\\pi\\times${r}^{2}=${piTerm(area)}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { shape, a, b, w2, axis, r, area, ans: area },
          figureSpec: {
            version: "elem-1",
            kind: "revolvePlan",
            pieces: [piece],
          },
        };
      }),
  ),

  def(MINOR_POLY, "15", "회전체의 단면의 모양", SEC.회전체, "mid", (rng) =>
    attempt(120, (): Body | null => {
      const idx = distinctIndices(rng, AXIAL_SECTION.length, 4);
      const rows = idx.map((i) => {
        const [solid, right] = AXIAL_SECTION[i]!;
        const bad = rng() < 0.5;
        const wrong = pick(
          rng,
          SECTION_WRONG.filter((s) => s !== right),
        );
        return { solid, claim: bad ? wrong : right, ok: !bad, right };
      });
      const ans = rows.filter((r) => r.ok).length;
      if (ans === 0 || ans === 4) return null;
      const lines = rows
        .map((r, k) => `${BOGI[k]!}. ${r.solid} — ${r.claim}`)
        .join("\n");
      return {
        content: `다음은 회전체와 그 회전체를 회전축을 포함하는 평면으로 자를 때 생기는 단면의 모양을 짝지은 것이다. 바르게 짝지어진 것은 모두 몇 개인지 구하시오.\n\n${lines}`,
        answer: `$${ans}$개`,
        solution: `${rows.map((r, k) => `${BOGI[k]!}. ${r.solid}의 단면은 ${r.right}이므로 ${r.ok ? "옳다" : "옳지 않다"}.`).join("\n")}\n따라서 바르게 짝지어진 것은 $${ans}$개이다.`,
        facts: { ans },
      };
    }),
  ),

  def(MINOR_POLY, "16", "회전체의 단면의 넓이", SEC.회전체, "mid", (rng) =>
    attempt(120, (): Body | null => {
      const shape = pick(rng, [0, 1, 2] as const); // 0 직사각형 · 1 직각삼각형 · 2 사다리꼴
      const a = intBetween(rng, 2, 9); // 축에서 가장 먼 거리 = 반지름
      const b = intBetween(rng, 3, 12); // 축에 나란한 변 = 높이
      const w2 = shape === 2 ? intBetween(rng, 1, a - 1) : 0;
      if (shape === 2 && (w2 <= 0 || w2 >= a)) return null;
      // 회전축을 포함하는 평면으로 자른 단면 = 회전 전 도형과 그 거울상을 이어 붙인 것.
      const area = shape === 0 ? 2 * a * b : shape === 1 ? a * b : (a + w2) * b;
      if (!Number.isInteger(area)) return null;
      const plan =
        shape === 0
          ? `가로의 길이가 $${a}\\,\\mathrm{cm}$, 세로의 길이가 $${b}\\,\\mathrm{cm}$인 직사각형`
          : shape === 1
            ? `직각을 낀 두 변의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$인 직각삼각형`
            : `평행한 두 변의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${w2}\\,\\mathrm{cm}$이고 그 사이의 거리가 $${b}\\,\\mathrm{cm}$인 사다리꼴`;
      const cut =
        shape === 0
          ? `가로의 길이가 $${2 * a}\\,\\mathrm{cm}$, 세로의 길이가 $${b}\\,\\mathrm{cm}$인 직사각형`
          : shape === 1
            ? `밑변의 길이가 $${2 * a}\\,\\mathrm{cm}$, 높이가 $${b}\\,\\mathrm{cm}$인 이등변삼각형`
            : `평행한 두 변의 길이가 각각 $${2 * a}\\,\\mathrm{cm}$, $${2 * w2}\\,\\mathrm{cm}$이고 높이가 $${b}\\,\\mathrm{cm}$인 사다리꼴`;
      const calc =
        shape === 0
          ? `$${2 * a}\\times${b}=${area}$`
          : shape === 1
            ? `$\\dfrac{1}{2}\\times${2 * a}\\times${b}=${area}$`
            : `$\\dfrac{1}{2}\\times(${2 * a}+${2 * w2})\\times${b}=${area}$`;
      const piece =
        shape === 0
          ? { shape: "rect", w: a, h: b }
          : shape === 1
            ? { shape: "rightTri", w: a, h: b }
            : { shape: "rightTrap", w: a, w2, h: b };
      return {
        content: `오른쪽 그림과 같이 ${plan}을 축에 나란한 변을 회전축으로 하여 $1$회전 시켰다. 이 회전체를 회전축을 포함하는 평면으로 자를 때 생기는 단면의 넓이를 구하시오.`,
        answer: `$${area}\\,\\mathrm{cm}^2$`,
        solution: `회전축을 포함하는 평면으로 자르면 단면은 회전 전의 도형과 그것을 축에 대하여 대칭이동한 도형을 이어 붙인 모양이다.\n즉 ${cut}이다.\n따라서 단면의 넓이는 ${calc}이므로 $${area}\\,\\mathrm{cm}^2$이다.`,
        facts: { shape, a, b, w2, area, ans: area },
        figureSpec: {
          version: "elem-1",
          kind: "revolvePlan",
          pieces: [piece],
        },
      };
    }),
  ),

  def(MINOR_POLY, "17", "회전체의 전개도", SEC.회전체, "mid", (rng) =>
    attempt(120, (): Body | null => {
      const branch = pick(rng, [0, 1] as const);
      if (branch === 0) {
        const r = intBetween(rng, 2, 8);
        const h = intBetween(rng, 3, 12);
        const w = 2 * r;
        const area = 2 * r * h;
        return {
          content: `오른쪽 그림은 밑면인 원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 높이가 $${h}\\,\\mathrm{cm}$인 원기둥의 전개도이다. 옆면인 직사각형의 넓이를 구하시오.`,
          answer: `$${piTerm(area)}\\,\\mathrm{cm}^2$`,
          solution: `옆면인 직사각형의 가로의 길이는 밑면인 원의 둘레의 길이와 같으므로 $2\\pi\\times${r}=${piTerm(w)}\\,(\\mathrm{cm})$이다.\n세로의 길이는 원기둥의 높이와 같으므로 $${h}\\,\\mathrm{cm}$이다.\n따라서 넓이는 $${piTerm(w)}\\times${h}=${piTerm(area)}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { branch, r, h, w, area, ans: area },
          figureSpec: { version: "elem-1", kind: "netCylinder", r, h },
        };
      }
      // 원뿔 전개도의 중심각 — 엔진이 $360r/l$ 로 구하므로 값을 발문에 안 적는다.
      const r = intBetween(rng, 1, 8);
      const l = intBetween(rng, r + 1, 18);
      const deg = (360 * r) / l;
      if (!Number.isInteger(deg) || deg < 30 || deg > 330) return null;
      return {
        content: `오른쪽 그림은 밑면인 원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$, 모선의 길이가 $${l}\\,\\mathrm{cm}$인 원뿔의 전개도이다. 옆면인 부채꼴의 중심각의 크기를 구하시오.`,
        answer: `$${deg}^\\circ$`,
        solution: `부채꼴의 호의 길이는 밑면인 원의 둘레의 길이와 같으므로 $2\\pi\\times${r}=${piTerm(2 * r)}\\,(\\mathrm{cm})$이다.\n중심각의 크기를 $x^\\circ$라 하면 $2\\pi\\times${l}\\times\\dfrac{x}{360}=${piTerm(2 * r)}$이다.\n따라서 $x=${deg}$이므로 중심각의 크기는 $${deg}^\\circ$이다.`,
        facts: { branch, r, l, deg, ans: deg },
        figureSpec: {
          version: "elem-1",
          kind: "netCone",
          r,
          l,
          labels: ["slant"],
        },
      };
    }),
  ),

  def(MINOR_POLY, "18", "회전체의 이해", SEC.회전체, "mid", (rng) =>
    attempt(120, (): Body | null => {
      const idx = distinctIndices(rng, REV_CLAIMS.length, 4);
      const rows = idx.map((i) => REV_CLAIMS[i]!);
      const ans = rows.filter((r) => r[1]).length;
      if (ans === 0 || ans === 4) return null;
      const lines = rows.map((r, k) => `${BOGI[k]!}. ${r[0]}`).join("\n");
      return {
        content: `다음 보기 중 옳은 것은 모두 몇 개인지 구하시오.\n\n${lines}`,
        answer: `$${ans}$개`,
        solution: `${rows.map((r, k) => `${BOGI[k]!}. ${r[1] ? "옳다" : "옳지 않다"}.`).join("\n")}\n따라서 옳은 것은 $${ans}$개이다.`,
        facts: { ans },
      };
    }),
  ),

  def(
    MINOR_POLY,
    "19",
    "다면체의 꼭짓점 모서리 면의 개수 사이의 관계",
    SEC.다면체,
    "mid",
    (rng) =>
      attempt(120, (): Body | null => {
        const branch = pick(rng, [0, 1, 2] as const);
        // 실제로 있는 다면체에서 뽑는다 — 오일러만 맞고 존재하지 않는 수는 안 쓴다.
        const fromPlato = rng() < 0.4;
        let v: number;
        let e: number;
        let f: number;
        if (fromPlato) {
          const s = pick(rng, PLATO);
          v = s.v;
          e = s.e;
          f = s.f;
        } else {
          const fam = pick(rng, [0, 1, 2] as const);
          const n = intBetween(rng, 5, 14);
          v = vertsOf(n, fam);
          e = edgesOf(n, fam);
          f = facesOf(n, fam);
        }
        if (branch === 0) {
          return {
            content: `꼭짓점의 개수가 $${v}$이고 모서리의 개수가 $${e}$인 다면체의 면의 개수를 구하시오.`,
            answer: `$${f}$`,
            solution: `다면체의 꼭짓점의 개수를 $v$, 모서리의 개수를 $e$, 면의 개수를 $f$라 하면 $v-e+f=2$이다.\n$${v}-${e}+f=2$이므로 $f=${f}$이다.`,
            facts: { branch, v, e, f, ans: f },
          };
        }
        if (branch === 1) {
          return {
            content: `면의 개수가 $${f}$이고 모서리의 개수가 $${e}$인 다면체의 꼭짓점의 개수를 구하시오.`,
            answer: `$${v}$`,
            solution: `다면체의 꼭짓점의 개수를 $v$, 모서리의 개수를 $e$, 면의 개수를 $f$라 하면 $v-e+f=2$이다.\n$v-${e}+${f}=2$이므로 $v=${v}$이다.`,
            facts: { branch, v, e, f, ans: v },
          };
        }
        const d = e - v;
        if (d <= 0) return null;
        return {
          content: `어떤 다면체의 모서리의 개수가 꼭짓점의 개수보다 $${d}$만큼 클 때, 이 다면체의 면의 개수를 구하시오.`,
          answer: `$${f}$`,
          solution: `다면체의 꼭짓점의 개수를 $v$, 모서리의 개수를 $e$, 면의 개수를 $f$라 하면 $v-e+f=2$이다.\n$e-v=${d}$이므로 $f=2+(e-v)=2+${d}=${f}$이다.`,
          facts: { branch, v, e, f, d, ans: f },
        };
      }),
  ),

  def(
    MINOR_POLY,
    "20",
    "정다면체의 각 면의 한가운데 점을 연결하여 만든 입체도형",
    SEC.정다면체,
    "hard",
    (rng) =>
      attempt(80, (): Body | null => {
        const s = pick(rng, PLATO);
        const dual = platoByFaces(s.v);
        const q = pick(rng, [0, 1, 2] as const);
        const a = platoCount(dual, q);
        return {
          content: `${s.name}의 각 면의 한가운데 점을 연결하여 만든 입체도형의 ${COUNT_KO[q]!}의 개수를 구하시오.`,
          answer: `$${a}$`,
          solution: `각 면의 한가운데 점을 연결하면 또 하나의 정다면체가 생기고, 새 정다면체의 꼭짓점의 개수는 원래 정다면체의 면의 개수와 같다.\n${s.name}의 면의 개수가 $${s.f}$이므로 새로 만든 입체도형은 꼭짓점의 개수가 $${s.f}$인 ${dual.name}이다.\n따라서 ${COUNT_KO[q]!}의 개수는 $${a}$이다.`,
          facts: { fs: s.f, fd: dual.f, ask: q, ans: a },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════════════
//  입체도형의 겉넓이와 부피 — RPM 1-2 05~17 · 19 · 20 (남은 열다섯)
//
//  01~04(기둥)·18(원뿔 그릇)·21~26(구)은 이미 다른 모듈에 있다 — 안 낸다.
// ═══════════════════════════════════════════════════════════════════

/** 세 변이 모두 정수인 직각삼각형 `[직각을 낀 변, 직각을 낀 변, 빗변]`. */
const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5],
  [4, 3, 5],
  [6, 8, 10],
  [8, 6, 10],
  [5, 12, 13],
  [12, 5, 13],
  [9, 12, 15],
  [12, 9, 15],
  [8, 15, 17],
  [15, 8, 17],
  [7, 24, 25],
  [24, 7, 25],
] as const;

/** 부채꼴 기둥·전개도에서 쓰는 중심각 — 호와 넓이가 정수가 되기 쉬운 각. */
const SECTOR_DEG: readonly number[] = [45, 60, 90, 120, 135, 180, 240, 270];

export const M1_SOLID_AREA: TypeEntry[] = [
  def(
    MINOR_AREA,
    "05",
    "전개도가 주어진 기둥의 겉넓이와 부피",
    SEC.기둥,
    "mid",
    (rng) =>
      attempt(120, (): Body | null => {
        const branch = pick(rng, [0, 1, 2] as const);
        if (branch === 0) {
          // 원기둥 — 전개도의 «가로»가 밑면의 둘레다. 반지름을 되찾아야 풀린다.
          const r = intBetween(rng, 2, 8);
          const h = intBetween(rng, 3, 12);
          const w = 2 * r;
          const S = 2 * r * (r + h);
          const V = r * r * h;
          return {
            content: `오른쪽 그림과 같이 옆면인 직사각형의 가로의 길이가 $${piTerm(w)}\\,\\mathrm{cm}$, 세로의 길이가 $${h}\\,\\mathrm{cm}$인 전개도로 만들어지는 원기둥의 겉넓이와 부피를 차례로 구하시오.`,
            answer: `겉넓이 $${piTerm(S)}\\,\\mathrm{cm}^2$, 부피 $${piTerm(V)}\\,\\mathrm{cm}^3$`,
            solution: `밑면인 원의 반지름의 길이를 $r\\,\\mathrm{cm}$라 하면 $2\\pi r=${piTerm(w)}$에서 $r=${r}$이다.\n(겉넓이)$=2\\times\\pi\\times${r}^{2}+${piTerm(w)}\\times${h}=${piTerm(2 * r * r)}+${piTerm(w * h)}=${piTerm(S)}$이다.\n(부피)$=\\pi\\times${r}^{2}\\times${h}=${piTerm(V)}$이다.`,
            facts: { branch, r, h, w, S, V, ans: S },
            figureSpec: { version: "elem-1", kind: "netCylinder", r, h },
          };
        }
        if (branch === 1) {
          // 삼각기둥 — 밑면이 직각삼각형이라 밑넓이가 정수다.
          const [a, b, c] = pick(rng, TRIPLES);
          const h = intBetween(rng, 3, 12);
          const base = (a * b) / 2;
          const S = 2 * base + (a + b + c) * h;
          const V = base * h;
          return {
            content: `밑면인 직각삼각형의 세 변의 길이가 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$, $${c}\\,\\mathrm{cm}$이고 옆면인 직사각형의 세로의 길이가 $${h}\\,\\mathrm{cm}$인 오른쪽 그림과 같은 전개도가 있다. 이 전개도로 만들어지는 삼각기둥의 겉넓이와 부피를 차례로 구하시오.`,
            answer: `겉넓이 $${S}\\,\\mathrm{cm}^2$, 부피 $${V}\\,\\mathrm{cm}^3$`,
            solution: `밑넓이는 $\\dfrac{1}{2}\\times${a}\\times${b}=${base}$이다.\n옆면인 직사각형의 가로의 길이는 밑면의 둘레의 길이와 같으므로 $${a}+${b}+${c}=${a + b + c}$이고, 옆넓이는 $${a + b + c}\\times${h}=${(a + b + c) * h}$이다.\n따라서 겉넓이는 $2\\times${base}+${(a + b + c) * h}=${S}$이고, 부피는 $${base}\\times${h}=${V}$이다.`,
            facts: { branch, a, b, c, h, base, S, V, ans: S },
            figureSpec: {
              version: "elem-1",
              kind: "prism",
              sides: 3,
              h,
              net: true,
            },
          };
        }
        // 직육면체 — `netCuboid` 가 치수를 그리므로 발문은 수를 안 적는다 (09 §4-20-b).
        const w = intBetween(rng, 3, 12);
        const d = intBetween(rng, 3, 12);
        const h = intBetween(rng, 3, 12);
        const S = 2 * (w * d + d * h + h * w);
        const V = w * d * h;
        return {
          content: `오른쪽 그림은 밑면이 가로의 길이가 $${w}\\,\\mathrm{cm}$, 세로의 길이가 $${d}\\,\\mathrm{cm}$인 직사각형인 사각기둥의 전개도이다. 이 전개도로 만들어지는 사각기둥의 겉넓이와 부피를 차례로 구하시오.`,
          answer: `겉넓이 $${S}\\,\\mathrm{cm}^2$, 부피 $${V}\\,\\mathrm{cm}^3$`,
          solution: `전개도를 접으면 가로의 길이가 $${w}\\,\\mathrm{cm}$, 세로의 길이가 $${d}\\,\\mathrm{cm}$, 높이가 $${h}\\,\\mathrm{cm}$인 직육면체가 된다.\n(겉넓이)$=2\\times(${w}\\times${d}+${d}\\times${h}+${h}\\times${w})=${S}$이다.\n(부피)$=${w}\\times${d}\\times${h}=${V}$이다.`,
          facts: { branch, w, d, h, S, V, ans: S },
          figureSpec: { version: "elem-1", kind: "netCuboid", w, d, h },
        };
      }),
    (f) => [f.S!, f.V!],
  ),

  def(
    MINOR_AREA,
    "06",
    "밑면이 부채꼴인 기둥의 겉넓이와 부피",
    SEC.기둥,
    "hard",
    (rng) =>
      attempt(200, (): Body | null => {
        const branch = pick(rng, [0, 1] as const);
        const r = intBetween(rng, 2, 12);
        const deg = pick(rng, SECTOR_DEG);
        const h = intBetween(rng, 3, 12);
        if ((r * r * deg) % 360 !== 0) return null;
        if ((2 * r * deg) % 360 !== 0) return null;
        const base = (r * r * deg) / 360; // 밑넓이 = base·π
        const arc = (2 * r * deg) / 360; // 호의 길이 = arc·π
        if (base < 1 || arc < 1) return null;
        if (branch === 0) {
          const V = base * h;
          return {
            content: `밑면이 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 중심각의 크기가 $${deg}^\\circ$인 부채꼴이며 높이가 $${h}\\,\\mathrm{cm}$인 기둥의 부피를 구하시오.`,
            answer: `$${piTerm(V)}\\,\\mathrm{cm}^3$`,
            solution: `밑넓이는 $\\pi\\times${r}^{2}\\times\\dfrac{${deg}}{360}=${piTerm(base)}$이다.\n(부피)$=$(밑넓이)$\\times$(높이)$=${piTerm(base)}\\times${h}=${piTerm(V)}$이므로 $${piTerm(V)}\\,\\mathrm{cm}^3$이다.`,
            facts: { branch, r, deg, h, base, arc, V, ans: V },
          };
        }
        const pi = 2 * base + arc * h; // $\pi$ 가 붙는 몫
        const flat = 2 * r * h; // 두 반지름이 만드는 직사각형 둘
        return {
          content: `밑면이 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 중심각의 크기가 $${deg}^\\circ$인 부채꼴이며 높이가 $${h}\\,\\mathrm{cm}$인 기둥의 겉넓이를 구하시오.`,
          answer: `$(${piTerm(pi)}+${flat})\\,\\mathrm{cm}^2$`,
          solution: `밑넓이는 $\\pi\\times${r}^{2}\\times\\dfrac{${deg}}{360}=${piTerm(base)}$이므로 두 밑면의 넓이의 합은 $${piTerm(2 * base)}$이다.\n밑면의 둘레의 길이는 (호의 길이)$+$(반지름의 길이)$\\times2=${piTerm(arc)}+${2 * r}$이므로 옆넓이는 $(${piTerm(arc)}+${2 * r})\\times${h}=${piTerm(arc * h)}+${flat}$이다.\n따라서 겉넓이는 $${piTerm(2 * base)}+${piTerm(arc * h)}+${flat}=${piTerm(pi)}+${flat}$이다.`,
          facts: { branch, r, deg, h, base, arc, pi, flat, ans: pi },
        };
      }),
    // 답이 발문의 **중심각**과 우연히 같은 수가 되는 일이 있다($r=6$·$90^\circ$·$h=10$
    // 이면 부피가 $90\pi$). 수학은 맞지만 지면에서는 답을 적어 준 것처럼 읽힌다.
    (f) => (f.branch === 0 ? [f.V!] : [f.pi!, f.flat!]),
  ),

  def(
    MINOR_AREA,
    "07",
    "구멍이 뚫린 기둥의 겉넓이와 부피",
    SEC.기둥,
    "hard",
    (rng) =>
      attempt(200, (): Body | null => {
        const shape = pick(rng, [0, 1] as const);
        const ask = pick(rng, [0, 1] as const); // 0 겉넓이 · 1 부피
        if (shape === 0) {
          const R = intBetween(rng, 3, 9);
          const r = intBetween(rng, 1, R - 2);
          const h = intBetween(rng, 4, 14);
          const S = 2 * (R * R - r * r) + 2 * R * h + 2 * r * h;
          const V = (R * R - r * r) * h;
          const val = ask === 0 ? S : V;
          return {
            content: `오른쪽 그림은 밑면인 원의 반지름의 길이가 $${R}\\,\\mathrm{cm}$이고 높이가 $${h}\\,\\mathrm{cm}$인 원기둥의 한가운데에 원기둥 모양의 구멍을 뚫은 입체도형이다. 이 입체도형의 ${ask === 0 ? "겉넓이" : "부피"}를 구하시오.`,
            answer: `$${piTerm(val)}\\,\\mathrm{cm}^${ask === 0 ? 2 : 3}$`,
            solution: `큰 원기둥의 밑면인 원의 반지름의 길이는 $${R}\\,\\mathrm{cm}$, 구멍의 반지름의 길이는 $${r}\\,\\mathrm{cm}$, 높이는 $${h}\\,\\mathrm{cm}$이다.\n밑넓이는 $\\pi\\times${R}^{2}-\\pi\\times${r}^{2}=${piTerm(R * R - r * r)}$이다.\n${ask === 0 ? `옆넓이는 바깥쪽 $2\\pi\\times${R}\\times${h}=${piTerm(2 * R * h)}$과 안쪽 $2\\pi\\times${r}\\times${h}=${piTerm(2 * r * h)}$의 합이다.\n따라서 겉넓이는 $2\\times${piTerm(R * R - r * r)}+${piTerm(2 * R * h)}+${piTerm(2 * r * h)}=${piTerm(S)}$이다.` : `따라서 부피는 $${piTerm(R * R - r * r)}\\times${h}=${piTerm(V)}$이다.`}`,
            facts: { shape, ask, R, r, h, S, V, ans: val },
            figureSpec: {
              version: "elem-1",
              kind: "hollowSolid",
              outer: { shape: "cylinder", r: R, h },
              inner: { shape: "cylinder", r },
            },
          };
        }
        const w = intBetween(rng, 4, 12);
        const d = intBetween(rng, 4, 12);
        const h = intBetween(rng, 4, 12);
        const iw = intBetween(rng, 1, w - 2);
        const id = intBetween(rng, 1, d - 2);
        const S = 2 * (w * d - iw * id) + 2 * (w + d) * h + 2 * (iw + id) * h;
        const V = (w * d - iw * id) * h;
        const val = ask === 0 ? S : V;
        return {
          content: `오른쪽 그림은 가로의 길이가 $${w}\\,\\mathrm{cm}$, 세로의 길이가 $${d}\\,\\mathrm{cm}$, 높이가 $${h}\\,\\mathrm{cm}$인 직육면체의 한가운데에 직육면체 모양의 구멍을 뚫은 입체도형이다. 이 입체도형의 ${ask === 0 ? "겉넓이" : "부피"}를 구하시오.`,
          answer: `$${val}\\,\\mathrm{cm}^${ask === 0 ? 2 : 3}$`,
          solution: `바깥 직육면체는 가로 $${w}\\,\\mathrm{cm}$, 세로 $${d}\\,\\mathrm{cm}$, 높이 $${h}\\,\\mathrm{cm}$이고 구멍은 가로 $${iw}\\,\\mathrm{cm}$, 세로 $${id}\\,\\mathrm{cm}$이다.\n밑넓이는 $${w}\\times${d}-${iw}\\times${id}=${w * d - iw * id}$이다.\n${ask === 0 ? `옆넓이는 바깥쪽 $2\\times(${w}+${d})\\times${h}=${2 * (w + d) * h}$과 안쪽 $2\\times(${iw}+${id})\\times${h}=${2 * (iw + id) * h}$의 합이다.\n따라서 겉넓이는 $2\\times${w * d - iw * id}+${2 * (w + d) * h}+${2 * (iw + id) * h}=${S}$이다.` : `따라서 부피는 $${w * d - iw * id}\\times${h}=${V}$이다.`}`,
          facts: { shape, ask, w, d, h, iw, id, S, V, ans: val },
          figureSpec: {
            version: "elem-1",
            kind: "hollowSolid",
            outer: { shape: "cuboid", w, d, h },
            inner: { shape: "cuboid", w: iw, d: id },
          },
        };
      }),
  ),

  def(
    MINOR_AREA,
    "08",
    "일부분을 잘라 낸 입체도형의 겉넓이와 부피",
    SEC.기둥,
    "mid",
    (rng) =>
      attempt(200, (): Body | null => {
        const ask = pick(rng, [0, 1] as const);
        const w = intBetween(rng, 5, 14);
        const d = intBetween(rng, 5, 14);
        const h = intBetween(rng, 5, 14);
        const cw = intBetween(rng, 1, w - 2);
        const cd = intBetween(rng, 1, d - 2);
        const ch = intBetween(rng, 1, h - 2);
        // 한 꼭짓점에 붙은 작은 직육면체를 떼면 없어진 세 면과 새로 생긴 세 면의
        // 넓이가 같다 — 겉넓이는 잘라 내기 전과 **똑같다**.
        const S = 2 * (w * d + d * h + h * w);
        const V = w * d * h - cw * cd * ch;
        const val = ask === 0 ? S : V;
        return {
          content: `오른쪽 그림은 가로의 길이가 $${w}\\,\\mathrm{cm}$, 세로의 길이가 $${d}\\,\\mathrm{cm}$, 높이가 $${h}\\,\\mathrm{cm}$인 직육면체에서 한 꼭짓점을 포함하는 작은 직육면체를 잘라 내고 남은 입체도형이다. 이 입체도형의 ${ask === 0 ? "겉넓이" : "부피"}를 구하시오.`,
          answer: `$${val}\\,\\mathrm{cm}^${ask === 0 ? 2 : 3}$`,
          solution: `잘라 내기 전 직육면체는 가로 $${w}\\,\\mathrm{cm}$, 세로 $${d}\\,\\mathrm{cm}$, 높이 $${h}\\,\\mathrm{cm}$이고, 잘라 낸 직육면체는 $${cw}\\,\\mathrm{cm}$, $${cd}\\,\\mathrm{cm}$, $${ch}\\,\\mathrm{cm}$이다.\n${ask === 0 ? `없어진 세 면의 넓이의 합과 새로 생긴 세 면의 넓이의 합이 같으므로 겉넓이는 잘라 내기 전과 같다.\n따라서 겉넓이는 $2\\times(${w}\\times${d}+${d}\\times${h}+${h}\\times${w})=${S}$이다.` : `(부피)$=${w}\\times${d}\\times${h}-${cw}\\times${cd}\\times${ch}=${w * d * h}-${cw * cd * ch}=${V}$이다.`}`,
          facts: { ask, w, d, h, cw, cd, ch, S, V, ans: val },
          figureSpec: {
            version: "elem-1",
            kind: "cutCuboid",
            w,
            d,
            h,
            cut: { x: 0, w: cw, d: cd, h: ch },
          },
        };
      }),
  ),

  def(
    MINOR_AREA,
    "09",
    "회전체의 겉넓이와 부피 원기둥",
    SEC.기둥,
    "mid",
    (rng) =>
      attempt(200, (): Body | null => {
        const branch = pick(rng, [0, 1] as const);
        if (branch === 0) {
          const r = intBetween(rng, 2, 9);
          const h = intBetween(rng, 3, 12);
          if (r === h) return null;
          const S = 2 * r * (r + h);
          const V = r * r * h;
          return {
            content: `오른쪽 그림과 같이 가로의 길이가 $${r}\\,\\mathrm{cm}$, 세로의 길이가 $${h}\\,\\mathrm{cm}$인 직사각형을 직선 $l$을 회전축으로 하여 $1$회전 시킬 때 생기는 회전체의 겉넓이와 부피를 차례로 구하시오.`,
            answer: `겉넓이 $${piTerm(S)}\\,\\mathrm{cm}^2$, 부피 $${piTerm(V)}\\,\\mathrm{cm}^3$`,
            solution: `생기는 회전체는 밑면인 원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 높이가 $${h}\\,\\mathrm{cm}$인 원기둥이다.\n(겉넓이)$=2\\times\\pi\\times${r}^{2}+2\\pi\\times${r}\\times${h}=${piTerm(2 * r * r)}+${piTerm(2 * r * h)}=${piTerm(S)}$이다.\n(부피)$=\\pi\\times${r}^{2}\\times${h}=${piTerm(V)}$이다.`,
            facts: { branch, r, h, S, V, ans: S },
            figureSpec: {
              version: "elem-1",
              kind: "revolvePlan",
              pieces: [{ shape: "rect", w: r, h }],
            },
          };
        }
        // 축에서 떨어진 직사각형 — 속이 빈 원기둥(도넛 모양 기둥)이 생긴다.
        const g = intBetween(rng, 1, 6);
        const t = intBetween(rng, 1, 6);
        const h = intBetween(rng, 3, 12);
        const R = g + t;
        const S = 2 * (R * R - g * g) + 2 * R * h + 2 * g * h;
        const V = (R * R - g * g) * h;
        return {
          content: `오른쪽 그림과 같이 회전축인 직선 $l$에서 $${g}\\,\\mathrm{cm}$만큼 떨어진 곳에 가로의 길이가 $${t}\\,\\mathrm{cm}$, 세로의 길이가 $${h}\\,\\mathrm{cm}$인 직사각형이 있다. 이 직사각형을 직선 $l$을 회전축으로 하여 $1$회전 시킬 때 생기는 회전체의 겉넓이와 부피를 차례로 구하시오.`,
          answer: `겉넓이 $${piTerm(S)}\\,\\mathrm{cm}^2$, 부피 $${piTerm(V)}\\,\\mathrm{cm}^3$`,
          solution: `생기는 회전체는 큰 원기둥에서 반지름의 길이가 $${g}\\,\\mathrm{cm}$인 원기둥을 도려낸 모양이고, 큰 원기둥의 밑면인 원의 반지름의 길이는 $${g}+${t}=${R}\\,(\\mathrm{cm})$이다.\n밑넓이는 $\\pi\\times${R}^{2}-\\pi\\times${g}^{2}=${piTerm(R * R - g * g)}$이다.\n(겉넓이)$=2\\times${piTerm(R * R - g * g)}+2\\pi\\times${R}\\times${h}+2\\pi\\times${g}\\times${h}=${piTerm(S)}$이다.\n(부피)$=${piTerm(R * R - g * g)}\\times${h}=${piTerm(V)}$이다.`,
          facts: { branch, g, t, h, R, S, V, ans: S },
          figureSpec: {
            version: "elem-1",
            kind: "revolvePlan",
            gap: g,
            pieces: [{ shape: "rect", w: t, h }],
          },
        };
      }),
    (f) => [f.S!, f.V!],
  ),

  def(MINOR_AREA, "10", "각뿔의 겉넓이", SEC.뿔, "mid", (rng) =>
    attempt(200, (): Body | null => {
      const branch = pick(rng, [0, 1, 2] as const);
      if (branch === 1) {
        // 오각뿔의 옆넓이 — 밑면의 모양이 정오각형이면 옆면은 합동인 이등변삼각형 다섯.
        const a = intBetween(rng, 3, 12);
        const l = intBetween(rng, 4, 15);
        if ((5 * a * l) % 2 !== 0) return null;
        const side = (5 * a * l) / 2;
        return {
          content: `밑면은 한 변의 길이가 $${a}\\,\\mathrm{cm}$인 정오각형이고 옆면은 모두 높이가 $${l}\\,\\mathrm{cm}$인 합동인 이등변삼각형인 오각뿔이 있다. 이 오각뿔의 옆넓이를 구하시오.`,
          answer: `$${side}\\,\\mathrm{cm}^2$`,
          solution: `옆면인 이등변삼각형 한 개의 넓이는 $\\dfrac{1}{2}\\times${a}\\times${l}=${(a * l) / 2}$이다.\n옆면은 $5$개이므로 옆넓이는 $5\\times${(a * l) / 2}=${side}$이다.`,
          facts: { branch, a, l, side, ans: side },
        };
      }
      // 사각뿔 — 밑면의 한 변의 절반·높이·옆면의 높이가 정수 직각삼각형이라
      // 겨냥도의 높이를 지어내지 않는다. 한 변이 $16\,\mathrm{cm}$ 를 넘으면
      // 겉넓이가 네 자리로 커져 중1 지면에 안 어울린다 — 그런 쌍은 버린다.
      const [m, H, l] = pick(rng, TRIPLES);
      const a = 2 * m;
      if (H > 20 || a > 16) return null;
      const S = a * a + 2 * a * l;
      if (branch === 0) {
        return {
          content: `오른쪽 그림과 같이 밑면은 한 변의 길이가 $${a}\\,\\mathrm{cm}$인 정사각형이고 옆면은 모두 높이가 $${l}\\,\\mathrm{cm}$인 합동인 이등변삼각형인 사각뿔의 겉넓이를 구하시오.`,
          answer: `$${S}\\,\\mathrm{cm}^2$`,
          solution: `밑넓이는 $${a}\\times${a}=${a * a}$이다.\n옆면인 이등변삼각형 한 개의 넓이는 $\\dfrac{1}{2}\\times${a}\\times${l}=${(a * l) / 2}$이고 옆면은 $4$개이므로 옆넓이는 $4\\times${(a * l) / 2}=${2 * a * l}$이다.\n따라서 겉넓이는 $${a * a}+${2 * a * l}=${S}$이다.`,
          facts: { branch, a, l, H, S, ans: S },
          figureSpec: { version: "elem-1", kind: "pyramid", sides: 4, h: H },
        };
      }
      return {
        content: `오른쪽 그림과 같이 밑면은 한 변의 길이가 $${a}\\,\\mathrm{cm}$인 정사각형이고 옆면은 모두 합동인 이등변삼각형인 사각뿔이 있다. 이 사각뿔의 겉넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 옆면인 이등변삼각형의 높이를 구하시오.`,
        answer: `$${l}\\,\\mathrm{cm}$`,
        solution: `밑넓이는 $${a}\\times${a}=${a * a}$이므로 옆넓이는 $${S}-${a * a}=${2 * a * l}$이다.\n옆면인 이등변삼각형의 높이를 $x\\,\\mathrm{cm}$라 하면 $4\\times\\dfrac{1}{2}\\times${a}\\times x=${2 * a * l}$이다.\n따라서 $x=${l}$이므로 $${l}\\,\\mathrm{cm}$이다.`,
        facts: { branch, a, l, H, S, ans: l },
        figureSpec: { version: "elem-1", kind: "pyramid", sides: 4, h: H },
      };
    }),
  ),

  def(MINOR_AREA, "11", "원뿔의 겉넓이", SEC.뿔, "mid", (rng) =>
    attempt(200, (): Body | null => {
      const branch = pick(rng, [0, 1, 2] as const);
      const r = intBetween(rng, 2, 10);
      const l = intBetween(rng, r + 1, 20);
      const S = r * (r + l);
      const side = r * l;
      if (branch === 0) {
        return {
          content: `밑면인 원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 모선의 길이가 $${l}\\,\\mathrm{cm}$인 원뿔의 겉넓이를 구하시오.`,
          answer: `$${piTerm(S)}\\,\\mathrm{cm}^2$`,
          solution: `밑넓이는 $\\pi\\times${r}^{2}=${piTerm(r * r)}$이다.\n옆넓이는 $\\pi\\times${r}\\times${l}=${piTerm(side)}$이다.\n따라서 겉넓이는 $${piTerm(r * r)}+${piTerm(side)}=${piTerm(S)}$이다.`,
          facts: { branch, r, l, S, side, ans: S },
        };
      }
      if (branch === 1) {
        return {
          content: `밑면인 원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$인 원뿔의 겉넓이가 $${piTerm(S)}\\,\\mathrm{cm}^2$일 때, 이 원뿔의 모선의 길이를 구하시오.`,
          answer: `$${l}\\,\\mathrm{cm}$`,
          solution: `밑넓이는 $\\pi\\times${r}^{2}=${piTerm(r * r)}$이므로 옆넓이는 $${piTerm(S)}-${piTerm(r * r)}=${piTerm(side)}$이다.\n모선의 길이를 $x\\,\\mathrm{cm}$라 하면 $\\pi\\times${r}\\times x=${piTerm(side)}$이다.\n따라서 $x=${l}$이므로 $${l}\\,\\mathrm{cm}$이다.`,
          facts: { branch, r, l, S, side, ans: l },
        };
      }
      return {
        content: `밑면인 원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$인 원뿔의 옆넓이가 $${piTerm(side)}\\,\\mathrm{cm}^2$일 때, 이 원뿔의 겉넓이를 구하시오.`,
        answer: `$${piTerm(S)}\\,\\mathrm{cm}^2$`,
        solution: `밑넓이는 $\\pi\\times${r}^{2}=${piTerm(r * r)}$이다.\n따라서 겉넓이는 $${piTerm(r * r)}+${piTerm(side)}=${piTerm(S)}$이다.`,
        facts: { branch, r, l, S, side, ans: S },
      };
    }),
  ),

  def(MINOR_AREA, "12", "뿔대의 겉넓이", SEC.뿔, "hard", (rng) =>
    attempt(200, (): Body | null => {
      const branch = pick(rng, [0, 1] as const);
      if (branch === 0) {
        const a = intBetween(rng, 6, 16); // 아래 밑면 한 변
        const b = intBetween(rng, 2, a - 2); // 위 밑면 한 변
        const m = intBetween(rng, 3, 12); // 옆면인 사다리꼴의 높이
        const S = a * a + b * b + 2 * (a + b) * m;
        return {
          content: `두 밑면이 각각 한 변의 길이가 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$인 정사각형이고 옆면은 모두 높이가 $${m}\\,\\mathrm{cm}$인 합동인 사다리꼴인 사각뿔대의 겉넓이를 구하시오.`,
          answer: `$${S}\\,\\mathrm{cm}^2$`,
          solution: `두 밑면의 넓이의 합은 $${a}\\times${a}+${b}\\times${b}=${a * a}+${b * b}=${a * a + b * b}$이다.\n옆면인 사다리꼴 한 개의 넓이는 $\\dfrac{1}{2}\\times(${a}+${b})\\times${m}=${((a + b) * m) / 2}$이고 옆면은 $4$개이므로 옆넓이는 $${2 * (a + b) * m}$이다.\n따라서 겉넓이는 $${a * a + b * b}+${2 * (a + b) * m}=${S}$이다.`,
          facts: { branch, a, b, m, S, ans: S },
        };
      }
      // 원뿔대 — 옆넓이는 (큰 부채꼴)$-$(작은 부채꼴)이고 그 값이 $\pi(R+r)s$ 다.
      const d = pick(rng, [1, 2, 3, 4] as const);
      const r = intBetween(rng, 1, 8);
      const R = r + d;
      const k = intBetween(rng, 2, 5);
      const s = d * k; // 뿔대의 모선
      const L = (s * R) / d; // 큰 원뿔의 모선
      const Ls = (s * r) / d; // 작은 원뿔의 모선
      if (!Number.isInteger(L) || !Number.isInteger(Ls)) return null;
      if (L > 60) return null;
      const side = (R + r) * s;
      const S = R * R + r * r + side;
      return {
        content: `두 밑면인 원의 반지름의 길이가 각각 $${R}\\,\\mathrm{cm}$, $${r}\\,\\mathrm{cm}$이고 모선의 길이가 $${s}\\,\\mathrm{cm}$인 원뿔대의 겉넓이를 구하시오.`,
        answer: `$${piTerm(S)}\\,\\mathrm{cm}^2$`,
        solution: `원뿔대를 이루기 전 큰 원뿔의 모선의 길이를 $x\\,\\mathrm{cm}$라 하면 $${R}:${r}=x:(x-${s})$에서 $x=${L}$이고, 잘라 낸 작은 원뿔의 모선의 길이는 $${Ls}\\,\\mathrm{cm}$이다.\n옆넓이는 $\\pi\\times${R}\\times${L}-\\pi\\times${r}\\times${Ls}=${piTerm(R * L)}-${piTerm(r * Ls)}=${piTerm(side)}$이다.\n두 밑면의 넓이의 합은 $${piTerm(R * R)}+${piTerm(r * r)}=${piTerm(R * R + r * r)}$이다.\n따라서 겉넓이는 $${piTerm(R * R + r * r)}+${piTerm(side)}=${piTerm(S)}$이다.`,
        facts: { branch, R, r, s, L, Ls, side, S, ans: S },
      };
    }),
  ),

  def(MINOR_AREA, "13", "각뿔의 부피", SEC.뿔, "mid", (rng) =>
    attempt(200, (): Body | null => {
      const branch = pick(rng, [0, 1, 2] as const);
      if (branch === 1) {
        const p = intBetween(rng, 3, 12);
        const q = intBetween(rng, 3, 12);
        const h = intBetween(rng, 3, 15);
        if ((p * q * h) % 6 !== 0) return null;
        const V = (p * q * h) / 6;
        return {
          content: `밑면이 직각을 낀 두 변의 길이가 각각 $${p}\\,\\mathrm{cm}$, $${q}\\,\\mathrm{cm}$인 직각삼각형이고 높이가 $${h}\\,\\mathrm{cm}$인 삼각뿔의 부피를 구하시오.`,
          answer: `$${V}\\,\\mathrm{cm}^3$`,
          solution: `밑넓이는 $\\dfrac{1}{2}\\times${p}\\times${q}=${(p * q) / 2}$이다.\n(부피)$=\\dfrac{1}{3}\\times$(밑넓이)$\\times$(높이)$=\\dfrac{1}{3}\\times${(p * q) / 2}\\times${h}=${V}$이다.`,
          facts: { branch, p, q, h, V, ans: V },
          figureSpec: { version: "elem-1", kind: "pyramid", sides: 3, h },
        };
      }
      const a = intBetween(rng, 3, 14);
      const h = intBetween(rng, 3, 18);
      if ((a * a * h) % 3 !== 0) return null;
      const V = (a * a * h) / 3;
      if (branch === 0) {
        return {
          content: `오른쪽 그림과 같이 밑면이 한 변의 길이가 $${a}\\,\\mathrm{cm}$인 정사각형이고 높이가 $${h}\\,\\mathrm{cm}$인 사각뿔의 부피를 구하시오.`,
          answer: `$${V}\\,\\mathrm{cm}^3$`,
          solution: `밑넓이는 $${a}\\times${a}=${a * a}$이다.\n(부피)$=\\dfrac{1}{3}\\times${a * a}\\times${h}=${V}$이다.`,
          facts: { branch, a, h, V, ans: V },
          figureSpec: { version: "elem-1", kind: "pyramid", sides: 4, h },
        };
      }
      return {
        content: `오른쪽 그림과 같이 밑면이 한 변의 길이가 $${a}\\,\\mathrm{cm}$인 정사각형인 사각뿔의 부피가 $${V}\\,\\mathrm{cm}^3$일 때, 이 사각뿔의 높이를 구하시오.`,
        answer: `$${h}\\,\\mathrm{cm}$`,
        solution: `밑넓이는 $${a}\\times${a}=${a * a}$이다.\n높이를 $x\\,\\mathrm{cm}$라 하면 $\\dfrac{1}{3}\\times${a * a}\\times x=${V}$이다.\n따라서 $x=${h}$이므로 $${h}\\,\\mathrm{cm}$이다.`,
        facts: { branch, a, h, V, ans: h },
        figureSpec: { version: "elem-1", kind: "pyramid", sides: 4, h },
      };
    }),
  ),

  def(MINOR_AREA, "14", "원뿔의 부피", SEC.뿔, "mid", (rng) =>
    attempt(200, (): Body | null => {
      const branch = pick(rng, [0, 1, 2] as const);
      const r = intBetween(rng, 2, 12);
      const h = intBetween(rng, 3, 18);
      if ((r * r * h) % 3 !== 0) return null;
      const V = (r * r * h) / 3;
      const cyl = r * r * h;
      if (branch === 0) {
        return {
          content: `오른쪽 그림과 같이 밑면인 원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 높이가 $${h}\\,\\mathrm{cm}$인 원뿔의 부피를 구하시오.`,
          answer: `$${piTerm(V)}\\,\\mathrm{cm}^3$`,
          solution: `밑넓이는 $\\pi\\times${r}^{2}=${piTerm(r * r)}$이다.\n(부피)$=\\dfrac{1}{3}\\times${piTerm(r * r)}\\times${h}=${piTerm(V)}$이다.`,
          facts: { branch, r, h, V, cyl, ans: V },
          figureSpec: { version: "elem-1", kind: "cone", r, h },
        };
      }
      if (branch === 1) {
        return {
          content: `밑면인 원의 둘레의 길이가 $${piTerm(2 * r)}\\,\\mathrm{cm}$이고 높이가 $${h}\\,\\mathrm{cm}$인 원뿔의 부피를 구하시오.`,
          answer: `$${piTerm(V)}\\,\\mathrm{cm}^3$`,
          solution: `밑면인 원의 반지름의 길이를 $x\\,\\mathrm{cm}$라 하면 $2\\pi x=${piTerm(2 * r)}$에서 $x=${r}$이다.\n밑넓이는 $\\pi\\times${r}^{2}=${piTerm(r * r)}$이므로 부피는 $\\dfrac{1}{3}\\times${piTerm(r * r)}\\times${h}=${piTerm(V)}$이다.`,
          facts: { branch, r, h, V, cyl, ans: V },
        };
      }
      return {
        content: `오른쪽 그림과 같이 밑면인 원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$인 원뿔의 부피가 $${piTerm(V)}\\,\\mathrm{cm}^3$일 때, 이 원뿔의 높이를 구하시오.`,
        answer: `$${h}\\,\\mathrm{cm}$`,
        solution: `밑넓이는 $\\pi\\times${r}^{2}=${piTerm(r * r)}$이다.\n높이를 $x\\,\\mathrm{cm}$라 하면 $\\dfrac{1}{3}\\times${piTerm(r * r)}\\times x=${piTerm(V)}$이다.\n따라서 $x=${h}$이므로 $${h}\\,\\mathrm{cm}$이다.`,
        facts: { branch, r, h, V, cyl, ans: h },
        figureSpec: { version: "elem-1", kind: "cone", r, h },
      };
    }),
  ),

  def(MINOR_AREA, "15", "뿔대의 부피", SEC.뿔, "hard", (rng) =>
    attempt(300, (): Body | null => {
      const branch = pick(rng, [0, 1] as const);
      // 닮음비 $b:a$ 로 잘린 뿔대 — 큰 뿔의 높이 `Hb`, 작은 뿔의 높이 `Hs`.
      const a = intBetween(rng, 4, 15);
      const b = intBetween(rng, 2, a - 1);
      const d = a - b;
      const k = intBetween(rng, 1, 4);
      const hh = d * k; // 뿔대의 높이
      const Hb = (hh * a) / d;
      const Hs = (hh * b) / d;
      if (!Number.isInteger(Hb) || !Number.isInteger(Hs)) return null;
      if (Hb > 60) return null;
      if (branch === 0) {
        const big = a * a * Hb;
        const small = b * b * Hs;
        if ((big - small) % 3 !== 0) return null;
        const V = (big - small) / 3;
        return {
          content: `두 밑면이 각각 한 변의 길이가 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$인 정사각형이고 높이가 $${hh}\\,\\mathrm{cm}$인 사각뿔대의 부피를 구하시오.`,
          answer: `$${V}\\,\\mathrm{cm}^3$`,
          solution: `잘라 내기 전 큰 사각뿔의 높이를 $x\\,\\mathrm{cm}$라 하면 $${a}:${b}=x:(x-${hh})$에서 $x=${Hb}$이고, 잘라 낸 작은 사각뿔의 높이는 $${Hs}\\,\\mathrm{cm}$이다.\n큰 사각뿔의 부피는 $\\dfrac{1}{3}\\times${a * a}\\times${Hb}=${big / 3}$이고 작은 사각뿔의 부피는 $\\dfrac{1}{3}\\times${b * b}\\times${Hs}=${small / 3}$이다.\n따라서 사각뿔대의 부피는 $${big / 3}-${small / 3}=${V}$이다.`,
          facts: { branch, a, b, hh, Hb, Hs, V, ans: V },
        };
      }
      const big = a * a * Hb;
      const small = b * b * Hs;
      if ((big - small) % 3 !== 0) return null;
      const V = (big - small) / 3;
      return {
        content: `두 밑면인 원의 반지름의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$이고 높이가 $${hh}\\,\\mathrm{cm}$인 원뿔대의 부피를 구하시오.`,
        answer: `$${piTerm(V)}\\,\\mathrm{cm}^3$`,
        solution: `잘라 내기 전 큰 원뿔의 높이를 $x\\,\\mathrm{cm}$라 하면 $${a}:${b}=x:(x-${hh})$에서 $x=${Hb}$이고, 잘라 낸 작은 원뿔의 높이는 $${Hs}\\,\\mathrm{cm}$이다.\n큰 원뿔의 부피는 $\\dfrac{1}{3}\\times${piTerm(a * a)}\\times${Hb}=${piTerm(big / 3)}$이고 작은 원뿔의 부피는 $\\dfrac{1}{3}\\times${piTerm(b * b)}\\times${Hs}=${piTerm(small / 3)}$이다.\n따라서 원뿔대의 부피는 $${piTerm(big / 3)}-${piTerm(small / 3)}=${piTerm(V)}$이다.`,
        facts: { branch, a, b, hh, Hb, Hs, V, ans: V },
      };
    }),
  ),

  def(
    MINOR_AREA,
    "16",
    "잘라 낸 각뿔의 부피",
    SEC.뿔,
    "mid",
    (rng) =>
      attempt(300, (): Body | null => {
        const branch = pick(rng, [0, 1, 2] as const);
        const a = intBetween(rng, 3, 14);
        const b = intBetween(rng, 3, 14);
        const c = intBetween(rng, 3, 14);
        if ((a * b * c) % 6 !== 0) return null;
        const box = a * b * c;
        const cut = box / 6;
        const rest = box - cut;
        if (branch === 0) {
          return {
            content: `직육면체의 한 꼭짓점에 모인 세 모서리의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$, $${c}\\,\\mathrm{cm}$이다. 이 꼭짓점과 이웃한 세 꼭짓점을 지나는 평면으로 자를 때 생기는 삼각뿔의 부피를 구하시오.`,
            answer: `$${cut}\\,\\mathrm{cm}^3$`,
            solution: `잘라 낸 삼각뿔은 밑면이 직각을 낀 두 변의 길이가 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$인 직각삼각형이고 높이가 $${c}\\,\\mathrm{cm}$이다.\n밑넓이는 $\\dfrac{1}{2}\\times${a}\\times${b}=${(a * b) / 2}$이다.\n(부피)$=\\dfrac{1}{3}\\times${(a * b) / 2}\\times${c}=${cut}$이다.`,
            facts: { branch, a, b, c, box, cut, rest, ans: cut },
          };
        }
        if (branch === 1) {
          return {
            content: `가로의 길이가 $${a}\\,\\mathrm{cm}$, 세로의 길이가 $${b}\\,\\mathrm{cm}$, 높이가 $${c}\\,\\mathrm{cm}$인 직육면체를 한 꼭짓점과 그 꼭짓점에 이웃한 세 꼭짓점을 지나는 평면으로 잘라 낼 때, 남은 입체도형의 부피를 구하시오.`,
            answer: `$${rest}\\,\\mathrm{cm}^3$`,
            solution: `직육면체의 부피는 $${a}\\times${b}\\times${c}=${box}$이다.\n잘라 낸 삼각뿔의 부피는 $\\dfrac{1}{3}\\times\\dfrac{1}{2}\\times${a}\\times${b}\\times${c}=${cut}$이다.\n따라서 남은 입체도형의 부피는 $${box}-${cut}=${rest}$이다.`,
            facts: { branch, a, b, c, box, cut, rest, ans: rest },
          };
        }
        return {
          content: `가로의 길이가 $${a}\\,\\mathrm{cm}$, 세로의 길이가 $${b}\\,\\mathrm{cm}$, 높이가 $${c}\\,\\mathrm{cm}$인 직육면체를 한 꼭짓점과 그 꼭짓점에 이웃한 세 꼭짓점을 지나는 평면으로 잘랐다. 잘라 낸 삼각뿔의 부피는 직육면체의 부피의 몇 분의 몇인지 그 분모를 구하시오.`,
          answer: `$6$`,
          solution: `잘라 낸 삼각뿔의 부피는 $\\dfrac{1}{3}\\times\\dfrac{1}{2}\\times${a}\\times${b}\\times${c}=${cut}$이고 직육면체의 부피는 $${box}$이다.\n$${cut}\\div${box}=\\dfrac{1}{6}$이므로 분모는 $6$이다.`,
          facts: { branch, a, b, c, box, cut, rest, ans: 6 },
        };
      }),
    () => [],
  ),

  def(
    MINOR_AREA,
    "17",
    "직육면체 모양의 그릇에 담긴 물의 부피",
    SEC.기둥,
    "hard",
    (rng) =>
      attempt(300, (): Body | null => {
        const branch = pick(rng, [0, 1, 2] as const);
        const a = intBetween(rng, 4, 20);
        const b = intBetween(rng, 4, 20);
        const c = intBetween(rng, 4, 20);
        if (branch === 0) {
          if ((a * c) % 2 !== 0) return null;
          const V = ((a * c) / 2) * b;
          return {
            content: `가로의 길이가 $${a}\\,\\mathrm{cm}$, 세로의 길이가 $${b}\\,\\mathrm{cm}$, 높이가 $${c}\\,\\mathrm{cm}$인 직육면체 모양의 그릇에 물을 가득 채운 후 그릇을 기울여 물을 흘려 보냈더니, 남은 물이 밑면은 직각을 낀 두 변의 길이가 $${a}\\,\\mathrm{cm}$, $${c}\\,\\mathrm{cm}$인 직각삼각형이고 높이가 $${b}\\,\\mathrm{cm}$인 삼각기둥 모양이 되었다. 남은 물의 부피를 구하시오. (단, 그릇의 두께는 생각하지 않는다.)`,
            answer: `$${V}\\,\\mathrm{cm}^3$`,
            solution: `남은 물이 이루는 삼각기둥의 밑넓이는 $\\dfrac{1}{2}\\times${a}\\times${c}=${(a * c) / 2}$이다.\n(부피)$=$(밑넓이)$\\times$(높이)$=${(a * c) / 2}\\times${b}=${V}$이다.`,
            facts: { branch, a, b, c, V, ans: V },
          };
        }
        if ((a * b * c) % 6 !== 0) return null;
        const V = (a * b * c) / 6;
        if (branch === 1) {
          return {
            content: `가로의 길이가 $${a}\\,\\mathrm{cm}$, 세로의 길이가 $${b}\\,\\mathrm{cm}$, 높이가 $${c}\\,\\mathrm{cm}$인 직육면체 모양의 그릇에 물을 가득 채운 후 그릇을 기울여 물을 흘려 보냈더니, 남은 물이 세 모서리의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$, $${c}\\,\\mathrm{cm}$인 삼각뿔 모양이 되었다. 남은 물의 부피를 구하시오. (단, 그릇의 두께는 생각하지 않는다.)`,
            answer: `$${V}\\,\\mathrm{cm}^3$`,
            solution: `남은 물이 이루는 삼각뿔의 밑넓이는 $\\dfrac{1}{2}\\times${a}\\times${b}=${(a * b) / 2}$이다.\n(부피)$=\\dfrac{1}{3}\\times${(a * b) / 2}\\times${c}=${V}$이다.`,
            facts: { branch, a, b, c, V, ans: V },
          };
        }
        const box = a * b * c;
        const spill = box - V;
        return {
          content: `가로의 길이가 $${a}\\,\\mathrm{cm}$, 세로의 길이가 $${b}\\,\\mathrm{cm}$, 높이가 $${c}\\,\\mathrm{cm}$인 직육면체 모양의 그릇에 물을 가득 채운 후 그릇을 기울여 물을 흘려 보냈더니, 남은 물이 세 모서리의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$, $${c}\\,\\mathrm{cm}$인 삼각뿔 모양이 되었다. 흘려 보낸 물의 부피를 구하시오. (단, 그릇의 두께는 생각하지 않는다.)`,
          answer: `$${spill}\\,\\mathrm{cm}^3$`,
          solution: `그릇을 가득 채운 물의 부피는 $${a}\\times${b}\\times${c}=${box}$이다.\n남은 물이 이루는 삼각뿔의 부피는 $\\dfrac{1}{3}\\times\\dfrac{1}{2}\\times${a}\\times${b}\\times${c}=${V}$이다.\n따라서 흘려 보낸 물의 부피는 $${box}-${V}=${spill}$이다.`,
          facts: { branch, a, b, c, V, box, spill, ans: spill },
        };
      }),
  ),

  def(
    MINOR_AREA,
    "19",
    "전개도가 주어진 원뿔의 겉넓이와 부피",
    SEC.뿔,
    "mid",
    (rng) =>
      attempt(300, (): Body | null => {
        // 치수는 **엔진이 쓴다**(모선·중심각) — 발문은 수를 한 자도 안 적는다.
        const ask = pick(rng, [0, 1, 2] as const);
        const r = intBetween(rng, 1, 9);
        const l = intBetween(rng, r + 1, 20);
        const deg = (360 * r) / l;
        if (!Number.isInteger(deg) || deg < 30 || deg > 330) return null;
        const side = r * l;
        const S = r * (r + l);
        const val = ask === 0 ? S : ask === 1 ? side : r;
        const askKo =
          ask === 0
            ? "겉넓이"
            : ask === 1
              ? "옆넓이"
              : "밑면인 원의 반지름의 길이";
        const unit = ask === 2 ? "\\,\\mathrm{cm}" : "\\,\\mathrm{cm}^2";
        const body = ask === 2 ? `$${val}${unit}$` : `$${piTerm(val)}${unit}$`;
        const tail =
          ask === 2
            ? ""
            : ask === 1
              ? `\n옆넓이는 $\\pi\\times${r}\\times${l}=${piTerm(side)}$이다.`
              : `\n밑넓이는 $\\pi\\times${r}^{2}=${piTerm(r * r)}$이고 옆넓이는 $\\pi\\times${r}\\times${l}=${piTerm(side)}$이므로 겉넓이는 $${piTerm(r * r)}+${piTerm(side)}=${piTerm(S)}$이다.`;
        return {
          content: `오른쪽 그림은 모선의 길이가 $${l}\\,\\mathrm{cm}$인 원뿔의 전개도이다. 이 원뿔의 ${askKo}를 구하시오.`,
          answer: body,
          solution: `옆면인 부채꼴의 호의 길이는 밑면인 원의 둘레의 길이와 같다.\n부채꼴의 반지름의 길이는 $${l}\\,\\mathrm{cm}$, 중심각의 크기는 $${deg}^\\circ$이므로 밑면인 원의 반지름의 길이를 $x\\,\\mathrm{cm}$라 하면 $2\\pi\\times${l}\\times\\dfrac{${deg}}{360}=2\\pi x$에서 $x=${r}$이다.${tail}\n따라서 ${askKo}는 ${body}이다.`,
          facts: { ask, r, l, deg, side, S, ans: val },
          // 모선은 **발문이 말했으므로** 그림은 중심각만 적는다 (09 §4-20-b).
          figureSpec: {
            version: "elem-1",
            kind: "netCone",
            r,
            l,
            labels: ["angle"],
          },
        };
      }),
  ),

  def(
    MINOR_AREA,
    "20",
    "회전체의 겉넓이와 부피 원뿔",
    SEC.뿔,
    "mid",
    (rng) =>
      attempt(200, (): Body | null => {
        const [r, h, l] = pick(rng, TRIPLES);
        if ((r * r * h) % 3 !== 0) return null;
        const ask = pick(rng, [0, 1, 2] as const);
        const S = r * (r + l);
        const V = (r * r * h) / 3;
        const cyl = r * r * h; // 같은 밑면·높이의 원기둥 부피 — 시험이 이것으로 검산한다
        const head = `오른쪽 그림과 같이 직각을 낀 두 변의 길이가 각각 $${r}\\,\\mathrm{cm}$, $${h}\\,\\mathrm{cm}$이고 빗변의 길이가 $${l}\\,\\mathrm{cm}$인 직각삼각형을 길이가 $${h}\\,\\mathrm{cm}$인 변을 회전축으로 하여 $1$회전 시켰다.`;
        const shape = `이때 생기는 회전체는 밑면인 원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$, 높이가 $${h}\\,\\mathrm{cm}$, 모선의 길이가 $${l}\\,\\mathrm{cm}$인 원뿔이다.`;
        const figureSpec = {
          version: "elem-1",
          kind: "revolvePlan",
          pieces: [{ shape: "rightTri", w: r, h }],
        };
        if (ask === 0) {
          return {
            content: `${head} 이 회전체의 겉넓이와 부피를 차례로 구하시오.`,
            answer: `겉넓이 $${piTerm(S)}\\,\\mathrm{cm}^2$, 부피 $${piTerm(V)}\\,\\mathrm{cm}^3$`,
            solution: `${shape}\n(겉넓이)$=\\pi\\times${r}^{2}+\\pi\\times${r}\\times${l}=${piTerm(r * r)}+${piTerm(r * l)}=${piTerm(S)}$이다.\n(부피)$=\\dfrac{1}{3}\\times${piTerm(r * r)}\\times${h}=${piTerm(V)}$이다.`,
            facts: { ask, r, h, l, S, V, cyl, ans: S },
            figureSpec,
          };
        }
        if (ask === 1) {
          return {
            content: `${head} 이 회전체의 겉넓이를 구하시오.`,
            answer: `$${piTerm(S)}\\,\\mathrm{cm}^2$`,
            solution: `${shape}\n밑넓이는 $\\pi\\times${r}^{2}=${piTerm(r * r)}$이고 옆넓이는 $\\pi\\times${r}\\times${l}=${piTerm(r * l)}$이다.\n따라서 겉넓이는 $${piTerm(r * r)}+${piTerm(r * l)}=${piTerm(S)}$이다.`,
            facts: { ask, r, h, l, S, V, cyl, ans: S },
            figureSpec,
          };
        }
        return {
          content: `${head} 이 회전체의 부피를 구하시오.`,
          answer: `$${piTerm(V)}\\,\\mathrm{cm}^3$`,
          solution: `${shape}\n밑넓이는 $\\pi\\times${r}^{2}=${piTerm(r * r)}$이다.\n(부피)$=\\dfrac{1}{3}\\times${piTerm(r * r)}\\times${h}=${piTerm(V)}$이다.`,
          facts: { ask, r, h, l, S, V, cyl, ans: V },
          figureSpec,
        };
      }),
    (f) => (f.ask === 0 ? [f.S!, f.V!] : [f.ans!]),
  ),
];

/** 이 세션이 등록하는 전부 — 다면체와 회전체 $20$ + 겉넓이와 부피 $15$. */
export const M1_SOLID_TYPES: TypeEntry[] = [...M1_POLY, ...M1_SOLID_AREA];
