/**
 * 🚧 **고등 공용 판정기 — 적재 전 관문** (2026-10-08 엔진 보강 ③-0 · 3자 합의 §6-2).
 *
 * 고등 유형을 문제은행에 싣기 **직전의 행**(적재기 `buildHighRows` 가 낸 단답 · 객관 두 벌)을 통째로 넣어
 * 다섯 가지를 묻는다. 생성기 시험(`highRegistry.test.ts` · 모듈 시험)은 **생성기가 낸 문항**을 보는데, 실리는
 * 것은 그 뒤에 객관식으로 파생하고 열쇠를 붙인 **행**이다 — «엔진을 본 것과 적재본을 본 것은 다른 일»이다
 * (20번 문서 2026-08-27 · 2026-09-04 «판정기의 축이 적재기의 걸음과 어긋나면»).
 *
 * | 축 | 물음 | 걸리면 |
 * |---|---|---|
 * | 렌더 | 수식마다 KaTeX 오류가 없는가 · `$` 짝이 맞는가 · 죽은 역슬래시가 없는가 | 막는다 |
 * | 보기 | 보기가 다섯인가 · **값이 같은 보기**가 없는가 · 정답 번호가 단답 정답을 가리키는가 | 막는다 |
 * | 답이 발문에 | 답이 발문에 그대로 적혀 있는가(단위 붙은 수량 · 식) | 막는다 |
 * | 차시 대응 | `과목 + 차시` 가 단원 시드에 글자 그대로 **하나** 있는가 | 막는다 |
 * | 난이도 | 칸이 여섯 칸 가운데 하나인가 — 분포는 세어 낸다 | 막는다(모르는 칸) |
 *
 * 막지 않고 **세어서 찍는** 것 둘:
 *
 * - `unread` — 값으로 못 읽은 보기. 0 이 «깨끗»인지 «못 셈»인지 갈리게 따로 센다.
 * - `bareAnswer` — 답이 맨 수(`$12$`)이고 그 수가 발문에 수식 한 덩어리로 그대로 있는 변형의 비율.
 *   맨 수는 계수 · 조건값과 우연히 겹치는 일이 흔해 한 건씩 막으면 거짓 경보가 가드를 끈다
 *   (`census-middle-degenerate.ts` 가 맨 숫자를 안 보는 까닭과 같다). 대신 **유형마다 비율**을 내고,
 *   비율이 높은 유형을 사람이 읽는다 — 늘 겹치는 유형은 우연이 아니라 꼴이 그런 것이다.
 *
 * 규칙을 옮겨 적지 않는다 — 죽은 역슬래시는 `probe-middle-raw-latex`, 단위 붙은 수량의 «답이 발문에»는
 * `census-middle-degenerate`, 보기 가르기는 지면 파서 `parseProblemContent`, 렌더 실패 판정은 제품의
 * `isFailedKatexHtml` 를 그대로 부른다. 여기서 새로 적은 것은 보기의 **값 대조**(`highChoiceValue.ts`)뿐이다.
 *
 * DB 를 안 읽는다 · 아무것도 안 쓴다. 적재기(`load-engine-problems.ts`)가 고등 행에 이것을 돌려 막힌 것이
 * 있으면 멈추고, `probe-high-gate.ts` 가 표로 찍고, `highLoadGate.test.ts` 가 관문으로 잠근다.
 */
import katex from "katex";

import { CURRICULUM_UNITS, type UnitSeed } from "../../prisma/seed-data/units";
import { DIFFICULTY_LADDER } from "../../src/contracts/difficulty";
import {
  isFailedKatexHtml,
  UI_KATEX_OPTIONS,
} from "../../src/lib/math/katexRender";
import { parseProblemContent } from "../../src/lib/problem/parseProblemContent";

import { degenerateFindings } from "./census-middle-degenerate";
import { sameChoice } from "./highChoiceValue";
import { deadBackslashHits } from "./probe-middle-raw-latex";

/** 관문이 보는 행 — 적재기의 `Row` 가 그대로 들어맞는다. */
export type GateRow = {
  externalId: string;
  variantKey: string;
  familyKey: string;
  grade: string;
  section: string;
  content: string;
  answer: string;
  solution: string;
  difficulty: string;
  questionType: string;
};

