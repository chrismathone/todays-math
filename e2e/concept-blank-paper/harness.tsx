import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "katex/dist/katex.min.css";
import "../../src/app/globals.css";
import "./harness.css";

import ConceptBlankView from "../../src/components/concept-blank/ConceptBlankView";
import ConceptBlankPreview from "../../src/components/concept-blank/ConceptBlankPreview";
import ConceptBlankPaper from "../../src/components/concept-blank/ConceptBlankPaper";
import {
  clozeCost,
  keyRowCost,
  planSheet,
  sheetHasContent,
  termCost,
} from "../../src/components/concept-blank/paper/paginate";
import { PaperText } from "../../src/components/concept-blank/paper/PaperParts";
import { inkEm } from "../../src/components/concept-blank/paper/text";
import { parseConceptBlankView } from "../../src/components/concept-blank/paper/view";
import type {
  ConceptBlankSelection,
  ConceptBlankSheet,
  ConceptEntry,
} from "../../src/contracts/conceptBlank.contract";
import { composeSheets } from "../../src/lib/concept-blank/compose";
import { FIXTURE_BANK } from "../../src/lib/concept-blank/fixture";
import { encodeSheetCode } from "../../src/lib/concept-blank/sheetCode";
import { CAL_MATH, calSheets } from "./calibrate";
import { LONGEST_CODE_SYMBOLS, syntheticCode } from "./code";
import { fuzzSheets } from "./fuzz";
import { photoCode, photoSheets } from "./photo";
import {
  countSheets,
  figureSheets,
  inkProbeTexts,
  plusSheets,
  realSheets,
  showSheets,
  worstPicks,
  worstSheets,
  type RealGrade,
  type WorstSet,
} from "./real";
import { STRESS_SHEETS } from "./stress";

/**
 * `?set=fixture|stress|math|fuzz&seed=N|real-e3 … real-m3|plus-e3 … plus-m3&chapter=N|figures-e3 … figures-m3|worst|worst-m|counts|show|cal` · `?view=student|key|both` ·
 * `?code=none|<글>|<글자 수>`(지면 코드 줄 — 기본은 fixture 면 제품 코드, 그 밖은 가장 긴 코드) —
 * 지면만 그린다(화면 축소 없이 1배).
 * fixture = 시험 · 미리보기용 작은 은행 전부(시안 두 단원) · stress = 계약 상한 · math = 수식 문장 ·
 * fuzz = 시드 고정 무작위 길이(`fuzz.ts`) · real-* = main 의 실제 은행 한 학년 전부(원래 파일) · plus-* = 원래 + 보강 은행의 대단원 하나(소단원마다) ·
 * worst(초등) · worst-m(중학) = 실제 은행에서 가장 긴 것끼리 ·
 * counts = 문항 수 1 ~ 정원 + 1 · show = 보고서 본보기(`real.ts`) · cal = 수식 갈래마다 한 줄(`calibrate.ts`) ·
 * ink = 빈칸 폭 어림 맞대기(지면이 아니라 글 한 줄씩). `?scale=0.58` 이면 화면 미리보기 축소를 본다(인쇄에는 안 먹는다).
 *
 * 쪽 나누기 어림(`paginate.ts`)은 `<script id="cb-estimates">` 에 덩이마다 실어 둔다 — `estimate.spec.ts` 가
 * 실제 높이와 맞대어 «어림 ≥ 실제»를 잠근다(지면 DOM 에는 어림을 싣지 않는다).
 */
const params = new URLSearchParams(location.search);
const ALL = { 하: 40, 중: 40, 상: 40 };
const NONE = { 하: 0, 중: 0, 상: 0 };

const fixtureSelection: ConceptBlankSelection = {
  sections: [
    ...new Set(
      [
        ...FIXTURE_BANK.concepts,
        ...FIXTURE_BANK.ox,
        ...FIXTURE_BANK.apply,
        ...FIXTURE_BANK.figures,
      ].map((x) => x.section),
    ),
  ],
  forms: [
    { form: "recall", counts: ALL, extras: NONE },
    { form: "term", counts: ALL, extras: ALL },
    { form: "cloze", counts: ALL, extras: ALL },
    { form: "map", counts: ALL, extras: NONE },
    { form: "figure", counts: ALL, extras: NONE },
  ],
  date: "2026-10-01",
};

const mathEntry = (i: number, definition: string): ConceptEntry => ({
  id: `math-${i}`,
  section: "중1::2. 정수와 유리수::정수와 유리수",
  term: `수식 뜻 ${i}`,
  kind: "정의",
  level: "중",
  definition,
});
const MATH_SENTENCES = [
  "분수 $\\frac{a}{b}$ 에서 $b \\neq 0$ 일 때 가로선 아래의 수 $b$ 를 {분모}, 위의 수 $a$ 를 {분자}라 한다.",
  "정수 $a$ 와 $0$ 이 아닌 정수 $b$ 로 $\\frac{a}{b}$ 꼴로 나타낼 수 있는 수를 {유리수}라 한다.",
  "수 하나를 수직선에 찍었을 때 그 점이 0 에서 떨어진 만큼을 {절댓값}이라 부르고 $|a|$ 처럼 막대 둘로 감싸 적는다.",
  "$a^2 = a \\times a$ 처럼 같은 수를 거듭 곱한 것을 {거듭제곱}이라 하고, 곱한 개수 $2$ 를 {지수}라 한다.",
  "일차방정식 $ax + b = 0$ $(a \\neq 0)$ 의 해는 $x = -\\frac{b}{a}$ 이고, 이렇게 해를 구하는 것을 방정식을 {푼다}고 한다.",
  // 핵심어 안 수식 — 학생지는 보이는 폭만큼의 빈칸, 채점표는 굵은 수식
  "두 수의 곱이 $1$ 이 될 때 한 수를 다른 수의 {역수}라 하며, $\\frac{2}{3}$ 의 역수는 {$\\frac{3}{2}$}이다.",
  "제곱근 $\\sqrt{a}$ 는 $a \\geq 0$ 일 때 제곱하여 $a$ 가 되는 수 가운데 {음이 아닌} 것이다.",
  "좌표평면에서 점 $(x, y)$ 의 $x$ 를 {x좌표}, $y$ 를 {y좌표}라 하고 두 수를 순서대로 묶어 쓴다.",
];
const MATH_SHEETS: ConceptBlankSheet[] = [
  {
    form: "cloze",
    header: {
      title: "정수와 유리수",
      unitLabel: "중1 · 2. 정수와 유리수",
      date: "2026-10-01",
      form: "cloze",
    },
    sentences: MATH_SENTENCES.map((d, i) => mathEntry(i + 1, d)),
    apply: [
      {
        id: "math-ap-1",
        section: "중1::2. 정수와 유리수::정수와 유리수",
        level: "중",
        prompt: "$-\\frac{3}{4}$ 의 절댓값과 역수를 차례로 쓰시오.",
        answer: "$\\frac{3}{4}$, $-\\frac{4}{3}$",
      },
    ],
  },
];

