/**
 * 중2 **확대 갈래 5차 물결 `m2Top5d`**(`src/lib/middle/m2Top5d.ts`) — 넷을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다**(2026-08-18 「지표의 «참»이
 * 제품에서 나오면 제품이 틀릴수록 좋은 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `113X` | 「점 $D$ 에서 두 변까지의 거리가 같다」(RHA 합동)로 두 조각의 **높이를 하나로 묶고**, 두 넓이의 합이 전체와 같다는 데서 그 높이를 얻는다 | 높이를 **한 번도 안 쓴다** — 각의 이등분선 정리로 $\overline{BD}:\overline{DC}=c:b$ 를 얻어 **밑변**을 나누고, $\angle C=90^\circ$ 이므로 $\overline{BC}$ 를 밑변으로 볼 때 높이가 $\overline{AC}$ 라는 것만 쓴다. 그리고 좌표로 점 $D$ 를 실제로 찍어 **신발끈 공식**으로 넓이를 한 번 더 잰다(부동소수) |
 * | `114X` | 배수의 개수를 나눗셈으로 세고 겹침을 최소공배수로 되돌린다 | 나눗셈도 최소공배수도 **안 쓴다** — $1$ 부터 $N$ 까지를 **하나씩 훑어** 두 나머지를 직접 본다 |
 * | `115X` | $M=c-bd$ 의 **약수**를 늘어놓고 $x=M/t$ 를 걸러 낸다 | 약수를 **안 쓴다** — $a$ 를 $1$ 부터 $b+M$ 까지 **전부 넣어** 연립방정식을 실제로 풀고 $x$, $y$ 가 자연수인지 본다 |
 * | `116X` | $180$ 의 **약수** 목록에서 창으로 거른다 | 약수를 **안 쓴다** — $t$ 를 $1$ 부터 $179$ 까지 훑으며 「$\angle A=180-t$ 가 $t$ 의 자연수 배인가」를 곱셈으로 확인한다 |
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면 재현율만
 * 재고 지어냄은 구조적으로 0이 된다(2026-08-20).
 *
 * ⚠️ 눈금 지면은 **문자열 픽스처**다. 엔진 산출물을 그때그때 불러 쓰면 엔진을 고치는
 *    순간 양성이 사라져 재현율을 영영 못 잰다(2026-08-23).
 *
 * ## ⑶ 앞 물결이 흘린 자리를 여기서 어떻게 잡나
 *
 *   ㄱ. **해설의 모든 산술 등식**(`35+15-5=45` 꼴)을 뽑아 좌·우를 각각 계산해 맞댄다.
 *       `\div` 도 센다 — `113X` 가 약분 전 분수를 피하려고 나눗셈으로 적기 때문이다.
 *   ㄴ. **기약** — 지면의 모든 `\dfrac{수}{수}` 가 기약이고 분모가 $1$ 이 아니다.
 *   ㄷ. **거르는 걸음** — 「버린다」가 실제로 무엇을 버렸고, 그것이 남긴 것과 겹치지
 *       않으며, 둘을 합치면 후보 전부가 되는가(㉯ 의 이 물결 판).
 *   ㄹ. **해설의 «말»** — 굳힘을 진술하는 낱말을 뒤집으면 빨개진다(㉳).
 *   ㅁ. **해설 높이** — 제품 `estimateSolutionPx` 로 **800판**을 재어 700px 아래로 잠근다.
 *   ㅂ. **선언한 제약을 스스로 어기지 않는다**(㉴) — `115X` 의 $1\le x\le d-1$,
 *       `116X` 의 $t\le90$ 과 창.
 *   ㅅ. 그리고 그 검산들이 **무언가를 실제로 봤는지** 센다 — 0 은 «깨끗»과 «못 셈»을
 *       안 가른다(2026-08-21).
 *
 * ## ⑷ 이 시험이 **못 보는 것** — 정직하게
 *
 * 1. 🔴 **공용 훑개의 「정수 경계 걸음」 축이 이 넷을 못 본다.**
 *    `probe-middle-extending-tiers.boundStepFaults` 는 부등식에서 정수로 뛰는 자리를
 *    찾는데, 이 물결의 거르기는 **약수 목록** 위에서 일어나 경계가 애초에 정수다.
 *    그 자에게 이 넷의 「$0$ 건」은 «깨끗»이 아니라 **«잴 것이 없다»** 다. 대신 여기서
 *    ㄷ(거르는 걸음)을 잰다.
 * 2. 「해설이 학생에게 충분한가」는 여기서 못 잰다. 줄 수·중간값의 **참·거짓**은 재지만
 *    설명이 실제로 이해되는지는 사람이 읽어야 안다. 이 회차의 해설은 표본으로 눈으로
 *    읽었고, 그때 고친 자리(`115X` 의 「$a-3$**는**」→「$a-3$**은**」 · `116X` 의
 *    「$5$ 이하인 약수는 모두 $5$ 이하」라는 **동어반복 문장**)를 아래 회귀 잠금에 남긴다.
 * 3. **`generate.ts` 등록은 리드의 몫**이라 이 파일이 쓰일 때 아직 등록 전일 수 있다.
 *    기본 경로는 `entry.handler` 를 직접 부르고, 등록되면 「등록되면 …」 검사가
 *    살아난다(등록 전에는 **그 사실을 스스로 찍는다**).
 * 4. `113X` 의 좌표 검산은 **부동소수**라 「값이 같다」를 $10^{-9}$ 까지만 본다. 정확한
 *    같음은 각의 이등분선 정리 쪽(유리수)이 맡는다 — 두 길이 서로를 검산한다.
 * 5. 🔴 **소단원 «평행사변형» 이름 문제는 여기서 못 정한다.** 리드가 준 이름이 우리
 *    `Unit.section` 에 없어서 `평행사변형의 성질` 을 골랐다(모듈 머리말 ⑵). 이 시험은
 *    「고른 이름이 단원 정본에 있다」와 「그 소단원에 확대 갈래가 우리 것뿐이다」까지만
 *    잠근다 — **다른 갈래가 같은 이름을 받았는지는 리드만 안다.**
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { createRng } from "@/lib/elementary/rng";
import { bareNumbers } from "@/lib/elementary/rules";
import { declaredUpperBound } from "@/lib/engine/deriveFormats";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "@/lib/middle/generate";
import {
  bisectorFootDistance,
  bisectorPieceArea,
  divisors,
  fracTex,
  looksLikeShortcut,
  M2_TOP_5D,
  naturalSolutionCoefficients,
  notMultipleCount,
  possibleOppositeAngles,
  reduceFraction,
  rightTriples,
  shortcutValues,
} from "@/lib/middle/m2Top5d";
import { tidySolution } from "@/lib/middle/solutionText";
import { resolveMiddleTier } from "@/lib/middle/tier";
import { assertChooseAllAnswerCount } from "@/lib/problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "@/lib/problem/choiceCountRule";
import { wrapDanClause } from "@/lib/problemText";
import type { MidProblem, TypeEntry } from "@/lib/middle/types";
import { estimateSolutionPx } from "@/lib/printOverflow";

import { josaMismatches, pageSmells } from "../helpers/midPage";
import {
  catalogTypesOfMinor,
  extensionNumberReason,
  isCatalogType,
} from "../helpers/rpmCatalog";

/** 브리프가 요구한 최소 표본 200 을 넘긴다. */
const SAMPLE = 240;
/** 해설 높이·정답 쏠림은 **800판**으로 잰다(브리프의 600판 이상). */
const WIDE = 800;
const BASE_SEED = 20260906;
/** 🔴 쏠림은 **씨앗 블록 여럿**으로 잰다 — 한 블록만 보면 여유를 낙관적으로 적는다. */
const SEED_BLOCKS = [20260906, 900000, 123456, 5550000];
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260906, 13, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];

/** 리드가 준 소단원별 변형 폭 하한. 이 수만큼 **서로 다른** 변형이 나와야 한다. */
const VARIANT_FLOOR: Record<string, number> = {
  "113X": 6,
  "114X": 12,
  "115X": 12,
  "116X": 12,
};

/** 유형은 **번호로** 집는다 — 중단원 이름을 손으로 적으면 조용히 안 잡힌다. */
function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_5D.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E113 = entryOf("113X");
const E114 = entryOf("114X");
const E115 = entryOf("115X");
const E116 = entryOf("116X");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "113X": "심화중",
  "114X": "심화중",
  "115X": "심화상",
  "116X": "심화상",
};

/** 유형이 붙는 소단원 — 손으로 못 박고, 아래에서 **단원 정본에 대조**한다. */
const EXPECTED_SECTION: Record<string, string> = {
  "113X": "직각삼각형의 합동",
  "114X": "경우의 수",
  "115X": "연립방정식의 풀이",
  "116X": "평행사변형의 성질",
};

/**
 * 🔴 **이 넷의 소단원에 «이미» 있던 확대 갈래.** 브리프는 「아직 확대 갈래가 없는
 * 소단원」이라 했지만 `경우의 수` 에는 1차 물결의 심화상이 이미 있다 — 실측이다.
 * 여기 적어 두어야 「우리 것뿐인가」 검사가 **거짓 경보 없이** 설 수 있고, 나중에
 * 누가 또 얹으면 그때 빨개진다.
 */
const PREEXISTING_TOP: readonly string[] = ["2-2|경우의 수|91"];

// ── 소품 ────────────────────────────────────────────────────

function rows(entry: TypeEntry, n = SAMPLE, base = BASE_SEED): MidProblem[] {
  const out: MidProblem[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(entry.handler(createRng(base + i * 7919)));
  }
  return out;
}

const registeredKeys = new Set(registeredTypes().map((e) => e.key));

/** 등록되기 전에는 빈 배열 — 그 사실을 검사가 스스로 찍는다. */
function productRows(entry: TypeEntry): MidProblem[] {
  if (!registeredKeys.has(entry.key)) return [];
  const out: MidProblem[] = [];
  for (const s of PRODUCT_SEEDS) {
    for (const v of PRODUCT_VARIANTS)
      out.push(generateMiddleProblem(entry.key, s, v));
  }
  return out;
}

/** 파싱이 안 되면 **던진다** — 조용히 통과시키면 그 유형은 분모 밖이 된다. */
function grab(re: RegExp, text: string, who: string): string[] {
  const m = re.exec(text);
  if (m === null) throw new Error(`${who}: 지면 모양이 다르다 — ${text}`);
  return m.slice(1);
}

