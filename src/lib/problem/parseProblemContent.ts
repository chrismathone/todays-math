/**
 * OCR 이관 본문 → mathgen ProblemDisplay 와 같은 `{ question, choices[] }` 구조.
 *
 * mathgen 은 모델이 question/choices 를 나눠서 주므로 렌더러가 바로 보기 그리드를
 * 그린다. 우리 데이터는 보기가 본문 문자열에 섞여 있어, mathgen 렌더러에 넣기 전에
 * 같은 모양으로 맞춰 주는 것이 이 모듈의 책임이다 (렌더러 자체는 mathgen 것을 그대로 씀).
 *
 * 안전 장치: 수식(`$...$`)은 플레이스홀더로 마스킹한 뒤 텍스트만 조작한다 —
 * 수식 안의 `\n`·`$`·`1.` 이 보기 마커로 오인되지 않는다.
 *
 * 데이터 실측(1,000건 표본): 숫자 마커 321 / 원문자 4 / 마커 없음 675.
 * 마커가 없으면 지문 그대로 두고 보기는 비운다(폴백) — 임의로 쪼개지 않는다.
 */
import { splitBoxSegments, type BoxSegment } from "@/lib/math/boxBlock";
import { boxHeaderMarkdown } from "@/lib/math/boxHeader";
import { BODY_CHOICE_CLASS, BODY_CHOICE_MARKS } from "@/lib/math/circledNumber";
import { fitsTwoColumns } from "@/lib/math/displayWidth";
import { isWorkedProcess, splitEquationChain } from "@/lib/math/equationChain";
import {
  canonicalizeMathSpans,
  findMathSpans,
  tokenizeMath,
} from "@/lib/math/segments";
import { normalizeMathgenText } from "@/lib/math/normalizeMathgenText";
import { findBlankAnswerSlots } from "@/lib/math/blankAnswerSlot";
import { findSubQuestionMarkers } from "@/lib/math/subQuestion";
import { splitInlineChoiceMarkers } from "@/lib/problem/choiceRepairRules";

export interface ParsedProblemContent {
  /**
   * 보기를 제외한 지문. 개행은 **뜻이 있는 것만** 남는다 —
   * 홑 개행은 지면의 줄바꿈, 이중 개행은 «문장이 끝난 자리»에서만 문단 경계다
   * (`keepMeaningfulParagraphs`).
   */
  question: string;
  /** 보기 본문 배열. 마커(`1.`, `①`)는 제거된다. 없으면 빈 배열 */
  choices: string[];
}

const MASK_OPEN = "\u0000";
const MASK_CLOSE = "\u0001";

/**
 * 줄 머리의 보기 마커: `1.`~`19.` 또는 원문자 ①~⑮.
 *
 * ⚠️ 원문자 범위는 `BODY_CHOICE_CLASS`(`①..⑮`) **한 곳**에서 온다.
 * **넓히지 마라** — `❶`·`➊` 은 이 데이터에서 «규칙» 항목·작도 순서·그래프
 * 라벨로 쓰인다. 넓히면 성한 문항의 발문이 보기로 잘린다
 * (실측과 문항 id 는 `circledNumber.ts` 머리 주석에).
 */
const CHOICE_AT_LINE_START = new RegExp(
  String.raw`\n[ \t]*(?:(?:[1-9][0-9]?)[.)][ \t]+|[${BODY_CHOICE_CLASS}][ \t]*)`,
  "g",
);

/** 수식을 플레이스홀더로 치환해 텍스트 조작이 수식을 건드리지 못하게 한다. */
function maskMath(text: string): { masked: string; formulas: string[] } {
  const formulas: string[] = [];
  const masked = tokenizeMath(text)
    .map((seg) => {
      if (seg.type === "text") return seg.value;
      const literal =
        seg.type === "display" ? `$$${seg.value}$$` : `$${seg.value}$`;
      formulas.push(literal);
      return `${MASK_OPEN}${formulas.length - 1}${MASK_CLOSE}`;
    })
    .join("");
  return { masked, formulas };
}

function unmask(masked: string, formulas: string[]): string {
  return masked.replace(
    new RegExp(`${MASK_OPEN}(\\d+)${MASK_CLOSE}`, "g"),
    (_, index: string) => formulas[Number(index)] ?? "",
  );
}

