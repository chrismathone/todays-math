/**
 * 「말 대신 기호」 규칙의 **한 곳** — 세는 쪽·고치는 쪽·판정기가 이 파일 하나를 읽는다.
 *
 * 원장님 지시(2026-08-26): 「해설에 이렇게 쓰지 말고 **최솟값·최댓값이란 말을 명확히
 * 쓸 것.** 지금 이런 해설 멘트 전수 검사해서 교체」 — 짚으신 해설은
 * `최대공약수에서 $2$의 지수는 $\min(a,3)=2$이므로 $a=2$` 였다.
 *
 * ## 대상은 «세어서» 골랐다
 *
 * `census-math-commands.ts` 가 공유 DB 의 수식 안 명령 **174종**을 빈도순으로 늘어놓고,
 * `census-operator-labels.ts` 가 `\mathrm{…}`·`\text{…}` 인자 **921종**을 늘어놓았다.
 * 그 목록을 보고 「한국 교과서가 **말**로 쓰는 것을 함수 이름으로 적은 것」만 남겼다.
 * 손으로 지은 목록이 아니다 — 손 목록은 세는 쪽과 고치는 쪽이 같이 눈이 먼다(2026-08-18).
 *
 * **일부러 뺀 것**(까닭이 있다):
 *   · `\sin`·`\cos`·`\log`·`\lim`·`\sum`·`\int` — 교과서가 **그 기호를 가르친다.**
 *   · `\det`·`\mathrm{tr}` (행렬) · `\pmod`·`\mathrm{mod}` (합동식) — 그 단원의 교과
 *     표기다. 바꾸면 오히려 낯설어진다.
 *   · `\sup` — 실측 5자리가 **전부 HWP `LSUP` 잔재**였다(`L\sup 3ax^{2}`). 뜻이 아니다.
 */

const BS = String.fromCharCode(92);

/** 「말」로 바꿀 연산자와 그 말. */
interface OperatorWord {
  /** 인자가 하나일 때: `(A의 …)` */
  one: string;
  /** 인자가 둘일 때: `(A, B 중 …)`. 없으면 `one` 을 쓴다. */
  two?: string;
  /** 인자가 셋 이상일 때. 없으면 `two` 를 쓴다. */
  many?: string;
}

const WORDS: Record<string, OperatorWord> = {
  min: { one: "의 최솟값", two: " 중 최솟값", many: " 중 가장 작은 값" },
  max: { one: "의 최댓값", two: " 중 최댓값", many: " 중 가장 큰 값" },
  gcd: { one: "의 최대공약수" },
  lcm: { one: "의 최소공배수" },
  deg: { one: "의 차수" },
};

export const WORDY_OPERATOR_NAMES = Object.keys(WORDS);

/** `\min` … 뒤에 영문이 이어지면 다른 명령이다 (`\deg` vs `\degree`). */
const BARE_HEAD = new RegExp(
  BS + BS + "(" + WORDY_OPERATOR_NAMES.join("|") + ")(?![A-Za-z])",
  "g",
);

/**
 * `\mathrm{lcm}` · `\text{lcm}` — **`\lcm` 은 KaTeX 에 없는 명령**이라(실측: 붉게
 * 나간다) 사람이 이렇게 피해 적는다. 백슬래시 명령만 세면 이 갈래가 구조적으로 0 이다.
 */
const LABEL_HEAD = new RegExp(
  BS +
    BS +
    "(?:mathrm|text|operatorname|mbox)\\s*\\{\\s*(" +
    WORDY_OPERATOR_NAMES.join("|") +
    ")\\s*\\}",
  "g",
);

export interface WordyOperatorHit {
  /** 지면에 나가는 이름. `\min` · `\mathrm{lcm}` */
  name: string;
  /** 연산자 이름. `min` */
  op: string;
  index: number;
  /** 원문에서 이 머리가 차지하는 길이. */
  length: number;
}