export type GateAxis = "렌더" | "보기" | "답이 발문에" | "차시 대응" | "난이도";

export type GateHit = {
  axis: GateAxis;
  /** 축 안의 갈래 — 「KaTeX 오류」·「값이 같은 보기」… */
  rule: string;
  externalId: string;
  familyKey: string;
  detail: string;
};

export type GateReport = {
  rows: number;
  families: number;
  /** 막는 것 — 하나라도 있으면 싣지 않는다 */
  hits: GateHit[];
  /** 값으로 못 읽은 보기(행 단위) — 막지 않고 센다 */
  unread: { externalId: string; familyKey: string; choice: string }[];
  /** 값을 견준 보기 쌍 수 — 0 이면 이 축은 «못 셈»이다 */
  comparedPairs: number;
  /**
   * 답이 맨 수인 변형(`variants`)과 그 가운데 답이 발문에 수식 한 덩어리로 그대로 있는 것(`shown`) — 유형마다,
   * 비율 높은 차례. **`shown` 이 0 인 유형도 싣는다** — 빼면 여러 씨앗을 모을 때 분모가 사라진다.
   */
  bareAnswer: { familyKey: string; variants: number; shown: number }[];
  /** 난이도 분포 — 행 수 */
  difficulty: Record<string, number>;
  /** 차시마다 난이도 분포 — `과목 / 차시` */
  bySection: Record<string, Record<string, number>>;
};

const SPAN = /\$([^$]*)\$/g;
const MARKS = "①②③④⑤";
const LEAK_RULE = "답이 발문에 그대로 있다";
const TIERS: readonly string[] = DIFFICULTY_LADDER;

/** 수식 한 덩어리(`$…$`)의 몸통 — 아니면 null. */
function oneSpan(text: string): string | null {
  return /^\$([^$]+)\$$/.exec(text.trim())?.[1] ?? null;
}

const squash = (s: string) => s.replace(/\s+/g, "");

/** KaTeX 가 글꼴 치수를 모르는 글자(「㈎」 따위)마다 찍는 경고 — 렌더 실패가 아니다(제품 렌더도 걸러 낸다). */
const METRIC_WARN = /No character metrics for/;

/** 이 글의 수식이 KaTeX 에서 깨지는가 — 깨진 수식의 몸통들. `$` 짝이 안 맞으면 그 사실을 낸다. */
export function renderFaults(text: string): string[] {
  const out: string[] = [];
  if ((text.match(/(?<!\\)\$/g) ?? []).length % 2 === 1)
    out.push("`$` 의 짝이 안 맞는다");
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && METRIC_WARN.test(args[0])) return;
    warn.apply(console, args);
  };
  try {
    for (const m of text.matchAll(SPAN)) {
      const body = m[1]!;
      if (body.trim() === "") {
        out.push("빈 수식 `$$`");
        continue;
      }
      try {
        const html = katex.renderToString(body, {
          ...UI_KATEX_OPTIONS,
          throwOnError: true,
          output: "html",
        });
        // 모르는 명령은 예외가 아니라 붉은 날문자로 그려진다(KaTeX 0.16) — 제품과 같은 판정으로 본다.
        if (isFailedKatexHtml(html)) out.push(`KaTeX 붉은 글자: ${body}`);
      } catch (e) {
        out.push(
          `KaTeX 오류: ${body} — ${e instanceof Error ? e.message.slice(0, 60) : String(e)}`,
        );
      }
    }
  } finally {
    console.warn = warn;
  }
  return out;
}

/** 답이 맨 수인가 — `$12$` · `$-3$` · `$0.5$`. 이런 답은 발문의 수와 우연히 겹치는 일이 흔하다. */
function isBareNumber(body: string): boolean {
  return /^-?\d+(?:\.\d+)?$/.test(squash(body));
}

/**
 * **식으로 된 답**이 발문에 그대로 적혀 있는가 — 적혀 있으면 그 수식, 아니면 null.
 *
 * 발문의 수식을 `=` 로 가른 변 가운데 하나가 답과 글자까지 같으면 답을 말해 준 것이다
 * (「$A+B=5x-9$일 때 $A+B$를 구하시오」). 맨 수 · 한 글자 답(`$r$`)은 보지 않는다 — 그런 답은 발문의 계수 ·
 * 문자와 겹치는 것이 자연스럽다(맨 수는 `bareAnswer` 로 유형마다 비율을 센다).
 */
