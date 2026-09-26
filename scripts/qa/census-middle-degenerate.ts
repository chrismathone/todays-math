/**
 * 🔎 훑개 + 판정 함수 — 중등 엔진 발문의 **「말이 안 되는」 수치**를 센다.
 *
 * ## ① 무엇을 하나
 *
 * 씨앗에 따라 이런 발문이 나왔다(원장님 2026-09-27, 모바일 «오늘의 복습»):
 *
 * > 남학생 수와 여학생 수의 비가 **$2:2$**인 모둠에서 …
 * > 두 톱니바퀴 A, B 의 톱니 수는 각각 **$10$개, $10$개**이다. A가 $120$바퀴 도는 동안 … (답 $120$바퀴)
 * > 어떤 일을 완성하는 데 A는 **$14$일**, B는 **$14$일**이 걸린다 …
 *
 * 값은 맞고 KaTeX 도 초록이라 **값 검산이 구조적으로 못 본다**(2026-08-24 「값이 맞으면
 * 시험이 다 초록이다」). 그래서 발문 글자에서 수량 토큰을 뽑아 여섯 가지를 본다.
 *
 * | 규칙 | 뜻 |
 * | --- | --- |
 * | `비의 두 항이 같다` | `$a:a$`($a\ge2$) — 비를 줄 까닭이 없다. `$1:1$` 은 옳은 비라 안 본다 |
 * | `비가 기약이 아니다` | `$2:4$` — 교과서는 가장 간단한 자연수의 비로 준다 |
 * | `각각 뒤 두 값이 같다` | 「각각 $10$개, $10$개」 |
 * | `나란한 두 자리의 값이 같다` | 「A는 $14$일, B는 $14$일」·「한 사람은 분속 $60\,\mathrm{m}$로, 다른 사람은 분속 $60\,\mathrm{m}$로」 |
 * | `와/과로 이은 두 값이 같다` | 「$6\%$의 소금물과 $6\%$의 소금물」 |
 * | `답이 발문에 그대로 있다` | 답 「$80$바퀴」가 발문에 「$80$바퀴」로 이미 있다 |
 *
 * 계수 `1x`·`1\left(`·`+-` 같은 **지면 냄새**와 조사는 여기서 다시 판정하지 않는다 —
 * `src/__tests__/helpers/midPage.ts` 의 `pageSmells`·`josaMismatches` 가 이미 있는 가드다
 * (늘리는 쪽은 거기). `--smells` 를 주면 그 가드를 **불러서** 같은 표에 센다.
 *
 * ## ② 왜 이렇게 하나 — «나란한 자리»를 어떻게 가르나
 *
 * 같은 값이 두 번 나온다고 다 결함은 아니다. 표본(씨앗 500 × 144유형)을 읽어 가른 것:
 *
 * - **결함**: 같은 속성을 두 주체에 따로 적는데 값이 같다 — 「A는 $14$일, B는 $14$일」.
 *   첫 자리 뒤에서 **술어가 생략되고 쉼표로 끝난다**(「$14$일,」·「$25\%$를 교재비로,」).
 * - **결함**: 같은 것의 같은 속성을 두 번 적는다 — 「$x$의 $9$배에서 … $x$의 $9$배와 같다」
 *   (해가 없다). 바로 앞 토큰이 **같은 문자**다.
 * - **결함 아님**: 역할이 다르다 — 「$10\%$ **늘고** … $10\%$ **줄어서**」·「$4$개가 **남고**,
 *   … $4$개가 **부족하다**」. 뒤따르는 술어가 다르다.
 * - **결함 아님**: 바로 앞 두 글자가 다르다 — 「어떤 수에 $4$를 곱한 **후** $4$를 더한」.
 *
 * - **결함 아님**: 문장이 다르다 — 「형의 예금액은 $1000$원, …이다. 매달 …, 동생은 $1000$원씩」
 *   (잔액과 적립액). 나란한 짝은 한 문장 안에 선다.
 * - **결함 아님**: 셋 이상 늘어놓은 자료 — 「목요일 $+200$명, 금요일 $+150$명, 토요일 $+150$명, …」·
 *   「세 모서리의 길이가 각각 $12$, $12$, $8$」. 자료 안에서 값이 겹치는 것은 자연스럽다
 *   (중1 밖 모듈을 훑다가 거짓 경보로 나온 것 — `LIST_GAP`·`PARTICLE_HEAD` 주석).
 *
 * - **결함 아님**: 속성이 다르다 — 「반지름의 길이가 $9$ cm, 높이가 $9$ cm」. 앞 낱말이 다르다.
 *
 * 그래서 `나란한` 은 «한 문장 안·이웃한 두 자리·값·단위»가 같고, «앞 낱말이 같거나 둘 다
 * 은/는 주제어»이며, «생략·같은 술어·같은 앞 토큰» 중 하나가 있을 때만 센다. 이 경계는 아래 `CALIBRATION` 이 **양성·음성을 같은 자리에** 놓고 잠근다
 * (§2-8 「진짜 위반과 멀쩡한 것을 같은 파일에 놓고 하나만 잡히는지」).
 *
 * `답이 발문에` 는 **단위가 있는 수량**만 본다. 맨 숫자·목록 줄(「다음 수 중에서 …\n$3$, $-2$, …」
 * — 답이 보기에 있는 것이 문제의 뜻이다)·서수(「제$2$사분면」)는 안 본다. 속력(시속·분속·초속)은
 * 거리와 단위 글자가 같아도 다른 양이라 단위 열쇠를 가른다.
 *
 * ⚠️ **이 열쇠는 샌다** — 「두 사람의 속력이 같다」를 다른 말로 풀어 쓰면 못 잡는다. 새는
 *    방향이 «못 잡는 쪽»이라 거짓 경보로 가드를 끄는 것보다 낫다(2026-08-20).
 *
 * ## ③ 무엇을 안 바꾸나
 *
 * 아무것도 안 바꾼다. 문항을 만들어 읽기만 한다(DB 안 씀).
 *
 *   npx tsx scripts/qa/census-middle-degenerate.ts                   # 전 학년, 씨앗 300
 *   npx tsx scripts/qa/census-middle-degenerate.ts --grade 중2 --seeds 1000
 *   npx tsx scripts/qa/census-middle-degenerate.ts --prefix "1-1|일차방정식의 활용"
 *   npx tsx scripts/qa/census-middle-degenerate.ts --module m1core   # 모바일 복습이 쓰는 세 모듈
 *   npx tsx scripts/qa/census-middle-degenerate.ts --module rest --smells --tsv
 *   npx tsx scripts/qa/census-middle-degenerate.ts --selftest        # 눈금만
 */
