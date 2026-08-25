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
 *   npx tsx scripts/qa/probe-middle-algebra-combo.ts --coord
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
  /**
   * 미분류가 **어느 쪽에서** 왔나. 둘은 값어치가 아주 다르다 —
   *   `제목` : 바깥 정본(RPM 카탈로그)이 남의 개념을 부르는데 해설이 안 받는다.
   *            **드물고 값어치가 크다.** 앞 트랙이 못 본 자리가 여기 있다.
   *   `해설` : 우리 해설에 남의 낱말이 지나간다. **흔하고 대개 잡음이다** —
   *            통분하며 「최소공배수」, 지수법칙을 설명하며 「거듭제곱」처럼
   *            **도구로 쓰는 산술 어휘**가 그대로 걸린다.
   * 섞어서 한 무더기로 내면 값어치 큰 쪽이 잡음에 묻힌다.
   */
  channel: "제목" | "해설" | null;
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
 * 이 유형이 **자기 것으로 주장하는** 핵심어.
 *
 * ⚠️ **`coreTerms` 의 결과만 쓰면 안 된다.** `coreTerms` 는 「의」 앞 머리만 남기므로
 * `정비례 관계 y=ax의 그래프` 의 핵심어는 `정비례 관계 y=ax` 하나이고 **`그래프` 가
 * 빠진다.** 그러면 「정비례 관계의 그래프」 유형이 제 소단원 이름에 있는 낱말을
 * 「남의 개념」으로 세어 **결합형으로 잘못 잡힌다** — 첫 판에서 33건 중 14건이
 * 그 하나 때문이었다.
 *
 * 그래서 자기 것은 **이름 문자열 안에 들어 있는 핵심어 전부**로 잡는다. 사전을
 * 훑어 「내 이름에 이 낱말이 있나」를 묻는다 — 자르는 규칙과 **무관하게** 옳다.
 */
function ownCores(
  t: { unitSection: string; rpmMinor: string },
  lexicon: Map<string, Set<string>>,
): Set<string> {
  const own = new Set([...coreTerms(t.unitSection), ...coreTerms(t.rpmMinor)]);
  for (const core of lexicon.keys()) {
    if (t.unitSection.includes(core) || t.rpmMinor.includes(core))
      own.add(core);
  }
  return own;
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
  const own = ownCores(t, lexicon);
  const fromTitle = foreignHits(t.rpmTitle, own, lexicon);
  const solutionText = t.samples.map((s) => s.solution).join("\n");
  const fromSolution = foreignHits(solutionText, own, lexicon);
  const both = fromTitle.filter((c) => fromSolution.includes(c));

  let verdict: Verdict;
  let channel: "제목" | "해설" | null = null;
  let reason: string;
  if (both.length > 0) {
    verdict = "결합형";
    reason = `제목과 해설이 **같은** 남의 개념을 부른다 — ${both.join(" · ")}`;
  } else if (fromTitle.length > 0) {
    verdict = "미분류";
    channel = "제목";
    reason = `제목만 남의 개념을 부른다(해설이 안 받는다) — ${fromTitle.join(" · ")}`;
  } else if (fromSolution.length > 0) {
    verdict = "미분류";
    channel = "해설";
    reason = `해설만 남의 개념을 부른다(제목이 안 부른다) — ${fromSolution.join(" · ")}`;
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
    channel,
    reason,
  };
}

/**
 * 눈금 — **양성과 음성을 둘 다** 댄다.
 *
 * 양성 둘은 D-109 가 실물(생성기 원문)로 확인한 것이다. 음성 여섯은 같은 대수 책의
 * 평범한 유형이다 — 「자기 개념만 쓰는」 자리라야 지어냄을 잰다.
 */