export function shownExpression(
  content: string,
  answer: string,
): string | null {
  const body = oneSpan(answer);
  if (body === null) return null;
  const want = squash(body);
  if (isBareNumber(want) || want.length < 3) return null;
  for (const m of content.matchAll(SPAN)) {
    const span = squash(m[1]!);
    if (span === want) return m[0]!;
    // 답이 관계식(`x<3` · `x=2`)이면 통째로 같을 때만 본다 — 변으로 쪼개면 답의 한 토막과 견주게 된다.
    if (/[=<>]|\\(?:le|ge|ne)/.test(want)) continue;
    if (span.split("=").some((side) => side === want)) return m[0]!;
  }
  return null;
}

/** 맨 수 답이 발문에 **수식 한 덩어리로** 그대로 있는가. */
function bareAnswerShown(content: string, answer: string): boolean | null {
  const body = oneSpan(answer);
  if (body === null || !isBareNumber(body)) return null;
  const want = squash(body);
  for (const m of content.matchAll(SPAN))
    if (squash(m[1]!) === want) return true;
  return false;
}

/** 객관식 본문에서 발문(보기 앞)만 — 답이 발문에 있는지는 보기를 뺀 글로 본다. */
function stemOf(content: string): string {
  return parseProblemContent(content).question;
}

