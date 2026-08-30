/**
 * **중1 난이도 «높이» 계량기** — 브리프 `tracks/briefs/mid-tier-bench.md` 물음 ①~⑤.
 *
 *   npx tsx scripts/qa/census-tier-frames-m1.ts --selftest   # 이 자가 «아니오»를 낼 수 있나
 *   npx tsx scripts/qa/census-tier-frames-m1.ts              # 갈래 분포 (유형 · 적재 행)
 *   npx tsx scripts/qa/census-tier-frames-m1.ts --axes       # 물음 ④ 후보 축 나란히
 *   npx tsx scripts/qa/census-tier-frames-m1.ts --explore    # 물음 ① 저쪽 「심화(중)」 표지
 *   npx tsx scripts/qa/census-tier-frames-m1.ts --thin       # 물음 ⑤ 어디가 얇나
 *   npx tsx scripts/qa/census-tier-frames-m1.ts --ledger     # 엔진에 있는데 적재 원장에 없는 유형
 *
 * ## 🔴 이 자가 **참을 어디서 가져오나**
 *
 * 갈래는 **제품이 낸 값**(`generateMiddleProblem(...).difficulty`)이다 — 등록부의
 * `declared` 를 따로 읽지 않는다. `resolveMiddleTier` 가 `기본` 을 `연산` 으로 내리는
 * 자리(D-106)를 안 세면, 「지면에 나가는 갈래」가 아니라 「사람이 적어 둔 갈래」를
 * 재게 된다. 적재기(`load-engine-problems.ts:256`)가 부르는 **그 함수**를 부른다.
 *
 * ## 🔴 이 자가 **못 재는 것** — 안 적으면 「검사됐다」로 읽힌다
 *
 * · **「어려운가」를 못 잰다.** 아래 축은 전부 **모양**이다. 이 저장소가 열쇠 셋을
 *   전 학년에 대 보고 버린 자리와 같다(`probe-elem-tier-ladder.ts` ㉡-b).
 * · **적재본(DB)을 못 본다.** 이 워크트리에 `.env` 가 없다. `--ledger` 는 DB 가
 *   아니라 커밋된 **원장**(`engine-load-*.json`)을 본다 — 파생물이다.
 * · **씨앗 밖을 못 본다.** 아래 `SEEDS` × `VARIANTS` 가 전부다.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { countCalcSteps } from "../../src/lib/elementary/make";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";

import { isDirectScript } from "../import/isDirectScript";

const GRADE = "중1";
/** 적재기 실측 씨앗(20260827) + 셋. 유형이 씨앗에 따라 다른 꼴을 낸다. */
const SEEDS = [20260827, 7, 4242];
/** 적재기가 쓰는 변형 수 그대로(`variants ?? 3`). */
const VARIANTS = [0, 1, 2];
const ORDER = ["연산", "기본", "응용", "심화하", "심화중", "심화상"] as const;

/* ─────────────────────────── 축 ─────────────────────────── */

/** 해설에서 «값이 하나로 굳는» 마디 — `문자=수`. */
export function solutionNodes(solution: string): number {
  return (solution.match(/[A-Za-z가-힣]\s*=\s*-?\d/g) ?? []).length;
}

/** 미지수 하나로 **다른 양**을 나타낸 자리 — `(460-x)` 꼴. */
export function auxExpressions(solution: string): number {
  return (solution.match(/\([^()]*x[^()]*\)/g) ?? []).length;
}

export type Axis = {
  id: string;
  label: string;
  hit: (content: string, solution: string, answer: string) => boolean;
};

/**
 * **후보 축 — 하나를 고르고 나중에 재면 늦다**(D-115 ⑵). 같은 모집단에 나란히 댄다.
 *
 * ⚠️ 이 목록에 **되짚기 축을 두 판**(A·A2) 넣은 것은 일부러다. D-115 가 초등에서
 *    고른 축을 중등에 그대로 물려받지 않으려면, 그 축이 **여기서 얼마나 서는지**를
 *    같은 표에서 봐야 한다.
 */