export function wordyOperatorHits(text: string): WordyOperatorHit[] {
  const out: WordyOperatorHit[] = [];
  for (const re of [BARE_HEAD, LABEL_HEAD]) {
    for (const m of text.matchAll(re)) {
      out.push({
        name: m[0],
        op: m[1] as string,
        index: m.index ?? 0,
        length: m[0].length,
      });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

export const hasWordyOperator = (text: string): boolean =>
  wordyOperatorHits(text).length > 0;

// ─────────────────────────────────────────────────────────────
// 바꾸기
// ─────────────────────────────────────────────────────────────

export type SkipReason =
  "인자없음" | "중괄호꼴" | "아래첨자" | "괄호안닫힘" | "인자비었음";

export interface SkippedHit {
  name: string;
  op: string;
  index: number;
  reason: SkipReason;
  /** 사람이 눈으로 볼 수 있게 앞뒤를 잘라 둔다. */
  around: string;
}

export interface RewriteResult {
  out: string;
  /** 바꾼 자리 수. */
  changed: number;
  /** 손대지 않은 자리 — **까닭과 함께**. 조용히 버리면 표가 «전부 했다»로 읽힌다. */
  skipped: SkippedHit[];
}

const LEFT = BS + "left";
const RIGHT = BS + "right";

/** `\left(` 를 포함해 여는 괄호를 읽는다. 바로 뒤가 괄호가 아니면 -1. */
function readOpenParen(text: string, from: number): number {
  const re = new RegExp(
    "^\\s*(?:" + BS + BS + ",|~|;)?\\s*(?:" + BS + BS + "left\\s*)?\\(",
  );
  const m = re.exec(text.slice(from));
  return m ? from + m[0].length : -1;
}

/**
 * `afterOpen` 에서 시작해 **짝이 맞는** 닫는 괄호의 자리를 찾는다.
 * `{}`·`[]` 안의 괄호는 안 센다. `\right)` 의 `)` 도 닫는 괄호로 본다.
 * 수식이 먼저 끝나면(`$`) 짝이 없는 것으로 본다 — 못 가르는 것은 버리는 쪽.
 */
function findClose(text: string, afterOpen: number): number {
  let depth = 0;
  let brace = 0;
  let bracket = 0;
  for (let i = afterOpen; i < text.length; i += 1) {
    const c = text[i];
    if (c === BS) {
      if (text.startsWith(RIGHT, i)) {
        i += RIGHT.length - 1;
        continue;
      }
      if (text.startsWith(LEFT, i)) {
        i += LEFT.length - 1;
        continue;
      }
      i += 1; // 이스케이프된 한 글자를 건너뛴다 (`\{` · `\}`)
      continue;
    }
    if (c === "{") brace += 1;
    else if (c === "}") {
      if (brace === 0) return -1; // 우리 괄호 밖으로 새어 나갔다
      brace -= 1;
    } else if (brace > 0) continue;
    else if (c === "[") bracket += 1;
    else if (c === "]") bracket = Math.max(0, bracket - 1);
    else if (bracket > 0) continue;
    else if (c === "(") depth += 1;
    else if (c === ")") {
      if (depth === 0) return i;
      depth -= 1;
    } else if (c === "$" || c === "\n") return -1;
  }
  return -1;
}

/** 바깥 쉼표에서만 가른다. */
function splitArgs(inner: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let brace = 0;
  let bracket = 0;
  let start = 0;
  for (let i = 0; i < inner.length; i += 1) {
    const c = inner[i];
    if (c === BS) {
      if (inner.startsWith(RIGHT, i)) {
        i += RIGHT.length - 1;
        continue;
      }
      if (inner.startsWith(LEFT, i)) {
        i += LEFT.length - 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (c === "{") brace += 1;
    else if (c === "}") brace = Math.max(0, brace - 1);
    else if (brace > 0) continue;
    else if (c === "[") bracket += 1;
    else if (c === "]") bracket = Math.max(0, bracket - 1);
    else if (bracket > 0) continue;
    else if (c === "(") depth += 1;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if (c === "," && depth === 0) {
      args.push(inner.slice(start, i));
      start = i + 1;
    }
  }
  args.push(inner.slice(start));
  return args;
}

/** 인자 앞뒤의 공백·간격 명령을 떼어 낸다 — 우리가 `,\,` 로 다시 이어 붙인다. */
const GAP = "(?:\\s|" + BS + BS + "[,;!]|" + BS + BS + "q?quad|~)+";
const trimArg = (s: string) =>
  s.replace(new RegExp("^" + GAP), "").replace(new RegExp(GAP + "$"), "");

function wordFor(op: string, argCount: number): string {
  const w = WORDS[op] as OperatorWord;
  if (argCount >= 3) return w.many ?? w.two ?? w.one;
  if (argCount === 2) return w.two ?? w.one;
  return w.one;
}

/** `\deg R` — 괄호 없이 **한 덩어리**를 받는 꼴. 이것만 받는다. */
const DEG_ARG = /^\s*([A-Za-z](?:\s*\([a-zA-Z]\))?)(?![A-Za-z0-9_])/;

/**
 * 「말 대신 기호」를 **말로** 바꾼다.
 *
 * ## 무엇을 바꾸지 «않나»
 *
 * **함수 적용 꼴만** 바꾼다. 아래첨자·중괄호·인자 없음은 손대지 않고 까닭을 남긴다.
 * 인자 없는 `\lcm` 을 「최소공배수」로 읽으면 **그럴듯하게 틀린다** — 실측
 * `J10604-LKH8` 의 `호의 길이를 $\lcm$ 라 하면` 은 `l cm` 이 붙어 버린 HWP 잔재다.
 *
 * ## 값을 지어내지 않는다
 *
 * 인자는 **한 글자도 안 고치고 그대로 옮긴다.** 그래서 수를 잃는 일이 구조적으로 없다
 * (2026-08-21 `\frac{}{2}` → `\frac{0}{2}` 사건의 반대편에 서려는 것이다).
 */
export function rewriteWordyOperators(text: string): RewriteResult {
  const hits = wordyOperatorHits(text);
  if (hits.length === 0) return { out: text, changed: 0, skipped: [] };

  const skipped: SkippedHit[] = [];
  let out = "";
  let cursor = 0;
  let changed = 0;

  const around = (at: number) =>
    text.slice(Math.max(0, at - 40), at + 60).replace(/\n/g, " ⏎ ");

  const skip = (h: WordyOperatorHit, reason: SkipReason) => {
    skipped.push({
      name: h.name,
      op: h.op,
      index: h.index,
      reason,
      around: around(h.index),
    });
  };

  for (const hit of hits) {
    if (hit.index < cursor) continue; // 앞선 치환이 이미 삼킨 자리
    const after = hit.index + hit.length;
    const tail = text.slice(after);
    const head = text.slice(Math.max(0, hit.index - 3), hit.index);

    // 아래첨자(`\max_{x\le0}` · `P_{\max}`)는 함수 적용이 아니다.
    if (/^\s*_/.test(tail) || /_\s*\{?\s*$/.test(head)) {
      skip(hit, "아래첨자");
      continue;
    }
    if (new RegExp("^\\s*" + BS + BS + "?\\{").test(tail)) {
      skip(hit, "중괄호꼴");
      continue;
    }

    if (hit.op === "deg") {
      const m = DEG_ARG.exec(tail);
      if (!m) {
        skip(hit, "인자없음");
        continue;
      }
      out += text.slice(cursor, hit.index);
      out +=
        "(" +
        (m[1] as string).replace(/\s+/g, "") +
        BS +
        "text{" +
        (WORDS.deg as OperatorWord).one +
        "})";
      cursor = after + m[0].length;
      changed += 1;
      continue;
    }

    const open = readOpenParen(text, after);
    if (open < 0) {
      skip(hit, "인자없음");
      continue;
    }
    const close = findClose(text, open);
    if (close < 0) {
      skip(hit, "괄호안닫힘");
      continue;
    }
    // `\left(…\right)` 로 닫혔으면 그 `\right` 는 우리 괄호의 일부다 — 인자가 아니다.
    const inner = text
      .slice(open, close)
      .replace(new RegExp(BS + BS + "right\\s*$"), "");
    const args = splitArgs(inner).map(trimArg);
    if (args.some((a) => a === "")) {
      skip(hit, "인자비었음");
      continue;
    }

    // 인자 **안**에도 같은 부류가 들어앉는다(`\gcd(\gcd(12,18),30)`). 바깥만 바꾸면
    // 안쪽이 그대로 남는데, 그 자리는 이미 우리가 삼킨 뒤라 **다시 안 걸린다** —
    // 침묵하는 잔재가 된다. 인자는 원문보다 반드시 짧으므로 재귀는 끝난다.
    const rewrittenArgs = args.map((a) => {
      const r = rewriteWordyOperators(a);
      changed += r.changed;
      for (const s of r.skipped) skipped.push({ ...s, index: open + s.index });
      return r.out;
    });

    out += text.slice(cursor, hit.index);
    out +=
      "(" +
      rewrittenArgs.join("," + BS + ",") +
      BS +
      "text{" +
      wordFor(hit.op, args.length) +
      "})";
    cursor = close + 1;
    changed += 1;
  }
  out += text.slice(cursor);
  return { out, changed, skipped };
}
