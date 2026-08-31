/**
 * **세 중등 벤치가 안 본 축**을 같은 모집단에 댄다 — 적대 검토용 계량기.
 *
 *     npx tsx scripts/qa/census-tier-missed-axes.ts --selftest
 *     npx tsx scripts/qa/census-tier-missed-axes.ts --grade 중1
 *     npx tsx scripts/qa/census-tier-missed-axes.ts --grade 중2
 *     npx tsx scripts/qa/census-tier-missed-axes.ts --grade 중3
 *     npx tsx scripts/qa/census-tier-missed-axes.ts --unified
 *
 * ## 왜 있나
 *
 * 중1·중2·중3 벤치가 「D-115 되짚기 축은 중등에서 안 선다」에 만장일치로 닿았다.
 * 셋이 스스로 적은 공백: 축이 전부 해설·발문의 글자 모양이고, **정답의 모양 ·
 * facts · figureSpec · 「해설이 밟는 길」** 은 한 번도 안 봤다.
 *
 * 이 자는 그 넷을 재고, 초등 `enumeratedSteps` 를 **옮겨 적지 않고 import** 해서
 * 중등에 그대로 댄다(브리프의 첫 수).
 *
 * ## 🔴 이 자가 못 재는 것
 *
 * · 「어려운가」자체. 아래는 전부 모양이다.
 * · 심화중·심화상 — 중등 엔진이 그 갈래를 안 낸다(D-113 ⑼). 초등에서 열거 자가
 *   갈린 칸이 바로 그 둘이라, 중등에서 약하게 나와도 「축이 죽었다」와
 *   「가르던 칸이 없다」가 안 갈린다. 표에 그 사실을 같이 찍는다.
 */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import type { MidProblem } from "../../src/lib/middle/types";

import { listedInside, listedOutside } from "./census-elem-answer-lists";
import { enumeratedSteps } from "./probe-elem-tier-enumeration";
import { isDirectScript } from "../import/isDirectScript";

const TIERS = ["연산", "기본", "응용", "심화하"] as const;
type Tier = (typeof TIERS)[number];

const POP: Record<string, { seeds: number[]; variants: number[] }> = {
  중1: { seeds: [20260827, 7, 4242], variants: [0, 1, 2] },
  중2: { seeds: [20260831, 7, 1234, 99991], variants: [0, 1, 2] },
  중3: { seeds: [20260831, 5150131, 777003, 424242], variants: [0] },
};

/** 분모를 맞추려고 세 학년에 같은 씨앗·변형을 댄다 — m1 이 적재기와 맞춘 값. */
const UNIFIED = { seeds: [20260827, 7, 4242], variants: [0, 1, 2] };

export type AnswerShape =
  "예아니오" | "나열" | "순서쌍" | "범위" | "각도" | "수하나" | "식" | "기타";

const SHAPES: AnswerShape[] = [
  "예아니오",
  "나열",
  "순서쌍",
  "범위",
  "각도",
  "수하나",
  "식",
  "기타",
];

/**
 * 정답의 모양 — **한 칸에만** 넣는다. 순서가 가르는 성질이다
 * (나열을 식보다 앞에 두지 않으면 `$1, 2$` 가 식으로 새어 나열이 구조적으로 0).
 */
export function answerShape(answer: string): AnswerShape {
  const raw = answer.trim();
  // 🔴 `\,` (LaTeX 얇은 공백) 안의 쉼표는 나열이 아니다.
  //    벗기지 않으면 `$18\,\mathrm{km}$` 가 전량 「나열」로 샌다 — 표본을 보기
  //    전에는 중2 심화하 39.7% 가 나열인 줄 알았다.
  const unspaced = raw.replace(/\\,/g, " ");
  const plain = unspaced.replace(/\$/g, "").replace(/\s+/g, " ").trim();
  if (/^(예|아니요|아니오|맞다|옳다|참|거짓)$/.test(plain)) return "예아니오";
  if (listedInside(unspaced) || listedOutside(unspaced)) return "나열";
  if (/\([^()]+,[^()]+\)/.test(plain)) return "순서쌍";
  if (/[<>]|\\le|\\ge|\\leq|\\geq|이상|이하|초과|미만/.test(raw)) return "범위";
  if (/circ|degree|°/.test(raw)) return "각도";
  const numOnly = plain
    .replace(/\\mathrm\{[^}]*\}/g, "")
    .replace(/\\text\{[^}]*\}/g, "")
    .replace(/[가-힣]+/g, "")
    .replace(/\s/g, "");
  if (/^-?\d+(?:\.\d+)?$/.test(numOnly)) return "수하나";
  if (/[a-zA-Z\\]/.test(raw) || /sqrt|frac|times|cdot/.test(raw)) return "식";
  return "기타";
}

