/**
 * **확대 중인 갈래가 몇 개나 찼나** — `심화중`·`심화상` (D-113, 2026-08-30).
 *
 *     npx tsx scripts/qa/probe-elem-extending-tiers.ts            # 전 학년
 *     npx tsx scripts/qa/probe-elem-extending-tiers.ts 초5        # 한 학년만
 *     npx tsx scripts/qa/probe-elem-extending-tiers.ts --selftest # 이 자가 눈이 멀었나
 *
 * ── 왜 있나 ──────────────────────────────────────────────────────────────────
 * 축을 여섯으로 넓히면서 새 갈래 둘을 **선택**으로 두었다(안 그러면 230개 소단원이
 * 전부 컴파일 오류가 되어 「축 세우기」와 「내용 채우기」를 못 나눈다). 선택으로 두는
 * 순간 **안 채워도 아무것도 빨개지지 않는다** — 관문은 초록이고 시험지는 나온다.
 * 그러면 이 확대는 조용히 멈춘 채 끝난 것처럼 보인다.
 *
 * 그래서 「몇 개 남았나」를 **세어서 찍는다.** 이 저장소가 여러 번 적은
 * 「0 이 «깨끗»인지 «못 셈»인지 갈려야 한다」의 앞면이다 — 여기서는 반대로,
 * **0 이 «아직 아무것도 안 했다»** 라는 뜻이고 그것이 화면에 보여야 한다.
 *
 * ⚠️ **이 자는 «있나»만 센다. «좋은가»는 못 잰다.** 난이도는 지면에 없다
 *    (`probe-elem-tier-ladder.ts` ㉡ 과 같은 한계). 채운 갈래가 정말 저쪽
 *    「심화(중)」 높이인지는 사람이 `/dev/tier-bench/g{N}` 에서 본다.
 *
 * ── 🔴 **경로가 둘이다 — 갈래를 채워도 시험지에는 안 나간다** ─────────────────
 * ```
 * 갈래   generateElementaryProblem(unit, seed, tier)   ← 판정기·시험이 재는 것
 * 문형   generateElementaryForm(unit, seed, formId)    ← **적재기가 부르는 것**
 * ```
 * `load-engine-problems.ts` 는 **문형**을 돈다. 문형은 소단원마다 열 개짜리 별도
 * 등록부(`forms.ts` 의 `FORMS`)이고 각 문형이 제 갈래를 달고 있다.
 * 그래서 **갈래만 채우면 이 자가 「230/230 다 찼다」고 하는데 적재본에는 한 건도
 * 안 들어간다** — 「엔진이 0이다」는 「지면이 0이다」가 아니다(2026-08-27·08-30
 * 에 두 번 물린 자리). 아래는 **두 축을 따로** 센다.
 *
 * ── 눈금이 «아니오»를 낼 수 있게 만든 방법 ──────────────────────────────────
 * 세는 일(`countExtending`·`auditCore`)을 **자료의 출처와 떼어 놓았다.** 그래야
 * 눈금이 지어낸 표로 **양성·음성 대조군을 둘 다** 댈 수 있다. 살아 있는 엔진만
 * 보면 「전부 넷」이라는 한 가지 그림밖에 없어서, 이 자가 세는 능력을 잃어도
 * 답이 똑같이 나온다 — 그건 재는 게 아니라 도장이다(2026-08-23).
 */
import {
  CORE_DIFFICULTIES,
  EXTENDING_DIFFICULTIES,
} from "../../src/contracts/difficulty";
import { listedForms } from "../../src/lib/elementary/forms";
import {
  elementaryUnits,
  supportedTiers,
} from "../../src/lib/elementary/generate";

import { isDirectScript } from "../import/isDirectScript";

/** 「소단원 하나가 어떤 갈래를 내는가」 — 세는 쪽이 보는 전부. */
export type UnitTiers = {
  grade: string;
  section: string;
  /** 갈래 경로(`generateElementaryProblem`)가 내는 것. */
  tiers: readonly string[];
  /** **문형 경로**(`generateElementaryForm`)가 내는 것 — 적재기가 이쪽을 부른다. */
  formTiers?: readonly string[];
};

export type Census = {
  units: number;
  filled: Record<string, number>;
  rows: { grade: string; section: string; missing: string[] }[];
};

/**
 * 확대 갈래를 센다. **갈래가 하나도 없는 소단원은 분모에서 뺀다** — 그건 「덜 찬」
 * 것이 아니라 애초에 이 조사의 대상이 아니다(등록 자체가 없다).
 */