import {
  josaMismatches,
  pageSmells,
} from "../../src/__tests__/helpers/midPage";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import { M1_BOOK1 } from "../../src/lib/middle/m1Book1";
import { M1_EXPR, M1_EXPR_SUP_B } from "../../src/lib/middle/m1Expr";
import { M1_LINEAR_APPLY } from "../../src/lib/middle/m1LinearApply";

/**
 * 모바일 «오늘의 복습»이 부르는 세 모듈(`src/lib/math-srs/engineCatalog.ts` 의 `SOURCES`).
 * 카탈로그 87유형은 이 안의 부분집합이다 — 잠금 시험은 모듈 전체를 본다.
 */
const M1_CORE_KEYS = new Set(
  [...M1_EXPR, ...M1_EXPR_SUP_B, ...M1_BOOK1, ...M1_LINEAR_APPLY].map(
    (e) => e.key,
  ),
);

export type Quantity = {
  /** `$…$` 안 그대로 */
  body: string;
  kind: "number" | "ratio" | "expr";
  /** 비교 열쇠 — 수는 정규화한 수, 비는 `a:b`, 식은 공백을 뺀 몸통 */
  value: string;
  /** 단위 열쇠 — 수식 안 단위·수식 밖 로마자 단위·붙은 한글 첫 글자 순. 속력은 `속력:` 을 붙인다 */
  unit: string;
  /** 단위 뒤에 붙은 한글 덩어리(「일이」·「원씩」) */
  attached: string;
  /** 토큰 바로 앞 두 글자 */
  pre2: string;
  /**
   * 토큰 바로 앞 낱말 — 그 안의 수식 토큰은 `$…$` 자리표로 바꾼다. 「분속」·「예산의」·
   * 「$x$의」→「$…$의」·「$\mathrm{A}$는」→「$…$는」(A·B 는 이름표라 같은 자리로 본다).
   */
  preWord: string;
  /** 바로 앞 토큰(사이가 세 글자 이하일 때만) */
  prevToken: string | null;
  /** 붙은 덩어리 다음의 첫 한글 낱말 — 다음 토큰·쉼표·마침표 전까지 */
  nextWord: string;
  /** 첫 자리 뒤에서 술어가 생략되고 쉼표로 끝나는가 — 「$14$일,」·「$25\%$를 교재비로,」 */
  ellipsis: boolean;
  /** 목록 줄(수식 토큰만 쉼표로 늘어놓은 줄)이나 서수(「제$2$」) — 비교하지 않는다 */
  skip: boolean;
  start: number;
  end: number;
};

export type Finding = { rule: string; detail: string };

const LATIN_UNIT = /^ (°[CF]|[a-zA-Z]{1,3}(?:\^\{?2\}?|²)?|%)(?![a-zA-Z])/;