const num = (s: string | undefined): number => Number(s);

/** 답 문자열에서 `$` 만 걷어 낸 것 — 검산기가 이 꼴로 답을 다시 짓는다. */
function plainAnswer(answer: string): string {
  return answer.replace(/\$/g, "");
}

function gcd2(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** 검산기가 답을 다시 지을 때 쓰는 꼴 — 제품 `fracTex` 를 안 부른다(동어반복 금지). */
function fracLocal(n: number, d: number): string {
  const g = gcd2(n, d) || 1;
  const rn = n / g;
  const rd = d / g;
  return rd === 1 ? `${rn}` : `\\dfrac{${rn}}{${rd}}`;
}

/**
 * 🔴 **「(으)로」가 맞는가** — `josaMismatches` 가 **구조적으로 못 보는 축**이다.
 * 그 자는 을/를·은/는·와/과·가만 본다. 「(으)로」는 받침 **유무**가 아니라 **ㄹ 받침
 * 인가**로 갈린다.
 *
 * ⚠️ 규칙은 제품(`m2Josa.euroRo`)에서 **가져오지 않는다** — 그러면 동어반복이다.
 */
function euroRoMismatches(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\$[^$]*?(\d+)\$(으로|로)/g)) {
    const d = Number(m[1]) % 10;
    const want = d === 0 || d === 3 || d === 6 ? "으로" : "로";
    if (m[2] !== want) out.push(`$…${m[1]}$${m[2]} → ${want}`);
  }
  return out;
}

/**
 * **지면을 제품 렌더러로 실제로 그려 본다** — 붉거나 중립 폴백이면 참.
 * 판정을 명령 목록으로 하지 않고 **화면과 같은 방식으로 렌더해서** 한다(2026-08-18).
 */
function brokenRender(text: string): boolean {
  const html = renderMathHtml(text);
  return (
    html.includes("katex-error") ||
    html.includes("#cc0000") ||
    html.includes("math-raw")
  );
}

// ── ㄱ. 해설의 **모든 산술 등식**을 뽑아 좌·우를 각각 계산한다 ──

/**
 * `35+15-5` · `672\div98` 처럼 정수와 `+`·`-`·`\times`·`\div` 만으로 된 식의 값.
 * 곱·나눗셈이 먼저이고 그 안에서는 왼쪽부터다.
 */
function evalChain(src: string): number {
  const terms = src.match(
    /^-?\d+(?:(?:\\times|\\div)\d+)*|[+-]\d+(?:(?:\\times|\\div)\d+)*/g,
  );
  if (terms === null) return NaN;
  let total = 0;
  for (const term of terms) {
    const parts = term.split(/(\\times|\\div)/);
    let v = Number(parts[0]);
    for (let k = 1; k < parts.length; k += 2) {
      const rhs = Number(parts[k + 1]);
      v = parts[k] === "\\times" ? v * rhs : v / rhs;
    }
    total += v;
  }
  return total;
}

const CHAIN_EQ =
  /(?<![\w}\\])(-?\d+(?:(?:\+|-|\\times|\\div)\d+)+)=(-?\d+)(?![\w\d])/g;

/** 해설에 적힌 산술 등식 가운데 **좌변과 우변이 다른** 것. */
function arithmeticFaults(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(CHAIN_EQ)) {
    const left = evalChain(m[1]!);
    const right = Number(m[2]);
    if (!Number.isFinite(left) || left !== right)
      out.push(`${m[1]}=${m[2]} (좌변은 ${left})`);
  }
  return out;
}

/** 이 자가 **몇 개를 실제로 봤는가** — 0 이면 «깨끗»이 아니라 «못 셈»이다. */
function arithmeticClaims(text: string): number {
  return [...text.matchAll(CHAIN_EQ)].length;
}

// ── ㄴ. 기약 ────────────────────────────────────────────────

const FRAC_RE = /\\d?frac\{(\d+)\}\{(\d+)\}/g;

/** 지면의 `\dfrac{수}{수}` 가운데 **기약이 아니거나 분모가 $1$** 인 것. */
function badFractions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(FRAC_RE)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (b === 1) out.push(`${a}/${b} (분모가 1)`);
    else if (gcd2(a, b) !== 1) out.push(`${a}/${b}`);
  }
  return out;
}

/** 이 자가 **몇 개를 봤는가**. */
function fractionCount(text: string): number {
  return [...text.matchAll(FRAC_RE)].length;
}

// ── ㄹ. 해설의 «말» (㉳) ────────────────────────────────────

type WordRule = { anchor: string; needs: readonly string[] };

/**
 * 🔴 **굳힘을 진술하는 줄의 낱말**을 읽는다. 4차 물결에서 중1 10줄·중2 3줄이
 * 무방비였던 자리다 — 「약수」를 「배수」로 바꿔도 92개 시험이 전부 초록이었다.
 */
const WORD_RULES: Record<string, readonly WordRule[]> = {
  "113X": [
    {
      anchor: "서로 합동이다",
      needs: [
        "두 직각삼각형",
        "빗변 $AD$는 공통",
        "\\angle CAD=\\angle EAD",
        "한 예각의 크기",
        // 🔴 이 소단원의 이름이 「직각삼각형의 합동」이다 — 어떤 합동 조건인지를
        //    지면이 말해야 한다. 「합동이다」만 있으면 그 굳힘이 지면에 안 적힌다.
        "RHA 합동",
      ],
    },
    {
      anchor: "대응하는 변의 길이는 같으므로",
      needs: [
        "합동인 두 삼각형",
        "\\overline{DE}=\\overline{DC}",
        "거리가 같다",
      ],
    },
    { anchor: "두 조각의 넓이의 합은", needs: ["삼각형 $ABC$의 넓이와 같고"] },
  ],
  "114X": [
    {
      // 🔴 앵커를 「공배수」로만 두면 「공배수」→「공약수」 변이를 **못 잡는다** —
      //    같은 줄의 「최소공배수」가 그 낱말을 품고 있어 앵커가 그대로 걸린다.
      //    그래서 «그 자리의 말»을 통째로 요구한다(변이 시험이 찾아 준 자리다).
      anchor: "공배수",
      needs: ["의 공배수이고", "최소공배수", "두 번 세었다", "배수이면서"],
    },
    { anchor: "또는", needs: ["배수 또는"] },
    { anchor: "따라서", needs: ["배수도 아닌 경우의 수"] },
  ],
  "115X": [
    { anchor: "모두 자연수이므로", needs: ["이상", "이하의 자연수이다"] },
    { anchor: "약수이고", needs: ["양수이므로", "의 약수이고"] },
    { anchor: "버린다", needs: ["보다 큰", "자연수가 되지 않으므로", "남는"] },
  ],
  "116X": [
    { anchor: "이웃하는 두 내각", needs: ["크기의 합은 $180^\\circ$"] },
    { anchor: "약수이면서", needs: ["$k$가 자연수이므로", "$90$ 이하이다"] },
    {
      anchor: "그것들은 모두 버린다",
      needs: ["작은 것부터", "앞에 있는 약수", "뒤에 있는 약수"],
    },
  ],
};

function wordFaults(rpmType: string, solution: string): string[] {
  const out: string[] = [];
  for (const rule of WORD_RULES[rpmType]!) {
    const line = solution.split("\n").find((l) => l.includes(rule.anchor));
    if (line === undefined) {
      out.push(`「${rule.anchor}」가 든 줄이 없다`);
      continue;
    }
    for (const need of rule.needs)
      if (!line.includes(need))
        out.push(`「${rule.anchor}」 줄에 「${need}」가 없다`);
  }
  if (solution.includes("그 중")) out.push("「그중」을 띄어 썼다");
  return out;
}

/** 이 자가 **몇 개를 실제로 물어봤는가**. */
function wordClaims(rpmType: string): number {
  return WORD_RULES[rpmType]!.reduce((s, r) => s + 1 + r.needs.length, 0);
}

// ── 소품: 지면에서 수 목록 읽기 ─────────────────────────────

/** `$1$, $2$, $4$` 를 `[1,2,4]` 로. 없으면 빈 배열. */
function numsAfter(line: string, marker: string): number[] {
  const at = line.indexOf(marker);
  if (at < 0) return [];
  // 앵커 **바로 뒤**에서만 이어 읽는다 — 목록이 끊기면 거기서 멈춘다.
  // 그래야 한 줄에 목록이 둘 있을 때(약수 목록 ↔ $x$ 목록) 서로 섞이지 않는다.
  let rest = line.slice(at + marker.length);
  const out: number[] = [];
  for (;;) {
    const m = /^\$(\d+)\$/.exec(rest);
    if (m === null) break;
    out.push(Number(m[1]));
    rest = rest.slice(m[0].length);
    if (rest.startsWith(", ")) rest = rest.slice(2);
    else break;
  }
  return out;
}

/** 해설에서 그 조각이 든 줄. 없으면 던진다 — 조용히 건너뛰면 분모 밖이 된다. */
function lineWith(solution: string, needle: string, who: string): string {
  const hit = solution.split("\n").find((l) => l.includes(needle));
  if (hit === undefined)
    throw new Error(`${who}: 「${needle}」가 든 줄이 없다 — ${solution}`);
  return hit;
}

/** `$...$` 안에 적힌 정수 전부. */
function mathIntegers(text: string): number[] {
  const out: number[] = [];
  for (const span of text.matchAll(/\$([^$]*)\$/g)) {
    for (const n of span[1]!.matchAll(/\d+/g)) out.push(Number(n[0]));
  }
  return out;
}

// ── 113X 소품 — **각의 이등분선 정리 + 좌표**로 다시 푼다 ────

/**
 * $\angle C=90^\circ$, $\overline{AC}=b$, $\overline{BC}=a$, $\overline{AB}=c$ 에서
 * $\angle A$ 의 이등분선이 $\overline{BC}$ 를 나누는 두 조각의 넓이 — **유리수**.
 *
 * 각의 이등분선 정리로 $\overline{BD}:\overline{DC}=c:b$ 이므로
 * $\overline{BD}=\dfrac{ac}{b+c}$, $\overline{DC}=\dfrac{ab}{b+c}$ 이고,
 * $\overline{BC}$ 를 밑변으로 보면 두 조각의 높이가 **둘 다** $\overline{AC}=b$ 다.
 * 제품이 쓰는 「점 $D$ 에서 두 변까지의 거리」는 **한 번도 안 쓴다.**
 */
