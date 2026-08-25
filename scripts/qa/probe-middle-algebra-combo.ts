/**
 * 대수 책(1-1 · 2-1 · 3-1)의 **놓친 결합형**을 훑는다 — 원장님 지시 2026-08-25 「훑어」.
 *
 * ## 왜 또 훑나 (D-109)
 * 앞 트랙(`tracks/middle-combo-classify.md`)이 낸 결합형 30건은 **기하로 쏠려** 있다
 * (피타고라스가 낀 것 20/30 · 3-2 에 16/30). 그 보고서 §9 가 한계를 스스로 적어 뒀다 —
 * 「이름도 없고 이번에 채택한 네 식 모양도 아닌 개념 사용은 여전히 못 본다」.
 * 채택된 열쇠 6종이 전부 **기하의 식 모양**(근호·비례식·전체각 360·제곱의 합차)이거나
 * 일차방정식의 수식골격이라, 「순환소수 → 분수」·「밑을 맞춰 지수 비교」 같은
 * **대수의 변환 단계**를 가리키는 열쇠가 **하나도 없다.**
 *
 * 그래서 `2-1|연립일차방정식|19`(계수가 순환소수인 연립방정식)가 「미분류」로,
 * `|20`(지수법칙을 이용한 연립방정식)이 **「아님」** 으로 떨어졌다. 둘 다 정의 그대로
 * 결합형이다. **열쇠가 없는 축은 점수가 구조적으로 0 이고, 그 0 은 「없다」가 아니라
 * 「못 센다」다.**
 *
 * ## 이 판정기의 열쇠 — 손으로 짓지 않는다
 * 개념 낱말 목록을 손으로 적으면 목록에 없는 부류가 또 구조적으로 0 이 된다
 * (CLAUDE.md 2026-08-18 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」).
 * 그래서 어휘를 **정본에서 프로그램으로 뽑는다** — 살아 있는 `registeredTypes()` 의
 * `unitSection`·`rpmMinor` 전량에서 핵심어를 유도한다(`coreTerms`).
 *
 * 판정은 **출처가 다른 두 근거**를 요구한다:
 *   ㉠ **제목**  — RPM 카탈로그(바깥 정본)가 자기 소단원 밖 개념을 부른다
 *   ㉡ **해설**  — 우리 생성기가 만든 풀이가 그 개념을 부른다
 *
 * 둘 다면 `결합형`, **하나뿐이면 `미분류`**, 아무것도 없으면 `아님`.
 *
 * ⚠️ **왜 제목 하나로 판정하지 않나** — D-100 이 적어 둔 그대로
 * 「유형 제목은 실제 풀이를 보장하지 않는다」(`2-2|피타고라스 정리|09` 는 제목에
 * 「닮음」이 있지만 해설이 닮음을 안 쓴다). 그리고 해설 하나로도 판정하지 않는다 —
 * 지나가는 말로 낱말이 한 번 나오는 것과 그 개념이 필요한 것은 다르다.
 * **한쪽만 맞으면 「아님」이 아니라 「미분류」다.** 0 이 「없다」인지 「못 센다」인지
 * 갈라야 하기 때문이다.
 *
 * ## 눈금 (양성·음성 둘 다)
 * 양성만 대면 지어냄이 구조적으로 0 이 된다(CLAUDE.md 2026-08-20). `--calibrate` 가
 * **양성 2 · 음성 6** 을 대고, 하나라도 어긋나면 **판정을 거부한다.**
 *
 *   npx tsx scripts/qa/probe-middle-algebra-combo.ts --calibrate
 *   npx tsx scripts/qa/probe-middle-algebra-combo.ts
 *   npx tsx scripts/qa/probe-middle-algebra-combo.ts --selftest
 */
import { readFileSync } from "node:fs";

import { registeredTypes } from "../../src/lib/middle/generate";

const DEFAULT_CORPUS = "C:/tmp/middle-combo/corpus-0825.json";

/** 대수 책 — RPM 은 홀수 권이 수와 식·방정식·함수다. */
const ALGEBRA_BOOKS = new Set(["1-1", "2-1", "3-1"]);

/**
 * 핵심어가 이보다 짧으면 버린다. 「수」·「함수」 같은 두 글자는 어디에나 걸려
 * 거짓 경보를 쏟고, **거짓 경보는 가드를 끈다**(CLAUDE.md 2026-08-20).
 */
const MIN_CORE = 3;

export type Verdict = "결합형" | "아님" | "미분류";

export type AlgebraFinding = {
  key: string;
  grade: string;
  unitSection: string;
  rpmTitle: string;
  verdict: Verdict;
  /** 제목이 부른 남의 핵심어 */
  fromTitle: string[];
  /** 해설이 부른 남의 핵심어 */
  fromSolution: string[];
  /** 두 근거가 겹치는 것 — 결합형 판정의 근거 */
  both: string[];
  reason: string;
};