export function countExtending(rows: readonly UnitTiers[]): Census {
  const filled: Record<string, number> = {};
  for (const t of EXTENDING_DIFFICULTIES) filled[t] = 0;
  const out: Census["rows"] = [];
  let units = 0;
  for (const r of rows) {
    if (r.tiers.length === 0) continue;
    units += 1;
    const missing: string[] = [];
    for (const t of EXTENDING_DIFFICULTIES) {
      if (r.tiers.includes(t)) filled[t] += 1;
      else missing.push(t);
    }
    if (missing.length > 0)
      out.push({ grade: r.grade, section: r.section, missing });
  }
  return { units, filled, rows: out };
}

/** 핵심 넷이 빠진 소단원 — 있으면 그건 확대가 아니라 **회귀**다. */
export function auditCore(rows: readonly UnitTiers[]): string[] {
  const bad: string[] = [];
  for (const r of rows) {
    if (r.tiers.length === 0) continue;
    for (const t of CORE_DIFFICULTIES)
      if (!r.tiers.includes(t))
        bad.push(`${r.grade} ${r.section}: 핵심 갈래 «${t}» 가 없다`);
  }
  return bad;
}

/** 살아 있는 엔진에서 표를 읽는다. */
export function engineRows(gradeFilter?: string): UnitTiers[] {
  return elementaryUnits()
    .filter((u) => !gradeFilter || u.grade === gradeFilter)
    .map((u) => ({
      grade: u.grade,
      section: u.section,
      tiers: supportedTiers(u),
      // 문형은 갈래를 **되풀이해** 단다(기본 4개 · 응용 4개 …). 「그 갈래가 있나」만
      // 물으므로 종류로 접는다.
      formTiers: [...new Set(listedForms(u).map((f) => f.tier as string))],
    }));
}

/** 문형 경로에서 확대 갈래를 센다 — **적재본이 받게 될 것**이 이쪽이다. */
export function countExtendingForms(rows: readonly UnitTiers[]): Census {
  return countExtending(
    rows
      .filter((r) => (r.formTiers?.length ?? 0) > 0)
      .map((r) => ({ ...r, tiers: r.formTiers ?? [] })),
  );
}

export function scanExtending(gradeFilter?: string): Census {
  return countExtending(engineRows(gradeFilter));
}

// ── 눈금 ─────────────────────────────────────────────────────────────────────

const CORE4 = [...CORE_DIFFICULTIES];
const u = (section: string, tiers: string[]): UnitTiers => ({
  grade: "초X",
  section,
  tiers,
});

type Gauge = { label: string; ok: () => boolean };

function gauges(): Gauge[] {
  return [
    // ── 음성 대조군: 확대 갈래가 하나도 없으면 0이어야 한다 ──
    {
      label: "음성 — 핵심 넷뿐이면 확대는 0",
      ok: () => {
        const c = countExtending([u("1-1-1", CORE4), u("1-1-2", CORE4)]);
        return (
          c.units === 2 &&
          c.filled["심화중"] === 0 &&
          c.filled["심화상"] === 0 &&
          c.rows.length === 2
        );
      },
    },
    {
      label: "음성 — 핵심 넷뿐이면 «핵심 빠짐»이 안 나온다",
      ok: () => auditCore([u("1-1-1", CORE4)]).length === 0,
    },
    // ── 양성 대조군: 채우면 실제로 세어진다 ──
    {
      label: "양성 — 한 소단원이 심화중을 채우면 1로 센다",
      ok: () => {
        const c = countExtending([
          u("1-1-1", [...CORE4, "심화중"]),
          u("1-1-2", CORE4),
        ]);
        return (
          c.filled["심화중"] === 1 &&
          c.filled["심화상"] === 0 &&
          c.rows.length === 2
        );
      },
    },
    {
      label: "양성 — 둘 다 채운 소단원은 «덜 찬 목록»에서 빠진다",
      ok: () => {
        const c = countExtending([u("1-1-1", [...CORE4, "심화중", "심화상"])]);
        return (
          c.filled["심화중"] === 1 &&
          c.filled["심화상"] === 1 &&
          c.rows.length === 0
        );
      },
    },
    {
      label: "양성 — 심화상만 채운 것도 갈래별로 따로 센다",
      ok: () => {
        const c = countExtending([u("1-1-1", [...CORE4, "심화상"])]);
        return (
          c.filled["심화중"] === 0 &&
          c.filled["심화상"] === 1 &&
          c.rows[0]?.missing.join() === "심화중"
        );
      },
    },
    {
      label: "양성 — 핵심이 빠지면 잡는다(확대가 아니라 회귀다)",
      ok: () => auditCore([u("1-1-1", ["연산", "기본", "응용"])]).length === 1,
    },
    // ── 분모: 등록 안 된 소단원은 «덜 찬 것»이 아니다 ──
    {
      label: "분모 — 갈래가 하나도 없는 소단원은 분모에서 뺀다",
      ok: () => {
        const c = countExtending([u("1-1-1", CORE4), u("9-9-9", [])]);
        return c.units === 1 && c.rows.length === 1;
      },
    },
    {
      label: "분모 — 표가 비면 분모도 0이다(있는 척하지 않는다)",
      ok: () => countExtending([]).units === 0,
    },
    // ── 문형 축: 적재기가 부르는 경로를 실제로 세나 ──
    {
      label: "문형 음성 — 문형이 핵심 넷뿐이면 확대는 0",
      ok: () => {
        const c = countExtendingForms([
          { grade: "초X", section: "1-1-1", tiers: CORE4, formTiers: CORE4 },
        ]);
        return c.units === 1 && c.filled["심화중"] === 0;
      },
    },
    {
      label: "문형 양성 — **갈래만** 채우고 문형을 안 채우면 문형 축이 0이다",
      ok: () => {
        const rows = [
          {
            grade: "초X",
            section: "1-1-1",
            tiers: [...CORE4, "심화중"],
            formTiers: CORE4,
          },
        ];
        // 갈래는 1, 문형은 0 — **둘이 갈려야** 이 자가 뜻이 있다.
        return (
          countExtending(rows).filled["심화중"] === 1 &&
          countExtendingForms(rows).filled["심화중"] === 0
        );
      },
    },
    // ── 살아 있는 엔진: 이 자가 실물을 실제로 보나 ──
    {
      label: "실물 — 등록된 소단원을 실제로 읽는다",
      ok: () => engineRows().filter((r) => r.tiers.length > 0).length > 100,
    },
    {
      label: "실물 — 등록된 소단원은 핵심 넷을 전부 갖는다",
      ok: () => auditCore(engineRows()).length === 0,
    },
    {
      label: "실물 — 문형 등록부를 실제로 읽는다(적재기가 부르는 경로)",
      ok: () => countExtendingForms(engineRows()).units > 100,
    },
  ];
}