function pieceAreaByBisectorTheorem(
  a: number,
  b: number,
  c: number,
  piece: "ABD" | "ACD",
): [number, number] {
  if (a * a + b * b !== c * c)
    throw new Error(`직각삼각형이 아니다: ${a}, ${b}, ${c}`);
  const segment = piece === "ABD" ? a * c : a * b; // 분모 b+c 를 뒤로 미룬다
  const n = segment * b;
  const d = 2 * (b + c);
  const g = gcd2(n, d) || 1;
  return [n / g, d / g];
}

/** 좌표로 점 $D$ 를 실제로 찍어 **신발끈 공식**으로 잰 넓이 — 부동소수. */
function pieceAreaByCoordinates(
  a: number,
  b: number,
  c: number,
  piece: "ABD" | "ACD",
): number {
  const C = [0, 0] as const;
  const A = [0, b] as const;
  const B = [a, 0] as const;
  // $\angle A$ 의 이등분선 방향 = 두 단위벡터의 합.
  const u1 = [(C[0] - A[0]) / b, (C[1] - A[1]) / b] as const;
  const u2 = [(B[0] - A[0]) / c, (B[1] - A[1]) / c] as const;
  const dir = [u1[0] + u2[0], u1[1] + u2[1]] as const;
  const t = -A[1] / dir[1]; // $y=0$ 인 자리
  const D = [A[0] + t * dir[0], 0] as const;
  const tri = piece === "ABD" ? [A, B, D] : [A, C, D];
  const [P, Q, R] = tri as unknown as [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
  ];
  return (
    Math.abs(
      P[0] * (Q[1] - R[1]) + Q[0] * (R[1] - P[1]) + R[0] * (P[1] - Q[1]),
    ) / 2
  );
}

// ── VERIFY — 지면만 읽어 다시 푼다 ──────────────────────────

const VERIFY: Record<string, (content: string) => string> = {
  "113X": (content) => {
    const b = num(grab(/AC\}=(\d+)/, content, "113X AC")[0]);
    const a = num(grab(/BC\}=(\d+)/, content, "113X BC")[0]);
    const c = num(grab(/AB\}=(\d+)/, content, "113X AB")[0]);
    const piece = grab(
      /삼각형 \$(ABD|ACD)\$의 넓이/,
      content,
      "113X 조각",
    )[0] as "ABD" | "ACD";
    const [n, d] = pieceAreaByBisectorTheorem(a, b, c, piece);
    const byCoord = pieceAreaByCoordinates(a, b, c, piece);
    if (Math.abs(n / d - byCoord) > 1e-9)
      throw new Error(`113X 두 길이 어긋난다: ${n}/${d} vs ${byCoord}`);
    return `${fracLocal(n, d)}\\,\\mathrm{cm}^2`;
  },
  "114X": (content) => {
    const N = num(grab(/\$1\$부터 \$(\d+)\$까지/, content, "114X N")[0]);
    const [ps, qs] = grab(
      /\$(\d+)\$의 배수도 아니고 \$(\d+)\$의 배수도 아닌/,
      content,
      "114X p,q",
    );
    const p = num(ps);
    const q = num(qs);
    if (p === q) throw new Error("114X 두 수가 같다");
    // 나눗셈도 최소공배수도 쓰지 않는다 — 하나씩 훑는다.
    let count = 0;
    for (let i = 1; i <= N; i += 1) if (i % p !== 0 && i % q !== 0) count += 1;
    return `${count}`;
  },
  "115X": (content) => {
    const d = num(grab(/x\+y=(\d+)/, content, "115X d")[0]);
    const [bs, cs] = grab(/ax\+(\d+)y=(\d+)/, content, "115X b,c");
    const b = num(bs);
    const c = num(cs);
    const M = c - b * d;
    if (M <= 0) throw new Error("115X 상수가 양수가 아니다");
    // 약수를 안 쓴다 — $a$ 를 전부 넣어 실제로 푼다.
    let total = 0;
    for (let a = 1; a <= b + M; a += 1) {
      if (a === b) continue;
      const den = a - b;
      if (M % den !== 0) continue;
      const x = M / den;
      const y = d - x;
      if (x < 1 || y < 1) continue;
      if (a * x + b * y !== c) continue; // 실제로 두 식을 만족하는지 확인
      total += a;
    }
    return `${total}`;
  },
  "116X": (content) => {
    const [ls, hs] = grab(
      /\$t\$가 \$(\d+)\$보다 크고 \$(\d+)\$보다 작을 때/,
      content,
      "116X 창",
    );
    const low = num(ls);
    const high = num(hs);
    if (low >= high) throw new Error("116X 창이 뒤집혔다");
    // 약수를 안 쓴다 — $t$ 를 훑으며 «자연수 배인가»를 곱셈으로 확인한다.
    let total = 0;
    for (let t = 1; t <= 179; t += 1) {
      if (!(t > low && t < high)) continue;
      const rest = 180 - t;
      let ok = false;
      for (let k = 1; k * t <= 180; k += 1) if (k * t === rest) ok = true;
      if (ok) total += rest;
    }
    if (total === 0) throw new Error("116X 창 안에 가능한 각이 없다");
    return `${total}^\\circ`;
  },
};

// ═══════════════════════════════════════════════════════════
// ⑵ 눈금 — 이 자가 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

/** 엔진을 거치지 않은 **손으로 쓴 지면** — 양성(답을 안다) · 음성(던져야 한다). */
const GAUGE: Record<string, { good: string; goodAnswer: string; bad: string }> =
  {
    "113X": {
      good:
        "$\\angle C=90^\\circ$인 직각삼각형 $ABC$에서 $\\overline{AC}=6\\,\\mathrm{cm}$, " +
        "$\\overline{BC}=8\\,\\mathrm{cm}$, $\\overline{AB}=10\\,\\mathrm{cm}$이다. " +
        "$\\angle A$의 이등분선이 변 $BC$와 만나는 점을 $D$라 할 때, 삼각형 $ABD$의 넓이를 구하시오.",
      goodAnswer: "15\\,\\mathrm{cm}^2",
      bad:
        "$\\angle C=90^\\circ$인 직각삼각형 $ABC$에서 $\\overline{AC}=6\\,\\mathrm{cm}$, " +
        "$\\overline{BC}=8\\,\\mathrm{cm}$, $\\overline{AB}=11\\,\\mathrm{cm}$이다. " +
        "$\\angle A$의 이등분선이 변 $BC$와 만나는 점을 $D$라 할 때, 삼각형 $ABD$의 넓이를 구하시오.",
    },
    "114X": {
      good:
        "$1$부터 $30$까지의 자연수가 각각 하나씩 적힌 $30$장의 카드가 있다. " +
        "이 중에서 한 장을 뽑을 때, 카드에 적힌 수가 $2$의 배수도 아니고 $3$의 배수도 아닌 경우의 수를 구하시오.",
      goodAnswer: "10",
      bad:
        "$1$부터 $30$까지의 자연수가 각각 하나씩 적힌 $30$장의 카드가 있다. " +
        "이 중에서 한 장을 뽑을 때, 카드에 적힌 수가 $2$의 배수도 아니고 $2$의 배수도 아닌 경우의 수를 구하시오.",
    },
    "115X": {
      good:
        "연립방정식 $\\begin{cases}x+y=13\\\\ax+3y=103\\end{cases}$의 해 $x$, $y$가 " +
        "모두 자연수가 되도록 하는 자연수 $a$의 값을 모두 구하고, 그 값들의 합을 구하시오.",
      goodAnswer: "132",
      bad:
        "연립방정식 $\\begin{cases}x+y=13\\\\ax+3y=39\\end{cases}$의 해 $x$, $y$가 " +
        "모두 자연수가 되도록 하는 자연수 $a$의 값을 모두 구하고, 그 값들의 합을 구하시오.",
    },
    "116X": {
      good:
        "평행사변형 $ABCD$에서 $\\angle B$의 크기를 $t^\\circ$라 하면 $t$는 자연수이고, " +
        "$\\angle A$의 크기는 $\\angle B$의 크기의 자연수 배이다. " +
        "$t$가 $5$보다 크고 $12$보다 작을 때, $\\angle A$의 크기로 가능한 모든 값의 합을 구하시오.",
      goodAnswer: "515^\\circ",
      bad:
        "평행사변형 $ABCD$에서 $\\angle B$의 크기를 $t^\\circ$라 하면 $t$는 자연수이고, " +
        "$\\angle A$의 크기는 $\\angle B$의 크기의 자연수 배이다. " +
        "$t$가 $12$보다 크고 $5$보다 작을 때, $\\angle A$의 크기로 가능한 모든 값의 합을 구하시오.",
    },
  };

describe("중2 5차d 확대 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  for (const [rpmType, g] of Object.entries(GAUGE)) {
    it(`${rpmType} — 양성 지면에서 그 답을 내고, 음성 지면은 던진다`, () => {
      expect(VERIFY[rpmType]!(g.good)).toBe(g.goodAnswer);
      expect(() => VERIFY[rpmType]!(g.bad)).toThrow();
    });
  }

  it("🔴 눈금이 네 유형을 **모두** 덮는다 — 안 덮인 유형의 «0» 은 못 셈이다", () => {
    expect(Object.keys(GAUGE).sort()).toEqual(
      M2_TOP_5D.map((e) => e.rpmType).sort(),
    );
    expect(Object.keys(VERIFY).sort()).toEqual(
      M2_TOP_5D.map((e) => e.rpmType).sort(),
    );
    expect(Object.keys(WORD_RULES).sort()).toEqual(
      M2_TOP_5D.map((e) => e.rpmType).sort(),
    );
  });
});

// ═══════════════════════════════════════════════════════════
// 명부와 규약
// ═══════════════════════════════════════════════════════════