function sheetsFor(set: string | null): ConceptBlankSheet[] {
  if (set === "photo-cloze") return photoSheets();
  if (set === "stress") return STRESS_SHEETS;
  if (set === "math") return MATH_SHEETS;
  if (set === "fuzz") return fuzzSheets(Number(params.get("seed") ?? 1));
  if (set === "worst" || set === "worst-m") return worstSheets(set);
  if (set === "counts") return countSheets();
  if (set === "show") return showSheets();
  if (set === "cal") return calSheets();
  if (set?.startsWith("real-")) return realSheets(set.slice(5) as RealGrade);
  if (set?.startsWith("plus-"))
    return plusSheets(
      set.slice(5) as RealGrade,
      Number(params.get("chapter") ?? 0),
    );
  if (set?.startsWith("figures-"))
    return figureSheets(set.slice(8) as RealGrade);
  return composeSheets(fixtureSelection, FIXTURE_BANK);
}

const sheets = sheetsFor(params.get("set"));

/**
 * 지면 코드 줄(트랙 cb-code) — fixture 는 제품 함수로 묶은 코드, 다른 표본은 한 줄에 싣는 가장 긴 코드(가장 넓은 글자)를 단다.
 * `?code=none` 이면 줄 없음 · `?code=<글>` 이면 그 글 · `?code=<수>` 면 그 글자 수의 지은 코드.
 */
function codeFor(set: string | null): string | undefined {
  const asked = params.get("code");
  if (asked === "none") return undefined;
  if (asked) return /^\d+$/.test(asked) ? syntheticCode(Number(asked)) : asked;
  if (set === "photo-cloze") return photoCode();
  if (!set || set === "fixture")
    return encodeSheetCode(fixtureSelection, FIXTURE_BANK);
  return syntheticCode(LONGEST_CODE_SYMBOLS);
}
const code = codeFor(params.get("set"));
const plans = sheets.filter(sheetHasContent).map(planSheet);

/** 덩이마다의 어림 높이 — 지면 DOM 순서 그대로(학생지 문항 · 채점표 줄). 머리글(«가» · ○× 안내)은 뺀 값. */
const estimates = {
  items: plans.flatMap((plan) =>
    plan.student.flatMap((page) =>
      page.form === "term"
        ? page.blocks.map((b) => termCost(b, b))
        : page.form === "cloze"
          ? page.blocks.map((b) => clozeCost(b, b))
          : [],
    ),
  ),
  rows: plans.flatMap((plan) =>
    plan.key.flatMap((rows) => rows.map(keyRowCost)),
  ),
  worst: params.get("set")?.startsWith("worst")
    ? worstPicks(params.get("set") as WorstSet)
    : undefined,
};

/**
 * `?set=ink` — 빈칸 폭 어림의 자. 은행의 수식 핵심어 · 예의 답과 눈금 수식을 지면 글꼴 14px 로 한 줄씩 그려,
 * 실제로 그려진 폭과 `inkEm`(빈칸 길이를 정하는 «보이는 폭»)을 `ink.spec.ts` 가 맞댄다.
 */
function InkProbe() {
  const texts = [...new Set([...inkProbeTexts(), ...CAL_MATH])];
  return (
    <div
      style={{
        fontFamily: '"cb-harness-noto-serif-kr"',
        fontSize: 14,
        lineHeight: 2.4,
      }}
    >
      {texts.map((text) => (
        <div key={text}>
          <span
            data-cb-ink={inkEm(text)}
            data-cb-ink-raw={text}
            style={{ display: "inline-block", whiteSpace: "nowrap" }}
          >
            <PaperText text={text} />
          </span>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main style={{ ["--cb-paper-scale" as string]: params.get("scale") ?? 1 }}>
      {params.has("builder") ? (
        <ConceptBlankView bank={FIXTURE_BANK} active />
      ) : params.get("set") === "ink" ? (
        <InkProbe />
      ) : params.has("preview") ? (
        <ConceptBlankPreview
          code={code}
          sheets={sheets}
          view={parseConceptBlankView(params.get("view") ?? undefined)}
        />
      ) : (
        <ConceptBlankPaper
          code={code}
          sheets={sheets}
          view={parseConceptBlankView(params.get("view") ?? undefined)}
        />
      )}
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(estimates) }}
        id="cb-estimates"
        type="application/json"
      />
    </main>
  </StrictMode>,
);