/**
 * 이중 개행을 **문장이 끝난 자리에서만** 문단으로 남긴다.
 *
 * ## 왜 이 열쇠인가
 *
 * 이중 개행을 쓰는 쪽이 둘인데 **뜻이 정반대**다.
 *
 *  - **엔진**은 뜻이 있어서 쓴다 — `calcForm` 이 쓰는
 *    `"두 수의 합을 구하시오.\n\n$485$, $342$"` 는 「발문 다음 줄에 나열 대상」이다.
 *  - **OCR 이관본**은 뜻 없이 쓴다 — 글줄이 넘어간 자리에 그냥 빈 줄이 들어간다.
 *    `"다음 조건을 만족시키는 자연수\n\n$m,n$\n\n의 개수는?"` 는 **한 문장**이다.
 *
 * 예전 코드는 이중 개행을 **전부** 공백으로 접었다. OCR 쪽은 맞고 엔진 쪽은 틀린다 —
 * 실측 **393건**이 그렇게 발문의 문단 경계를 잃었고, 그게 원장님이 지적하신
 * 「줄바꿈 되어있지 않고」(2026-08-27)다.
 *
 * 둘을 가르는 것은 **개행의 개수가 아니라 앞이 문장으로 끝났는가**다.
 * 엔진은 늘 「…하시오.」 「…입니까?」로 끊고 넘어가고, OCR 이 문장을 끊는 자리는
 * 「자연수」 「분수의」처럼 **문장이 안 끝난 자리**다.
 * `markStandaloneFormula` 가 이미 같은 열쇠(㉠)를 쓰고 있다 — 새 규칙이 아니다.
 *
 * ⚠️ **문턱을 옮기지 말고 열쇠를 보라.** 「OCR 말뭉치가 지금 없으니 그냥 다 남기자」로
 *    하면, 다시 이관하는 날 45,374건이 문장 한가운데서 갈라진다. 지금 DB 가
 *    전량 엔진 산출물인 것은 **오늘의 사정**이지 규칙의 근거가 아니다.
 *
 * ## 남긴 개행이 어떻게 지면이 되나
 *
 * 홑 개행은 `applyHardBreaks`(렌더러)가 마크다운 하드 브레이크(`<br>`)로 굳히고,
 * 이중 개행은 마크다운이 그대로 **문단 경계**로 읽는다.
 * 자(`estimateProblemPx`)는 **이미** 개행마다 한 줄을 세고 있어 그대로 맞는다
 * — 「한 숫자를 두 곳이 쓰게 하라」(2026-08-18)가 여기서 값을 했다.
 *
 * ⚠️ **보기·상자 항목에는 쓰지 마라** — 그 둘은 반드시 한 줄이어야 한다
 *    (`collapseToOneLine`). 상자 항목에 개행이 남으면 `> ` 인용문이 끊겨 그리드가
 *    깨지고, 보기에 남으면 자(`choicesBlockPx`)가 그 줄을 못 센다.
 */
/**
 * 문장이 끝나는 자리. 닫는 따옴표·괄호는 넘어가서 본다 (`…이다.)` · `…인가?"`).
 * 🔴 **한글 종결어미(`다`·`요`)를 넣지 마라** — 「자연수」의 `수`, 「…의 개수」처럼
 *    문장이 아닌 자리가 같이 걸린다. 엔진은 언제나 문장부호로 끊는다(실측 393/393).
 */
const SENTENCE_END = /[.?!。？！][")'\]』」]*$/;

function keepMeaningfulParagraphs(text: string): string {
  if (!/\n[ \t]*\n/.test(text)) return text;
  const parts = text.split(/\n[ \t]*(?:\n[ \t]*)+/);
  return parts.reduce((acc, part) =>
    SENTENCE_END.test(acc.trimEnd()) ? `${acc}\n\n${part}` : `${acc} ${part}`,
  );
}

function collapseWhitespace(masked: string): string {
  return (
    keepMeaningfulParagraphs(masked)
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+([,)\]?!。，、])/g, "$1")
      // 개행 둘레의 공백은 턴다 — 앞에 4칸 이상 남으면 마크다운이 **코드 블록**으로 읽는다.
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .trim()
  );
}

/**
 * 개행을 **전부** 공백으로 접는다 — 반드시 한 줄이어야 하는 자리 전용.
 *
 * 쓰는 곳은 둘뿐이다: **보기 본문**과 **상자 항목**. 둘 다 개행이 남으면 깨진다
 * (상자는 `> ` 인용문이 끊기고, 보기는 자가 그 줄을 안 센다). 나머지 자리는
 * `collapseWhitespace` 를 써서 홑 개행을 지면의 줄바꿈으로 남긴다.
 */