export const AXES: Axis[] = [
  {
    id: "A",
    label: "되짚기 — 해설이 미지수를 세워 방정식을 푼다",
    hit: (_c, s) => /라 하면|라 하자|라고 하면|놓으면|이라 하면/.test(s),
  },
  {
    id: "A2",
    label: "되짚기 — 발문이 «결과»를 주고 상수·계수를 되묻는다",
    hit: (c) => /해가|상수/.test(c) && /일 때|이면|되도록/.test(c),
  },
  {
    id: "B",
    label: "계산걸음 ≥ 2 (제품 `countCalcSteps`)",
    hit: (_c, s) => countCalcSteps(s) >= 2,
  },
  {
    id: "B3",
    label: "해설 마디 ≥ 3 (`문자=수` 가 세 번)",
    hit: (_c, s) => solutionNodes(s) >= 3,
  },
  {
    id: "C",
    label: "답이 방정식의 해가 아니다 (x 를 구한 뒤 한 걸음 더)",
    hit: (_c, s, a) => {
      const m = /x\s*=\s*(-?\d+(?:\.\d+)?)/.exec(s);
      if (!m) return false;
      const an = /-?\d+(?:\.\d+)?/.exec(a.replace(/\$/g, ""));
      return !!an && Number(m[1]) !== Number(an[0]);
    },
  },
  {
    id: "D",
    label: "보조 양을 미지수로 나타낸다 (`(460-x)` 꼴)",
    hit: (_c, s) => auxExpressions(s) >= 1,
  },
  {
    id: "G",
    label: "후보가 여럿이라 조건이 굳힌다 (가장 큰·작은·최댓값)",
    hit: (c) => /가장 작은|가장 큰|최소인|최댓값|최솟값/.test(c),
  },
  {
    id: "K",
    label: "주어진 조건이 둘 이상",
    hit: (c) => (c.match(/이고,|이고 |이며|하면 |일 때,/g) ?? []).length >= 2,
  },
  {
    id: "N3",
    label: "해설에 «발문에 없는 중간값»이 3개 이상",
    hit: (c, s) => {
      const given = new Set((c.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number));
      const extra = new Set(
        (s.match(/-?\d+(?:\.\d+)?/g) ?? [])
          .map(Number)
          .filter((x) => !given.has(x)),
      );
      return extra.size >= 3;
    },
  },
  {
    // 이 축은 §2(물음 ①)의 Ⓓ 표지를 **④ 표에도** 세운 것이다 — 「꼭대기가 어디냐」와
    // 「무엇이 갈래를 가르냐」는 다른 물음이지만, 후보 축으로서의 성적을 같은 표에서
    // 봐야 «고르고 나중에 재는» 일이 안 된다(D-115 ⑵).
    id: "Ⓓ",
    label: "구조 탐색 — 후보를 만들어 견준다 (§2 의 표지)",
    hit: (c) => exploreMark(c) !== null,
  },
  {
    id: "U",
    label: "D ∪ G ∪ B3 (합집합)",
    hit: (c, s, a) =>
      AXES[5]!.hit(c, s, a) || AXES[6]!.hit(c, s, a) || AXES[3]!.hit(c, s, a),
  },
];

/**
 * **저쪽 「심화(중)」 표지 — «답이 여럿일 수 있는 구조를 탐색»** (g5 §2.4 Ⓓ 의 중등판).
 *
 * ⚠️ **이 목록은 손으로 쓴 것이라 샌다.** 실제로 첫 판이 「$N$ 중 가장 작은 수」·
 *    「□ 안에 들어갈 수 있는 가장 작은 자연수」를 **못 봤다**(눈으로 찾았다).
 *    그래서 넓힌 뒤 **걸린 것을 전량 눈으로 본다** — 이 자는 «막지» 않고 «세운다».
 */
export const EXPLORE_MARKS: [why: string, re: RegExp][] = [
  [
    "뽑아·골라 최적",
    /중에서[^.]{0,40}(뽑아|골라)[^.]{0,40}(가장 큰|가장 작은|최댓값|최솟값)/,
  ],
  ["몇 가지", /모두 몇 가지/],
  ["경우의 수", /경우의 수/],
  ["조건을 만족시키는 개수", /되도록 하는[^.]{0,30}(개수|모두 몇|값)/],
  ["될 수 있는 수 중", /될 수 있는[^.]{0,25}(수|것|값)/],
  ["들어갈 수 있는 수", /들어갈 수 있는[^.]{0,25}(자연수|수|정수)/],
  ["만족시키는 개수", /만족시키는[^.]{0,30}(모두 몇|개수)/],
  ["후보 집합에서 최적", /중\s*(에서)?\s*가장 (큰|작은)/],
  ["최댓값·최솟값", /(최댓값|최솟값)을 구하시오/],
];