const CALIBRATION: { key: string; expect: Verdict; note?: string }[] = [
  { key: "2-1|연립일차방정식|19", expect: "결합형" },
  { key: "2-1|연립일차방정식|20", expect: "결합형" },
  { key: "2-1|일차부등식|07", expect: "아님" },
  { key: "2-1|유리수와 순환소수|02", expect: "아님" },
  { key: "1-1|일차방정식의 활용|01", expect: "아님" },
  { key: "3-1|이차방정식의 풀이|01", expect: "아님" },
  // ⚠️ 아래 둘은 처음에 「아님」으로 기대했다가 **눈금이 판정을 거부해서** 고쳤다.
  //    판정기가 틀린 게 아니라 **내 기대값이 틀렸다** — 둘 다 해설에 남의 낱말이
  //    실제로 있다(`거듭제곱` · `최소공배수`). 그것은 결합이 아니라 **도구로 쓰는
  //    산술 어휘**이고, 이 열쇠는 그 둘을 못 가른다. 그래서 「아님」이 아니라
  //    「미분류(해설)」이 정직한 답이다. **못 가르는 것을 「아님」에 숨기지 않는다.**
  { key: "2-1|단항식의 계산|01", expect: "미분류", note: "해설의 `거듭제곱`" },
  {
    key: "2-1|다항식의 계산|01",
    expect: "미분류",
    note: "해설의 `최소공배수`",
  },
];

function loadCorpus(path: string): CorpusType[] {
  const raw = JSON.parse(readFileSync(path, "utf8")) as { types: CorpusType[] };
  return raw.types;
}

