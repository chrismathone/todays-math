/**
 * **중3 난이도 «높이» 계량기** — 매쓰홀릭 벤치마킹 (브리프 `tracks/briefs/mid-tier-bench.md`).
 *
 *     npx tsx scripts/qa/census-tier-frames-m3.ts --selftest   # 이 자가 눈이 멀었나
 *     npx tsx scripts/qa/census-tier-frames-m3.ts --tiers      # 갈래 분포 · 등록 vs 지면
 *     npx tsx scripts/qa/census-tier-frames-m3.ts --axes       # 물음 ④ 후보 축을 나란히
 *     npx tsx scripts/qa/census-tier-frames-m3.ts --frames     # 「얇다」
 *     npx tsx scripts/qa/census-tier-frames-m3.ts --sixgrade   # 6단에 댈 신호 Ⓐ~Ⓔ
 *     npx tsx scripts/qa/census-tier-frames-m3.ts --grid [소단원…]  # 사람이 읽을 격자
 *
 * 변이 시험: `PYTHONIOENCODING=utf-8 python scripts/qa/mutate-census-tier-m3.py`
 * (2026-08-31 실측 — 변이 16개 **전부 빨강**)
 *
 * ## 이 자가 **재는 것**과 **못 재는 것**
 *
 * 재는 것은 전부 **지면의 «모양»** 이다 — 갈래 분포·발문 꼴의 가짓수·해설의 자국.
 * **「어려운가」는 못 잰다.** 그건 지면에 안 적혀 있고, 이 저장소는 그 열쇠를 여러 번
 * 찾다가 버렸다(`probe-elem-tier-ladder.ts` ㉡-b).
 *
 * ## 🔴 「지면」이라 적은 것은 **DB 가 아니라 적재 원장**이다
 *
 * 이 워크트리에 `.env` 가 없어 공유 DB 를 한 줄도 못 읽는다. 그래서 «지면» 은
 * `docs/planning/tracks/reports/engine-load-중등*.json`(커밋된 되돌리기 원장)에서
 * 온다. 원장은 «어느 유형이 몇 행 들어갔나»를 정확히 적지만 **본문·난이도는 안 적는다.**
 * 난이도는 원장의 유형 키를 **오늘 엔진**에 다시 물어 얻는다 — 적재 뒤 엔진이 바뀌었으면
 * 갈린다(2026-08-30 에 실제로 1,560건을 갈아 끼운 이력이 있다).
 *
 * ## 눈금(`--selftest`)이 지키는 것
 *
 * 검출기마다 **양성**(걸려야 하는 실물)과 **음성**(걸리면 안 되는 것)을 둘 다 댄다.
 * 양성만 대면 재현율만 재고 «지어냄»은 구조적으로 0 이 된다(2026-08-20).
 * 저쪽 교재 표지의 양성 대조군은 **저쪽 문항이 아니라 같은 꼴로 내가 지은 문자열**이다
 * (저작권 — 브리프 ㉠).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import type { TypeEntry } from "../../src/lib/middle/types";

import { loneInstruction } from "../../src/lib/middle/tier";
import { OPERATION_INSTRUCTION_WORDS } from "./tier4Rules";
import { enumeratedSteps } from "./probe-elem-tier-enumeration";
import { isDirectScript } from "../import/isDirectScript";

/**
 * 🔴 **`probe-middle-tier-4dan.ts` 를 import 하지 않는다.**
 *
 * 그 파일은 최상위에서 쓸기를 돌고 `process.exitCode` 까지 건드린다(가드가 없다).
 * 처음에 `bareOperationInstruction` 을 가져왔더니 **내 `--selftest` 가 한 줄도 안 돌고
 * 그 판정기의 눈금 8건이 찍혔다** — 내 것처럼 보였다(`tier-bench-g5.md` §7 이 초등
 * 판정기에서 겪고 적어 둔 그 자리다). 규칙은 부작용 없는 SSOT 둘에서 가져온다:
 * `loneInstruction`(`src/lib/middle/tier.ts`) + `OPERATION_INSTRUCTION_WORDS`
 * (`tier4Rules.ts`) — **그 판정기가 쓰는 것과 같은 둘**이다.
 */
export function bareOperationInstruction(content: string): string | null {
  const only = loneInstruction(content);
  if (!only) return null;
  const tail = only.replace(/\.$/, "");
  return OPERATION_INSTRUCTION_WORDS.some((w) => tail.endsWith(w))
    ? only
    : null;
}

const GRADE = "중3";
const SEEDS = [20260831, 5150131, 777003, 424242];
const TIERS = ["연산", "기본", "응용", "심화하", "심화중", "심화상"] as const;
const CORE = ["연산", "기본", "응용", "심화하"] as const;

const REPO = path.resolve(__dirname, "..", "..");
const LEDGERS = [
  "engine-load-중등전량-3변형-형식3종",
  "engine-load-중등-유형보강-재적재",
  "engine-load-파일럿2회차-중등만",
];
const LEDGER_REVERTS = ["engine-load-중등-바뀐유형-되돌림"];