/** 생략된 술어 뒤에 오는 한 낱말 — 부사격·목적격 조사로 끝나면 술어가 아니다. */
const COMPLEMENT_END = /(?:으로|로|에게|에서|에|와|과|의|을|를)$/;

/**
 * 붙은 덩어리가 **조사·서술격으로 시작하면 단위가 아니다** — 「$6$이고」·「$6$이다」·「$2$인」.
 * 이걸 안 막으면 맨 수 둘이 「이」라는 단위를 나눠 가져 「거리가 $6$이고 … 수가 $6$이다」가
 * 나란한 짝으로 걸렸다(중1 정수와 유리수 06, 2026-09-27 실측 — 거짓 경보).
 * ⚠️ 「가지」·「도」 같은 단위도 여기서 빠진다 — 새는 방향이 «못 잡는 쪽»이라 받아들인다.
 */
const PARTICLE_HEAD =
  /^(?:이|가|을|를|은|는|과|와|의|으로|로|에|도|만|보다|부터|까지|라|인)/;

/**
 * 셋 이상 늘어놓은 자료 사이의 틈 — 「$+200$명, 금요일 $+150$명」·「$12$ cm, $12$ cm, $8$ cm」.
 * 요일별 증감·세 모서리·합동인 세 변처럼 **자료 목록 안에서 값이 겹치는 것은 자연스럽다.**
 * 「A는 $14$일, B는 $14$일」은 둘뿐이라 목록이 아니다.
 */
const LIST_GAP = /^[^$.\n]{0,8},\s*[^$,.\n]{0,8}$/;

function normalizeBody(body: string): string {
  return body
    .replace(/\\[,;!]/g, "")
    .replace(/\\mathrm\{([^}]*)\}/g, "$1")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\^\{\\circ\}/g, "°")
    .replace(/\\%/g, "%")
    .replace(/\^\{2\}/g, "²")
    .replace(/\s+/g, "");
}

/** 한 줄이 수식 토큰만 쉼표로 늘어놓은 목록인가 — 「$3$, $-2x$, $5$」 */
function isListLine(line: string): boolean {
  return /^\s*\$[^$]+\$(?:\s*,\s*\$[^$]+\$)+\s*$/.test(line);
}