export function exploreMark(content: string): string | null {
  for (const [why, re] of EXPLORE_MARKS) if (re.test(content)) return why;
  return null;
}

/* ─────────────────────────── 쓸기 ─────────────────────────── */

export type Doc = {
  key: string;
  section: string;
  book: string;
  title: string;
  tier: string;
  content: string;
  solution: string;
  answer: string;
};

export function sweep(): Doc[] {
  const out: Doc[] = [];
  for (const e of registeredTypes()) {
    if (e.grade !== GRADE) continue;
    for (const seed of SEEDS)
      for (const v of VARIANTS) {
        const p = generateMiddleProblem(e.key, seed, v);
        out.push({
          key: e.key,
          section: e.unitSection,
          book: e.rpmBook,
          title: e.rpmTitle,
          tier: p.difficulty,
          content: p.content,
          solution: p.solution,
          answer: p.answer,
        });
      }
  }
  return out;
}

/* ── ④ 뒤집힘 필터 + «못 잼» 자격 ──────────────────────────────────────────
 *
 * D-115 반증 ④: 「같은 소단원의 연산·기본·응용 중 하나라도 이 잣대를 통과하면
 * 그 소단원에서는 이 축이 난이도를 **안 가른다**」.
 *
 * 🔴 그런데 그것만 세면 **81%가 거짓**이 된다 — 2026-08-31 에 초등 판정기가 물린
 *    자리다(`probe-elem-tier-backsolve.ts` 머리말). 여기서의 대조군은 이것이다:
 *    **축이 그 소단원의 심화하에서 한 번도 안 걸리면, 그 「갈림」은 근거가 없다.**
 *    안 걸린 쪽은 문항이 아니라 **자**다. 그래서 «못 잼»으로 따로 센다.
 */
export type SplitVerdict = { split: number; flat: number; blind: number };

export function splitBySection(docs: readonly Doc[], axis: Axis): SplitVerdict {
  const per = new Map<
    string,
    { lowHit: number; top: number; topHit: number }
  >();
  for (const d of docs) {
    const c = per.get(d.section) ?? { lowHit: 0, top: 0, topHit: 0 };
    const h = axis.hit(d.content, d.solution, d.answer);
    if (d.tier === "심화하") {
      c.top += 1;
      if (h) c.topHit += 1;
    } else if (h) c.lowHit += 1;
    per.set(d.section, c);
  }
  const v: SplitVerdict = { split: 0, flat: 0, blind: 0 };
  for (const c of per.values()) {
    if (c.top === 0) continue; // 심화하가 없는 소단원 — 이 물음의 분모 밖
    if (c.topHit === 0) v.blind += 1;
    else if (c.lowHit > 0) v.flat += 1;
    else v.split += 1;
  }
  return v;
}

export function tierRate(docs: readonly Doc[], axis: Axis): number[] {
  return ORDER.map((t) => {
    const rows = docs.filter((d) => d.tier === t);
    if (rows.length === 0) return NaN;
    return (
      (rows.filter((d) => axis.hit(d.content, d.solution, d.answer)).length /
        rows.length) *
      100
    );
  });
}

/* ─────────────────────────── 원장 ─────────────────────────── */

/** 커밋된 적재 원장에 실린 중등 유형 키. **DB 가 아니라 파생물이다.** */
export function ledgerKeys(): Set<string> {
  const dir = path.resolve(
    __dirname,
    "..",
    "..",
    "docs",
    "planning",
    "tracks",
    "reports",
  );
  const keys = new Set<string>();
  for (const f of readdirSync(dir)) {
    if (!f.startsWith("engine-load-") || !f.endsWith(".json")) continue;
    if (f.includes("되돌림")) continue; // 되돌린 회차는 «실렸다»가 아니다
    const d = JSON.parse(readFileSync(path.join(dir, f), "utf-8")) as {
      rows?: { externalId: string }[];
    };
    for (const r of d.rows ?? []) {
      if (!r.externalId.startsWith("engine-mid:")) continue;
      keys.add(r.externalId.slice("engine-mid:".length).split("|s")[0]!);
    }
  }
  return keys;
}