function collapseToOneLine(masked: string): string {
  return collapseWhitespace(masked)
    .replace(/\n+/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * 꼬리 블록이 통째로 2회 반복 저장된 OCR 결함을 제거한다 (실측 2,000건 중 340건).
 * 보기 마커까지 유실된 문항은 `dedupeRepeatedBlock`이 못 잡으므로 문자열 수준에서 본다.
 *
 * 오탐 방지: 최소 반복 길이를 두어 `$a$ $a$` 같은 정상 반복은 건드리지 않는다.
 */
const MIN_DUPLICATE_TAIL = 24;

/**
 * Z-알고리즘 — `z[i]` 는 `codes` 와 `codes[i..]` 의 최장 공통 접두사 길이. O(n).
 */
function zFunction(codes: Uint16Array): Uint32Array {
  const n = codes.length;
  const z = new Uint32Array(n);
  if (n === 0) return z;

  z[0] = n;
  let left = 0;
  let right = 0;
  for (let i = 1; i < n; i += 1) {
    let k = 0;
    if (i < right) {
      const mirrored = z[i - left]!;
      k = mirrored < right - i ? mirrored : right - i;
    }
    while (i + k < n && codes[k] === codes[i + k]) k += 1;
    z[i] = k;
    if (i + k > right) {
      left = i;
      right = i + k;
    }
  }
  return z;
}

/**
 * 원래 구현은 `len` 을 `n/2` 부터 내려오며 매번 꼬리 두 토막을 잘라 비교했다 —
 * 최악 O(n^2). 이 함수는 렌더 본문 경로(ProblemContent / MathText)에서
 * 문항마다 돈다.
 *
 * 실측(node, 해설 길이별 500회 평균) — 「호출당 100만 문자 복사」같은 얘기는
 * 사실이 아니다. V8 의 `slice` 는 사본이 아니라 뷰이고 `===` 는 첫 글자에서
 * 갈리므로 보통은 싸다. 그런데 **같은 글자가 길게 이어지는 구간**(OCR 점선·
 * 밑줄·표 여백)에서는 비교가 매번 끝까지 가서 진짜로 제곱이 된다:
 *   중복 없음   n=2000  35us → 19us / n=4000  89us → 48us
 *   동일문자 런 n=2000 109us → 25us / n=4000 302us → 44us (초선형 → 선형)
 * 반대로 꼬리 중복이 `n/2` 에서 바로 걸리면 원래 쪽이 빨랐다(0.2us → 21us).
 * 실데이터 분포(2,000건 중 중복 340건)로 보면 평균은 이득이고, 무엇보다
 * **최악이 묶인다** — 위 캐시와 합쳐 렌더 경로에서 반복 계산 자체가 사라진다.
 *
 * 판정은 **한 글자도 바꾸지 않는다**. 문자열을 (코드 유닛 단위로) 뒤집으면
 * "꼬리가 반복인가" 가 "접두사가 반복인가" 로 바뀐다:
 *
 *   text[n-2len, n-len) === text[n-len, n)  ⟺  rev[len, 2len) === rev[0, len)
 *                                           ⟺  z[len] >= len
 *
 * 뒤집기를 코드 유닛 단위로 하는 것이 중요하다 — 원래 구현이 `slice`(코드 유닛
 * 인덱스)로 비교했으므로 서로게이트 쌍이 있어도 비교 결과가 정확히 같아진다.
 * `renderParity` + `dropDuplicatedTail` 테스트가 이 동치를 잠근다.
 */
/**
 * 문단 경계를 **넘어서도, 문단 안에서도** 꼬리 중복을 본다.
 *
 * 🔴 `dropDuplicatedTail` 은 글자를 그대로 견주므로 **구분자가 다르면 못 찾는다.**
 *    `keepMeaningfulParagraphs`(2026-08-27)가 발문 뒤에 `\n\n` 을 남기기 시작하면서
 *    `것은?⏎⏎S S` 의 두 `S` 가 앞뒤 구분자(`\n\n` vs ` `)가 달라 **중복이 안 잡혔다** —
 *    OCR 이 보기 묶음을 두 번 저장한 결함(실측 2,000건 중 340건)이 그대로 지면에 나간다.
 *    단위 시험이 이 회귀를 잡았다.
 *
 * 문단이 없는 글에서는 `split` 이 한 조각을 내므로 **예전과 한 글자도 다르지 않다.**
 */
function dropDuplicatedTails(text: string): string {
  const whole = dropDuplicatedTail(text);
  if (!whole.includes("\n\n")) return whole;
  return (
    whole
      .split("\n\n")
      // ⚠️ 한 칸을 **앞에 붙여서** 잰다. 되풀이되는 단위는 알맹이가 아니라 「구분자+알맹이」
      //    (`⎵S⎵S`)라, 앞이 잘린 `S⎵S` 는 길이가 한 글자 모자라 `maxLen` 이 그 단위에
      //    **닿지 못한다** — 붙이지 않으면 이 함수는 아무것도 못 찾는다(시험으로 확인).
      .map((part) => dropDuplicatedTail(` ${part}`).trimStart())
      .join("\n\n")
  );
}

function dropDuplicatedTail(text: string): string {
  const n = text.length;
  const maxLen = Math.floor(n / 2);
  if (maxLen < MIN_DUPLICATE_TAIL) return text;

  const reversed = new Uint16Array(n);
  for (let i = 0; i < n; i += 1) reversed[i] = text.charCodeAt(n - 1 - i);

  const z = zFunction(reversed);
  for (let len = maxLen; len >= MIN_DUPLICATE_TAIL; len -= 1) {
    if (z[len]! >= len) return text.slice(0, n - len).trimEnd();
  }
  return text;
}

/**
 * 보기 블록이 통째로 2회 중복 저장된 OCR 결함을 제거한다.
 *
 * 라벨을 같이 끌고 다니려고 **본문을 가진 무엇이든** 받게 했다 — 판정은 예전과
 * 똑같이 `body` 만 본다(문자열 배열을 넣던 시절과 결과가 같다).
 */
function dedupeRepeatedBlock<T extends { body: string }>(items: T[]): T[] {
  if (items.length < 4 || items.length % 2 !== 0) return items;
  const half = items.length / 2;
  const first = items.slice(0, half);
  const second = items.slice(half);
  const identical = first.every(
    (item, index) => item.body === second[index]!.body,
  );
  return identical ? first : items;
}

/**
 * 결과 캐시 — 같은 본문을 문제은행 카드·검수 발췌·인쇄 지면이 각각 그리고,
 * 상위 상태가 하나만 바뀌어도 목록 전체가 다시 렌더된다. 두 함수 모두 순수
 * 함수(같은 입력 → 같은 출력)라 캐시가 판정을 바꾸지 않는다.
 *
 * ⚠️ 반환값은 **읽기 전용으로 다룰 것** — 호출자끼리 같은 객체를 공유한다.
 * 서버 프로세스에서 무한히 자라지 않도록 오래된 항목부터 버린다.
 */
const RESULT_CACHE_LIMIT = 256;
const parsedCache = new Map<string, ParsedProblemContent>();
/** 라벨까지 담는 캐시 — `parseProblemContentLabeled` 전용. */
const labeledCache = new Map<string, LabeledProblemContent>();
const normalizedCache = new Map<string, string>();

function remember<T>(cache: Map<string, T>, key: string, compute: () => T): T {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const value = compute();
  if (cache.size >= RESULT_CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

export function parseProblemContent(raw: string): ParsedProblemContent {
  if (!raw) return { question: "", choices: [] };
  return remember(parsedCache, raw, () => {
    const { question, choices } = parseUncached(raw);
    return { question, choices };
  });
}

/** 마커에 적힌 **원래 번호**. `①` 이면 1, `3.` 이면 3. */
function markerLabel(marker: string): number {
  const trimmed = marker.trim();
  const circled = BODY_CHOICE_MARKS.indexOf(trimmed[0] ?? "");
  if (circled >= 0) return circled + 1;
  return Number(/^(\d+)/.exec(trimmed)![1]);
}

export interface LabeledProblemContent extends ParsedProblemContent {
  /** 지면에 실제로 남는 보기의 **원래 번호**, 남는 순서대로. */
  labels: number[];
  /** 마커는 잡혔으나 본문이 비어 **버려진** 보기의 원래 번호. */
  dropped: number[];
  /** 중복 블록 제거가 **실제로 잘라 냈는가**. */
  deduped: boolean;
}

type MarkedParse = LabeledProblemContent;

/**
 * 앞의 온전한 번호 묶음도 풀이 과정의 참조일 수 있다(FLOW-F01).
 * 발문이 그 원문자 범위를 명시하고, 번호 하나가 앞줄에서 연 괄호를 이어야 한다.
 * 단순히 「증명」이 있거나 번호가 두 번 나온 것만으로는 앞 묶음을 감추지 않는다.
 * 수식을 가린 원문으로만 판정하며, 중간의 새 발문/지시는 합쳐진 문항으로 남긴다.
 */
function isReferencedReasoningRun(
  masked: string,
  markers: RegExpExecArray[],
  tailStart: number,
): boolean {
  const earlier = markers.slice(0, tailStart);
  if (
    !isCleanRun(
      earlier.map((marker) => markerLabel(marker[0])),
      CHOICE_BLOCK_MIN,
    ) ||
    !earlier.every((marker, i) => marker[0].trim() === BODY_CHOICE_MARKS[i])
  ) {
    return false;
  }

  const first = earlier[0]!;
  const prefix = masked.slice(0, first.index);
  const promptEnd = prefix.search(/[?？]/);
  if (promptEnd < 0) return false;
  const prompt = prefix.slice(0, promptEnd + 1);
  const range = new RegExp(
    `${BODY_CHOICE_MARKS[0]}\\s*[~∼～]\\s*${BODY_CHOICE_MARKS[earlier.length - 1]}`,
  );
  if (!/(?:증명|과정)/.test(prompt) || !range.test(prompt)) return false;

  const tailIndex = markers[tailStart]!.index;
  const reasoning = masked.slice(promptEnd + 1, tailIndex);
  if (/[?？]|(?:시오|세요|하여라|하라)[.。]?(?=\s|$)/.test(reasoning)) {
    return false;
  }

  return earlier.some((marker, i) => {
    // 줄머리처럼 보이지만 실제로는 앞줄의 괄호 안에 이어지는 번호다.
    if (!masked.slice(0, marker.index).trimEnd().endsWith("(")) return false;
    const end = earlier[i + 1]?.index ?? tailIndex;
    return masked.slice(marker.index + marker[0].length, end).includes(")");
  });
}

function parseMarked(text: string, trailingBlockOnly = false): MarkedParse {
  const { masked, formulas } = maskMath(text);

  let markers = [...masked.matchAll(CHOICE_AT_LINE_START)];
  if (trailingBlockOnly) {
    const labels = markers.map((marker) => markerLabel(marker[0]));
    const count = labels.at(-1) ?? 0;
    const preceding = labels.slice(0, -count);
    // 앞에도 온전한 1..4 이상이 있으면 보통 두 문항이 합쳐진 것과 구별할 수 없다.
    // 명시적으로 참조된 풀이 과정일 때만 예외로 하고, 나머지는 QA에 원래 라벨을 남긴다.
    const hasEarlierBlock = preceding.some(
      (label, i) =>
        label === 1 &&
        isCleanRun(preceding.slice(i, i + CHOICE_BLOCK_MIN), CHOICE_BLOCK_MIN),
    );
    // 앞의 조건 번호는 마커를 지우지 않고 발문에 남긴다. 마지막 번호가 n이면
    // 마지막 n개가 실제로 1..n인지 확인한다 — 중간 묶음이나 1..3은 받지 않는다.
    if (
      count >= CHOICE_BLOCK_MIN &&
      count < markers.length &&
      isCleanRun(labels.slice(-count), CHOICE_BLOCK_MIN) &&
      (!hasEarlierBlock ||
        isReferencedReasoningRun(masked, markers, markers.length - count))
    ) {
      markers = markers.slice(-count);
    }
  }
  // 마커가 2개 미만이면 보기 목록으로 보지 않는다 (문장 중 "1." 오탐 방지).
  if (markers.length < 2) {
    return {
      question: buildQuestion(unmask(masked, formulas)),
      choices: [],
      labels: [],
      dropped: [],
      deduped: false,
    };
  }

  const first = markers[0];
  const questionMasked = masked.slice(0, first.index);

  const pairs = markers.map((marker, index) => {
    const start = marker.index + marker[0].length;
    const end =
      index + 1 < markers.length ? markers[index + 1].index : masked.length;
    return {
      label: markerLabel(marker[0]),
      body: collapseToOneLine(unmask(masked.slice(start, end), formulas)),
    };
  });

  const afterDedupe = dedupeRepeatedBlock(pairs);
  const kept = afterDedupe.filter((pair) => pair.body.length > 0);

  return {
    question: buildQuestion(unmask(questionMasked, formulas)),
    choices: kept.map((pair) => pair.body),
    labels: kept.map((pair) => pair.label),
    dropped: afterDedupe
      .filter((pair) => pair.body.length === 0)
      .map((pair) => pair.label),
    deduped: afterDedupe.length !== pairs.length,
  };
}

/**
 * R2 를 받아들이는 조건 — **「1..n 으로 온전해지고 n 이 4 이상」.**
 *
 * `n >= 4` 는 문턱이 아니라 **분포**에서 왔다: 보기가 있는 문항의 99% 가 정확히
 * 5칸이다. 이 조건 없이 「1..n 이면 받는다」로 두면 서술형 발문 속 「두 직선 ①, ②를」
 * 같은 **참조**가 보기 2칸으로 잘려 가짜 객관식이 된다(실측 학산중 22 외).
 */
const CHOICE_BLOCK_MIN = 4;

const isCleanRun = (labels: number[], min: number): boolean =>
  labels.length >= min && labels.every((label, i) => label === i + 1);

/**
 * 입구 후보정 + **수식 구간 맞추기** — 본문·해설 파서 둘의 첫 단계.
 *
 * 붙은 수식(`$A$$B$`)·여러 줄 수식을 여기서 맞춰 두지 않으면 아래 정규식들이 서로 다른 짝을
 * 짓는다. 문제 표 해설 4행은 `breakDisplayMath` 가 `$A$$B$` 의 «닫고-여는» `$$` 를 표시식으로
 * 읽어 **본문 렌더러에서만** 샜다(2026-09-26). 렌더 전처리(`preprocessMathText`)도 같은 함수로
 * 시작한다 — 멱등이라 두 번 지나도 같다.
 */
function normalizeSource(raw: string): string {
  return canonicalizeMathSpans(
    normalizeMathgenText(raw).replace(/\r\n?/g, "\n"),
  );
}

function parseUncached(raw: string): LabeledProblemContent {
  const text = normalizeSource(raw);
  const base = parseMarked(text);

  // ── R2 (D-58) — 줄 중간 마커를 보기 경계로 본다 ─────────────────────────
  //
  // **이미 1..n 으로 온전하면 손대지 않는다**(`wasClean`). 온전한 문항에 다시 대면
  // 보기 본문 안의 «참조»(「②의 닮음조건은」)가 새 경계로 잡혀 성한 것을 깬다.
  //
  // 다시 자른 결과가 **1..n 이고 n>=4** 일 때만 받는다. 이 가드는 성한 44,099건에
  // 대 보며 세 번 고쳐 얻었고, 지금 기준으로도 반대쪽 개악 **0건**이다.
  const wasClean = isCleanRun(base.labels, 2);
  if (!wasClean) {
    const repaired = parseMarked(splitInlineChoiceMarkers(text));
    if (isCleanRun(repaired.labels, CHOICE_BLOCK_MIN)) return repaired;
    // R2와 기존 중복 제거가 먼저다. 둘로도 온전해지지 않을 때만 원문의
    // 끝 1..n 묶음을 고른다(조건 1..3 + 실제 보기 1..5인 대구동중 6번).
    return parseMarked(text, true);
  }

  return base;
}

/**
 * 지면에 그려지는 보기와 **그 원래 번호**를 같이 낸다.
 *
 * QA 판정기(`scripts/qa/answerChoiceRules.ts`)가 이걸 쓴다. 예전에는 그쪽이
 * 파이프라인을 **다시 밟아** 라벨을 구했는데, R2 가 제품에 들어가자 두 벌이
 * 갈라져 44,401건이 통째로 «판정 불가»가 될 뻔했다(본문 대조 가드가 잡았다).
 * 규칙이 둘이면 언젠가 갈라진다 — 그래서 **여기 하나만** 둔다.
 */
export function parseProblemContentLabeled(raw: string): LabeledProblemContent {
  if (!raw)
    return {
      question: "",
      choices: [],
      labels: [],
      dropped: [],
      deduped: false,
    };
  return remember(labeledCache, raw, () => parseUncached(raw));
}

/* ──────────────────────────────────────────────────────────────────────────
 * 지문 조립 — `<보기>` · `<조건>` 상자를 마크다운 인용문으로 굳힌다.
 *
 * 왜 여기인가: 바로 아래 `collapseWhitespace` 가 개행을 전부 공백으로 합친다.
 * 그게 있어야 OCR 이중 개행이 문단을 토막 내지 않는데(이 모듈의 원래 목적),
 * 그 대가로 **상자 구조가 같이 녹아버린다** — 원장님이 본 "보기가 발문과 한 덩어리"가
 * 바로 이것이다. 그래서 합치기 **전에** 상자를 마크다운 구조로 바꿔 놓는다.
 * (mathgen 도 같은 자리에서 `wrapBareConditionBoxes` 로 blockquote 를 만든다.)
 *
 * 상자가 없으면 `splitBoxSegments` 가 입력을 그대로 돌려주므로
 * 예전 경로와 **문자열이 같다** — 상자 없는 43,512건의 렌더는 불변이다.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * 마크다운이 줄머리 기호를 목록·제목·중첩 인용문으로 읽지 않게 막는다.
 * 막지 않으면 `1. 첫째 조건` 의 `1.` 이 **사라져** 항목 번호가 없어진다.
 */
const MARKDOWN_LEADER = /^(\s*)([0-9]{1,9}[.)]|[-*+>#]|=)/;

function escapeMarkdownLeader(line: string): string {
  // 기호 **바로 앞**에 역슬래시를 넣는다 — `1.` 은 마침표를, `-` 는 자신을 escape.
  return line.replace(MARKDOWN_LEADER, (_m, space: string, token: string) =>
    token.length > 1
      ? space + token.slice(0, -1) + "\\" + token.slice(-1)
      : space + "\\" + token,
  );
}

/**
 * 평문 줄머리를 마크다운이 **목록·제목**으로 읽지 않게 막는다.
 *
 * `collapseWhitespace` 가 홑 개행을 남기기 시작하면서(2026-08-25) 발문 안에
 * **줄머리**가 생겼다. 그전에는 지문이 늘 한 줄이라 이 자리가 없었다 —
 * 새로 열린 구멍이지 예전부터 있던 것이 아니다.
 *
 * 실측: 이대로 두면 46문항의 `1.`·`-`·`=` 로 시작하는 줄이 목록·제목으로 바뀐다
 * (전부 HWP 변환 잔재가 심한 격리 문항이지만, 막지 않으면 번호가 **사라진다**).
 * 상자 항목은 `renderBoxSegment` 가 이미 같은 함수를 걸어 둔다.
 */
/**
 * ⚠️ `>` 는 **일부러 뺐다**. 우리 데이터에는 발문에 맨 마크다운 인용문
 * (`> $f(1)=2$`)을 그대로 담은 문항이 있고(상자 마커 `<보기>` 가 없어
 * `splitBoxSegments` 가 상자로 안 본다), escape 하면 그 인용문이 **깨진다**.
 * `renderParity` 의 `paper:보기상자-blockquote` 키가 이것을 잠근다 —
 * 여기에 `>` 를 넣으면 그 해시가 빨개진다(실제로 그렇게 잡혔다).
 */
const PLAIN_LEADER = /^(\s*)([0-9]{1,9}[.)]|[-*+#]|=)/;

function escapePlainLine(line: string): string {
  return line.replace(PLAIN_LEADER, (_m, space: string, token: string) =>
    token.length > 1
      ? space + token.slice(0, -1) + "\\" + token.slice(-1)
      : space + "\\" + token,
  );
}

/**
 * 🔴 **수식 안 줄은 건너뛴다** — 그 줄은 마크다운 줄이 아니라 식의 이어짐이다.
 *    `$$x(b)⏎- x(a) = 8$$` 의 둘째 줄에 `\-`, 울타리 `$$` 안 `= 8` 줄에 `\=` 를 넣어
 *    KaTeX 가 붉게 그렸다(2026-09-26, 부류표 «여러 줄 `$$`»).
 */
function escapePlainLeaders(text: string): string {
  if (!text.includes("\n")) return escapePlainLine(text);
  const spans = findMathSpans(text);
  let offset = 0;
  return text
    .split("\n")
    .map((line) => {
      const start = offset;
      offset += line.length + 1;
      const insideMath = spans.some((s) => s.start < start && start < s.end);
      return insideMath ? line : escapePlainLine(line);
    })
    .join("\n");
}

/**
 * 상자 하나 → 마크다운 인용문. 항목마다 빈 `>` 줄을 두어 **각각 문단**이 되게 한다.
 * 문단이어야 렌더러가 React 자식 단위로 항목을 잡아 그리드로 바꿀 수 있다
 * (이 저장소는 remark-breaks 를 안 쓴다 — 부드러운 줄바꿈은 `<br>` 을 낳지 않는다).
 *
 * 열 수는 정본 머리 `<보기:cols=N>` 로 싣는다(`boxHeader.ts`, 트랙 46). 지면 렌더러가 수식
 * 전처리 직전에만 전처리를 통과하는 표기로 옮겨 적는다 — 예전에 이 자리가 `<보기2>` 를 쓴 까닭
 * (`preprocessMathText` 가 `cols=2` 를 수식으로 감싼다)은 거기서 막는다.
 *
 * 열 수: 머리에 **적힌** 값이 이긴다. 인용 상자(편집기·인식 원문, `native`)는 적힌 게 없으면 1열 —
 * 검수 카드와 같은 규칙이다. 줄 정보가 없는 OCR 흐름 글만 폭으로 추정한다(`fitsTwoColumns`).
 */
function renderBoxSegment(box: BoxSegment): string {
  const items = box.items.map((item) => collapseToOneLine(item));
  const columns = box.cols ?? (box.native ? 1 : fitsTwoColumns(items) ? 2 : 1);
  // 라벨 없는 상자(나열 대상)는 전용 머리말 `<나열>` 로 싣는다 —
  // 렌더러가 이 이름을 보고 **머리 줄을 그리지 않는다**.
  const label = boxHeaderMarkdown(box.headerless ? "나열" : box.label, columns);
  const header = box.lead ? `${label} ${collapseToOneLine(box.lead)}` : label;
  const lines = [header, ...items.map(escapeMarkdownLeader)];
  return lines.map((line) => `> ${line}`).join("\n>\n");
}

/* ──────────────────────────────────────────────────────────────────────────
 * 계산 과정 다단 등식 — `A = B = C` 를 단계마다 줄바꿈한다 (원장님 2026-08-18).
 *
 * 여기서 하는 이유는 상자와 같다: `collapseWhitespace` 가 개행을 다 녹이므로
 * **녹인 뒤에** 문단 경계를 다시 세워야 한다. 조각은 각각 완결된 `$…$` 라
 * 마크다운 문단으로 나눠도 KaTeX 가 깨지지 않는다.
 *
 * 자를 조건은 `equationChain.ts` 가 정한다 — 안 자르면 원문 그대로다.
 * ────────────────────────────────────────────────────────────────────────── */
const INLINE_MATH_SPAN = /\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g;

function breakEquationChains(text: string, workedProcess: boolean): string {
  if (!text.includes("=")) return text;
  let changed = false;
  const out = text.replace(INLINE_MATH_SPAN, (span) => {
    const parts = splitEquationChain(span, { workedProcess });
    if (parts === null) return span;
    changed = true;
    return parts.join("\n\n");
  });
  return changed ? out : text;
}

/* ──────────────────────────────────────────────────────────────────────────
 * 세부 문항 줄바꿈 — 원장님 2026-08-18 "세부 문항이 줄바꿈 처리되어야할텐데?"
 *
 * `collapseWhitespace` 가 개행을 전부 녹이므로, **녹이기 전에** 자리를 표시해 두었다가
 * 녹인 뒤 문단으로 되살린다. 표시 문자는 본문에 절대 나오지 않는 제어문자를 쓴다 —
 * 개행으로 표시하면 `collapseWhitespace` 가 같이 녹여 버린다.
 *
 * 판정은 `subQuestion.ts` 한 군데가 한다(상자 경계와 같은 규칙을 쓴다).
 * ────────────────────────────────────────────────────────────────────────── */
const SUBQ_SENTINEL = "\u0001";

function markBlankAnswerSlots(text: string): string {
  const slots = findBlankAnswerSlots(text);
  if (slots.length === 0) return text;
  let out = "";
  let position = 0;
  for (const slot of slots) {
    if (text.slice(0, slot.index).trim().length === 0) continue;
    out += text.slice(position, slot.index) + SUBQ_SENTINEL;
    position = slot.index;
  }
  return out + text.slice(position);
}

/**
 * display $$ 는 문단을 나눈다. 한 줄에 붙으면 remark-math 가 인라인으로 읽어 세로셈이 발문에 붙는다.
 *
 * 🔴 표시식의 자리는 `findMathSpans` 가 정한다. 예전 `/\$\$…\$\$/` 는 `$A$$B$` 의 «닫고-여는»
 *    `$$` 부터 짝을 지어 인라인 둘 사이를 표시식으로 세웠다 — 문제 표 해설 4행이 본문 렌더러에서만
 *    `\displaystyle`·자리표시 숫자를 흘린 뿌리다(2026-09-26).
 */
function breakDisplayMath(text: string): string {
  if (!text.includes("$$")) return text;
  const displays = findMathSpans(text).filter((s) => s.type === "display");
  if (displays.length === 0) return text;
  let out = "";
  let last = 0;
  for (const span of displays) {
    out += `${text.slice(last, span.start)}\n\n$$${span.value}$$\n\n`;
    last = span.end;
  }
  return (out + text.slice(last)).replace(/[ \t]*\n{2,}[ \t]*/g, "\n\n").trim();
}

/**
 * 발문 다음 줄이 **수식 하나뿐**이면 그 줄을 **문단으로 세운다**
 * (원장님 지시 2026-08-25: *「하시오. 하고 줄바꿔서 수식이 있어야 문제답다」*).
 *
 * ## 왜 여기인가
 *
 * 엔진은 이미 줄바꿈을 넣고 있었다 — `"다음 식을 계산하시오.\n$2\sqrt{11}\times…$"`.
 * 그런데 `collapseWhitespace` 가 **모든 개행을 공백으로** 녹인다(OCR 이관본의 줄바꿈은
 * 글줄 넘김이라 뜻이 없기 때문이다). 그래서 화면·지면이 둘을 한 줄로 붙여 그렸다.
 *
 * 개행 자체를 살리면 OCR 45,374건의 줄바꿈까지 되살아나 문단이 아무 데서나 갈린다.
 * 그래서 **뜻 있는 개행만** 표시로 남긴다 — `markSubQuestions` 와 **같은 방식·같은
 * 표시**를 쓰고, 복원도 `applySubQuestionBreaks` 가 같이 해 준다.
 *
 * ## 열쇠 셋 — 하나라도 빠지면 멀쩡한 것을 가른다
 *
 * 처음에 「그 줄이 수식 하나뿐인가」만 봤더니 **문장 중간에 낀 수식**까지 갈랐다:
 * `다음 조건을 만족시키는 자연수 / $m,n$ / 의 개수는?` 는 OCR 이 한 문장을 세 줄로
 * 끊어 놓은 것이라 붙여야 옳다. 그래서 셋을 **모두** 요구한다:
 *
 *   ㉠ 앞부분이 **문장으로 끝난다**(`.` `?` `!`) — 「…하시오.」 「…것은?」
 *   ㉡ 그 수식이 **글의 마지막**이다 — 뒤에 이어지는 말이 없다
 *   ㉢ 홑수식 줄이 **하나뿐**이다 — 여럿이면 «표시 없는 보기»라 갈라선 안 된다
 *      (한 줄의 쉼표 나열 «$2$, $3$, $x$» 는 줄 하나다 — 2026-10-20)
 *
 * ㉠ 이 「자연수 / $m,n$」 를 막고, ㉡ 가 「$m,n$ / 의 개수는?」 를 막고,
 * ㉢ 이 「…아닌 것은? / $5-3x\ge x+9$ / $6x…$ / …」(보기 넷)를 막는다.
 *
 * ⚠️ **지면 높이가 바뀐다** — 한 줄이 늘어난다. 자(`estimateProblemPx`)도 이 함수를
 *    거치는 같은 파서를 부르므로 갈라지지 않는다. 종이 검수는 따로 남긴다(절대 규칙 6).
 */
// 식 하나, 또는 쉼표로 가른 식 나열 한 줄(«$2$, $3$, $x$» — 2026-10-20 넓힘 · `isFormulaOnlyParagraph` 와 같은 꼴).
const TRAILING_FORMULA =
  /^([\s\S]*[.?!])\n\s*(\$[^$\n]+\$(?:[ \t]*[,，][ \t]*\$[^$\n]+\$)*)$/;
/** 글 **중간**에 있는 홑수식 줄 — 하나라도 있으면 표시 없는 보기로 보고 손대지 않는다. */
const MIDDLE_FORMULA_LINE =
  /\n[ \t]*\$[^$\n]+\$(?:[ \t]*[,，][ \t]*\$[^$\n]+\$)*[ \t]*(?=\n)/;

/**
 * 물음 바로 뒤 **같은 줄**에 식만 이어지는 꼴 — «…쓰시오. $9000$, $10000$, $2000$» (2026-10-20 교차 검수).
 * 엔진이 줄바꿈 대신 공백으로 이어 쓴 문항이 초등 · 중등 출력에 약 5,700건이었다. ㉠ ㉡ 을 그대로 요구하고
 * (문장 끝 뒤 · 글의 마지막), 문장 끝의 부호가 **수식 밖**인지 센다(`$0.5.$` 같은 수식 속 마침표가 아님).
 */
// 문장 끝은 «한글 음절 둘 이상 + 부호» — <보기> 항목 이름(«ㄹ.» 는 자모 · «가.» 는 홀로 선 한 음절)과 «$23$.» 은 문장 끝이 아니다.
const SAME_LINE_TRAILING_FORMULA =
  /^([\s\S]*[가-힣]{2}[.?!])[ \t]+(\$[^$\n]+\$(?:[ \t]*[,，][ \t]*\$[^$\n]+\$)*)$/;
/** 글자 없는 답 칸 괄호 «$(~~~~~~)$» · «$(\,)$» — 식이 아니다. */
const BLANK_PAREN_FORMULA = /^\$\s*\((?:~|\\[,;:!]|\\q?quad|\s)*\)\s*\$$/;

function markStandaloneFormula(text: string): string {
  const trimmed = text.replace(/\s+$/, "");
  const m = text.includes("\n") ? TRAILING_FORMULA.exec(trimmed) : null;
  if (m) {
    if (MIDDLE_FORMULA_LINE.test(trimmed)) return text;
    return `${m[1]}${SUBQ_SENTINEL}${m[2]}${text.slice(trimmed.length)}`;
  }
  const same = SAME_LINE_TRAILING_FORMULA.exec(trimmed);
  if (!same) return text;
  const head = same[1]!;
  if ((head.match(/\$/g) ?? []).length % 2 === 1) return text;
  if (MIDDLE_FORMULA_LINE.test(trimmed)) return text;
  if (BLANK_PAREN_FORMULA.test(same[2]!)) return text;
  return `${head}${SUBQ_SENTINEL}${same[2]}${text.slice(trimmed.length)}`;
}

function markSubQuestions(text: string): string {
  const markers = findSubQuestionMarkers(text);
  if (markers.length === 0) return text;
  let out = "";
  let position = 0;
  for (const marker of markers) {
    // 맨 앞 마커는 나눌 앞이 없다 — 빈 문단이 생기지 않게 건너뛴다.
    if (text.slice(0, marker.index).trim().length === 0) continue;
    out += text.slice(position, marker.index) + SUBQ_SENTINEL;
    position = marker.index;
  }
  return out + text.slice(position);
}

/** 표시를 문단 경계로 되살린다. 표시 앞뒤의 공백은 문단 사이에 남기지 않는다. */
function applySubQuestionBreaks(text: string): string {
  if (!text.includes(SUBQ_SENTINEL)) return text;
  return text
    .split(SUBQ_SENTINEL)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("\n\n");
}

function buildQuestion(questionText: string): string {
  const segments = splitBoxSegments(questionText);
  // 「…과정이다」는 **문항 전체**를 봐야 안다 — 상자를 나누기 전에 한 번만 본다.
  const worked = isWorkedProcess(questionText);
  const plain = (text: string) =>
    escapePlainLeaders(
      breakDisplayMath(
        applySubQuestionBreaks(
          breakEquationChains(
            dropDuplicatedTails(
              collapseWhitespace(
                // ⚠️ `markStandaloneFormula` 가 **맨 먼저**다 — 원문의 개행을 봐야 한다.
                //    뒤의 표시들은 개행을 안 만들므로 순서가 서로를 방해하지 않는다.
                markBlankAnswerSlots(
                  markSubQuestions(markStandaloneFormula(text)),
                ),
              ),
            ),
            worked,
          ),
        ),
      ),
    );

  if (segments.length === 1 && segments[0].kind === "text") {
    return plain(segments[0].text);
  }
  return segments
    .map((segment) =>
      segment.kind === "text" ? plain(segment.text) : renderBoxSegment(segment),
    )
    .filter((part) => part.length > 0)
    .join("\n\n");
}

/**
 * 보기 분해 없이 OCR 이중 개행만 정규화한다 (지문/정답/해설 공용).
 * mathgen 렌더러(마크다운)는 `\n\n`을 문단 분리로 읽으므로 반드시 선행돼야 한다.
 */
export function normalizeOcrText(raw: string): string {
  if (!raw) return "";
  return remember(normalizedCache, raw, () => {
    const { masked, formulas } = maskMath(normalizeSource(raw));
    return dropDuplicatedTails(collapseWhitespace(unmask(masked, formulas)));
  });
}