export function quantities(text: string): Quantity[] {
  const out: Quantity[] = [];
  const re = /\$([^$]+)\$/g;
  let m: RegExpExecArray | null;
  let prev: { body: string; end: number } | null = null;
  while ((m = re.exec(text))) {
    const body = m[1]!;
    const start = m.index;
    const end = start + m[0].length;
    const lineStart = text.lastIndexOf("\n", start) + 1;
    const lineEndAt = text.indexOf("\n", end);
    const line = text.slice(lineStart, lineEndAt < 0 ? undefined : lineEndAt);
    const norm = normalizeBody(body);
    const num = /^(-?\d+(?:\.\d+)?)([a-zA-Z%°²]*)$/.exec(norm);
    const ratio = /^(\d+)(?::(\d+))+$/.test(norm) ? norm : null;
    let kind: Quantity["kind"];
    let value: string;
    let mathUnit = "";
    if (num) {
      kind = "number";
      value = String(Number(num[1]));
      mathUnit = num[2] ?? "";
    } else if (ratio) {
      kind = "ratio";
      value = ratio;
    } else {
      kind = "expr";
      value = norm;
    }
    let after = text.slice(end);
    let latin = "";
    const lu = LATIN_UNIT.exec(after);
    if (lu && !mathUnit) {
      latin = lu[1]!.replace(/\^\{?2\}?/, "²");
      after = after.slice(lu[0].length);
    }
    const attached = /^[가-힣]+/.exec(after)?.[0] ?? "";
    const rest = after.slice(attached.length);
    const before = text.slice(0, start);
    const speed = /(?:시속|분속|초속)\s*$/.test(before) ? "속력:" : "";
    const counter =
      attached && !PARTICLE_HEAD.test(attached) ? attached[0]! : "";
    const unit = speed + (mathUnit || latin || counter);
    // 붙은 덩어리 뒤 — 「,」면 생략, 「 낱말,」이고 낱말이 조사로 끝나면 생략
    const restToStop = /^[^$,.\n]*/.exec(rest)?.[0] ?? "";
    const words = restToStop.trim().split(/\s+/).filter(Boolean);
    const nextWord = words[0] ?? "";
    const stopChar = rest[restToStop.length] ?? "";
    const ellipsis =
      stopChar === "," &&
      (words.length === 0 ||
        (words.length === 1 && COMPLEMENT_END.test(words[0]!)));
    const gap = prev ? text.slice(prev.end, start) : null;
    out.push({
      body,
      kind,
      value,
      unit,
      attached,
      pre2: before.slice(-2),
      preWord: (/(\S*)\s*$/.exec(before)?.[1] ?? "").replace(
        /\$[^$]*\$/g,
        "$…$",
      ),
      prevToken: prev && gap !== null && gap.length <= 3 ? prev.body : null,
      nextWord,
      ellipsis,
      skip: isListLine(line) || /제\s*$/.test(before),
      start,
      end,
    });
    prev = { body, end };
  }
  return out;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

const hasDigit = (q: Quantity): boolean => /\d/.test(q.body);
const sameAmount = (a: Quantity, b: Quantity): boolean =>
  a.kind === b.kind && a.value === b.value && a.unit === b.unit;

/** 발문 하나의 퇴화 — 없으면 빈 배열. `answer` 를 주면 「답이 발문에」도 본다. */
export function degenerateFindings(
  content: string,
  answer?: string,
): Finding[] {
  const found: Finding[] = [];
  const qs = quantities(content);

  for (const q of qs) {
    if (q.kind !== "ratio" || q.skip) continue;
    const terms = q.value.split(":").map(Number);
    // `$1:1$` 은 옳은 비다(두 점 사이를 $1:1$로 나누는 점, 겉넓이와 부피의 비가 $1:1$인 구).
    // 세 항 비에서 두 항이 같은 것(`$2:2:5$`)도 이등변 꼴이라 자연스럽다 — 기약 여부만 본다.
    if (terms.length === 2 && terms[0] === terms[1] && terms[0]! > 1) {
      found.push({ rule: "비의 두 항이 같다", detail: `$${q.body}$` });
    } else if (terms.reduce(gcd) > 1) {
      found.push({ rule: "비가 기약이 아니다", detail: `$${q.body}$` });
    }
  }

  // 「각각 $a$…, $b$…(, $c$…)」 — 「각각」 바로 뒤에 쉼표로 이어진 토큰들
  for (const m of content.matchAll(/각각\s+/g)) {
    const from = m.index + m[0].length;
    const group: Quantity[] = [];
    for (const q of qs) {
      if (q.start < from) continue;
      if (group.length === 0) {
        if (q.start !== from) break;
      } else {
        const gapText = content.slice(group[group.length - 1]!.end, q.start);
        if (!/^[^$,.]{0,6},\s*$/.test(gapText)) break;
      }
      group.push(q);
    }
    // 셋 이상이면 자료 목록이다(「세 모서리의 길이가 각각 $12$, $12$, $8$」) — 겹쳐도 된다.
    if (group.length > 2) continue;
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        if (hasDigit(group[i]!) && sameAmount(group[i]!, group[j]!)) {
          found.push({
            rule: "각각 뒤 두 값이 같다",
            detail: `$${group[i]!.body}$ = $${group[j]!.body}$`,
          });
        }
      }
    }
  }

  const live = qs.filter((q) => !q.skip && hasDigit(q) && q.kind !== "ratio");
  // 같은 단위로 쉼표를 두고 셋 이상 이어진 자료 목록 — 번호가 같으면 한 목록이다
  const runOf = new Map<Quantity, number>();
  const runSize = new Map<number, number>();
  let run = 0;
  live.forEach((q, i) => {
    const p = live[i - 1];
    if (
      !p ||
      p.unit !== q.unit ||
      !LIST_GAP.test(content.slice(p.end, q.start))
    ) {
      run += 1;
    }
    runOf.set(q, run);
    runSize.set(run, (runSize.get(run) ?? 0) + 1);
  });
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const a = live[i]!;
      const b = live[j]!;
      if (!sameAmount(a, b)) continue;
      if (runOf.get(a) === runOf.get(b) && runSize.get(runOf.get(a)!)! > 2) {
        continue;
      }
      // 한글 단위(「일」·「원」)는 붙은 첫 글자가 곧 단위다 — 단위가 없으면 비교하지 않는다
      if (a.unit === "") continue;
      // 나란한 짝은 **한 문장 안**에 선다. 문장이 바뀌면 다른 말이다 — 「형의 예금액은
      // $1000$원, …이다. 매달 형은 …, 동생은 $1000$원씩」의 두 $1000$원은 잔액과 적립액이다.
      const between = content.slice(a.end, b.start);
      if (/[.?!](?:\s|$)|\n/.test(between)) continue;
      // 짝은 **이웃한** 두 자리다 — 같은 단위의 수가 사이에 끼면 짝이 아니다. 「A를 $300$g,
      // B를 $150$g …, A를 $150$g, B를 $300$g」의 두 $300$g 은 서로 다른 경우의 자리다.
      const adjacent = live.slice(i + 1, j).every((m) => m.unit !== a.unit);
      // 앞 낱말이 같거나(「분속」·「예산의」·「$…$의」·「$…$는」), 둘 다 「X은/는」 주제어로
      // 맞서는 꼴(「형은 …, 동생은 …」)이어야 한다. 앞 두 글자만 보면 흔한 주격 「가 」 하나로
      // 「반지름의 길이가 $9$ cm, 높이가 $9$ cm」 같은 다른 속성이 짝으로 걸렸다(중1 밖 실측).
      const sameSlot =
        (a.preWord !== "" && a.preWord === b.preWord) ||
        (a.pre2 === b.pre2 &&
          /[은는]$/.test(a.preWord) &&
          /[은는]$/.test(b.preWord));
      if (
        adjacent &&
        sameSlot &&
        (a.ellipsis ||
          (a.nextWord !== "" && a.nextWord === b.nextWord) ||
          (a.prevToken !== null && a.prevToken === b.prevToken))
      ) {
        found.push({
          rule: "나란한 두 자리의 값이 같다",
          detail: `…${content.slice(Math.max(0, a.start - 8), a.end + 4)}… / …${content.slice(Math.max(0, b.start - 8), b.end + 4)}…`,
        });
        continue;
      }
      // 「$6\%$의 소금물과 $6\%$의 소금물」 — 사이가 「X와 」이고 둘째 뒤가 「X」로 이어진다
      const joined = /^(.{1,12})(?:와|과) $/.exec(between);
      if (joined && content.slice(b.end).startsWith(joined[1]!)) {
        found.push({
          rule: "와/과로 이은 두 값이 같다",
          detail: `$${a.body}$${between}$${b.body}$`,
        });
      }
    }
  }

  if (answer !== undefined) {
    const aq = quantities(answer).filter((q) => !q.skip);
    if (aq.length === 1 && aq[0]!.kind === "number" && aq[0]!.unit !== "") {
      const hit = live.find((q) => sameAmount(q, aq[0]!));
      if (hit) {
        found.push({
          rule: "답이 발문에 그대로 있다",
          detail: `답 ${answer} ← 발문 …${content.slice(Math.max(0, hit.start - 8), hit.end + 4)}…`,
        });
      }
    }
  }
  return found;
}