/* ─────────────────────────── 눈금 ─────────────────────────── */

/**
 * 🔴 **양성과 음성이 둘 다 있어야 한다**(2026-08-20). 양성만 대면 재현율만 재고
 *    «지어냄»은 구조적으로 0이 된다. 양성 문자열은 **저쪽 교재 문항이 아니라**
 *    같은 꼴로 내가 지은 것이다(저작권 — 브리프 §0 ㉠).
 */
function gauges(): { label: string; ok: () => boolean }[] {
  const g: { label: string; ok: () => boolean }[] = [];

  // ── 축 A (되짚기) ──
  g.push({
    label: "양성 A — 「의자 수를 $x$개라 하면 …」은 미지수를 세운다",
    ok: () => AXES[0]!.hit("", "의자 수를 $x$개라 하면 $4x+2=5(x-2)$이다.", ""),
  });
  g.push({
    label: "음성 A — 「$2^3$을 계산하면 $8$이다」는 미지수를 안 세운다",
    ok: () => !AXES[0]!.hit("", "$2^3=8$이다.", ""),
  });

  // ── 축 D (보조 양) ──
  g.push({
    label: "양성 D — 「여학생 수는 $(460-x)$명」은 보조 양이다",
    ok: () =>
      AXES[5]!.hit(
        "",
        "남학생 수를 $x$명이라 하면 여학생 수는 $(460-x)$명이다.",
        "",
      ),
  });
  g.push({
    label: "음성 D — 미지수가 없는 괄호는 보조 양이 아니다",
    ok: () => !AXES[5]!.hit("", "$(3+4)\\times2=14$이다.", ""),
  });

  // ── 축 B3 (마디) ──
  g.push({
    label: "양성 B3 — 마디가 셋이면 걸린다",
    ok: () => AXES[3]!.hit("", "$a=27$, $b=8$, $c=49$이다.", ""),
  });
  g.push({
    label: "음성 B3 — 마디가 하나면 안 걸린다",
    ok: () => !AXES[3]!.hit("", "$x=12$이다.", ""),
  });

  // ── 축 C (답 ≠ 해) ──
  g.push({
    label: "양성 C — 해가 $2$인데 답이 $62$면 한 걸음 더다",
    ok: () => AXES[4]!.hit("", "$x=2$이다.", "$62$"),
  });
  g.push({
    label: "음성 C — 해가 곧 답이면 안 걸린다",
    ok: () => !AXES[4]!.hit("", "$x=12$이다.", "$12$개"),
  });

  // ── Ⓓ 구조 탐색 표지 ──
  g.push({
    label: "양성 Ⓓ — 「넷 중 셋을 뽑아 곱한 값 중 가장 큰 값」",
    ok: () =>
      exploreMark(
        "네 유리수 중에서 서로 다른 세 수를 뽑아 곱한 값 중 가장 큰 값을 구하시오.",
      ) !== null,
  });
  g.push({
    label: "양성 Ⓓ — 「… 이 되도록 하는 자연수 $a$의 개수」",
    ok: () =>
      exploreMark(
        "해가 음의 정수가 되도록 하는 자연수 $a$의 개수를 구하시오.",
      ) !== null,
  });
  g.push({
    label:
      "양성 Ⓓ — 「$N$의 값이 될 수 있는 수 중 가장 큰 수」(첫 판이 놓친 꼴)",
    ok: () =>
      exploreMark("$N$의 값이 될 수 있는 수 중 가장 큰 수를 구하시오.") !==
      null,
  });
  // 🔴 이 눈금은 **변이 시험이 시켜서** 들어왔다. 위 세 양성은 「… 중 가장 큰」이
  //    함께 걸려 규칙 8 이 대신 물어 준다 — 규칙 5 를 통째로 지워도 **초록이었다.**
  //    「가드를 망가뜨려 봐야 가드인 줄 안다」(2026-08-18)와 같은 자리다.
  g.push({
    label: "양성 Ⓓ — 규칙 5 만 무는 꼴 (「… 될 수 있는 자연수를 모두」)",
    ok: () =>
      exploreMark("$x$의 값이 될 수 있는 자연수를 모두 구하시오.") !== null,
  });
  g.push({
    label: "음성 Ⓓ — 맨 계산은 구조 탐색이 아니다",
    ok: () => exploreMark("다음을 계산하시오. $2\\times3$") === null,
  });
  g.push({
    label: "음성 Ⓓ — 한 걸음 되짚기는 구조 탐색이 아니다",
    ok: () =>
      exploreMark(
        "어떤 수에 $3$을 더했더니 $10$이 되었다. 어떤 수를 구하시오.",
      ) === null,
  });

  // ── 모집단 — 「0」이 «못 셈»이 아닌지 ──
  g.push({
    label: "분모 — 중1 등록 유형이 500 이상이다",
    ok: () => registeredTypes().filter((e) => e.grade === GRADE).length >= 500,
  });
  g.push({
    label: "분모 — 적재 원장에서 중등 유형 키를 1,000개 이상 읽는다",
    ok: () => ledgerKeys().size >= 1000,
  });

  return g;
}