type CorpusType = {
  key: string;
  grade: string;
  unitSection: string;
  rpmBook: string;
  rpmMinor: string;
  rpmTitle: string;
  samples: { solution: string; content: string }[];
};

/**
 * 소단원 이름에서 **핵심 명사**를 뽑는다. 손 목록이 아니라 **한 가지 변환 규칙**이다:
 *   ⑴ 괄호 안은 버린다 — `일차함수의 활용(속력, 도형, 기타)` → `일차함수의 활용`
 *   ⑵ 「…의 X」이면 「의」 앞만 남긴다 — `연립방정식의 풀이` → `연립방정식`
 *   ⑶ 「A와 B」·「A과 B」는 둘 다 낸다 — `유리수와 소수` → `유리수` · `소수`
 *   ⑷ `MIN_CORE` 자 미만은 버린다
 *
 * ⚠️ 규칙이지 사전이 아니다. 그래서 새 소단원이 생겨도 **자동으로 따라온다** —
 * 사전이면 그 소단원은 영영 0 이 된다.
 */
export function coreTerms(sectionName: string): string[] {
  const noParen = sectionName.replace(/\([^)]*\)/g, "").trim();
  const out = new Set<string>();
  for (const piece of noParen.split(/(?:와|과)\s+/)) {
    const head = piece.split("의 ")[0]!.trim();
    if (head.length >= MIN_CORE) out.add(head);
  }
  return [...out];
}

/** 살아 있는 등록부 전량에서 핵심어 사전을 만든다 — 정본이 바뀌면 같이 바뀐다. */
export function buildLexicon(
  entries: { unitSection: string; rpmMinor: string }[],
): Map<string, Set<string>> {
  const lex = new Map<string, Set<string>>();
  for (const e of entries) {
    for (const source of [e.unitSection, e.rpmMinor]) {
      for (const core of coreTerms(source)) {
        if (!lex.has(core)) lex.set(core, new Set());
        lex.get(core)!.add(source);
      }
    }
  }
  return lex;
}

/**
 * 이 유형이 **자기 것으로 주장하는** 핵심어. 자기 소단원·자기 RPM 중단원에서 나온
 * 것은 「남의 개념」이 아니다.
 *
 * ⚠️ 포함 관계도 자기 것으로 본다 — `연립방정식의 풀이` 안에 있는 유형이 제목에
 * 「연립방정식」을 쓰는 것은 당연하다.
 */
function ownCores(t: { unitSection: string; rpmMinor: string }): Set<string> {
  return new Set([...coreTerms(t.unitSection), ...coreTerms(t.rpmMinor)]);
}

function foreignHits(
  text: string,
  own: Set<string>,
  lexicon: Map<string, Set<string>>,
): string[] {
  const hits: string[] = [];
  for (const core of lexicon.keys()) {
    if (own.has(core)) continue;
    // 자기 핵심어에 «포함»되는 낱말도 남의 것이 아니다
    // (`연립방정식` 을 가진 유형에게 `연립방정` 같은 조각이 잡히지 않게).
    if ([...own].some((o) => o.includes(core) || core.includes(o))) continue;
    if (text.includes(core)) hits.push(core);
  }
  return hits.sort();
}

export function judge(
  t: CorpusType,
  lexicon: Map<string, Set<string>>,
): AlgebraFinding {
  const own = ownCores(t);
  const fromTitle = foreignHits(t.rpmTitle, own, lexicon);
  const solutionText = t.samples.map((s) => s.solution).join("\n");
  const fromSolution = foreignHits(solutionText, own, lexicon);
  const both = fromTitle.filter((c) => fromSolution.includes(c));

  let verdict: Verdict;
  let reason: string;
  if (both.length > 0) {
    verdict = "결합형";
    reason = `제목과 해설이 **같은** 남의 개념을 부른다 — ${both.join(" · ")}`;
  } else if (fromTitle.length > 0 || fromSolution.length > 0) {
    verdict = "미분류";
    reason =
      fromTitle.length > 0
        ? `제목만 남의 개념을 부른다(해설이 안 받는다) — ${fromTitle.join(" · ")}`
        : `해설만 남의 개념을 부른다(제목이 안 부른다) — ${fromSolution.join(" · ")}`;
  } else {
    verdict = "아님";
    reason = "제목·해설 어디에도 남의 개념이 없다";
  }
  return {
    key: t.key,
    grade: t.grade,
    unitSection: t.unitSection,
    rpmTitle: t.rpmTitle,
    verdict,
    fromTitle,
    fromSolution,
    both,
    reason,
  };
}