describe("중2 5차d 확대 갈래 — 명부와 규약", () => {
  it("🔴 유형은 정확히 넷이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_5D).toHaveLength(4);
    expect(M2_TOP_5D.map((e) => e.rpmType)).toEqual([
      "113X",
      "114X",
      "115X",
      "116X",
    ]);
    expect(new Set(M2_TOP_5D.map((e) => e.key)).size).toBe(4);
    for (const e of M2_TOP_5D) expect(e.grade).toBe("중2");
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인과 안 겹치고 제목은 새것이다)", () => {
    for (const e of M2_TOP_5D) {
      expect(extensionNumberReason(e), e.key).toBeNull();
      expect(isCatalogType(e), e.key).toBe(false);
      const titles = catalogTypesOfMinor(e.rpmBook, e.rpmMinor).map(
        (t) => t.title,
      );
      expect(titles, e.key).not.toContain(e.rpmTitle);
      expect(
        e.rpmType.endsWith("X"),
        `${e.key} 는 5차 접미사 X 여야 한다`,
      ).toBe(true);
    }
  });

  it("🔴 소단원·중단원 이름을 **정본에 대조**한다 — 손으로 옮겨 적은 것을 믿지 않는다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중2").map((u) => u.section),
    );
    for (const e of M2_TOP_5D) {
      expect(
        sections.has(e.unitSection),
        `${e.key} 소단원 ${e.unitSection}`,
      ).toBe(true);
      expect(e.unitSection).toBe(EXPECTED_SECTION[e.rpmType]);
      expect(
        catalogTypesOfMinor(e.rpmBook, e.rpmMinor).length,
        `${e.key} 중단원이 색인에 없다`,
      ).toBeGreaterThan(0);
    }
  });

  it("🔴 리드가 준 이름 «평행사변형» 은 우리 소단원이 **아니다** — 그래서 골라야 했다", () => {
    const mid2 = CURRICULUM_UNITS.filter((u) => u.grade === "중2").map(
      (u) => u.section,
    );
    expect(mid2).not.toContain("평행사변형");
    expect(mid2).toContain("평행사변형의 성질");
    expect(mid2).toContain("평행사변형이 되는 조건");
    // 우리가 고른 쪽. 다른 갈래가 같은 이름을 받았는지는 리드만 안다(⑷ 5).
    expect(E116.unitSection).toBe("평행사변형의 성질");
    expect(E116.rpmMinor).toBe("평행사변형");
  });

  it("네 유형이 어느 소단원에 붙는지 못 박는다", () => {
    expect(
      Object.fromEntries(M2_TOP_5D.map((e) => [e.rpmType, e.unitSection])),
    ).toEqual(EXPECTED_SECTION);
    expect(
      Object.fromEntries(M2_TOP_5D.map((e) => [e.rpmType, e.key])),
    ).toEqual({
      "113X": "2-2|삼각형의 성질|113X",
      "114X": "2-2|경우의 수|114X",
      "115X": "2-1|연립일차방정식|115X",
      "116X": "2-2|평행사변형|116X",
    });
  });

  it("🔴 네 소단원의 확대 갈래는 «우리 넷 + 이미 있던 것»뿐이다", () => {
    const top = new Set(["심화중", "심화상"]);
    const found: string[] = [];
    for (const e of registeredTypes()) {
      if (!Object.values(EXPECTED_SECTION).includes(e.unitSection)) continue;
      let d = "";
      try {
        d = e.handler(createRng(7654321)).difficulty;
      } catch {
        d = "";
      }
      if (top.has(d)) found.push(e.key);
    }
    const mine = M2_TOP_5D.filter((e) => registeredKeys.has(e.key)).map(
      (e) => e.key,
    );
    expect(found.sort()).toEqual([...PREEXISTING_TOP, ...mine].sort());
  });

  it("키가 다른 모듈의 등록 유형과 겹치지 않는다", () => {
    const others = registeredTypes().filter(
      (e) => !M2_TOP_5D.some((m) => m.key === e.key),
    );
    for (const e of M2_TOP_5D)
      expect(
        others.some((o) => o.key === e.key),
        e.key,
      ).toBe(false);
  });

  it("🔴 제품 후처리가 이 넷에 대해 **항등**이다 — 그래서 이 시험의 지면이 제품의 지면이다", () => {
    for (const e of M2_TOP_5D) {
      for (const p of rows(e, 120)) {
        expect(tidySolution(p.solution), e.rpmType).toBe(p.solution);
        expect(wrapDanClause(p.content), e.rpmType).toBe(p.content);
        assertChooseAllAnswerCount(p.content, p.answer, e.key);
        assertChoiceCount(p.content, e.key);
        assertChoiceMarks(p.content, e.key);
      }
    }
  });

  it("🔴 갈래가 못 박은 그대로이고 `resolveMiddleTier` 가 그것을 안 내린다", () => {
    for (const e of M2_TOP_5D) {
      for (const p of rows(e, 60)) {
        expect(p.difficulty, e.rpmType).toBe(EXPECTED_TIER[e.rpmType]);
        expect(
          resolveMiddleTier(p.difficulty, p.content, !!p.figureSpec),
          e.rpmType,
        ).toBe(EXPECTED_TIER[e.rpmType]);
      }
    }
    // 갈래 둘이 **모두** 있어야 한다 (브리프 요구).
    const tiers = new Set(Object.values(EXPECTED_TIER));
    expect(tiers.has("심화중")).toBe(true);
    expect(tiers.has("심화상")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 지면과 값
// ═══════════════════════════════════════════════════════════

describe("중2 5차d 확대 갈래 — 지면과 값", () => {
  for (const e of M2_TOP_5D) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      const sample = rows(e);

      it(`지면을 다시 풀면 같은 답이 나온다 (표본 ${SAMPLE})`, () => {
        for (const p of sample) {
          expect(VERIFY[e.rpmType]!(p.content), p.content).toBe(
            plainAnswer(p.answer),
          );
        }
      });

      it("`facts` 로 정답 문자열을 다시 지을 수 있다", () => {
        for (const p of sample) {
          const f = p.facts;
          const again =
            e.rpmType === "113X"
              ? `$${fracLocal(f.x!, f.den!)}\\,\\mathrm{cm}^2$`
              : e.rpmType === "116X"
                ? `$${f.x}^\\circ$`
                : `$${f.x}$`;
          expect(again, p.content).toBe(p.answer);
        }
      });

      it("지면이 깨끗하다 — 렌더·냄새·조사·(으)로·맨 숫자·그림 지시·상한 선언", () => {
        for (const p of sample) {
          const both = `${p.content}\n${p.solution}`;
          expect(brokenRender(p.content), p.content).toBe(false);
          expect(brokenRender(p.solution), p.solution).toBe(false);
          expect(pageSmells(p.solution), p.solution).toEqual([]);
          expect(pageSmells(p.content), p.content).toEqual([]);
          expect(josaMismatches(both), both).toEqual([]);
          expect(euroRoMismatches(both), both).toEqual([]);
          expect(bareNumbers(p.content), p.content).toEqual([]);
          expect(bareNumbers(p.solution), p.solution).toEqual([]);
          expect(pointsAtFigure(p.content), p.content).toBeNull();
          expect(p.figureSpec).toBeNull();
          // ㉱ 발문이 스스로 상한을 못 박지 않는다 — 그러면 파생 오답이 그것을 넘는다.
          expect(declaredUpperBound(p.content), p.content).toBeNull();
          expect(
            p.solution.includes("**"),
            "마크다운 굵게가 지면에 나간다",
          ).toBe(false);
        }
      });

      it("🔴 해설의 산술 등식을 좌·우 따로 계산해 맞댄다 (그리고 몇 개를 봤는지 센다)", () => {
        let seen = 0;
        for (const p of sample) {
          expect(arithmeticFaults(p.solution), p.solution).toEqual([]);
          seen += arithmeticClaims(p.solution);
        }
        // 판마다 **적어도 하나**는 봐야 한다 — `116X` 는 합 줄 하나뿐이라 딱 240 이다.
        expect(
          seen,
          `${e.rpmType} 산술 등식을 판마다 하나도 못 봤다`,
        ).toBeGreaterThanOrEqual(SAMPLE);
      });

      it("🔴 지면의 모든 분수가 기약이고 분모가 $1$ 이 아니다 (그리고 몇 개를 봤는지 센다)", () => {
        let seen = 0;
        for (const p of sample) {
          expect(badFractions(p.solution), p.solution).toEqual([]);
          expect(badFractions(p.answer), p.answer).toEqual([]);
          seen += fractionCount(p.solution);
        }
        // `113X` 만 분수가 난다 — 나머지 셋은 «분수를 안 쓴다»가 옳은 상태다.
        if (e.rpmType === "113X")
          expect(seen, "113X 분수를 하나도 못 봤다").toBeGreaterThan(SAMPLE);
        else expect(seen).toBe(0);
      });

      it("🔴 해설의 «말»이 «왜 그런가»를 옳게 진술한다 (㉳)", () => {
        for (const p of sample)
          expect(wordFaults(e.rpmType, p.solution), p.solution).toEqual([]);
        expect(wordClaims(e.rpmType)).toBeGreaterThan(5);
      });

      it("🔴 해설이 걸음을 건너뛰지 않는다 (D-116 ⑹)", () => {
        for (const p of sample) {
          const lines = p.solution.split("\n");
          expect(lines.length, p.solution).toBeGreaterThanOrEqual(6);
          for (const l of lines) expect(l.trim().length).toBeGreaterThan(0);
        }
      });

      it(`🔴 해설이 정답지 한 단을 안 넘는다 — ${WIDE}판에서 최대 700px 미만`, () => {
        let worst = 0;
        for (const base of SEED_BLOCKS)
          for (const p of rows(e, WIDE / SEED_BLOCKS.length, base))
            worst = Math.max(worst, estimateSolutionPx(p.solution));
        expect(worst, `${e.rpmType} 해설 최대 높이`).toBeLessThan(700);
        expect(worst, `${e.rpmType} 해설을 하나도 못 쟀다`).toBeGreaterThan(
          100,
        );
      });

      it(`🔴 정답 쏠림 — 씨앗 블록 ${SEED_BLOCKS.length}개 × ${WIDE}판에서 모두 12% 미만`, () => {
        for (const base of SEED_BLOCKS) {
          const wide = rows(e, WIDE, base);
          const answers = new Map<string, number>();
          for (const p of wide)
            answers.set(p.answer, (answers.get(p.answer) ?? 0) + 1);
          const top = Math.max(...answers.values()) / wide.length;
          expect(
            top,
            `${e.rpmType} 씨앗 ${base} 최빈 정답 비율 (정답 ${answers.size}가지)`,
          ).toBeLessThan(0.12);
          expect(
            answers.size,
            `${e.rpmType} 씨앗 ${base} 서로 다른 정답`,
          ).toBeGreaterThan(15);
        }
      });

      it("🔴 변형 폭 — 같은 씨앗에서 리드가 준 하한만큼 서로 다른 변형이 나온다", () => {
        const floor = VARIANT_FLOOR[e.rpmType]!;
        const seen = new Set<string>();
        for (let v = 0; v < floor; v += 1) {
          // 제품 `generateMiddleProblem` 과 **같은 방식**으로 변형을 가른다.
          seen.add(e.handler(createRng(BASE_SEED + v * 0x9e37)).content);
        }
        expect(seen.size, `${e.rpmType} 변형 폭(하한 ${floor})`).toBe(floor);
      });

      it("등록되면 진짜 파이프라인으로도 같은 계약을 지킨다", () => {
        const produced = productRows(e);
        if (produced.length === 0) {
          // 🟡 아직 리드가 `generate.ts` 에 안 넣었다. 「검사가 돌았다」와
          //    「검사가 볼 것이 없었다」를 가르려고 그 사실을 여기 적어 둔다.
          expect(registeredKeys.has(e.key)).toBe(false);
          return;
        }
        for (const p of produced) {
          expect(VERIFY[e.rpmType]!(p.content), p.content).toBe(
            plainAnswer(p.answer),
          );
          expect(p.difficulty).toBe(EXPECTED_TIER[e.rpmType]);
          expect(pageSmells(p.solution)).toEqual([]);
          expect(wordFaults(e.rpmType, p.solution)).toEqual([]);
        }
        expect(
          new Set(
            generateMiddleSet(e.key, BASE_SEED, VARIANT_FLOOR[e.rpmType]!).map(
              (p) => p.content,
            ),
          ).size,
        ).toBe(VARIANT_FLOOR[e.rpmType]!);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// 🔴 해설의 **중간값**을 다른 길로 다시 잰다
// ═══════════════════════════════════════════════════════════

describe("중2 5차d 확대 갈래 — 🔴 해설의 중간값을 다른 길로 다시 잰다", () => {
  it("`113X` — 세 변 ↔ 전체 넓이 ↔ 높이 ↔ 두 조각 ↔ 합을 **다섯 다** 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E113, 160)) {
      const b = num(grab(/AC\}=(\d+)/, p.content, "AC")[0]);
      const a = num(grab(/BC\}=(\d+)/, p.content, "BC")[0]);
      const c = num(grab(/AB\}=(\d+)/, p.content, "AB")[0]);
      expect(a * a + b * b, p.content).toBe(c * c);

      // ⑴ 전체 넓이 줄
      const wholeLine = lineWith(p.solution, "삼각형 $ABC$의 넓이는", "113X");
      const whole = num(
        grab(
          /\\times(\d+)=(\d+)\\,\\mathrm\{cm\}\^2/,
          wholeLine,
          "113X 전체",
        )[1],
      );
      expect(whole).toBe((a * b) / 2);

      // ⑵ 높이 줄 — 나눗셈이 실제로 그 값을 준다
      const hLine = lineWith(p.solution, "$h=", "113X 높이");
      const [lhs, rhs] = grab(/\$h=(\d+)\\div(\d+)=/, hLine, "113X 나눗셈");
      expect(num(lhs)).toBe(2 * whole);
      expect(num(rhs)).toBe(b + c);

      // ⑶·⑷ 두 조각 — 각의 이등분선 정리로 따로 구한 값과 같다
      const abd = pieceAreaByBisectorTheorem(a, b, c, "ABD");
      const acd = pieceAreaByBisectorTheorem(a, b, c, "ACD");
      expect(p.solution).toContain(
        `${fracLocal(abd[0], abd[1])}\\,\\mathrm{cm}^2`,
      );
      expect(p.solution).toContain(
        `${fracLocal(acd[0], acd[1])}\\,\\mathrm{cm}^2`,
      );

      // ⑸ 두 조각의 합이 전체다 (유리수로)
      const sn = abd[0] * acd[1] + acd[0] * abd[1];
      const sd = abd[1] * acd[1];
      expect(sn / sd).toBeCloseTo(whole, 10);
      expect(sn % sd).toBe(0);
      expect(sn / sd).toBe(whole);
      checked += 1;
    }
    expect(checked).toBe(160);
  });

  it("`114X` — 두 개수 ↔ 겹침 ↔ 합집합 ↔ 여집합 ↔ 쪼갠 셋을 **다섯 다** 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E114, 160)) {
      const N = num(grab(/\$1\$부터 \$(\d+)\$까지/, p.content, "N")[0]);
      const [ps, qs] = grab(
        /\$(\d+)\$의 배수도 아니고 \$(\d+)\$의 배수도 아닌/,
        p.content,
        "p,q",
      );
      const pp = num(ps);
      const qq = num(qs);
      // 지면 글자만 읽어 훑기로 다시 센다.
      let cp = 0;
      let cq = 0;
      let both = 0;
      for (let i = 1; i <= N; i += 1) {
        if (i % pp === 0) cp += 1;
        if (i % qq === 0) cq += 1;
        if (i % pp === 0 && i % qq === 0) both += 1;
      }
      const cpLine = lineWith(p.solution, `$${pp}$의 배수는`, "114X cp");
      expect(num(grab(/몫인 \$(\d+)\$개/, cpLine, "114X cp값")[0])).toBe(cp);
      const cqLine = lineWith(p.solution, `$${qq}$의 배수는`, "114X cq");
      expect(num(grab(/몫인 \$(\d+)\$개/, cqLine, "114X cq값")[0])).toBe(cq);
      const bothLine = lineWith(p.solution, "최소공배수", "114X 겹침");
      const [lcmShown, bothShown] = grab(
        /최소공배수 \$(\d+)\$의 배수이므로 \$\d+\\div\d+\$의 몫인 \$(\d+)\$개/,
        bothLine,
        "114X 겹침값",
      );
      expect(num(bothShown)).toBe(both);
      // 최소공배수가 정말 두 수의 공배수 가운데 가장 작은가 — 훑어서 확인한다.
      let L = 0;
      for (let i = 1; i <= pp * qq; i += 1)
        if (i % pp === 0 && i % qq === 0) {
          L = i;
          break;
        }
      expect(num(lcmShown)).toBe(L);
      const unionLine = lineWith(p.solution, "배수 또는", "114X 합집합");
      expect(num(grab(/=(\d+)\$이다/, unionLine, "114X 합집합값")[0])).toBe(
        cp + cq - both,
      );
      const lastLine = lineWith(p.solution, "이들을 더하면", "114X 쪼갠 셋");
      const parts = grab(
        /\$(\d+)\+(\d+)\+(\d+)=(\d+)\$이다/,
        lastLine,
        "114X 쪼갠 셋 값",
      ).map(num);
      expect(parts[0]).toBe(cp - both);
      expect(parts[1]).toBe(cq - both);
      expect(parts[2]).toBe(both);
      expect(parts[3]).toBe(cp + cq - both);
      checked += 1;
    }
    expect(checked).toBe(160);
  });

  it("`115X` — 상수 ↔ 약수 목록 ↔ $x$ 목록 ↔ 버린 것 ↔ 남은 것 ↔ 합을 **여섯 다** 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E115, 160)) {
      const d = num(grab(/x\+y=(\d+)/, p.content, "d")[0]);
      const [bs, cs] = grab(/ax\+(\d+)y=(\d+)/, p.content, "b,c");
      const b = num(bs);
      const c = num(cs);
      const M = c - b * d;
      const mLine = lineWith(p.solution, "에 대입하면", "115X 대입");
      expect(num(grab(/=(\d+)\$이다/, mLine, "115X 상수")[0])).toBe(M);

      // 약수 목록·$x$ 목록 — 지면에서 읽어 훑기로 검산한다.
      const listLine = lineWith(p.solution, "의 약수는", "115X 목록");
      const divs = numsAfter(listLine, `$${M}$의 약수는 `);
      const xs = numsAfter(listLine, "$x$의 값은 차례로 ");
      const byScan: number[] = [];
      for (let t = 1; t <= M; t += 1) if (M % t === 0) byScan.push(t);
      expect(divs).toEqual(byScan);
      expect(xs).toEqual(divs.map((t) => M / t));

      // 버린 것과 남은 것 — 제약을 스스로 어기지 않는다 (㉴)
      const cutLine = lineWith(p.solution, "버린다", "115X 버림");
      const dropped = numsAfter(cutLine, `$${d - 1}$보다 큰 `);
      const kept = numsAfter(cutLine, "남는 $x$의 값은 ");
      for (const x of dropped) expect(x, `버린 ${x}`).toBeGreaterThan(d - 1);
      for (const x of kept) {
        expect(x).toBeGreaterThanOrEqual(1);
        expect(x, `남긴 ${x}`).toBeLessThanOrEqual(d - 1);
      }
      expect(dropped.length).toBeGreaterThan(0);
      expect(kept.length).toBeGreaterThanOrEqual(3);
      expect([...dropped, ...kept].sort((x, y) => x - y)).toEqual(
        [...xs].sort((x, y) => x - y),
      );

      // 합 — 남은 $x$ 마다 실제로 연립방정식을 풀어 확인한다.
      const aLine = lineWith(p.solution, "$a$의 값은", "115X 답");
      const aList = numsAfter(aLine, "$a$의 값은 ");
      expect(aList.length).toBe(kept.length);
      for (const a of aList) {
        const x = M / (a - b);
        const y = d - x;
        expect(Number.isInteger(x)).toBe(true);
        expect(x + y).toBe(d);
        expect(a * x + b * y).toBe(c);
        expect(x).toBeGreaterThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(1);
      }
      expect(aList.reduce((s, v) => s + v, 0)).toBe(num(plainAnswer(p.answer)));
      checked += 1;
    }
    expect(checked).toBe(160);
  });

  it("`116X` — 후보 목록 ↔ 창 ↔ 버린 두 쪽 ↔ 각 ↔ 합을 **다섯 다** 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E116, 160)) {
      const [ls, hs] = grab(
        /\$t\$가 \$(\d+)\$보다 크고 \$(\d+)\$보다 작을 때/,
        p.content,
        "창",
      );
      const low = num(ls);
      const high = num(hs);

      // ⑴ 후보 목록 — 훑어서 다시 만든다(약수 함수를 안 쓴다).
      const candLine = lineWith(p.solution, "$90$ 이하인 것은", "116X 후보");
      const cand = numsAfter(candLine, "$90$ 이하인 것은 ");
      const byScan: number[] = [];
      for (let t = 1; t <= 90; t += 1) if (180 % t === 0) byScan.push(t);
      expect(cand).toEqual(byScan);

      // ⑵ 창 안 — 선언한 제약을 스스로 어기지 않는다 (㉴)
      const insideLine = lineWith(p.solution, "보다 작은 것은", "116X 창 안");
      const inside = numsAfter(insideLine, `$${high}$보다 작은 것은 `);
      expect(inside).toEqual(cand.filter((t) => t > low && t < high));
      for (const t of inside) {
        expect(t).toBeGreaterThan(low);
        expect(t).toBeLessThan(high);
        expect(180 % t).toBe(0);
        expect(t).toBeLessThanOrEqual(90);
      }

      // ⑶ 버린 두 쪽 — 「앞」은 $low$ 이하, 「뒤」는 $high$ 이상
      const cutLine = lineWith(p.solution, "그것들은 모두 버린다", "116X 버림");
      const [prevS, lowS, nextS, highS] = grab(
        /모두 \$(\d+)\$ 이하이므로 \$(\d+)\$보다 크지 않고, \$\d+\$보다 뒤에 있는 약수는 모두 \$(\d+)\$ 이상이므로 \$(\d+)\$보다 작지 않다/,
        cutLine,
        "116X 버림값",
      );
      expect(num(lowS)).toBe(low);
      expect(num(highS)).toBe(high);
      expect(num(prevS)).toBeLessThanOrEqual(low);
      expect(num(nextS)).toBeGreaterThanOrEqual(high);
      expect(cand.filter((t) => t <= num(prevS)).length).toBeGreaterThan(0);
      expect(cand.filter((t) => t >= num(nextS)).length).toBeGreaterThan(0);
      expect(cand.indexOf(inside[0]!) - 1).toBe(cand.indexOf(num(prevS)));
      expect(cand.indexOf(inside[inside.length - 1]!) + 1).toBe(
        cand.indexOf(num(nextS)),
      );

      // ⑷·⑸ 각과 합
      const angleLine = lineWith(p.solution, "가능한 값은 차례로", "116X 각");
      const angles = numsAfter(angleLine, "가능한 값은 차례로 ");
      expect(angles).toEqual(inside.map((t) => 180 - t));
      expect(angles.reduce((s, v) => s + v, 0)).toBe(
        num(plainAnswer(p.answer).replace(/\^\\circ$/, "")),
      );
      checked += 1;
    }
    expect(checked).toBe(160);
  });
});