/** 해설 수식 덩어리 수 — 글자 수가 아니라 `$…$` 개수. */
export function mathSpanCount(solution: string): number {
  return [...solution.matchAll(/\$[^$]*\$/g)].length;
}

/** 등식이 든 수식 덩어리 수. */
export function eqSpanCount(solution: string): number {
  return [...solution.matchAll(/\$([^$]*)\$/g)].filter((m) =>
    (m[1] ?? "").includes("="),
  ).length;
}

/**
 * **해설이 앞 결과를 뒤에 다시 쓰나** — D-115 ⑾ 「해설이 밟는 길」의 하한.
 *
 * 글자 모양(「라 하면」)이 아니라, 한 수식에서 왼쪽에 선 홑문자가
 * **나중 수식의 오른쪽**에 다시 나타나는 횟수다. 독립인 계산 나열은 0.
 *
 * ⚠️ 하한이다. `\overline{AB}=6` 같은 다글자 라벨은 안 센다(홑문자만).
 *    세면 `AB` 의 `A`·`B` 가 좌표 라벨과 섞인다.
 */
export function chainReuse(solution: string): number {
  const spans = [...solution.matchAll(/\$([^$]*)\$/g)].map((m) => m[1] ?? "");
  const defined = new Set<string>();
  let reuse = 0;
  for (const body of spans) {
    const lhs = new Set(
      [...body.matchAll(/(?:^|[^A-Za-z])([A-Za-z])\s*=/g)].map((m) => m[1]!),
    );
    for (const id of defined) {
      const re = new RegExp(`(?:^|[^A-Za-z])${id}(?:[^A-Za-z=]|$)`);
      if (re.test(body) && !lhs.has(id)) reuse += 1;
    }
    for (const id of lhs) defined.add(id);
  }
  return reuse;
}

export function factsKeyCount(facts: Record<string, number>): number {
  return Object.keys(facts).length;
}

/** figureSpec 의 「종류」 — 장식 키를 빼고 남은 최상위 키를 이은 것. */
export function figureKind(
  spec: Record<string, unknown> | null | undefined,
): string {
  if (!spec) return "없음";
  const skip = new Set(["version", "theme", "canvas", "background", "style"]);
  const keys = Object.keys(spec)
    .filter((k) => !skip.has(k))
    .sort();
  return keys.length ? keys.join("+") : "빈스펙";
}

export type Row = {
  grade: string;
  key: string;
  section: string;
  tier: string;
  content: string;
  answer: string;
  solution: string;
  shape: AnswerShape;
  factsN: number;
  hasFigure: boolean;
  figKind: string;
  enumN: number;
  spans: number;
  eqs: number;
  reuse: number;
};