/**
 * 눈금 — **양성과 음성을 둘 다** 댄다.
 *
 * 양성 둘은 D-109 가 실물(생성기 원문)로 확인한 것이다. 음성 여섯은 같은 대수 책의
 * 평범한 유형이다 — 「자기 개념만 쓰는」 자리라야 지어냄을 잰다.
 */
const CALIBRATION: { key: string; expect: Verdict }[] = [
  { key: "2-1|연립일차방정식|19", expect: "결합형" },
  { key: "2-1|연립일차방정식|20", expect: "결합형" },
  { key: "2-1|일차부등식|07", expect: "아님" },
  { key: "2-1|단항식의 계산|01", expect: "아님" },
  { key: "2-1|유리수와 순환소수|02", expect: "아님" },
  { key: "1-1|일차방정식의 활용|01", expect: "아님" },
  { key: "3-1|이차방정식의 풀이|01", expect: "아님" },
  { key: "2-1|다항식의 계산|01", expect: "아님" },
];

function loadCorpus(path: string): CorpusType[] {
  const raw = JSON.parse(readFileSync(path, "utf8")) as { types: CorpusType[] };
  return raw.types;
}

function argValue(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function main(): void {
  if (process.argv.includes("--selftest")) {
    // 규칙이 살아 있나 — 제품을 거치지 않고 손으로 만든 입력으로 본다.
    const cases: [string, string[]][] = [
      ["연립방정식의 풀이", ["연립방정식"]],
      ["순환소수의 분수 표현", ["순환소수"]],
      ["일차함수의 활용(속력, 도형, 기타)", ["일차함수"]],
      ["지수법칙", ["지수법칙"]],
      ["유리수와 소수", ["유리수"]], // 「소수」는 2자라 버려진다
    ];
    let bad = 0;
    for (const [input, want] of cases) {
      const got = coreTerms(input);
      const ok = JSON.stringify(got) === JSON.stringify(want);
      if (!ok) bad += 1;
      console.log(`${ok ? "✔" : "✘"} ${input} → ${JSON.stringify(got)}`);
    }
    if (bad > 0) process.exitCode = 1;
    return;
  }

  const corpusPath = argValue("corpus", DEFAULT_CORPUS);
  const all = loadCorpus(corpusPath);
  const lexicon = buildLexicon(registeredTypes());
  const byKey = new Map(all.map((t) => [t.key, t]));

  // ── 눈금부터. 어긋나면 판정을 내지 않는다. ─────────────────────────────
  const cal = CALIBRATION.map((c) => {
    const t = byKey.get(c.key);
    if (!t) return { ...c, got: "없음" as const, ok: false };
    const got = judge(t, lexicon).verdict;
    return { ...c, got, ok: got === c.expect };
  });
  console.log("눈금 (양성 2 · 음성 6)");
  for (const c of cal) {
    console.log(
      `  ${c.ok ? "✔" : "✘"} ${c.key} — 기대 ${c.expect} / 실제 ${c.got}`,
    );
  }
  const failed = cal.filter((c) => !c.ok);
  if (failed.length > 0) {
    console.log(
      `\n🔴 눈금 ${failed.length}건이 어긋났다 — **판정을 내지 않는다.**` +
        ` 열쇠가 무엇을 세는지 모르는 채로 나온 숫자는 근거가 아니다.`,
    );
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes("--calibrate")) return;

  // ── 분모를 먼저 찍는다 ────────────────────────────────────────────────
  const algebra = all.filter((t) => ALGEBRA_BOOKS.has(t.rpmBook));
  console.log(
    `\n분모 — 등록 ${all.length}유형 중 대수 책(${[...ALGEBRA_BOOKS].join(" · ")}) ${algebra.length}유형`,
  );

  const findings = algebra.map((t) => judge(t, lexicon));
  const count = (v: Verdict) => findings.filter((f) => f.verdict === v).length;
  console.log(
    `판정 — 결합형 ${count("결합형")} · 미분류 ${count("미분류")} · 아님 ${count("아님")}` +
      `  (합 ${findings.length})`,
  );

  for (const v of ["결합형", "미분류"] as const) {
    const rows = findings.filter((f) => f.verdict === v);
    if (rows.length === 0) continue;
    console.log(`\n## ${v} ${rows.length}건`);
    for (const f of rows) {
      console.log(`  ${f.key}  ${f.rpmTitle}`);
      console.log(`      ${f.grade} · ${f.unitSection} — ${f.reason}`);
    }
  }

  console.log(
    `\n⚠️ 「미분류」는 **아직 못 가른 것**이지 「아님」이 아니다. 눈으로 봐야 한다.` +
      `\n⚠️ 이 판정기는 «이름으로 부르는» 결합만 본다 — 이름 없이 개념만 쓰는 결합은` +
      ` 여전히 못 본다(앞 트랙 §9 와 같은 한계).`,
  );
}

if (process.argv[1]?.includes("probe-middle-algebra-combo")) main();