function argValue(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

/**
 * `--coord` — **D-100 ⑶ 이 정말 지켜지고 있나**를 전량으로 본다.
 *
 * ⚠️ 「좌표라는 낱말이 있나」로는 못 잰다 — 좌표는 일차함수·이차함수의 **정식 내용**이다.
 * 가르는 것은 **«도형 + 좌표 + 길이/넓이» 셋의 교집합**이다(D-109 가 결합형에 건
 * 불변식과 같은 축).
 *
 * ⚠️ 그리고 여기 걸린 것이 곧 결함은 아니다. D-100 ⑶ 은 **결합형을 만들 때** 그
 * 방식을 쓰지 말라는 규칙이고, RPM 이 정식으로 싣는 유형(`좌표평면 위의 도형의 넓이`
 * 는 중1 유형이다)까지 틀렸다는 뜻이 아니다. 이 목록은 **「새 결합형이 여기와 겹치면
 * 안 된다」는 회피 목록**으로 쓴다.
 */
function sweepCoordinateShapes(all: CorpusType[]): void {
  const SHAPE = /삼각형|사각형|평행사변형|마름모|사다리꼴|다각형/;
  const COORD = /좌표|\(\s*-?\d+\s*,|원점/;
  const MEASURE = /넓이|길이|둘레/;
  const hits = all.filter((t) => {
    const text = t.samples.map((s) => `${s.content}\n${s.solution}`).join("\n");
    return SHAPE.test(text) && COORD.test(text) && MEASURE.test(text);
  });
  console.log(
    `\n[--coord] 전량 ${all.length}유형 중 «도형 + 좌표 + 길이/넓이» ${hits.length}유형` +
      ` — 결함 목록이 아니라 **새 결합형이 겹치면 안 되는 자리**다.`,
  );
  for (const t of hits) {
    console.log(`  ${t.rpmBook}  ${t.key}`);
    console.log(`      ${t.grade} · ${t.unitSection} — ${t.rpmTitle}`);
  }
}

/**
 * `--selftest` — **손으로 만든 픽스처**로 눈금을 잰다. 말뭉치(`C:/tmp`)가 없어도 돈다.
 *
 * ⚠️ **양성 대조군을 살아 있는 등록부에서 뽑지 않는다.** 그러면 그 유형을 고치는 순간
 * 양성이 사라지고 재현율을 영영 못 잰다(전량 초록이라 잘 도는 것처럼 보인다) —
 * CLAUDE.md D-66 ⒀ 이 적어 둔 그 자리다. 문자열로 박는다.
 *
 * ⚠️ 그리고 **토크나이저만 재면 안 된다.** 첫 판이 `coreTerms` 5건만 봤는데, 그때
 * 실제로 틀린 것은 `ownCores`(자기 이름 안의 낱말을 남의 것으로 셌다)였다.
 * **판정 함수 자체**를 대야 그 부류가 잡힌다 — 아래 R 항목이 그 회귀다.
 */
function selftest(): void {
  const fixtureEntries = [
    { unitSection: "여러 가지 연립방정식의 풀이", rpmMinor: "연립일차방정식" },
    { unitSection: "순환소수의 분수 표현", rpmMinor: "유리수와 순환소수" },
    { unitSection: "지수법칙", rpmMinor: "단항식의 계산" },
    { unitSection: "정비례 관계 y=ax의 그래프", rpmMinor: "정비례와 반비례" },
    { unitSection: "일차부등식의 풀이", rpmMinor: "일차부등식" },
    // ⚠️ **이 줄이 아래 R 눈금을 살린다.** 이것이 없으면 사전에 `그래프` 라는 핵심어가
    //    **아예 안 생긴다**(`정비례 관계 y=ax의 그래프` 는 「의」 앞만 남아 `정비례 관계
    //    y=ax` 하나만 낸다). 그러면 `ownCores` 를 옛 판으로 되돌려도 R 이 **초록**이다 —
    //    변이 시험에서 실제로 그랬다. **「가드가 초록이면 픽스처가 경계를 가르는지부터
    //    보라」**(CLAUDE.md 2026-08-21). `좌표와 그래프` 는 「와 」로 갈려 `그래프` 를 낸다.
    { unitSection: "순서쌍과 좌표평면", rpmMinor: "좌표와 그래프" },
  ];
  const lex = buildLexicon(fixtureEntries);
  const make = (
    unitSection: string,
    rpmMinor: string,
    rpmTitle: string,
    solution: string,
  ): CorpusType => ({
    key: "픽스처",
    grade: "중2",
    unitSection,
    rpmBook: "2-1",
    rpmMinor,
    rpmTitle,
    samples: [{ solution, content: "" }],
  });

  const cases: [string, boolean][] = [];
  const gauge = (label: string, ok: boolean) => cases.push([label, ok]);

  // ── 핵심어 자르는 규칙 ────────────────────────────────────────────────
  const core: [string, string[]][] = [
    ["연립방정식의 풀이", ["연립방정식"]],
    ["순환소수의 분수 표현", ["순환소수"]],
    ["일차함수의 활용(속력, 도형, 기타)", ["일차함수"]],
    ["지수법칙", ["지수법칙"]],
    ["유리수와 소수", ["유리수"]], // 「소수」는 2자라 버려진다
  ];
  for (const [input, want] of core)
    gauge(
      `핵심어 ${input} → ${JSON.stringify(want)}`,
      JSON.stringify(coreTerms(input)) === JSON.stringify(want),
    );

  // ── 양성: 제목과 해설이 **같은** 남의 개념을 부른다 ────────────────────
  gauge(
    "양성 — 제목·해설이 둘 다 순환소수를 부른다 → 결합형",
    judge(
      make(
        "여러 가지 연립방정식의 풀이",
        "연립일차방정식",
        "계수가 순환소수인 연립방정식",
        "순환소수를 분수로 고쳐 계수를 정리한다.",
      ),
      lex,
    ).verdict === "결합형",
  );

  // ── 음성 ①: 제목만 ────────────────────────────────────────────────────
  const titleOnly = judge(
    make(
      "여러 가지 연립방정식의 풀이",
      "연립일차방정식",
      "계수가 순환소수인 연립방정식",
      "가감법으로 두 식을 더해 정리한다.",
    ),
    lex,
  );
  gauge("음성① — 제목만 부른다 → 미분류", titleOnly.verdict === "미분류");
  gauge("음성① — 그 미분류는 «제목» 갈래다", titleOnly.channel === "제목");

  // ── 음성 ②: 해설만 ────────────────────────────────────────────────────
  const solOnly = judge(
    make(
      "여러 가지 연립방정식의 풀이",
      "연립일차방정식",
      "괄호가 있는 연립방정식의 풀이",
      "괄호를 풀고 지수법칙으로 정리한다.",
    ),
    lex,
  );
  gauge("음성② — 해설만 부른다 → 미분류", solOnly.verdict === "미분류");
  gauge("음성② — 그 미분류는 «해설» 갈래다", solOnly.channel === "해설");

  // ── 음성 ③: 자기 개념만 ───────────────────────────────────────────────
  gauge(
    "음성③ — 자기 개념만 쓴다 → 아님",
    judge(
      make(
        "일차부등식의 풀이",
        "일차부등식",
        "일차부등식의 풀이",
        "양변을 정리해 해를 구한다.",
      ),
      lex,
    ).verdict === "아님",
  );

  // ── R: 회귀 — **자기 이름 안의 낱말은 남의 것이 아니다** ───────────────
  // 첫 판에서 결합형 33건 중 14건이 이 결함이었다. `coreTerms` 만 재던 옛 눈금은
  // 이 부류를 **구조적으로 못 봤다** — 틀린 것이 `ownCores` 였기 때문이다.
  gauge(
    "R — 「…의 그래프」 소단원이 제 이름의 `그래프`로 결합형이 되지 않는다",
    judge(
      make(
        "정비례 관계 y=ax의 그래프",
        "정비례와 반비례",
        "정비례 관계 y=ax의 그래프",
        "그래프가 원점을 지나는 직선임을 이용한다.",
      ),
      lex,
    ).verdict === "아님",
  );

  console.log(`눈금 ${cases.length}건`);
  let bad = 0;
  for (const [label, ok] of cases) {
    if (!ok) bad += 1;
    console.log(`${ok ? "✅" : "❌"} ${label}`);
  }
  if (bad > 0) {
    console.log(`\n🔴 눈금 ${bad}건 실패`);
    process.exitCode = 1;
  }
}

function main(): void {
  if (process.argv.includes("--selftest")) {
    selftest();
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
  if (process.argv.includes("--coord")) {
    sweepCoordinateShapes(all);
    return;
  }

  // ── 분모를 먼저 찍는다 ────────────────────────────────────────────────
  const algebra = all.filter((t) => ALGEBRA_BOOKS.has(t.rpmBook));
  console.log(
    `\n분모 — 등록 ${all.length}유형 중 대수 책(${[...ALGEBRA_BOOKS].join(" · ")}) ${algebra.length}유형`,
  );

  const findings = algebra.map((t) => judge(t, lexicon));
  const combo = findings.filter((f) => f.verdict === "결합형");
  const byTitle = findings.filter((f) => f.channel === "제목");
  const bySolution = findings.filter((f) => f.channel === "해설");
  const none = findings.filter((f) => f.verdict === "아님");
  console.log(
    `판정 — 결합형 ${combo.length} · 미분류(제목) ${byTitle.length}` +
      ` · 미분류(해설) ${bySolution.length} · 아님 ${none.length}` +
      `  (합 ${combo.length + byTitle.length + bySolution.length + none.length} == ${findings.length})`,
  );

  const show = (title: string, rows: AlgebraFinding[]) => {
    if (rows.length === 0) return;
    console.log(`\n## ${title} ${rows.length}건`);
    for (const f of rows) {
      console.log(`  ${f.key}  ${f.rpmTitle}`);
      console.log(`      ${f.grade} · ${f.unitSection} — ${f.reason}`);
    }
  };
  show("결합형", combo);
  show("미분류 — 제목만 (값어치 큰 쪽, 눈으로 볼 것)", byTitle);
  show("미분류 — 해설만 (대개 도구 어휘, 잡음)", bySolution);

  console.log(
    `\n⚠️ 「미분류」는 **아직 못 가른 것**이지 「아님」이 아니다. 눈으로 봐야 한다.` +
      `\n⚠️ 이 판정기는 «이름으로 부르는» 결합만 본다 — 이름 없이 개념만 쓰는 결합은` +
      ` 여전히 못 본다(앞 트랙 §9 와 같은 한계). **그러므로 이 숫자는 총수가 아니라 하한이다.**`,
  );
}

if (process.argv[1]?.includes("probe-middle-algebra-combo")) main();