/* ══════════════════════ 검출기 ══════════════════════ */

/** 수식을 접어 한글만 남긴다 — 「지시. ↵ $식$」 꼴을 문장으로 세려고. */
export function plainText(s: string): string {
  return s.replace(/\$[^$]*\$/g, " ◇ ");
}

/**
 * ㉠ **되짚기 마디** — 해설이 미지수를 놓고 식을 세운 횟수 (D-115 축의 중등판).
 *
 * 초등은 「어떤 수」·「되짚습니다」·「검산하면」이 열쇠였다. 중등에서 같은 자리는
 * **「…라 하면」**(미지수 도입)이다 — 되짚기가 방정식으로 바뀌었을 뿐 같은 마디다.
 */
export function backsolveNodes(solution: string): number {
  const p = plainText(solution);
  return (
    p.match(
      /(라 하면|이라 하면|라 놓|이라 놓|라고 하면|라 하자|이라 하자|좌표를)/g,
    ) ?? []
  ).length;
}

/**
 * ㉡ **안 굳는 마디** — 값이 둘 나온 뒤 조건이 하나를 고른다.
 * D-115 의 「굳지 않는 마디가 하나 있고 그 소단원의 성질이 굳힌다」를 중등 어투로 옮긴 것.
 */
export function unsettledNode(solution: string): boolean {
  const p = plainText(solution);
  return (
    /또는/.test(p) && /(버린다|버리|아니므로|이어야|않으므로|만족)/.test(p)
  );
}

/** ㉢ **후보 열거** — D-115 ⑾ 의 규칙을 **그대로 부른다** (옮겨 적지 않는다). */
export function enumerates(solution: string): boolean {
  return enumeratedSteps(solution) >= 3;
}

/**
 * ㉣ **발문 밖 보조 문자** — 해설이 새로 세운 홑문자 변수의 수.
 *
 * ⚠️ 처음에는 LaTeX 명령(`\sqrt` 따위)을 먼저 지웠다. **변이 시험이 그 줄을 장식으로
 *    짚었다** — 지워도 안 지워도 눈금이 초록이었다. 실측하니 중3 2,224조각에서
 *    **결과가 한 번도 안 달라진다**: 아래 정규식은 «앞뒤가 영문자가 아닌 홑글자»만
 *    무는데, LaTeX 명령 이름은 전부 두 글자 이상이라 애초에 안 걸린다. 그래서 지웠다 —
 *    시험할 수 없는 가드는 장식이고, 부품이 적을수록 눈멀 곳도 적다.
 *    (한 글자짜리 명령이 생기면 이 셈이 어긋난다. 그건 §5 에 적었다.)
 */
export function auxLetters(content: string, solution: string): number {
  const grab = (t: string) => {
    const out = new Set<string>();
    for (const m of t.matchAll(/\$[^$]*\$/g)) {
      for (const c of m[0].matchAll(/(?<![a-zA-Z])[a-zA-Z](?![a-zA-Z])/g))
        out.add(c[0]);
    }
    return out;
  };
  const q = grab(content);
  let n = 0;
  for (const c of grab(solution)) if (!q.has(c)) n += 1;
  return n;
}

/** ㉤ **발문 조건 수** — 조건이 겹치면 6단의 「심화(하)」 자리다. */
export function conditionCount(content: string): number {
  return (
    plainText(content).match(/(일 때|이고|이며|이면|단,|였더니|더니)/g) ?? []
  ).length;
}

/**
 * ㉥ **변형 착상** — 해설이 바로 계산하지 않고 **모양을 바꾸어** 푼다.
 * 어휘는 중3 심화하 해설을 눈으로 읽고 골랐다 (그 사실을 보고서에 적었다).
 */
const RESHAPE: RegExp[] = [
  /로 놓고|라 놓고|으로 놓고|로 치환|놓으면 /,
  /묶으면|묶어|짝을 지어|짝지어/,
  /양변을|양변에/,
  /내림차순|오름차순|차수가 낮은/,
  /변형하면|꼴로 고치면|완전제곱식으로 고치면|꼴로 나타내면/,
];
export function reshapeInsight(solution: string): boolean {
  return RESHAPE.some((re) => re.test(solution));
}

/** ㉦ **해설 글자 수** — 게으른 대조군. 「걸음이 많은가」의 가장 싼 대리. */
export function solutionLength(solution: string): number {
  return solution.length;
}

/** ㉧ **해설 문장 수** — ㉦ 와 짝. 글자는 느는데 문장은 안 늘면 «식이 무거운» 것이다. */
export function solutionSentences(solution: string): number {
  return solution
    .split(/\n+/)
    .flatMap((l) => l.split(/(?<=다\.)\s*/))
    .filter((x) => /[가-힣]/.test(x)).length;
}

/**
 * Ⓓ **저쪽 「심화(중)」 표지** — 답이 여럿일 수 있는 **구조를 뒤지게** 하는가.
 * 저쪽 문항을 한 글자도 안 봤다 — D-113 ⑴ 이 적어 둔 «성격»만 옮겼다.
 */
