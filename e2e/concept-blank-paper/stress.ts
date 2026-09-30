import type {
  ApplyItem,
  ConceptBlankSheet,
  ConceptEntry,
  FigureItem,
  OxItem,
  SheetHeader,
} from "../../src/contracts/conceptBlank.contract";
import { FIXTURE_BANK } from "../../src/lib/concept-blank/fixture";

/**
 * 계약 상한 지면 — 넘침을 재려고 **모든 글을 계약이 허락하는 가장 긴 꼴**로 채운다
 * (용어 40 · 뜻 160 · 예 물음 80 / 답 60 · ○× 120 · 적용 120 · 그림 물음 60 · 줄 이름 24 · 이름표 넷).
 * 글은 뜻 없는 우리 말 채움 — 교재 문장이 아니다.
 */
const SECTION = "초5::2-3 합동과 대칭::2-3-1 도형의 합동 알아보기";

/** 띄어쓰기가 있는 한글 채움을 정확히 n 자로. */
function fill(
  n: number,
  seed = "넓이와 둘레를 함께 재어 보는 긴 문장 ",
): string {
  let s = "";
  while (s.length < n) s += seed;
  return s.slice(0, n).replace(/\s+$/, "끝");
}

/** 핵심어 네 곳이 든 160자 뜻 문장. */
function longDefinition(i: number): string {
  const keys = ["{대응하는 두 변의 길이}", "{크기}", "{한가운데}", "{직각}"];
  const body = keys.join(" 그리고 ");
  const pad = 160 - body.length - 1;
  return `${fill(pad, `긴 뜻 문장 ${i}번은 여러 조건을 겹쳐 말하므로 `)} ${body}`.slice(
    0,
    160,
  );
}

const header = (form: SheetHeader["form"]): SheetHeader => ({
  title: fill(40, "십월 첫째 주 합동과 대칭 개념 백지 복습 "),
  unitLabel: "초5 · 2-3 합동과 대칭 외 3단원",
  date: "2026-10-01",
  form,
});

const concept = (i: number): ConceptEntry => ({
  id: `stress-c-${i}`,
  section: SECTION,
  term: fill(40, `아주 긴 용어 이름 ${i} 대응점 대응변 대응각 `),
  kind: "성질",
  level: "상",
  definition: longDefinition(i),
  example: {
    prompt: fill(80, `예를 들어 설명하는 긴 물음 ${i}번이 여기 이어진다 `),
    answer: fill(60, "답도 길게 쓴 긴 답 "),
  },
});

const ox = (i: number): OxItem => ({
  id: `stress-o-${i}`,
  section: SECTION,
  level: "중",
  statement: fill(120, `참인지 거짓인지 가리는 긴 문장 ${i}번이 이어진다 `),
  answer: i % 2 === 0,
  why: fill(120, "까닭을 길게 적은 문장이 이어진다 "),
});

const apply = (i: number): ApplyItem => ({
  id: `stress-a-${i}`,
  section: SECTION,
  level: "상",
  prompt: fill(120, `방금 쓴 뜻으로 풀어 보는 긴 적용 물음 ${i}번 `),
  answer: fill(80, "적용 답을 길게 쓴 것 "),
});

const baseFigure = FIXTURE_BANK.figures[0]!;
const figure = (i: number): FigureItem => ({
  ...baseFigure,
  id: `stress-f-${i}`,
  prompt: fill(60, `그림을 보고 이름과 뜻을 쓰는 긴 물음 ${i} `),
  tags: [
    { x: 4, y: 4, w: 80, answer: fill(20, "대칭의 중심 이름표 ") },
    { x: 116, y: 4, w: 80, answer: "대칭축" },
    { x: 4, y: 104, w: 80, answer: "대응점" },
    { x: 116, y: 104, w: 80, answer: "대응변" },
  ],
  lines: [
    {
      label: fill(24, "도형 이름과 뜻을 쓰는 줄 "),
      answer: fill(120, "줄 답을 길게 쓴 것 "),
    },
    { label: "성질", answer: fill(120, "성질 답을 길게 쓴 것 ") },
  ],
});

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

export const STRESS_SHEETS: ConceptBlankSheet[] = [
  {
    form: "recall",
    header: header("recall"),
    zones: range(6).map((i) => ({
      section: `${SECTION}-${i}`,
      title: fill(40, `아주 긴 소단원 이름 ${i} 알아보기와 활용 `),
      hint: "정의 · 성질 · 공식 · 방법 · 법칙 · 정리 · 단위",
      side: i % 2 ? ("그림" as const) : ("예" as const),
    })),
    key: range(14).map(concept),
  },
  {
    form: "term",
    header: header("term"),
    terms: range(9).map(concept),
    ox: range(9).map(ox),
  },
  {
    form: "cloze",
    header: header("cloze"),
    sentences: range(16).map(concept),
    apply: range(4).map(apply),
  },
  {
    form: "map",
    header: header("map"),
    maps: [
      {
        hub: "문자의 사용과 식의 계산 (1)",
        nodes: range(6).map(concept),
      },
      { hub: "합동", nodes: range(3).map(concept) },
    ],
  },
  {
    form: "figure",
    header: header("figure"),
    figures: range(7).map(figure),
  },
];