function runSelftest(): number {
  const list = gauges();
  let bad = 0;
  for (const g of list) {
    const ok = g.ok();
    if (!ok) bad += 1;
    console.log(`${ok ? "✅" : "❌"} ${g.label}`);
  }
  console.log(`\n눈금 ${list.length}건 — 실패 ${bad}건`);
  return bad === 0 ? 0 : 1;
}

function main() {
  if (process.argv.includes("--selftest")) {
    process.exit(runSelftest());
  }

  const grade = process.argv.slice(2).find((a) => a.startsWith("초"));
  const all = engineRows(grade);
  const byPath = [
    ["갈래 (판정기·시험이 보는 것)", countExtending(all)] as const,
    ["문형 (**적재기**가 부르는 것)", countExtendingForms(all)] as const,
  ];

  console.log(`확대 중인 갈래 채움 — ${grade ?? "전 학년"}\n`);
  for (const [label, c] of byPath) {
    console.log(`  ${label} · 등록 소단원 ${c.units}개`);
    for (const t of EXTENDING_DIFFICULTIES) {
      const n = c.filled[t] ?? 0;
      const pct = c.units > 0 ? ((n / c.units) * 100).toFixed(1) : "0.0";
      console.log(
        `     ${t}   ${String(n).padStart(4)} / ${c.units}   (${pct}%)`,
      );
    }
    const byGrade = new Map<string, number>();
    for (const r of c.rows)
      byGrade.set(r.grade, (byGrade.get(r.grade) ?? 0) + 1);
    console.log(
      `     아직 덜 채운 소단원 ${c.rows.length}개` +
        (byGrade.size > 0
          ? ` — ${[...byGrade]
              .sort()
              .map(([g, n]) => `${g} ${n}`)
              .join(" · ")}`
          : ""),
    );
    console.log("");
  }

  console.log(
    "🔴 **두 줄이 갈리면 그것이 결함이다.** 갈래만 채우면 지면에는 한 건도\n" +
      "   안 나간다 — 적재기(`load-engine-problems.ts`)는 **문형**을 돈다.\n\n" +
      "⚠️ 이 자는 «있나»만 센다 — «저쪽 심화(중) 높이인가»는 못 잰다.\n" +
      "   난이도는 지면에 없다. 높이는 /dev/tier-bench/g{N} 에서 사람이 본다.",
  );
  // 🔴 **종료 코드로 막지 않는다.** 확대는 여러 회차에 걸쳐 진행되고, 매 회차
  //    빨간 관문은 꺼진다(「거짓 경보는 가드를 끈다」, 2026-08-20). 이 자는
  //    «남은 수»를 보여 주는 계량기이지 관문이 아니다.
}

if (isDirectScript(import.meta.url)) main();