export function structureSearchMark(content: string): boolean {
  const p = plainText(content);
  if (/모두 몇 가지|경우의 수|가능한 모든|서로 다른 .{0,6}가지/.test(p))
    return true;
  if (/카드.{0,20}(만들|늘어놓|배열)/.test(p)) return true;
  if (/(가장 큰|가장 작은).{0,12}(만들|되도록)/.test(p)) return true;
  return false;
}

/** Ⓔ **정답이 예/아니요** — 찍어서 절반을 맞힌다. */
export function yesNoAnswer(answer: string): boolean {
  return /^\s*\$?\s*(예|아니요|아니오|맞다|옳다)\s*\$?\s*$/.test(answer);
}

/** 발문 꼴 — 수·문자를 지워 「같은 문형인가」를 세는 열쇠. */
export function frameOf(content: string): string {
  return plainText(content)
    .replace(/[0-9]+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}
// ⚠️ **이 열쇠는 «한글 뼈대»만 본다.** 우리 발문은 수를 전부 `$…$` 안에 넣으므로
//    `plainText` 가 수식을 통째로 `◇` 로 접는다 — 그래서 «수식만 다른 두 유형»은
//    같은 꼴로 세어진다. 곧 이 수는 다양성의 **하한**이고, 위 `[0-9]+` 치환은
//    수식 **밖**의 수(「$4$장」이 아니라 「4장」)만 맡는다.

/* ══════════════════════ 쓸기 ══════════════════════ */

export type Row = {
  key: string;
  sec: string;
  minor: string;
  title: string;
  tier: string;
  seed: number;
  content: string;
  answer: string;
  solution: string;
  hasFigure: boolean;
};

export function m3Types(): TypeEntry[] {
  return registeredTypes().filter((e) => e.grade === GRADE);
}

export function sweep(seeds = SEEDS): { rows: Row[]; failed: string[] } {
  const rows: Row[] = [];
  const failed: string[] = [];
  for (const e of m3Types()) {
    for (const seed of seeds) {
      try {
        const p = generateMiddleProblem(e.key, seed, 0);
        rows.push({
          key: e.key,
          sec: e.unitSection,
          minor: e.rpmMinor,
          title: e.rpmTitle,
          tier: p.difficulty,
          seed,
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          hasFigure: !!p.figureSpec,
        });
      } catch (err) {
        failed.push(
          `${e.key} s${seed}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
  return { rows, failed };
}

/** 직전 `loadedFromLedger()` 가 되돌림 목록으로 **실제로 뺀** 행 수. 눈금이 이것을 본다. */
export let lastRevertHits = 0;

export type LedgerRow = { externalId: string; problemId: string };

/**
 * 원장 행 → «유형 키 → 행 수».
 *
 * 🔴 **파일 읽기와 갈라 놓았다.** 붙여 두면 「engine-mid 인데 못 읽은 행」 가드를
 *    시험할 방법이 없다 — 오늘 원장에 그런 행이 0개라 그 줄을 지워도 눈금이 초록이었다
 *    (변이가 짚었다). 순수 함수로 빼면 눈금이 **일부러 깨진 행**을 먹여 볼 수 있다.
 *    「가드를 새로 쓰면 일부러 걸리는 입력을 하나 넣어 빨개지는지 보라」(2026-08-21).
 */
export function countMiddleRows(
  added: readonly LedgerRow[],
  removedIds: ReadonlySet<string>,
): { byKey: Map<string, number>; revertHits: number } {
  const byKey = new Map<string, number>();
  const pat = /^engine-mid:(.+?)\|s\d+\|v\d+(?:\|.+)?$/;
  let bad = 0;
  let revertHits = 0;
  for (const r of added) {
    if (removedIds.has(r.problemId)) {
      revertHits += 1;
      continue;
    }
    const m = pat.exec(r.externalId);
    if (!m) {
      // 초등 행(engine-elem:)은 이 자의 몫이 아니다 — 조용히 버리지 않고 센다.
      if (r.externalId.startsWith("engine-mid:")) bad += 1;
      continue;
    }
    byKey.set(m[1]!, (byKey.get(m[1]!) ?? 0) + 1);
  }
  if (bad > 0) {
    throw new Error(
      `원장의 engine-mid 행 ${bad}개를 못 읽었다 — externalId 모양이 바뀌었다.` +
        ` 이 자가 조용히 0을 내지 않게 던진다(적재기 load-engine-problems.ts 를 보라).`,
    );
  }
  return { byKey, revertHits };
}

/** 적재 원장에서 «지면에 실제로 나간 유형 키 → 행 수» 를 되찾는다. */
export function loadedFromLedger(): Map<string, number> {
  const dir = path.join(REPO, "docs", "planning", "tracks", "reports");
  const read = (name: string) =>
    (
      JSON.parse(readFileSync(path.join(dir, `${name}.json`), "utf-8")) as {
        rows: LedgerRow[];
      }
    ).rows;
  const removed = new Set<string>();
  for (const name of LEDGER_REVERTS)
    for (const r of read(name)) removed.add(r.problemId);
  const added = LEDGERS.flatMap(read);
  const got = countMiddleRows(added, removed);
  lastRevertHits = got.revertHits;
  return got.byKey;
}

/* ══════════════════════ 눈금 ══════════════════════ */

type Gauge = [why: string, run: () => boolean, want: boolean];

function gauges(): Gauge[] {
  const g: Gauge[] = [];

  // ── ㉠ 되짚기 마디 ──
  g.push([
    "㉠ 양성 — 미지수를 놓고 식을 세운다 (실물: 이차방정식의 활용 12)",
    () => backsolveNodes("늘인 길이를 $k$라 하면 $(12+k)(8+k)=117$이다.") >= 1,
    true,
  ]);
  g.push([
    "㉠ 양성 — 마디 둘 (실물: 이차함수 최댓값 19)",
    () =>
      backsolveNodes(
        "$\\overline{AP}=x$라 하면 $\\overline{AQ}=12-x$이다. 넓이를 $y$라 하면 $y=-(x-6)^2+18$이다.",
      ) >= 2,
    true,
  ]);
  g.push([
    "㉠ 음성 — 그냥 계산만 하는 해설은 마디가 0 (실물: 근호 계산 16)",
    () =>
      backsolveNodes("$3\\sqrt{10}\\times\\sqrt{2}=6\\sqrt{5}$ 이다.") === 0,
    true,
  ]);

  // ── ㉡ 안 굳는 마디 ──
  g.push([
    "㉡ 양성 — 두 근 중 하나를 버린다 (실물: 이차방정식의 활용 10)",
    () =>
      unsettledNode(
        "$k=13$ 또는 $k=-9$이다. 학생 수는 자연수이므로 $k=-9$은 버린다.",
      ),
    true,
  ]);
  g.push([
    "㉡ 음성 — 「또는」이 없으면 안 걸린다",
    () => !unsettledNode("$k=13$이므로 학생은 $13$명이다."),
    true,
  ]);
  g.push([
    "㉡ 음성 — 「또는」만 있고 고르지 않으면 안 걸린다 (둘 다 답)",
    () => !unsettledNode("높이는 $3$ 또는 $9$이다."),
    true,
  ]);

  // ── ㉢ 후보 열거 (D-115 ⑾ 규칙을 그대로 부른다) ──
  g.push([
    "㉢ 양성 — 같은 연산 셋을 늘어놓는다",
    () =>
      enumerates(
        "$58\\times26=1508$, $58\\times27=1566$, $58\\times28=1624$ 이므로",
      ),
    true,
  ]);
  g.push([
    "㉢ 음성 — 둘은 대비지 열거가 아니다",
    () => !enumerates("$58\\times26=1508$, $58\\times27=1566$ 이다."),
    true,
  ]);

  // ── ㉣ 보조 문자 ──
  g.push([
    "㉣ 양성 — 발문에 없는 $k$ 를 해설이 세운다",
    () =>
      auxLetters("넓이가 $54$이다.", "높이를 $k$라 하면 $k(24-2k)=54$이다.") >=
      1,
    true,
  ]);
  g.push([
    "㉣ 음성 — 발문에 이미 있는 문자는 «새 문자»가 아니다",
    () => auxLetters("$x$의 값을 구하시오.", "$x=2$이다.") === 0,
    true,
  ]);
  g.push([
    "㉣ 음성 — 여러 글자 이름(LaTeX 명령)은 홑문자가 아니다",
    () => auxLetters("$1$", "$\\sqrt{2}\\times\\dfrac{1}{2}$") === 0,
    true,
  ]);
  g.push([
    "㉣ 음성 — 명령 안의 홑글자는 세지만 발문에 있으면 새 문자가 아니다",
    () =>
      auxLetters("$\\overline{AB}=x$", "$x=2$이므로 $\\overline{AB}=2$") === 0,
    true,
  ]);

  // ── ㉤ 조건 수 ──
  g.push([
    "㉤ 양성 — 조건 둘",
    () => conditionCount("$a<0$이고 $b>0$일 때, 값을 구하시오.") >= 2,
    true,
  ]);
  g.push([
    "㉤ 음성 — 조건 없는 지시 한 줄",
    () => conditionCount("다음 식을 전개하시오.") === 0,
    true,
  ]);

  // ── ㉥ 변형 착상 ──
  g.push([
    "㉥ 양성 — 치환 (실물: 다항식의 곱셈 17)",
    () => reshapeInsight("$x^2+3x=A$ 로 놓고 전개한 뒤 되돌리면"),
    true,
  ]);
  g.push([
    "㉥ 음성 — 곧바로 계산하는 해설",
    () =>
      !reshapeInsight("$48=4^2\\times3$ 이므로 $\\sqrt{48}=4\\sqrt{3}$ 이다."),
    true,
  ]);

  // ── ㉧ 문장 수 ──
  g.push([
    "㉧ 양성 — 「…이다.」 셋이면 세 문장",
    () => solutionSentences("가나이다.\n다라이다.\n마바이다.") === 3,
    true,
  ]);
  g.push([
    "㉧ 음성 — 수식만 있는 줄은 문장이 아니다",
    () => solutionSentences("$1+1=2$\n$2+2=4$") === 0,
    true,
  ]);

  // ── Ⓓ 저쪽 심화(중) 표지 ──
  g.push([
    "Ⓓ 양성 — 구조 탐색 (저쪽 문항이 아니라 같은 꼴로 내가 지은 문자열)",
    () =>
      structureSearchMark(
        "조건을 만족시키는 순서쌍은 모두 몇 가지인지 구하시오.",
      ),
    true,
  ]);
  g.push([
    "Ⓓ 양성 — 수 카드 배열 (같은 이유로 지어낸 문자열)",
    () =>
      structureSearchMark(
        "$4$장의 수 카드를 늘어놓아 만들 수 있는 수를 모두 구하시오.",
      ),
    true,
  ]);
  g.push([
    "Ⓓ 음성 — 「개수를 구하시오」는 세기지 탐색이 아니다 (실물: 제곱근 14)",
    () =>
      !structureSearchMark(
        "$\\sqrt{168-x}$ 가 정수가 되도록 하는 자연수 $x$ 의 개수를 구하시오.",
      ),
    true,
  ]);
  g.push([
    "Ⓓ 음성 — 평범한 최댓값은 탐색이 아니다 (실물: 이차함수 19)",
    () => !structureSearchMark("삼각형 $APQ$의 넓이의 최댓값을 구하시오."),
    true,
  ]);

  // ── Ⓔ 예/아니요 ──
  g.push(["Ⓔ 양성", () => yesNoAnswer("예"), true]);
  g.push(["Ⓔ 음성 — 수 답", () => !yesNoAnswer("$17$"), true]);

  // ── 발문 꼴 ──
  g.push([
    "꼴 — 수만 다른 두 발문은 같은 꼴이다",
    () =>
      frameOf("다음 식을 전개하시오.\n$(x+3)(x+5)$") ===
      frameOf("다음 식을 전개하시오.\n$(x+7)(x+2)$"),
    true,
  ]);
  g.push([
    "꼴 — 수식은 통째로 접는다 (문자만 다른 두 발문은 같은 꼴)",
    () =>
      frameOf("다음 식을 전개하시오.\n$(x+3)(x+5)$") ===
      frameOf("다음 식을 전개하시오.\n$(y-7)(y+2)$"),
    true,
  ]);
  g.push([
    "꼴 — 수식 **밖**의 수도 지운다 (이 줄이 없으면 위 치환은 장식이다)",
    () =>
      frameOf("$4$장이 아니라 4장의 카드") ===
      frameOf("$4$장이 아니라 7장의 카드"),
    true,
  ]);
  g.push([
    "꼴 — 지시가 다르면 다른 꼴이다",
    () =>
      frameOf("다음 식을 전개하시오.\n$(x+3)(x+5)$") !==
      frameOf("다음 식을 인수분해하시오.\n$x^2+8x+15$"),
    true,
  ]);

  // ── Ⓐ/Ⓑ 「지시 한 줄 + 식」 ──
  g.push([
    "Ⓐ 양성 — 지시 한 줄 + 식 (실물: 3-1 인수분해 18)",
    () =>
      bareOperationInstruction(
        "다음 식을 인수분해하시오.\n\n$4x^2-12xy+9y^2-9$",
      ) !== null,
    true,
  ]);
  g.push([
    "Ⓐ 음성 — 문장 안에 조건이 있으면 아니다",
    () =>
      bareOperationInstruction(
        "$2<x<9$ 일 때, 다음 식을 간단히 하시오.\n$\\sqrt{x^2}$",
      ) === null,
    true,
  ]);
  g.push([
    "Ⓐ 음성 — 판별·선택은 계산 지시가 아니다",
    () => bareOperationInstruction("다음 중 옳은 것을 모두 고르시오.") === null,
    true,
  ]);

  // ── 원장 ──
  g.push([
    "원장 — 중3 유형이 실제로 실려 있다 (0 이면 이 자가 눈이 먼 것)",
    () => {
      const led = loadedFromLedger();
      return m3Types().filter((e) => led.has(e.key)).length > 200;
    },
    true,
  ]);
  g.push([
    "원장 — 되돌림 목록이 **실제로 행을 뺀다** (0 이면 그 필터는 장식이다)",
    () => {
      loadedFromLedger();
      return lastRevertHits === 90;
    },
    true,
  ]);
  g.push([
    "원장 — **못 읽은 engine-mid 행이 있으면 던진다** (일부러 깨진 행을 먹인다)",
    () => {
      try {
        countMiddleRows(
          [{ externalId: "engine-mid:새모양-키", problemId: "p1" }],
          new Set(),
        );
        return false;
      } catch {
        return true;
      }
    },
    true,
  ]);
  g.push([
    "원장 — 초등 행은 조용히 건너뛴다 (던지면 이 자가 초등을 물게 된다)",
    () =>
      countMiddleRows(
        [
          {
            externalId: "engine-elem:초5|1-1|1-1-1|f1|단답형|s1",
            problemId: "p2",
          },
        ],
        new Set(),
      ).byKey.size === 0,
    true,
  ]);
  g.push([
    "원장 — 등록됐는데 안 실린 중3 유형이 있다 (§1.2 의 근거가 살아 있나)",
    () => {
      const led = loadedFromLedger();
      const miss = m3Types().filter((e) => !led.has(e.key)).length;
      return miss > 0 && miss < 50;
    },
    true,
  ]);

  return g;
}

function selftest(): number {
  // 🔴 **누구의 눈금인지 먼저 찍는다.** 남의 판정기를 import 하면 그쪽 눈금이 돌고
  //    내 것처럼 보인다(위 `bareOperationInstruction` 주석 참조).
  console.log("눈금 — census-tier-frames-m3.ts (중3 계량기 자신의 눈금)\n");
  const g = gauges();
  let bad = 0;
  for (const [why, run, want] of g) {
    let got: boolean;
    try {
      got = run();
    } catch (err) {
      console.log(
        `  ❌ ${why} — 던졌다: ${err instanceof Error ? err.message : err}`,
      );
      bad += 1;
      continue;
    }
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`  ${ok ? "✅" : "❌"} ${why}`);
  }
  const pos = g.filter(([w]) => w.includes("양성")).length;
  const neg = g.filter(([w]) => w.includes("음성")).length;
  console.log(
    `\n${bad === 0 ? "✅" : "❌"} 눈금 ${g.length}건 (양성 ${pos} · 음성 ${neg} · 그 밖 ${g.length - pos - neg}) — 어긋남 ${bad}`,
  );
  return bad;
}

/* ══════════════════════ 보고 ══════════════════════ */

function pct(n: number, d: number): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(1)}%`;
}

function reportTiers(): void {
  const { rows, failed } = sweep([SEEDS[0]!]);
  const led = loadedFromLedger();
  const types = m3Types();
  console.log(
    `훑은 것 — 중3 등록 유형 ${types.length} · 씨앗 하나로 못 만든 유형 ${failed.length}`,
  );
  if (failed.length) for (const f of failed) console.log("   ⚠️", f);

  const eng = new Map<string, number>();
  const pap = new Map<string, number>();
  const papRows = new Map<string, number>();
  for (const r of rows) {
    eng.set(r.tier, (eng.get(r.tier) ?? 0) + 1);
    const n = led.get(r.key);
    if (n) {
      pap.set(r.tier, (pap.get(r.tier) ?? 0) + 1);
      papRows.set(r.tier, (papRows.get(r.tier) ?? 0) + n);
    }
  }
  const line = (label: string, m: Map<string, number>) => {
    const tot = [...m.values()].reduce((a, b) => a + b, 0);
    console.log(
      `${label.padEnd(18)}` +
        TIERS.map(
          (t) => `${t} ${m.get(t) ?? 0} (${pct(m.get(t) ?? 0, tot)})`,
        ).join(" · ") +
        `  합 ${tot}`,
    );
  };
  console.log("");
  line("엔진 등록 유형", eng);
  line("원장에 실린 유형", pap);
  line("원장 행(=지면)", papRows);

  const missing = types.filter((e) => !led.has(e.key));
  console.log(`\n등록됐지만 원장에 없는 중3 유형 ${missing.length}개`);
  for (const e of missing) {
    const r = rows.find((x) => x.key === e.key);
    console.log(
      `  [${r?.tier ?? "?"}] ${e.key} — ${e.rpmTitle}  [${e.unitSection}]`,
    );
  }

  console.log("\n소단원 | 엔진 연/기/응/심하 | 지면 연/기/응/심하");
  const secs = [...new Set(types.map((e) => e.unitSection))];
  let engZero = 0;
  let papZero = 0;
  for (const s of secs) {
    const sub = rows.filter((r) => r.sec === s);
    const e = CORE.map((t) => sub.filter((r) => r.tier === t).length);
    const p = CORE.map(
      (t) => sub.filter((r) => r.tier === t && led.has(r.key)).length,
    );
    if (e[0] === 0) engZero += 1;
    if (p[0] === 0) papZero += 1;
    console.log(`${s} | ${e.join("/")} | ${p.join("/")}`);
  }
  console.log(
    `\n연산이 0인 소단원 — 엔진 ${engZero}/${secs.length} · 지면 ${papZero}/${secs.length}` +
      `  (하위반 프리셋은 연산 40% — src/lib/elementary/difficulty.ts:35)`,
  );
}

const AXES: [name: string, f: (r: Row) => boolean][] = [
  ["㉠ 되짚기 마디 ≥1", (r) => backsolveNodes(r.solution) >= 1],
  ["㉠' 되짚기 마디 ≥2", (r) => backsolveNodes(r.solution) >= 2],
  ["㉡ 안 굳는 마디", (r) => unsettledNode(r.solution)],
  ["㉢ 후보 열거 ≥3", (r) => enumerates(r.solution)],
  ["㉣ 보조 문자 ≥1", (r) => auxLetters(r.content, r.solution) >= 1],
  ["㉣' 보조 문자 ≥2", (r) => auxLetters(r.content, r.solution) >= 2],
  ["㉤ 조건 ≥2", (r) => conditionCount(r.content) >= 2],
  ["㉤' 조건 ≥3", (r) => conditionCount(r.content) >= 3],
  ["㉥ 변형 착상", (r) => reshapeInsight(r.solution)],
  ["㉦ 해설 ≥200자", (r) => solutionLength(r.solution) >= 200],
  ["㉦' 해설 ≥300자", (r) => solutionLength(r.solution) >= 300],
  ["㉧ 해설 문장 ≥3", (r) => solutionSentences(r.solution) >= 3],
  ["㉧' 해설 문장 ≥4", (r) => solutionSentences(r.solution) >= 4],
];

function axisTable(rows: Row[], label: string): void {
  const secs = [...new Set(rows.map((r) => r.sec))];
  console.log(`\n── ${label} (행 ${rows.length}) ──`);
  console.log(
    "축".padEnd(18) +
      CORE.map((t) => t.padStart(9)).join("") +
      "  심화하/응용   뒤집힘④  설 수 있는 소단원",
  );
  for (const [name, f] of AXES) {
    const p = CORE.map((t) => {
      const s = rows.filter((r) => r.tier === t);
      return s.length ? (s.filter(f).length / s.length) * 100 : NaN;
    });
    let flip = 0;
    let stands = 0;
    for (const s of secs) {
      if (rows.filter((r) => r.sec === s && r.tier !== "심화하").some(f))
        flip += 1;
      if (rows.filter((r) => r.sec === s && r.tier === "심화하").some(f))
        stands += 1;
    }
    const ratio = p[2]! > 0 ? (p[3]! / p[2]!).toFixed(2) : "—";
    console.log(
      name.padEnd(18) +
        p
          .map((x) =>
            Number.isNaN(x) ? "—".padStart(9) : `${x.toFixed(1)}%`.padStart(9),
          )
          .join("") +
        `${ratio.padStart(9)}배` +
        `${String(flip).padStart(7)}/${secs.length}` +
        `${String(stands).padStart(13)}/${secs.length}`,
    );
  }
}

function reportAxes(): void {
  const { rows, failed } = sweep();
  console.log(
    `훑은 것 — 유형 ${new Set(rows.map((r) => r.key)).size} × 씨앗 ${SEEDS.length} = 행 ${rows.length}` +
      ` · 못 만든 것 ${failed.length}`,
  );
  console.log(
    "\n「뒤집힘④」 = D-115 반증문 ④ — 같은 소단원의 «연산·기본·응용» 중 하나라도 이 축을",
  );
  console.log(
    "통과하면 그 소단원에서는 이 축이 난이도를 안 가른다. 초등에서는 되짚기 축이 0/230 이었다.",
  );
  axisTable(rows, "전체");
  axisTable(
    rows.filter((r) => !r.hasFigure),
    "그림 없는 행 (해설 길이가 그림 탓인지 가른다)",
  );
  console.log("\n갈래별 그림 비율");
  for (const t of CORE) {
    const s = rows.filter((r) => r.tier === t);
    console.log(
      `  ${t}  ${pct(s.filter((r) => r.hasFigure).length, s.length)}  (n=${s.length})`,
    );
  }
}

function reportFrames(): void {
  const { rows } = sweep();
  const secs = [...new Set(rows.map((r) => r.sec))];
  console.log(
    "「얇다」 = 그 소단원·갈래에 **서로 다른 발문 꼴이 몇 개인가** (씨앗 " +
      `${SEEDS.length}, 수는 지운다). 이 수는 다양성의 **하한**이고, 다양성은 난이도가 아니다.`,
  );
  console.log(
    "\n소단원".padEnd(34) +
      CORE.map((t) => `${t}(유형/꼴)`.padStart(14)).join(""),
  );
  const oneFrame: Record<string, number> = {
    연산: 0,
    기본: 0,
    응용: 0,
    심화하: 0,
  };
  const zero: Record<string, number> = { 연산: 0, 기본: 0, 응용: 0, 심화하: 0 };
  for (const s of secs) {
    const cells = CORE.map((t) => {
      const sub = rows.filter((r) => r.sec === s && r.tier === t);
      const nTypes = new Set(sub.map((r) => r.key)).size;
      const nFrames = new Set(sub.map((r) => frameOf(r.content))).size;
      if (nTypes === 0) zero[t]! += 1;
      else if (nFrames === 1) oneFrame[t]! += 1;
      return `${nTypes}/${nFrames}`;
    });
    console.log(s.padEnd(34) + cells.map((c) => c.padStart(14)).join(""));
  }
  console.log("\n갈래   꼴이 하나뿐인 소단원   그 갈래가 아예 없는 소단원");
  for (const t of CORE)
    console.log(
      `${t.padEnd(8)}${String(oneFrame[t]).padStart(12)}/${secs.length}${String(zero[t]).padStart(20)}/${secs.length}`,
    );
}

/**
 * 소단원 × 갈래 격자 — **사람이 읽으라고** 뽑는다.
 *
 * 보고서 §2 의 6단 배정은 이 출력을 눈으로 읽고 내린 판단이다. 임시 파일로 뽑아
 * 놓고 보고서에서 그 경로를 근거로 대면 **다음 사람에게는 없는 파일**이 된다
 * (이 저장소가 2026-08-18 「되돌리기가 이 컴퓨터에만 있었다」로 데인 자리와 같은 성질).
 * 그래서 계량기 안에 둔다 — 판단은 다시 못 돌려도 **판단의 재료는 다시 뽑힌다.**
 */
function reportGrid(only: string[]): void {
  const { rows } = sweep([SEEDS[0]!]);
  const secs = [...new Set(rows.map((r) => r.sec))];
  for (const s of secs) {
    if (only.length && !only.includes(s)) continue;
    console.log(`\n══════ ${s} ══════`);
    for (const t of CORE) {
      const hits = rows.filter((r) => r.sec === s && r.tier === t);
      console.log(`── ${t} (${hits.length})`);
      for (const r of hits) {
        const key = r.key.split("|").pop();
        console.log(
          `   ${key} ${r.hasFigure ? "[그림]" : ""} ${r.content.replace(/\s*\n+\s*/g, " ").slice(0, 155)}`,
        );
      }
    }
  }
}

function reportSixGrade(): void {
  const { rows } = sweep();
  const secs = [...new Set(rows.map((r) => r.sec))];
  const hi = rows.filter((r) => r.tier === "심화하");
  const app = rows.filter((r) => r.tier === "응용");
  const ops = rows.filter((r) => r.tier === "연산");

  const bare = (r: Row) => bareOperationInstruction(r.content) !== null;

  console.log(
    "신호 — 6단에 대기 위한 자국 (전부 «모양»이지 «어려움»이 아니다)\n",
  );
  console.log(
    `Ⓐ 심화하가 「지시 한 줄 + 식」뿐 — ${hi.filter(bare).length}/${hi.length}행 · ` +
      `${new Set(hi.filter(bare).map((r) => r.sec)).size}/${secs.length}소단원`,
  );
  console.log(
    `Ⓑ 응용이 「지시 한 줄 + 식」뿐 — ${app.filter(bare).length}/${app.length}행 · ` +
      `${new Set(app.filter(bare).map((r) => r.sec)).size}/${secs.length}소단원`,
  );
  console.log(
    `Ⓒ 연산 갈래가 아예 없는 소단원 — ` +
      `${secs.filter((s) => !ops.some((r) => r.sec === s)).length}/${secs.length}`,
  );
  const d = rows.filter((r) => structureSearchMark(r.content));
  console.log(
    `Ⓓ 저쪽 「심화(중)」 표지(구조 탐색) — ${d.length}/${rows.length}행` +
      (d.length
        ? ""
        : "   ← 이 0 은 «못 셈»이 아니다: 눈금 양성 2건이 실제로 문다"),
  );
  for (const r of d.slice(0, 20))
    console.log(`   · [${r.tier}] ${r.key} — ${r.title}`);
  const e = rows.filter((r) => yesNoAnswer(r.answer));
  console.log(`Ⓔ 정답이 «예/아니요» — ${e.length}/${rows.length}행`);
  for (const r of e.slice(0, 10)) console.log(`   · [${r.tier}] ${r.key}`);
}

/* ══════════════════════ 진입 ══════════════════════ */

function main(): void {
  const a = process.argv.slice(2);
  if (a.includes("--selftest")) {
    process.exitCode = selftest() === 0 ? 0 : 1;
    return;
  }
  if (a.includes("--tiers")) return reportTiers();
  if (a.includes("--axes")) return reportAxes();
  if (a.includes("--frames")) return reportFrames();
  if (a.includes("--sixgrade")) return reportSixGrade();
  if (a.includes("--grid"))
    return reportGrid(a.filter((x) => !x.startsWith("--")));
  console.log(
    "쓰임: --selftest | --tiers | --axes | --frames | --sixgrade | --grid [소단원…]\n" +
      "  (머리말을 읽어라 — 「지면」은 DB 가 아니라 적재 원장이다)",
  );
}

// ⚠️ `isDirectScript` 는 **파일 URL** 을 받는다(`import.meta.url`). 경로 문자열을 그냥
//    넘기면 **언제나 거짓**이라 아무 출력도 없이 조용히 끝난다 — 처음에 그렇게 짜서
//    「종료 코드 0 · 출력 0줄」이 나왔다. 조용한 성공이 조용한 실패였다.
if (isDirectScript(pathToFileURL(__filename).href)) main();