/**
 * 눈금 — **양성과 음성을 같은 자리에** 둔다. 양성만 대면 「걸리는가」만 재고
 * 「멀쩡한 것을 걸지는 않는가」는 구조적으로 0이 된다(18 §2-6·§6.5).
 * 양성 셋은 리드가 씨앗 7 에서 뽑은 **실제 지면 그대로**다.
 */
export const CALIBRATION: readonly {
  content: string;
  answer?: string;
  rules: readonly string[];
  why: string;
}[] = [
  {
    content:
      "남학생 수와 여학생 수의 비가 $2:2$인 모둠에서 남학생이 $6$명이다. 이 모둠의 전체 학생 수를 구하시오.",
    answer: "$12$명",
    rules: ["비의 두 항이 같다"],
    why: "리드 실측 1-1|일차방정식의 활용|23",
  },
  {
    content:
      "서로 맞물린 두 톱니바퀴 $\\mathrm{A}$, $\\mathrm{B}$의 톱니 수는 각각 $10$개, $10$개이다. $\\mathrm{A}$가 $120$바퀴 도는 동안 $\\mathrm{B}$가 도는 바퀴 수를 구하시오.",
    answer: "$120$바퀴",
    rules: ["각각 뒤 두 값이 같다", "답이 발문에 그대로 있다"],
    why: "리드 실측 1-1|일차방정식의 활용|30",
  },
  {
    content:
      "어떤 일을 완성하는 데 $\\mathrm{A}$는 $14$일, $\\mathrm{B}$는 $14$일이 걸린다. 이 일을 $\\mathrm{A}$가 혼자 $4$일 동안 한 뒤 나머지를 두 사람이 함께 하여 완성하였다. 두 사람이 함께 한 날수를 구하시오.",
    answer: "$5$일",
    rules: ["나란한 두 자리의 값이 같다"],
    why: "리드 실측 1-1|일차방정식의 활용|59",
  },
  {
    content:
      "한 사람은 분속 $60\\,\\mathrm{m}$로, 다른 사람은 분속 $60\\,\\mathrm{m}$로 걸을 때, 두 사람은 출발한 지 몇 분 후에 처음으로 다시 만나는지 구하시오.",
    rules: ["나란한 두 자리의 값이 같다"],
    why: "두 사람의 속력이 같다 — 수식 안 단위 + 생략",
  },
  {
    content:
      "예산의 $25\\%$를 교재비로, 전체 예산의 $25\\%$를 준비물비로 사용하였더니 $450$원이 남았다. 처음 예산을 구하시오.",
    rules: ["나란한 두 자리의 값이 같다"],
    why: "술어가 생략된 첫 자리 뒤에 조사로 끝나는 낱말 하나",
  },
  {
    content:
      "어떤 수 $x$의 $9$배에서 $11$을 뺀 수는 $x$의 $9$배와 같다. 이를 등식으로 나타내시오.",
    rules: ["나란한 두 자리의 값이 같다"],
    why: "같은 것의 같은 속성 — 해가 없는 등식",
  },
  {
    content:
      "$6\\%$의 소금물과 $6\\%$의 소금물을 섞어서 $6\\%$의 소금물 $300\\,\\mathrm{g}$을 만들려고 한다.",
    rules: ["와/과로 이은 두 값이 같다"],
    why: "농도가 같은 두 소금물",
  },
  {
    content:
      "두 상자 $\\mathrm{A}$, $\\mathrm{B}$에 들어 있는 공의 수의 비가 $2:4$이다. $\\mathrm{A}$ 상자에 공을 $18$개 더 넣었더니 두 상자의 공의 수가 같아졌다. 처음 $\\mathrm{A}$ 상자에 있던 공의 수를 구하시오.",
    answer: "$18$개",
    rules: ["비가 기약이 아니다", "답이 발문에 그대로 있다"],
    why: "b=2a 면 더 넣은 수가 곧 답이다",
  },
  {
    content:
      "가로의 길이가 $x+3$ cm, 세로의 길이가 $x+3$ cm인 직사각형의 둘레의 길이를 $x$를 사용한 식으로 나타내시오.",
    rules: ["나란한 두 자리의 값이 같다"],
    why: "가로와 세로가 같은 식 — 수식 밖 로마자 단위",
  },
  {
    content:
      "정다각형의 한 내각의 크기와 한 외각의 크기의 비가 $42:6$일 때, 이 정다각형의 변의 개수를 구하시오.",
    rules: ["비가 기약이 아니다"],
    why: "중1 밖(1-2 다각형 20) 실제 지면 — 교과서는 $7:1$ 로 준다",
  },
  {
    content:
      "다음 달부터 매달 형은 $3000$원씩, 동생은 $3000$원씩 예금한다면 형의 예금액이 동생의 예금액의 $2$배가 되는 것은 몇 개월 후인지 구하시오.",
    rules: ["나란한 두 자리의 값이 같다"],
    why: "한글 이름 주제어 「형은 …, 동생은 …」 — 앞 낱말은 달라도 은/는 으로 맞선다",
  },
  // ── 음성 — 같은 값이 두 번 나와도 결함이 아니다 ──
  {
    content:
      "밑면인 원의 반지름의 길이가 $9$ cm, 높이가 $9$ cm인 원뿔 모양의 빈 그릇이 있다.",
    rules: [],
    why: "반지름과 높이는 다른 속성 — 앞 두 글자 「가 」만 같다",
  },
  {
    content:
      "소금물 $\\mathrm{A}$를 $300\\,\\mathrm{g}$, 소금물 $\\mathrm{B}$를 $150\\,\\mathrm{g}$ 섞으면 $12\\%$의 소금물이 되고, 소금물 $\\mathrm{A}$를 $150\\,\\mathrm{g}$, 소금물 $\\mathrm{B}$를 $300\\,\\mathrm{g}$ 섞으면 $9\\%$의 소금물이 된다.",
    rules: [],
    why: "두 $300\\,\\mathrm{g}$ 은 이웃한 자리가 아니다 — 서로 다른 경우",
  },
  {
    content:
      "수직선 위에서 두 수 $a$, $b$를 나타내는 두 점 사이의 거리가 $6$이고, 두 점으로부터 같은 거리에 있는 점이 나타내는 수가 $6$이다. 두 수 중 큰 수를 구하시오.",
    answer: "$9$",
    rules: [],
    why: "「$6$이고」·「$6$이다」의 「이」는 단위가 아니다 — 거리와 좌표는 다른 양",
  },
  {
    content:
      "어느 박물관의 입장객 수를 전날과 비교하여 나타내면 목요일 $+200$명, 금요일 $+150$명, 토요일 $+150$명, 일요일 $-300$명이다.",
    rules: [],
    why: "넷을 늘어놓은 자료 — 두 요일의 증감이 같아도 된다",
  },
  {
    content:
      "직육면체의 한 꼭짓점에 모인 세 모서리의 길이가 각각 $12\\,\\mathrm{cm}$, $12\\,\\mathrm{cm}$, $8\\,\\mathrm{cm}$이다.",
    rules: [],
    why: "「각각」 뒤 셋 — 자료 목록",
  },
  {
    content:
      "어떤 구의 겉넓이와 부피의 비가 $1:1$일 때, 이 구의 반지름의 길이를 구하시오.",
    rules: [],
    why: "$1:1$ 은 옳은 비다",
  },
  {
    content:
      "원 O의 둘레 위의 세 점 A, B, C에 대하여 호 AB, 호 BC, 호 CA의 길이의 비가 $2:2:5$이다.",
    rules: [],
    why: "세 항 비의 두 항이 같은 것은 이등변 꼴 — 기약이면 조용하다",
  },
  {
    content:
      "작년 어느 중학교의 전체 학생 수는 $620$명이었다. 올해는 작년보다 남학생이 $10\\%$ 늘고 여학생이 $10\\%$ 줄어서 전체 학생 수가 $22$명 늘었다. 작년 남학생 수를 구하시오.",
    answer: "$300$명",
    rules: [],
    why: "늘고 / 줄어서 — 역할이 다르다",
  },
  {
    content:
      "학생들에게 공책을 나누어 주려고 한다. 한 학생에게 $3$권씩 나누어 주면 $4$권이 남고, $5$권씩 나누어 주면 $4$권이 부족하다. 학생 수를 구하시오.",
    answer: "$4$명",
    rules: [],
    why: "남고 / 부족하다 — 역할이 다르다. 답 $4$명은 단위가 달라 발문의 $4$권과 안 겹친다",
  },
  {
    content:
      "어떤 수에 $4$를 곱한 후 $4$를 더한 수는 어떤 수의 $2$배보다 $14$만큼 크다고 한다. 어떤 수를 구하시오.",
    answer: "$5$",
    rules: [],
    why: "곱한 후 / 더한 — 앞 두 글자가 다르다",
  },
  {
    content:
      "어떤 제품의 생산량이 첫 달에는 $25\\%$ 증가하고 다음 달에는 $25\\%$ 감소하여 $750$개가 되었다. 증가하기 전 생산량을 구하시오.",
    answer: "$800$개",
    rules: [],
    why: "증가하고 / 감소하여",
  },
  {
    content:
      "$15\\%$의 소금물과 $6\\%$의 소금물을 섞어서 $12\\%$의 소금물 $300\\,\\mathrm{g}$을 만들려고 한다. $15\\%$의 소금물은 몇 $\\mathrm{g}$ 섞어야 하는지 구하시오.",
    answer: "$200\\,\\mathrm{g}$",
    rules: [],
    why: "같은 소금물을 다시 가리키는 $15\\%$ 는 이은 짝이 아니다",
  },
  {
    content:
      "현재 형의 예금액은 $1000$원, 동생의 예금액은 $11000$원이다. 다음 달부터 매달 형은 $5000$원씩, 동생은 $1000$원씩 예금한다면 형의 예금액이 동생의 예금액의 $2$배가 되는 것은 몇 개월 후인지 구하시오.",
    answer: "$4$개월 후",
    rules: [],
    why: "문장이 다르다 — 잔액 $1000$원과 적립액 $1000$원은 나란한 짝이 아니다",
  },
  {
    content:
      "다음 수 중에서 등식 $6x+7=43$을 참이 되게 하는 수를 구하시오.\n$6$, $10$, $3$, $8$, $11$",
    answer: "$6$",
    rules: [],
    why: "목록 줄 — 답이 보기에 있는 것이 문제의 뜻이다",
  },
  {
    content:
      "점 $\\mathrm{P}(a, b)$가 제$2$사분면 위의 점일 때, 점 $\\mathrm{Q}(ab, b-a)$는 제 몇 사분면 위의 점인지 구하시오.",
    answer: "제$2$사분면",
    rules: [],
    why: "서수 — 답이 같은 사분면인 것은 퇴화가 아니다",
  },
  {
    content:
      "집에서 공원까지 시속 $6\\,\\mathrm{km}$로 걸어서 갔다가 같은 길로 돌아오는 데 모두 $2$시간이 걸렸다. 집에서 공원까지의 거리를 구하시오.",
    answer: "$6\\,\\mathrm{km}$",
    rules: [],
    why: "속력 $6\\,\\mathrm{km}$ 와 거리 $6\\,\\mathrm{km}$ 는 다른 양이다",
  },
  {
    content:
      "서로 맞물린 두 톱니바퀴 $\\mathrm{A}$, $\\mathrm{B}$의 톱니 수는 각각 $20$개, $30$개이다. $\\mathrm{A}$가 $90$바퀴 도는 동안 $\\mathrm{B}$가 도는 바퀴 수를 구하시오.",
    answer: "$60$바퀴",
    rules: [],
    why: "같은 틀에서 값이 다르면 조용하다",
  },
];