// ═══════════════════════════════════════════════════════════
// 🔴 해설에 «설명되지 않는 수»가 없다
// ═══════════════════════════════════════════════════════════

describe("중2 5차d 확대 갈래 — 🔴 해설에 «설명되지 않는 수»가 없다", () => {
  it("`116X` — 발문과 독립 검산이 낳은 값만 지면에 있다", () => {
    let seen = 0;
    for (const p of rows(E116, 120)) {
      const [ls, hs] = grab(
        /\$t\$가 \$(\d+)\$보다 크고 \$(\d+)\$보다 작을 때/,
        p.content,
        "창",
      );
      const low = num(ls);
      const high = num(hs);
      const allowed = new Set<number>([1, 2, 90, 180, low, high]);
      for (let t = 1; t <= 90; t += 1) if (180 % t === 0) allowed.add(t);
      let total = 0;
      for (let t = 1; t <= 90; t += 1) {
        if (180 % t !== 0) continue;
        if (!(t > low && t < high)) continue;
        allowed.add(180 - t);
        total += 180 - t;
      }
      allowed.add(total);
      for (const n of mathIntegers(p.solution)) {
        expect(allowed.has(n), `설명되지 않는 수 ${n} — ${p.solution}`).toBe(
          true,
        );
        seen += 1;
      }
    }
    expect(seen, "이 자가 수를 하나도 못 봤다").toBeGreaterThan(1000);
  });

  it("`115X` — 발문과 독립 검산이 낳은 값만 지면에 있다", () => {
    let seen = 0;
    for (const p of rows(E115, 120)) {
      const d = num(grab(/x\+y=(\d+)/, p.content, "d")[0]);
      const [bs, cs] = grab(/ax\+(\d+)y=(\d+)/, p.content, "b,c");
      const b = num(bs);
      const c = num(cs);
      const M = c - b * d;
      const allowed = new Set<number>([1, d, d - 1, b, c, b * d, M]);
      let total = 0;
      for (let t = 1; t <= M; t += 1) {
        if (M % t !== 0) continue;
        allowed.add(t);
        allowed.add(M / t);
        if (M / t <= d - 1) {
          allowed.add(b + t);
          total += b + t;
        }
      }
      allowed.add(total);
      for (const n of mathIntegers(p.solution)) {
        expect(allowed.has(n), `설명되지 않는 수 ${n} — ${p.solution}`).toBe(
          true,
        );
        seen += 1;
      }
    }
    expect(seen, "이 자가 수를 하나도 못 봤다").toBeGreaterThan(1000);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉳ 말의 눈금 — 낱말을 뒤집으면 빨개진다
// ═══════════════════════════════════════════════════════════

describe("[중2 5차d] ㉳ 해설의 «말»을 뒤집으면 빨개진다", () => {
  /** 낱말 하나만 뒤집는다 — 값은 그대로라 값 검산·KaTeX 는 초록이다. */
  const FLIPS: Record<string, readonly (readonly [string, string])[]> = {
    "113X": [
      ["대응하는 변의 길이는 같으므로", "대응하는 각의 크기는 같으므로"],
      ["서로 합동이다", "서로 닮음이다"],
      ["거리가 같다", "거리가 다르다"],
      ["두 조각의 넓이의 합은", "두 조각의 넓이의 차는"],
    ],
    "114X": [
      ["공배수", "공약수"],
      ["최소공배수", "최대공약수"],
      ["두 번 세었다", "세 번 세었다"],
    ],
    "115X": [
      ["의 약수이고", "의 배수이고"],
      ["자연수가 되지 않으므로", "정수가 되지 않으므로"],
      ["이하의 자연수이다", "이하의 짝수이다"],
    ],
    "116X": [
      ["이웃하는 두 내각", "마주 보는 두 내각"],
      ["약수이면서", "배수이면서"],
      ["앞에 있는 약수", "앞에 있는 배수"],
    ],
  };

  it("음성 대조를 **먼저** 본다 — 손 안 댄 지면은 초록이다", () => {
    for (const e of M2_TOP_5D)
      for (const p of rows(e, 40))
        expect(wordFaults(e.rpmType, p.solution), p.solution).toEqual([]);
  });

  it("🔴 낱말을 뒤집으면 **전부** 빨개진다 (그리고 실제로 글이 바뀌었는지 먼저 본다)", () => {
    for (const e of M2_TOP_5D) {
      const p = rows(e, 1)[0]!;
      for (const [from, to] of FLIPS[e.rpmType]!) {
        expect(
          p.solution.includes(from),
          `${e.rpmType} 「${from}」이 없다`,
        ).toBe(true);
        const flipped = p.solution.replace(from, to);
        // ⑵ 산출물이 실제로 바뀌었나 — 안 바뀌면 판정을 **거부**한다(2026-08-21).
        expect(flipped, `${e.rpmType} 변이가 글을 못 바꿨다`).not.toBe(
          p.solution,
        );
        expect(
          wordFaults(e.rpmType, flipped),
          `${e.rpmType} 「${from}」→「${to}」 를 못 잡는다`,
        ).not.toEqual([]);
      }
    }
  });

  it("🔴 「그중」을 띄어 쓰면 잡는다 (양성·음성 한 쌍)", () => {
    expect(wordFaults("114X", rows(E114, 1)[0]!.solution)).toEqual([]);
    const dirty = `${rows(E114, 1)[0]!.solution}\n그 중 하나를 고른다.`;
    expect(wordFaults("114X", dirty)).toContain("「그중」을 띄어 썼다");
  });
});

// ═══════════════════════════════════════════════════════════
// ㉵ 지름길과 널 모형
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **이 자는 제품의 목록을 안 쓴다.** 제품 `shortcutValues` 를 그대로 부르면
 * 「생성기가 거른 것을 생성기의 자로 다시 재는」 동어반복이 된다(`113X`·`114X`·`115X`
 * 는 실제로 그 목록으로 거른다). 여기서는 **지면에서 읽은 수**로 목록을 다시 짓는다.
 *
 * 그물을 **둘**로 나눈다 — 「한두 번 연산」이라는 말을 글자 그대로 지키기 위해서다.
 *
 * ⚠️ `narrowShortcut` 에 「찍힌 수를 **전부** 더한 값」을 넣었다가 뺐다. 발문에 수가
 *    넷이면 그 합은 연산이 **세 번**이고, 실제로 `114X` 에서 $(1+N+p+q)\div2$ 가
 *    답과 우연히 같은 판이 $600$ 중 **5** 나 걸렸다(전부 거짓 경보였다 — 카드 수와
 *    두 약수와 글자 $1$ 을 더할 학생은 없다). **거짓 경보는 가드를 끈다**(2026-08-20).
 *    세 수 조합은 아래 넓은 그물로 옮기고, 거기서는 **널 모형과 견주어** 판정한다.
 */
function narrowShortcut(nums: readonly number[]): Set<number> {
  const out = new Set<number>();
  const add = (v: number): void => {
    if (Number.isFinite(v) && Number.isInteger(v) && v > 0) out.add(v);
  };
  for (const x of nums) {
    add(x);
    add(2 * x);
    add(x / 2);
    add(x * x);
    for (const y of nums) {
      if (x === y) continue;
      add(x + y);
      add(x - y);
      add(x * y);
      add(x / y);
      add((x * y) / 2);
      add(x * y - x);
    }
  }
  return out;
}

/** 세 수까지 섞은 넓은 그물 — **혼자서는 판정하지 않는다**(널 모형과 짝이다). */
function wideShortcut(nums: readonly number[]): Set<number> {
  const out = narrowShortcut(nums);
  const add = (v: number): void => {
    if (Number.isFinite(v) && Number.isInteger(v) && v > 0) out.add(v);
  };
  for (const x of nums)
    for (const y of nums) {
      if (x === y) continue;
      for (const z of nums) {
        if (z === x || z === y) continue;
        add(x + y + z);
        add(x * y - z);
        add(x * y + z);
        add((x * y) / z);
        add(x - y - z);
      }
    }
  return out;
}

/**
 * 발문에 실제로 찍힌 수 — 지면에서 읽는다(생성기 매개변수를 안 본다).
 *
 * 🔴 **각의 크기는 뺀다.** `113X` 발문의 $\angle C=90^\circ$ 가 그대로 섞이면
 * $90+30=120$ 이 「지름길」로 잡힌다(실측). 각도와 넓이는 **단위가 다르므로** 학생이
 * 그 둘을 더할 리 없다 — 넓혀 둔 그물이 여기서는 거짓 경보를 냈고, **거짓 경보는
 * 가드를 끈다**(2026-08-20). 그래서 `\circ` 가 붙은 수만 덜어 낸다.
 * ⚠️ `116X` 는 창의 두 끝이 각도지만 발문에 `^\circ` 없이 적히므로 그대로 남는다.
 */
function printedNumbers(content: string): number[] {
  const withoutAngles = content.replace(/\d+\^\\circ/g, " ");
  return [...new Set(mathIntegers(withoutAngles))];
}

/** 정답의 «값» — 분수면 근삿값이 아니라 정수일 때만 센다. */
function answerInteger(answer: string): number | null {
  const plain = plainAnswer(answer)
    .replace(/\\,\\mathrm\{cm\}\^2/, "")
    .replace(/\^\\circ/, "");
  return /^\d+$/.test(plain) ? Number(plain) : null;
}

describe("중2 5차d 확대 갈래 — ㉵ 지름길과 널 모형", () => {
  it("🔴 **좁은 그물** — 두 수를 한두 번 굴린 값이 답이 되는 판이 **없다** (600판)", () => {
    for (const e of M2_TOP_5D) {
      let checked = 0;
      for (const p of rows(e, 600)) {
        const v = answerInteger(p.answer);
        if (v === null) continue; // `113X` 의 분수 답은 아래 널 모형이 함께 잰다
        expect(
          narrowShortcut(printedNumbers(p.content)).has(v),
          `${e.rpmType} 지름길: ${p.content} → ${p.answer}`,
        ).toBe(false);
        checked += 1;
      }
      // 「몇 판을 실제로 쟀나」 — 0 이면 «깨끗»이 아니라 «못 셈»이다.
      if (e.rpmType === "113X") expect(checked).toBeGreaterThan(50);
      else expect(checked).toBe(600);
    }
  });

  /**
   * 🔴 **널 모형** — 넓은 그물은 혼자서 판정하지 않는다.
   *
   * 세 수를 섞으면 우연히 맞는 값이 생긴다. 그래서 **같은 자루의 다른 판 답**을
   * 끼워 넣어 «우연 수준»을 같이 재고, 진짜 답의 적중률이 그보다 뚜렷이 높지 않은지
   * 본다. 저술 시점 실측(씨앗 $20260906$ · $600$ 판):
   * `113X` 진짜 $0.00\%$ / 우연 $3.36\%$ · `114X` $5.50\%$ / $11.17\%$ ·
   * `115X` $2.00\%$ / $5.50\%$ · `116X` $0.17\%$ / $0.00\%$ — 넷 다 우연 수준
   * 아래이거나 그 언저리다.
   */
  it("🔴 **널 모형** — 넓은 그물의 적중률이 우연 수준을 뚜렷이 넘지 않는다", () => {
    for (const e of M2_TOP_5D) {
      const pool = rows(e, 600);
      let real = 0;
      let chance = 0;
      let tried = 0;
      for (let i = 0; i < pool.length; i += 1) {
        const v = answerInteger(pool[i]!.answer);
        if (v === null) continue;
        const other = answerInteger(pool[(i + 137) % pool.length]!.answer);
        tried += 1;
        const net = wideShortcut(printedNumbers(pool[i]!.content));
        if (net.has(v)) real += 1;
        if (other !== null && net.has(other)) chance += 1;
      }
      expect(tried, `${e.rpmType} 널 모형이 잴 것이 없었다`).toBeGreaterThan(
        50,
      );
      const realRate = real / tried;
      const chanceRate = chance / tried;
      expect(
        realRate,
        `${e.rpmType} 넓은 그물 적중률 ${(realRate * 100).toFixed(2)}%`,
      ).toBeLessThan(0.08);
      expect(
        realRate,
        `${e.rpmType} 적중 ${(realRate * 100).toFixed(2)}% · 우연 ${(chanceRate * 100).toFixed(2)}%`,
      ).toBeLessThanOrEqual(chanceRate + 0.02);
    }
  });

  it("🔴 `looksLikeShortcut` 이 «예»도 «아니오»도 낸다 (양성·음성 한 쌍)", () => {
    // 양성: 답이 두 수의 곱이다.
    expect(looksLikeShortcut([6, 7, 9], 42, 1)).toBe(true);
    // 양성: 답이 두 수의 몫(분수)이다.
    expect(looksLikeShortcut([6, 7, 9], 6, 7)).toBe(true);
    // 음성: 어떤 한두 번 연산으로도 안 나온다.
    expect(looksLikeShortcut([6, 7, 9], 1201, 7)).toBe(false);
    expect(shortcutValues([6, 7]).has("42/1")).toBe(true);
    expect(shortcutValues([6, 7]).has("1201/7")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉡ 굳힘을 지우면 답이 바뀌는가 · 굳힘 함수의 눈금
// ═══════════════════════════════════════════════════════════

describe("중2 5차d 확대 갈래 — 굳힘 함수와 음성 대조", () => {
  it("`bisectorFootDistance` — 손 실측과 맞고, 인자를 끄면 값이 달라지고, 직각이 아니면 던지듯 `null`", () => {
    // $AC=6$, $BC=8$, $AB=10$ → $h=\dfrac{8\times6}{6+10}=3$
    expect(bisectorFootDistance(8, 6, 10)).toEqual([3, 1]);
    // 굳힘을 지우면(삼각형 $ACD$ 조각을 빠뜨리면) 분모가 $c$ 가 되어 $\dfrac{48}{10}$
    expect(bisectorFootDistance(8, 6, 10, false)).toEqual([24, 5]);
    expect(bisectorFootDistance(6, 8, 10)).toEqual([8, 3]);
    expect(bisectorFootDistance(8, 6, 11)).toBeNull();
    expect(bisectorFootDistance(0, 6, 10)).toBeNull();
  });

  it("`bisectorPieceArea` — 두 조각의 합이 전체이고, 굳힘을 지우면 달라진다", () => {
    expect(bisectorPieceArea(8, 6, 10, "ABD")).toEqual([15, 1]);
    expect(bisectorPieceArea(8, 6, 10, "ACD")).toEqual([9, 1]);
    expect(15 + 9).toBe((8 * 6) / 2);
    expect(bisectorPieceArea(8, 6, 10, "ABD", false)).toEqual([24, 1]);
    expect(bisectorPieceArea(8, 6, 11, "ABD")).toBeNull();
  });

  it("`notMultipleCount` — 손 실측과 맞고, 겹침을 안 빼면 값이 달라진다", () => {
    // $1$~$30$ 에서 $2$·$3$ 의 배수가 아닌 것: 1,5,7,11,13,17,19,23,25,29 → 10
    expect(notMultipleCount(30, 2, 3)).toBe(10);
    expect(notMultipleCount(30, 2, 3, false)).toBe(5);
    expect(notMultipleCount(20, 3, 5)).toBe(11);
    expect(notMultipleCount(30, 2, 2)).toBeNull();
    expect(notMultipleCount(30, 1, 3)).toBeNull();
  });

  it("`naturalSolutionCoefficients` — 손 실측과 맞고, $y$ 조건을 지우면 후보가 늘어난다", () => {
    // $x+y=13$, $ax+3y=103$ → $M=64$, $x\le12$ 인 약수만
    expect(naturalSolutionCoefficients(13, 3, 103)).toEqual([11, 19, 35, 67]);
    expect(naturalSolutionCoefficients(13, 3, 103, false)).toEqual([
      4, 5, 7, 11, 19, 35, 67,
    ]);
    expect(naturalSolutionCoefficients(13, 3, 39)).toBeNull(); // $M=0$
    expect(naturalSolutionCoefficients(13, 3, 30)).toBeNull(); // $M<0$
  });

  it("`possibleOppositeAngles` — 손 실측과 맞고, 합을 $360$ 으로 바꾸면 달라진다", () => {
    expect(possibleOppositeAngles(5, 12)).toEqual([174, 171, 170]);
    expect(possibleOppositeAngles(5, 12, 360)).toEqual([354, 352, 351, 350]);
    expect(possibleOppositeAngles(20, 30)).toEqual([]);
    expect(possibleOppositeAngles(90, 200)).toEqual([]);
  });

  it("`divisors`·`rightTriples`·`reduceFraction`·`fracTex` 는 손 실측과 맞는다", () => {
    expect(divisors(64)).toEqual([1, 2, 4, 8, 16, 32, 64]);
    expect(divisors(180)).toEqual([
      1, 2, 3, 4, 5, 6, 9, 10, 12, 15, 18, 20, 30, 36, 45, 60, 90, 180,
    ]);
    expect(divisors(1)).toEqual([1]);
    expect(rightTriples(13)).toEqual([
      [3, 4, 5],
      [5, 12, 13],
      [6, 8, 10],
      [9, 12, 15],
    ]);
    expect(rightTriples(4)).toEqual([[3, 4, 5]]);
    expect(reduceFraction(48, 18)).toEqual([8, 3]);
    expect(reduceFraction(-6, -4)).toEqual([3, 2]);
    expect(fracTex(3, 1)).toBe("3");
    expect(fracTex(8, 3)).toBe("\\dfrac{8}{3}");
  });

  it("🔴 검산 소품 자신의 눈금 — `evalChain`·`badFractions`·`numsAfter`", () => {
    expect(evalChain("35+15-5")).toBe(45);
    expect(evalChain("672\\div98")).toBeCloseTo(672 / 98, 10);
    expect(evalChain("2\\times3+4")).toBe(10);
    expect(arithmeticFaults("$35+15-5=45$")).toEqual([]);
    expect(arithmeticFaults("$35+15-5=44$")).toHaveLength(1);
    expect(arithmeticClaims("$35+15-5=45$이고 $1+2=3$이다")).toBe(2);
    expect(badFractions("$\\dfrac{2}{4}$")).toHaveLength(1);
    expect(badFractions("$\\dfrac{6}{1}$")).toHaveLength(1);
    expect(badFractions("$\\dfrac{8}{3}$")).toEqual([]);
    expect(numsAfter("약수는 $1$, $2$, $4$이고", "약수는 ")).toEqual([1, 2, 4]);
    expect(numsAfter("약수는 $1$이고", "약수는 ")).toEqual([1]);
    expect(numsAfter("약수는 $1$, $2$이고", "없는말 ")).toEqual([]);
    expect(euroRoMismatches("$3$로")).toHaveLength(1);
    expect(euroRoMismatches("$3$으로")).toEqual([]);
    expect(euroRoMismatches("$7$로")).toEqual([]);
  });

  it("🔴 `pieceAreaByCoordinates` 는 좌표에서 오고 유리수 검산과 값이 같다", () => {
    expect(pieceAreaByCoordinates(8, 6, 10, "ABD")).toBeCloseTo(15, 9);
    expect(pieceAreaByCoordinates(8, 6, 10, "ACD")).toBeCloseTo(9, 9);
    for (const [p, q, c] of rightTriples(20)) {
      for (const [a, b] of [
        [p, q],
        [q, p],
      ] as const) {
        for (const piece of ["ABD", "ACD"] as const) {
          const [n, d] = pieceAreaByBisectorTheorem(a, b, c, piece);
          expect(pieceAreaByCoordinates(a, b, c, piece)).toBeCloseTo(n / d, 9);
        }
      }
    }
    expect(() => pieceAreaByBisectorTheorem(8, 6, 11, "ABD")).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// 🔴 D-20 손실 원장이 재현된다
// ═══════════════════════════════════════════════════════════

describe("중2 5차d 확대 갈래 — 🔴 D-20 손실 원장이 재현된다", () => {
  function lcm2(a: number, b: number): number {
    return (a / gcd2(a, b)) * b;
  }

  it("`113X` — 전수 **104**, 가드 전부 **100**, 지름길이 혼자 **4** 를 문다", () => {
    let all = 0;
    let kept = 0;
    let onlyPinOff = 0;
    const answers = new Set<string>();
    for (const [p, q, c] of rightTriples(48))
      for (const [a, b] of [
        [p, q],
        [q, p],
      ] as const)
        for (const piece of ["ABD", "ACD"] as const) {
          all += 1;
          const ans = bisectorPieceArea(a, b, c, piece)!;
          const naive = bisectorPieceArea(a, b, c, piece, false)!;
          const pinned = !(naive[0] === ans[0] && naive[1] === ans[1]);
          const short = looksLikeShortcut([a, b, c], ans[0], ans[1]);
          if (!short) onlyPinOff += 1;
          if (!pinned || short) continue;
          kept += 1;
          answers.add(`${ans[0]}/${ans[1]}`);
        }
    expect(all).toBe(104);
    expect(kept).toBe(100);
    expect(onlyPinOff).toBe(100); // 굳힘 줄은 혼자서 아무것도 안 문다
    expect(answers.size).toBe(100);
  });

  it("`114X` — 전수 **7,332**, 가드 전부 **4,202**, 겹침이 **914** · 지름길이 **236**", () => {
    const counts = { all: 0, kept: 0, overlapOff: 0, shortOff: 0 };
    const answers = new Set<number>();
    for (let N = 60; N <= 200; N += 1)
      for (let p = 2; p <= 9; p += 1)
        for (let q = p + 1; q <= 12; q += 1) {
          counts.all += 1;
          const L = lcm2(p, q);
          const cp = Math.floor(N / p);
          const cq = Math.floor(N / q);
          const both = Math.floor(N / L);
          const base =
            q % p !== 0 &&
            L <= N &&
            cp !== cq &&
            cp - both >= 1 &&
            cq - both >= 1;
          if (!base) continue;
          const ans = notMultipleCount(N, p, q)!;
          // 🔴 지면에 찍히는 수 그대로 — 발문의 $1$ 까지 넣는다(모듈과 같은 자루).
          const short = looksLikeShortcut([1, N, p, q], ans, 1);
          if (both >= 2 && !short) {
            counts.kept += 1;
            answers.add(ans);
          }
          if (!short) counts.overlapOff += 1;
          if (both >= 2) counts.shortOff += 1;
        }
    expect(counts.all).toBe(7332);
    expect(counts.kept).toBe(4202);
    expect(counts.overlapOff).toBe(5116);
    expect(counts.overlapOff - counts.kept).toBe(914);
    expect(counts.shortOff).toBe(4438);
    expect(counts.shortOff - counts.kept).toBe(236);
    expect(answers.size).toBe(147);
  });

  it("`115X` — 전수 **10,140**, 가드 전부 **3,622**, 네 가드가 각각 무는 수", () => {
    let all = 0;
    let kept = 0;
    let divOff = 0;
    let keepOff = 0;
    let dropOff = 0;
    let shortOff = 0;
    const answers = new Set<number>();
    for (let d = 7; d <= 16; d += 1)
      for (let b = 2; b <= 7; b += 1)
        for (let M = 12; M <= 180; M += 1) {
          all += 1;
          const divs = divisors(M);
          const inRange = divs.filter((t) => M / t <= d - 1);
          const out = divs.filter((t) => M / t > d - 1);
          const c = b * d + M;
          const sum = inRange.reduce((s, t) => s + b + t, 0);
          const gDiv = divs.length >= 4 && divs.length <= 10;
          const gKeep = inRange.length >= 3 && inRange.length <= 6;
          const gDrop = out.length >= 1;
          const gShort = !looksLikeShortcut([d, b, c], sum, 1);
          if (gDiv && gKeep && gDrop && gShort) {
            kept += 1;
            answers.add(sum);
          }
          if (inRange.length === 0) continue;
          if (gKeep && gDrop && gShort) divOff += 1;
          if (gDiv && gDrop && gShort) keepOff += 1;
          if (gDiv && gKeep && gShort) dropOff += 1;
          if (gDiv && gKeep && gDrop) shortOff += 1;
        }
    expect(all).toBe(10140);
    expect(kept).toBe(3622);
    expect(divOff).toBe(4132);
    expect(keepOff).toBe(6330);
    expect(dropOff).toBe(3654);
    expect(shortOff).toBe(3894);
    expect(answers.size).toBe(302);
  });

  it("`116X` — 창 토막 **46**(전부 살아남는다) · 지름길은 $1{,}208$ 쌍에서 **1**", () => {
    const cand = divisors(180).filter((t) => t <= 90);
    const n = cand.length;
    const sums: number[] = [];
    let pairs = 0;
    let short = 0;
    for (let i = 1; i <= n - 4; i += 1)
      for (let j = i + 2; j <= Math.min(i + 5, n - 2); j += 1) {
        const s = cand.slice(i, j + 1).reduce((acc, t) => acc + (180 - t), 0);
        sums.push(s);
        for (let low = cand[i - 1]!; low <= cand[i]! - 1; low += 1)
          for (let high = cand[j]! + 1; high <= cand[j + 1]!; high += 1) {
            pairs += 1;
            if (looksLikeShortcut([low, high], s, 1)) short += 1;
          }
      }
    expect(sums).toHaveLength(46);
    expect(new Set(sums).size).toBe(46);
    expect(pairs).toBe(1208);
    expect(short).toBe(1);
    // 🔴 어느 쪽으로 세는지가 최빈을 바꾼다 — 제품은 «토막 균등»이다.
    expect(
      Math.max(...sums.map((s) => sums.filter((t) => t === s).length)),
    ).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════
// 물린 결함의 회귀 잠금
// ═══════════════════════════════════════════════════════════

describe("중2 5차d 확대 갈래 — 물린 결함의 회귀 잠금", () => {
  it("⑴ 🔴 `115X` 의 「$a-b$」 뒤 조사가 **받침**을 따른다 (「$a-3$은」·「$a-2$는」)", () => {
    let sawEun = false;
    let sawNeun = false;
    for (const p of rows(E115, 200)) {
      const b = num(grab(/ax\+(\d+)y=/, p.content, "b")[0]);
      const want = [2, 4, 5, 9].includes(b % 10) ? "는" : "은";
      expect(p.solution, p.solution).toContain(`$a-${b}$${want} `);
      if (want === "은") sawEun = true;
      else sawNeun = true;
    }
    expect(sawEun && sawNeun, "두 갈래를 다 봐야 이 잠금이 뜻이 있다").toBe(
      true,
    );
  });

  it("⑵ 🔴 `116X` 의 버리는 줄이 **동어반복이 아니다** (「$5$ 이하는 $5$ 이하」꼴 금지)", () => {
    for (const p of rows(E116, 200)) {
      const cut = lineWith(p.solution, "그것들은 모두 버린다", "116X");
      expect(cut).toContain("앞에 있는 약수");
      expect(cut).toContain("뒤에 있는 약수");
      // 같은 수가 「$X$ 이하이므로 $X$보다 크지 않다」로 되풀이되지 않는다.
      const [prevS, lowS] = grab(
        /모두 \$(\d+)\$ 이하이므로 \$(\d+)\$보다 크지 않고/,
        cut,
        "116X 앞",
      );
      expect(cut.includes(`$${prevS}$ 이하인 약수는 모두 $${lowS}$ 이하`)).toBe(
        false,
      );
    }
  });

  it("⑶ 🔴 `114X` 가 **겹침이 실제로 있는** 판만 낸다 (겹침 $\\ge2$)", () => {
    for (const p of rows(E114, 200)) {
      const both = num(
        grab(
          /의 배수이므로 \$\d+\\div\d+\$의 몫인 \$(\d+)\$개/,
          p.solution,
          "겹침",
        )[0],
      );
      expect(both, p.solution).toBeGreaterThanOrEqual(2);
    }
  });

  it("⑷ 🔴 `113X` 가 **약분 전 분수**를 지면에 만들지 않는다 (나눗셈으로 적는다)", () => {
    for (const p of rows(E113, 200)) {
      expect(p.solution, p.solution).toMatch(/\$h=\d+\\div\d+=/);
      expect(badFractions(p.solution), p.solution).toEqual([]);
    }
  });

  it("⑸ 🔴 두 물음(`ABD`·`ACD`)이 **둘 다** 나온다 — 하나만 나면 배치 축이 죽는다", () => {
    const kinds = new Set(
      rows(E113, 200).map(
        (p) => grab(/삼각형 \$(ABD|ACD)\$의 넓이/, p.content, "조각")[0]!,
      ),
    );
    expect([...kinds].sort()).toEqual(["ABD", "ACD"]);
  });

  it("⑹ 🔴 해설에 마크다운 굵게 표시(`**`)를 쓰지 않는다 — 지면에 그대로 나간다", () => {
    for (const e of M2_TOP_5D)
      for (const p of rows(e, 40)) {
        expect(p.solution.includes("**")).toBe(false);
        expect(p.content.includes("**")).toBe(false);
      }
  });
});