export function sweepGrade(
  grade: string,
  seeds: number[],
  variants: number[],
): { rows: Row[]; failed: string[] } {
  const rows: Row[] = [];
  const failed: string[] = [];
  for (const e of registeredTypes()) {
    if (e.grade !== grade) continue;
    for (const seed of seeds)
      for (const v of variants) {
        try {
          const p: MidProblem = generateMiddleProblem(e.key, seed, v);
          rows.push({
            grade,
            key: e.key,
            section: e.unitSection,
            tier: p.difficulty,
            content: p.content,
            answer: p.answer,
            solution: p.solution,
            shape: answerShape(p.answer),
            factsN: factsKeyCount(p.facts),
            hasFigure: !!p.figureSpec,
            figKind: figureKind(p.figureSpec),
            enumN: enumeratedSteps(p.solution),
            spans: mathSpanCount(p.solution),
            eqs: eqSpanCount(p.solution),
            reuse: chainReuse(p.solution),
          });
        } catch (err) {
          failed.push(
            `${e.key} s${seed}v${v}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
  }
  return { rows, failed };
}

type Hit = (r: Row) => boolean;

export type FlipM1 = {
  split: number;
  flat: number;
  blind: number;
  denom: number;
};
export type FlipM2 = {
  split: number;
  tie: number;
  flip: number;
  blind: number;
};
export type FlipM3 = { flip: number; stands: number; secs: number };

/** m1 식 — 심화하가 한 번도 안 걸리면 못잼. 걸렸는데 아랫도 걸리면 안갈림. */
export function flipM1(rows: Row[], hit: Hit): FlipM1 {
  const per = new Map<
    string,
    { top: number; topHit: number; lowHit: number }
  >();
  for (const r of rows) {
    const c = per.get(r.section) ?? { top: 0, topHit: 0, lowHit: 0 };
    const h = hit(r);
    if (r.tier === "심화하") {
      c.top += 1;
      if (h) c.topHit += 1;
    } else if (h) c.lowHit += 1;
    per.set(r.section, c);
  }
  const v: FlipM1 = { split: 0, flat: 0, blind: 0, denom: 0 };
  for (const c of per.values()) {
    if (c.top === 0) continue;
    v.denom += 1;
    if (c.topHit === 0) v.blind += 1;
    else if (c.lowHit > 0) v.flat += 1;
    else v.split += 1;
  }
  return v;
}

/** m2 식 — 소단원 안 적중률 비교. */
export function flipM2(rows: Row[], hit: Hit): FlipM2 {
  const per = new Map<
    string,
    { deep: number; deepHit: number; low: number; lowHit: number }
  >();
  for (const r of rows) {
    const v = per.get(r.section) ?? { deep: 0, deepHit: 0, low: 0, lowHit: 0 };
    const isDeep = r.tier.startsWith("심화");
    if (isDeep) {
      v.deep += 1;
      if (hit(r)) v.deepHit += 1;
    } else {
      v.low += 1;
      if (hit(r)) v.lowHit += 1;
    }
    per.set(r.section, v);
  }
  const out: FlipM2 = { split: 0, tie: 0, flip: 0, blind: 0 };
  for (const v of per.values()) {
    if (v.deep === 0 || v.low === 0) {
      out.blind += 1;
      continue;
    }
    const d = v.deepHit / v.deep;
    const l = v.lowHit / v.low;
    if (d > l) out.split += 1;
    else if (d === l) out.tie += 1;
    else out.flip += 1;
  }
  return out;
}

/** m3 식 — 아랫 갈래가 하나라도 통과하면 뒤집힘. */
export function flipM3(rows: Row[], hit: Hit): FlipM3 {
  const secs = [...new Set(rows.map((r) => r.section))];
  let flip = 0;
  let stands = 0;
  for (const s of secs) {
    const sub = rows.filter((r) => r.section === s);
    if (sub.filter((r) => r.tier !== "심화하").some(hit)) flip += 1;
    if (sub.filter((r) => r.tier === "심화하").some(hit)) stands += 1;
  }
  return { flip, stands, secs: secs.length };
}

export function tierPct(rows: Row[], hit: Hit): number[] {
  return TIERS.map((t) => {
    const sub = rows.filter((r) => r.tier === t);
    return sub.length ? (sub.filter(hit).length / sub.length) * 100 : NaN;
  });
}

function ratio(p: number[]): string {
  const app = p[2] ?? 0;
  const top = p[3] ?? 0;
  if (app === 0) return top > 0 ? "∞" : "—";
  return (top / app).toFixed(2);
}

function fmtPct(x: number): string {
  return Number.isNaN(x) ? "—" : `${x.toFixed(1)}%`;
}

const AXES: { name: string; hit: Hit }[] = [
  { name: "열거≥3 (초등 자 그대로)", hit: (r) => r.enumN >= 3 },
  { name: "정답=나열", hit: (r) => r.shape === "나열" },
  { name: "정답=순서쌍", hit: (r) => r.shape === "순서쌍" },
  { name: "정답=식", hit: (r) => r.shape === "식" },
  { name: "정답=수하나", hit: (r) => r.shape === "수하나" },
  { name: "정답=범위", hit: (r) => r.shape === "범위" },
  { name: "정답=각도", hit: (r) => r.shape === "각도" },
  { name: "정답≠수하나", hit: (r) => r.shape !== "수하나" },
  { name: "facts≥5", hit: (r) => r.factsN >= 5 },
  { name: "facts≥8", hit: (r) => r.factsN >= 8 },
  { name: "그림 있음", hit: (r) => r.hasFigure },
  { name: "스펙에 각", hit: (r) => r.figKind.includes("angles") },
  { name: "스펙에 치수", hit: (r) => r.figKind.includes("dimensions") },
  { name: "해설 수식≥6", hit: (r) => r.spans >= 6 },
  { name: "해설 등식≥3", hit: (r) => r.eqs >= 3 },
  { name: "사슬 재사용≥1", hit: (r) => r.reuse >= 1 },
  { name: "사슬 재사용≥2", hit: (r) => r.reuse >= 2 },
];

function printAxisTable(rows: Row[], label: string): void {
  console.log(`\n── ${label} (행 ${rows.length}) ──`);
  console.log(
    "축".padEnd(28) +
      TIERS.map((t) => t.padStart(9)).join("") +
      "  심화하/응용   m1갈림/안/못   m2갈/동/뒤/못   m3뒤집힘",
  );
  for (const ax of AXES) {
    const p = tierPct(rows, ax.hit);
    const a = flipM1(rows, ax.hit);
    const b = flipM2(rows, ax.hit);
    const c = flipM3(rows, ax.hit);
    const hits = rows.filter(ax.hit).length;
    console.log(
      ax.name.padEnd(28) +
        p.map((x) => fmtPct(x).padStart(9)).join("") +
        `${ratio(p).padStart(8)}배` +
        `${String(a.split).padStart(6)}/${a.flat}/${a.blind}` +
        `${String(b.split).padStart(7)}/${b.tie}/${b.flip}/${b.blind}` +
        `${String(c.flip).padStart(8)}/${c.secs}` +
        `   n=${hits}`,
    );
  }
}

function printShapes(rows: Row[]): void {
  console.log("\n── 정답 모양 분포 (칸마다 행의 %) ──");
  console.log(
    "모양".padEnd(12) +
      TIERS.map((t) => t.padStart(9)).join("") +
      "  심화하/응용",
  );
  for (const sh of SHAPES) {
    const p = tierPct(rows, (r) => r.shape === sh);
    const n = rows.filter((r) => r.shape === sh).length;
    console.log(
      sh.padEnd(12) +
        p.map((x) => fmtPct(x).padStart(9)).join("") +
        `${ratio(p).padStart(8)}배   n=${n}`,
    );
  }
}

function printFacts(rows: Row[]): void {
  console.log("\n── facts 키 개수 평균 ──");
  for (const t of TIERS) {
    const sub = rows.filter((r) => r.tier === t);
    const avg = sub.length
      ? sub.reduce((s, r) => s + r.factsN, 0) / sub.length
      : 0;
    console.log(`  ${t}  n=${sub.length}  평균 ${avg.toFixed(2)}`);
  }
}

function printFigKinds(rows: Row[]): void {
  const withFig = rows.filter((r) => r.hasFigure);
  const kinds = new Map<string, number>();
  for (const r of withFig)
    kinds.set(r.figKind, (kinds.get(r.figKind) ?? 0) + 1);
  const top = [...kinds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(
    `\n── figureSpec 종류 (그림 있는 행 ${withFig.length}/${rows.length}) 상위 8 ──`,
  );
  for (const [k, n] of top) console.log(`  ${n.toString().padStart(5)}  ${k}`);
}

function printTiers(rows: Row[]): void {
  console.log("\n── 갈래 분포 ──");
  for (const t of [...TIERS, "심화중", "심화상"]) {
    const n = rows.filter((r) => r.tier === t).length;
    console.log(
      `  ${t}  ${n}  (${rows.length ? ((n / rows.length) * 100).toFixed(1) : 0}%)`,
    );
  }
}

/* ── 눈금 ─────────────────────────────────────────────────────────────── */

function gauges(): { label: string; ok: () => boolean }[] {
  return [
    {
      label: "양성 — `$6,\\ 7$` 은 나열 (초등 자 listedInside)",
      ok: () => answerShape("$6,\\ 7$") === "나열",
    },
    {
      label: "양성 — `$6$, $7$` 도 나열 (listedOutside)",
      ok: () => answerShape("$6$, $7$") === "나열",
    },
    {
      label: "음성 — 좌표 `$(5, 8)$` 은 순서쌍이지 나열이 아니다",
      ok: () => answerShape("$(5, 8)$") === "순서쌍",
    },
    {
      label: "양성 — `$12$` 는 수하나",
      ok: () => answerShape("$12$") === "수하나",
    },
    {
      label: "양성 — `$3\\sqrt{7}$` 는 식",
      ok: () => answerShape("$3\\sqrt{7}$") === "식",
    },
    {
      label: "양성 — `$(x-3)(x-2)$` 는 식",
      ok: () => answerShape("$(x-3)(x-2)$") === "식",
    },
    {
      label: "양성 — `$30^\\circ$` 는 각도 (식보다 앞)",
      ok: () => answerShape("$30^\\circ$") === "각도",
    },
    {
      label: "양성 — `$x>2$` 는 범위",
      ok: () => answerShape("$x>2$") === "범위",
    },
    {
      label: "양성 — `예` 는 예아니오",
      ok: () => answerShape("예") === "예아니오",
    },
    {
      label: "음성 — `$12\\mathrm{cm}$` 는 수하나 (단위를 식로 안 센다)",
      ok: () => answerShape("$12\\mathrm{cm}$") === "수하나",
    },
    {
      label: "🔴 나열을 식보다 앞에 — `$1, 2, 3$` 이 나열이지 식이 아니다",
      ok: () => answerShape("$1, 2, 3$") === "나열",
    },
    {
      label: "🔴 `\\,` 는 나열이 아니다 — `$18\\,\\mathrm{km}$` 는 수하나",
      ok: () => answerShape("$18\\,\\mathrm{km}$") === "수하나",
    },
    {
      label: "한글 단위 — `$12$개` 는 수하나이지 기타가 아니다",
      ok: () => answerShape("$12$개") === "수하나",
    },
    {
      label: "열거 자 import — 초등 실물 셋을 3 으로 센다",
      ok: () =>
        enumeratedSteps("$1\\times1=1$, $2\\times2=4$, $3\\times3=9$") === 3,
    },
    {
      label: "열거 음성 — 곱이 하나면 문턱 아래",
      ok: () => enumeratedSteps("$58\\times26=1508$ 입니다.") < 3,
    },
    {
      label: "사슬 양성 — `$x=3$, $y=x+1$` 은 재사용 1",
      ok: () => chainReuse("$x=3$, $y=x+1$") === 1,
    },
    {
      label: "사슬 음성 — 독립 계산 `$2+3=5$, $4+5=9$` 은 0",
      ok: () => chainReuse("$2+3=5$, $4+5=9$") === 0,
    },
    {
      label: "사슬 음성 — 답을 되풀이만 `$x=3$이다. 답은 $3$` 은 0",
      ok: () => chainReuse("$x=3$이다. 답은 $3$이다.") === 0,
    },
    {
      label: "수식 덩어리 — `$a$ 와 $b=1$` 은 2",
      ok: () =>
        mathSpanCount("$a$ 와 $b=1$") === 2 &&
        eqSpanCount("$a$ 와 $b=1$") === 1,
    },
    {
      label: "facts 키 수",
      ok: () => factsKeyCount({ a: 1, b: 2, ans: 3 }) === 3,
    },
    {
      label: "그림 없음",
      ok: () => figureKind(null) === "없음" && figureKind(undefined) === "없음",
    },
    {
      label: "그림 종류 — 장식 키를 뺀다",
      ok: () =>
        figureKind({
          version: 2,
          style: {},
          points: {},
          angles: {},
        }) === "angles+points",
    },
    {
      label: "m1 뒤집힘 — 심화하만 걸리면 갈림",
      ok: () => {
        const rows: Row[] = [
          dummy("s", "연산", false),
          dummy("s", "심화하", true),
        ];
        const v = flipM1(rows, (r) => r.hasFigure);
        return v.split === 1 && v.flat === 0 && v.blind === 0;
      },
    },
    {
      label: "m1 뒤집힘 — 아랫도 걸리면 안갈림",
      ok: () => {
        const rows: Row[] = [
          dummy("s", "응용", true),
          dummy("s", "심화하", true),
        ];
        const v = flipM1(rows, (r) => r.hasFigure);
        return v.split === 0 && v.flat === 1;
      },
    },
    {
      label: "m1 뒤집힘 — 심화하가 안 걸리면 못잼 (갈림으로 안 센다)",
      ok: () => {
        const rows: Row[] = [
          dummy("s", "응용", true),
          dummy("s", "심화하", false),
        ];
        const v = flipM1(rows, (r) => r.hasFigure);
        return v.blind === 1 && v.split === 0;
      },
    },
    {
      label: "m2 뒤집힘 — 율이 낮으면 뒤집힘",
      ok: () => {
        const rows: Row[] = [
          dummy("s", "응용", true),
          dummy("s", "응용", true),
          dummy("s", "심화하", false),
          dummy("s", "심화하", true),
        ];
        const v = flipM2(rows, (r) => r.hasFigure);
        return v.flip === 1 && v.split === 0;
      },
    },
    {
      label: "m3 뒤집힘 — 아랫 하나라도 통과하면 뒤집힘",
      ok: () => {
        const rows: Row[] = [
          dummy("s", "연산", true),
          dummy("s", "심화하", true),
          dummy("t", "연산", false),
          dummy("t", "심화하", true),
        ];
        const v = flipM3(rows, (r) => r.hasFigure);
        return v.flip === 1 && v.stands === 2 && v.secs === 2;
      },
    },
    {
      label: "🔴 일부러 걸리는 입력 — 열거 자가 0 을 내면 죽은 것",
      ok: () =>
        enumeratedSteps(
          "$58\\times26=1508$, $58\\times27=1566$, $58\\times28=1624$",
        ) === 3,
    },
  ];
}

function dummy(section: string, tier: string, fig: boolean): Row {
  return {
    grade: "중1",
    key: "k",
    section,
    tier,
    content: "",
    answer: "$1$",
    solution: "",
    shape: "수하나",
    factsN: 0,
    hasFigure: fig,
    figKind: fig ? "points" : "없음",
    enumN: 0,
    spans: 0,
    eqs: 0,
    reuse: 0,
  };
}

function selftest(): number {
  let bad = 0;
  for (const g of gauges()) {
    const ok = g.ok();
    if (!ok) bad += 1;
    console.log(`${ok ? "✅" : "❌"} ${g.label}`);
  }
  console.log(`\n눈금 ${gauges().length}건 — 실패 ${bad}건`);
  return bad;
}

function report(grade: string, seeds: number[], variants: number[]): void {
  console.log(
    `\n======== ${grade}  씨앗 ${seeds.join(",")}  변형 ${variants.join(",")} ========`,
  );
  const { rows, failed } = sweepGrade(grade, seeds, variants);
  console.log(
    `유형 ${new Set(rows.map((r) => r.key)).size} · 행 ${rows.length} · 못 만든 것 ${failed.length}`,
  );
  if (failed.length) {
    console.log("실패 보기 5:");
    for (const f of failed.slice(0, 5)) console.log(`  ${f}`);
  }
  printTiers(rows);
  printShapes(rows);
  printFacts(rows);
  printFigKinds(rows);
  printAxisTable(rows, `${grade} 안 본 축`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--selftest")) {
    process.exitCode = selftest() === 0 ? 0 : 1;
    return;
  }
  if (argv.includes("--unified")) {
    for (const g of ["중1", "중2", "중3"])
      report(g, UNIFIED.seeds, UNIFIED.variants);
    return;
  }
  const grade = argv.find((a) => a.startsWith("중"));
  if (argv.includes("--grade") || grade) {
    const g = grade ?? argv[argv.indexOf("--grade") + 1];
    const pop = POP[g ?? ""];
    if (!pop) {
      console.log("학년은 중1·중2·중3 만.");
      process.exitCode = 2;
      return;
    }
    report(g!, pop.seeds, pop.variants);
    return;
  }
  console.log(
    "쓰임: --selftest | --grade 중1|중2|중3 | --unified\n" +
      "  이 자는 세 벤치가 안 본 축(정답 모양·facts·figureSpec·사슬)을 잰다.",
  );
}

if (isDirectScript(import.meta.url)) main();