export function highLoadGate(
  rows: readonly GateRow[],
  opts: { units?: readonly Pick<UnitSeed, "grade" | "section">[] } = {},
): GateReport {
  const units = opts.units ?? CURRICULUM_UNITS;
  const unitCount = new Map<string, number>();
  for (const u of units) {
    const k = `${u.grade}|${u.section}`;
    unitCount.set(k, (unitCount.get(k) ?? 0) + 1);
  }

  const hits: GateHit[] = [];
  const unread: GateReport["unread"] = [];
  const difficulty: Record<string, number> = {};
  const bySection: Record<string, Record<string, number>> = {};
  const bare = new Map<string, { variants: number; shown: number }>();
  const shortByVariant = new Map<string, GateRow>();
  for (const r of rows)
    if (r.questionType === "단답형") shortByVariant.set(r.variantKey, r);
  const unitChecked = new Set<string>();
  let comparedPairs = 0;

  const hit = (r: GateRow, axis: GateAxis, rule: string, detail: string) =>
    hits.push({
      axis,
      rule,
      externalId: r.externalId,
      familyKey: r.familyKey,
      detail,
    });

  for (const r of rows) {
    // ── 난이도 ──
    difficulty[r.difficulty] = (difficulty[r.difficulty] ?? 0) + 1;
    const sectionKey = `${r.grade} / ${r.section}`;
    const inSection = (bySection[sectionKey] ??= {});
    inSection[r.difficulty] = (inSection[r.difficulty] ?? 0) + 1;
    if (!TIERS.includes(r.difficulty))
      hit(r, "난이도", "모르는 칸", `${r.difficulty}`);

    // ── 차시 대응 — 문항류마다 한 번 ──
    const unitKey = `${r.familyKey}::${r.grade}|${r.section}`;
    if (!unitChecked.has(unitKey)) {
      unitChecked.add(unitKey);
      const n = unitCount.get(`${r.grade}|${r.section}`) ?? 0;
      if (n === 0)
        hit(
          r,
          "차시 대응",
          "단원 시드에 없는 차시",
          `${r.grade} / ${r.section}`,
        );
      else if (n > 1)
        hit(
          r,
          "차시 대응",
          "차시 이름이 단원 둘 이상에 걸린다",
          `${r.grade} / ${r.section} (${n}곳)`,
        );
    }

    // ── 렌더 ──
    for (const [where, text] of [
      ["발문", r.content],
      ["정답", r.answer],
      ["해설", r.solution],
    ] as const) {
      for (const f of renderFaults(text))
        hit(r, "렌더", "KaTeX", `${where}: ${f}`);
      const dead = deadBackslashHits(text);
      if (dead.length > 0)
        hit(
          r,
          "렌더",
          "죽은 역슬래시",
          `${where}: ${[...new Set(dead)].join(", ")}`,
        );
    }

    // ── 보기 ──
    if (r.questionType === "객관식") {
      const choices = parseProblemContent(r.content).choices.map((c) =>
        c.trim(),
      );
      if (choices.length !== 5) {
        hit(r, "보기", "보기가 다섯이 아니다", `${choices.length}개`);
      } else {
        let unreadHere = false;
        for (let i = 0; i < 5; i += 1) {
          for (let j = i + 1; j < 5; j += 1) {
            const same =
              squash(choices[i]!) === squash(choices[j]!)
                ? true
                : sameChoice(choices[i]!, choices[j]!);
            if (same === null) {
              unreadHere = true;
              continue;
            }
            comparedPairs += 1;
            if (same)
              hit(
                r,
                "보기",
                "값이 같은 보기",
                `${MARKS[i]} ${choices[i]} = ${MARKS[j]} ${choices[j]}`,
              );
          }
        }
        if (unreadHere) {
          const bad = choices.find(
            (c) => oneSpan(c) === null || sameChoice(c, c) === null,
          );
          unread.push({
            externalId: r.externalId,
            familyKey: r.familyKey,
            choice: bad ?? choices.join(" / "),
          });
        }
        const at = MARKS.indexOf(r.answer.trim());
        if (r.answer.trim().length !== 1 || at < 0) {
          hit(r, "보기", "정답이 보기 번호 하나가 아니다", r.answer);
        } else {
          const short = shortByVariant.get(r.variantKey);
          if (short && squash(choices[at]!) !== squash(short.answer))
            hit(
              r,
              "보기",
              "정답 번호가 단답 정답을 안 가리킨다",
              `${r.answer} ${choices[at]} ≠ ${short.answer}`,
            );
        }
      }
    }

    // ── 답이 발문에 — 단답형 행으로 본다(객관식은 같은 발문에 보기가 붙은 것이다) ──
    if (r.questionType === "단답형") {
      const stem = stemOf(r.content);
      for (const f of degenerateFindings(stem, r.answer))
        if (f.rule === LEAK_RULE)
          hit(r, "답이 발문에", "단위 붙은 수량", f.detail);
      const shown = shownExpression(stem, r.answer);
      if (shown !== null)
        hit(r, "답이 발문에", "식", `답 ${r.answer} ← 발문 ${shown}`);
      const bareShown = bareAnswerShown(stem, r.answer);
      if (bareShown !== null) {
        const cur = bare.get(r.familyKey) ?? { variants: 0, shown: 0 };
        cur.variants += 1;
        if (bareShown) cur.shown += 1;
        bare.set(r.familyKey, cur);
      }
    }
  }

  return {
    rows: rows.length,
    families: new Set(rows.map((r) => r.familyKey)).size,
    hits,
    unread,
    comparedPairs,
    bareAnswer: [...bare.entries()]
      .map(([familyKey, v]) => ({ familyKey, ...v }))
      .sort(
        (a, b) =>
          b.shown / b.variants - a.shown / a.variants ||
          a.familyKey.localeCompare(b.familyKey),
      ),
    difficulty,
    bySection,
  };
}

/** 막힌 것을 사람이 읽는 줄로 — 축 · 갈래마다 건수와 앞의 몇 건. */
export function describeGate(report: GateReport, sample = 5): string[] {
  const lines: string[] = [];
  const by = new Map<string, GateHit[]>();
  for (const h of report.hits) {
    const k = `${h.axis} — ${h.rule}`;
    by.set(k, [...(by.get(k) ?? []), h]);
  }
  for (const [k, list] of [...by].sort((a, b) => b[1].length - a[1].length)) {
    const families = new Set(list.map((h) => h.familyKey));
    lines.push(`🔴 ${k}: ${list.length}건 · 문항류 ${families.size}`);
    for (const h of list.slice(0, sample))
      lines.push(`     ${h.externalId}\n       ${h.detail}`);
    if (list.length > sample) lines.push(`     … ${list.length - sample}건 더`);
  }
  return lines;
}