/* ─────────────────────────── 화면 ─────────────────────────── */

function pct(x: number): string {
  return Number.isNaN(x) ? "  —  " : `${x.toFixed(1)}%`;
}

function main(): void {
  const argv = process.argv.slice(2);

  if (argv.includes("--selftest")) {
    const rows = gauges();
    let bad = 0;
    for (const r of rows) {
      const ok = r.ok();
      if (!ok) bad += 1;
      console.log(`${ok ? "✅" : "🔴"} ${r.label}`);
    }
    console.log(`\n눈금 ${rows.length}건 · 어긋남 ${bad}`);
    if (bad > 0) process.exitCode = 1;
    return;
  }

  const docs = sweep();
  const types = new Set(docs.map((d) => d.key));
  console.log(
    `모집단 — 중1 유형 ${types.size} × 씨앗 ${SEEDS.length} × 변형 ${VARIANTS.length} = ${docs.length}문항`,
  );

  if (argv.includes("--axes")) {
    console.log(
      "\n| 축 | " +
        ORDER.slice(0, 4).join(" | ") +
        " | 배수 | 단조 | 갈림 | 안갈림 | **못 잼** |",
    );
    console.log("|---|---|---|---|---|---|---|---|---|---|");
    for (const ax of AXES) {
      const r = tierRate(docs, ax);
      const rest = Math.max(r[0]!, r[1]!, r[2]!);
      let mono = true;
      for (let i = 1; i < 4; i += 1) if (r[i]! < r[i - 1]! - 0.05) mono = false;
      const v = splitBySection(docs, ax);
      console.log(
        `| ${ax.id} ${ax.label} | ${r.slice(0, 4).map(pct).join(" | ")} | ` +
          `${(r[3]! / Math.max(rest, 0.05)).toFixed(1)}× | ${mono ? "예" : "**아니오**"} | ` +
          `${v.split} | ${v.flat} | **${v.blind}** |`,
      );
    }
    const withTop = new Set(
      docs.filter((d) => d.tier === "심화하").map((d) => d.section),
    );
    console.log(
      `\n분모: 심화하가 있는 소단원 ${withTop.size} / 전체 ${new Set(docs.map((d) => d.section)).size}`,
    );
    console.log(
      "「못 잼」 = 그 소단원의 심화하에서 축이 한 번도 안 걸린다 → 그 소단원의 «갈림»은 근거가 없다.",
    );
    return;
  }

  if (argv.includes("--explore")) {
    const seen = new Map<string, Doc & { why: string }>();
    for (const d of docs) {
      const why = exploreMark(d.content);
      if (!why || seen.has(d.key)) continue;
      seen.set(d.key, { ...d, why });
    }
    const byTier = new Map<string, number>();
    for (const d of seen.values())
      byTier.set(d.tier, (byTier.get(d.tier) ?? 0) + 1);
    console.log(
      `\nⒹ 저쪽 「심화(중)」 표지 — 걸린 유형 ${seen.size} / ${types.size}` +
        ` (${((seen.size / types.size) * 100).toFixed(1)}%)`,
    );
    console.log(
      "갈래별: " +
        ORDER.filter((t) => byTier.has(t))
          .map((t) => `${t} ${byTier.get(t)}`)
          .join(" · "),
    );
    console.log(
      "\n🔴 아래는 **전량 눈으로 볼 목록**이다 — 이 자는 막지 않고 세운다.",
    );
    for (const d of [...seen.values()].sort((a, b) =>
      a.tier.localeCompare(b.tier),
    ))
      console.log(
        `  [${d.tier}] ${d.key} «${d.why}» — ${d.content.replace(/\n/g, " ⏎ ").slice(0, 130)}`,
      );
    return;
  }

  if (argv.includes("--thin")) {
    const byMinor = argv.includes("--minor");
    const group = (d: Doc) =>
      byMinor
        ? `${d.book}|${d.title.slice(0, 0)}${d.key.split("|")[1]}`
        : d.section;
    const bySec = new Map<string, Doc[]>();
    for (const d of docs) {
      const g = group(d);
      if (!bySec.has(g)) bySec.set(g, []);
      bySec.get(g)!.push(d);
    }
    console.log(
      `\n| ${byMinor ? "중단원" : "소단원"} | 유형 | 연산 | 기본 | 응용 | 심화하 | Ⓓ 표지 |`,
    );
    console.log("|---|---|---|---|---|---|---|");
    let zero = 0;
    let one = 0;
    for (const [sec, rows] of [...bySec.entries()].sort()) {
      const keys = new Map<string, string>();
      for (const r of rows) keys.set(r.key, r.tier);
      const c = ORDER.slice(0, 4).map(
        (t) => [...keys.values()].filter((x) => x === t).length,
      );
      const marked = new Set(
        rows.filter((r) => exploreMark(r.content) !== null).map((r) => r.key),
      ).size;
      if (c[3] === 0) zero += 1;
      if (c[3] === 1) one += 1;
      console.log(`| ${sec} | ${keys.size} | ${c.join(" | ")} | ${marked} |`);
    }
    console.log(
      `\n심화하 유형이 **0개**인 ${byMinor ? "중단원" : "소단원"}: ${zero} · **1개뿐**: ${one} / ${bySec.size}`,
    );
    return;
  }

  if (argv.includes("--ledger")) {
    const inLedger = ledgerKeys();
    const missing = [...types].filter((k) => !inLedger.has(k));
    console.log(
      `\n적재 원장(파생물)에 실린 중등 유형 키 ${inLedger.size} · 중1 등록 ${types.size} · **원장에 없는 것 ${missing.length}**`,
    );
    for (const k of missing) {
      const d = docs.find((x) => x.key === k)!;
      console.log(`  없음: ${k} [${d.tier}] ${d.title}`);
    }
    console.log(
      "\n⚠️ 원장은 DB 가 아니다. 이 워크트리에 `.env` 가 없어 적재본을 직접 못 본다.",
    );
    return;
  }

  // 기본 — 갈래 분포
  const byType = new Map<string, string>();
  for (const d of docs) byType.set(d.key, d.tier);
  console.log("\n| 갈래 | 유형 | % | 문항(변형) | % |");
  console.log("|---|---|---|---|---|");
  for (const t of ORDER) {
    const nt = [...byType.values()].filter((x) => x === t).length;
    const nd = docs.filter((d) => d.tier === t).length;
    console.log(
      `| ${t} | ${nt} | ${((nt / byType.size) * 100).toFixed(1)}% | ${nd} | ${((nd / docs.length) * 100).toFixed(1)}% |`,
    );
  }
  const split = [...types].filter(
    (k) => new Set(docs.filter((d) => d.key === k).map((d) => d.tier)).size > 1,
  );
  console.log(
    `\n한 유형 안에서 갈래가 갈리는 유형: **${split.length}** ` +
      "(0 이면 갈래는 «유형마다 하나»로 고정 — defType(..., difficulty, ...) 인자)",
  );
}

if (isDirectScript(import.meta.url)) main();