/** 눈금이 맞는가 — 어긋난 것의 설명 목록(비면 맞다). */
export function calibrationMisses(): string[] {
  const misses: string[] = [];
  for (const c of CALIBRATION) {
    const got = [
      ...new Set(degenerateFindings(c.content, c.answer).map((f) => f.rule)),
    ].sort();
    const want = [...c.rules].sort();
    if (got.join("|") !== want.join("|")) {
      misses.push(
        `${c.why}: 기대 [${want.join(", ")}] · 실제 [${got.join(", ")}]`,
      );
    }
  }
  return misses;
}

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): void {
  const misses = calibrationMisses();
  console.log(`눈금 ${CALIBRATION.length}건`);
  for (const m of misses) console.log(`❌ ${m}`);
  if (misses.length) {
    console.log("🔴 눈금이 안 맞는다 — 판정을 믿을 수 없다");
    process.exitCode = 1;
    return;
  }
  console.log("✅ 눈금 맞음");
  if (process.argv.includes("--selftest")) return;

  const seeds = Number(argValue("--seeds") ?? 300);
  const grade = argValue("--grade");
  const prefix = argValue("--prefix");
  const mod = argValue("--module"); // m1core · rest
  const smells = process.argv.includes("--smells");
  const types = registeredTypes().filter(
    (t) =>
      (!grade || t.grade === grade) &&
      (!prefix || t.key.startsWith(prefix)) &&
      (mod !== "m1core" || M1_CORE_KEYS.has(t.key)) &&
      (mod !== "rest" || !M1_CORE_KEYS.has(t.key)),
  );

  const rows: {
    key: string;
    title: string;
    byRule: Map<string, number>;
    samples: Map<string, string>;
  }[] = [];
  for (const t of types) {
    const byRule = new Map<string, number>();
    const samples = new Map<string, string>();
    for (let s = 0; s < seeds; s += 1) {
      const p = generateMiddleProblem(t.key, s * 7919 + 17, 0);
      const rules = new Set<string>();
      const found = degenerateFindings(p.content, p.answer);
      if (smells) {
        for (const [field, text] of [
          ["발문", p.content],
          ["정답", p.answer],
          ["해설", p.solution],
        ] as const) {
          for (const s of pageSmells(text)) {
            found.push({ rule: `냄새 ${field}: ${s}`, detail: "" });
          }
          for (const j of josaMismatches(text)) {
            found.push({ rule: `조사 ${field}`, detail: j });
          }
        }
      }
      for (const f of found) {
        rules.add(f.rule);
        if (!samples.has(f.rule)) {
          samples.set(
            f.rule,
            `${f.detail} :: ${p.content.replace(/\n/g, " ⏎ ").slice(0, 180)}`,
          );
        }
      }
      for (const r of rules) byRule.set(r, (byRule.get(r) ?? 0) + 1);
    }
    if (byRule.size)
      rows.push({ key: t.key, title: t.rpmTitle, byRule, samples });
  }

  const totals = new Map<string, number>();
  for (const r of rows) {
    for (const [rule] of r.byRule)
      totals.set(rule, (totals.get(rule) ?? 0) + 1);
  }
  console.log(
    `\n유형 ${types.length} × 씨앗 ${seeds} — 퇴화가 난 유형 ${rows.length}`,
  );
  for (const [rule, n] of totals) console.log(`   ${rule}: ${n}유형`);
  process.exitCode = rows.length ? 1 : 0;
  // `--tsv` 는 보고서 표를 만들 때 쓴다 — 유형·규칙·건수·비율 한 줄씩.
  if (process.argv.includes("--tsv")) {
    console.log("\n유형\t제목\t규칙\t건수\t비율");
    for (const r of rows) {
      for (const [rule, n] of r.byRule) {
        console.log(
          `${r.key}\t${r.title}\t${rule}\t${n}\t${((100 * n) / seeds).toFixed(1)}%`,
        );
      }
    }
    return;
  }
  for (const r of rows.sort((a, b) => a.key.localeCompare(b.key))) {
    console.log(`\n■ ${r.key} ${r.title}`);
    for (const [rule, n] of r.byRule) {
      console.log(
        `   ${String(n).padStart(4)}/${seeds} (${((100 * n) / seeds).toFixed(1)}%) ${rule}`,
      );
      console.log(`        예: ${r.samples.get(rule)}`);
    }
  }
}

// 시험이 판정 함수만 가져다 쓸 때는 돌지 않는다.
if (
  process.argv[1]?.replace(/\\/g, "/").endsWith("census-middle-degenerate.ts")
) {
  main();
}
