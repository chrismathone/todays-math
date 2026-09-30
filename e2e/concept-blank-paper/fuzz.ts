import type {
  ConceptBlankSheet,
  ConceptEntry,
  SheetHeader,
} from "../../src/contracts/conceptBlank.contract";
import { FIXTURE_BANK } from "../../src/lib/concept-blank/fixture";

/**
 * 시드 고정 무작위 지면 — 길이 · 핵심어 수 · 핵심어 길이 · 숫자/라틴/수식 섞임을 계약 한도 안에서 흔든다.
 * 손으로 고른 두 벌(FIXTURE · 계약 상한)이 못 건드리는 «어중간한» 길이에서 쪽 나누기 어림이 모자라지 않은지 본다.
 * 글은 뜻 없는 채움 — 교재 문장이 아니다.
 */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0x100000000;
  };
}

const WORDS = [
  "도형",
  "두",
  "변의",
  "길이가",
  "같을",
  "때",
  "그",
  "사이의",
  "각을",
  "끼인각이라",
  "부른다",
  "수직선",
  "위의",
  "점",
  "12.5",
  "cm",
  "3462",
  "ABC",
  "넓이는",
  "가로×세로",
  "대응하는",
  "꼭짓점끼리",
  "이은",
  "선분",
  "직각",
  "이다",
  // `\frac{a}{b}` 는 계약 검사가 TeX 중괄호를 핵심어로 세어 떨어진다 — 중괄호 없는 꼴로
  "$\\frac ab$",
  "$x^2$",
  "$a \\neq 0$",
];
const KEYS = [
  "합동",
  "대칭축",
  "대칭의 중심",
  "꼭 맞게 겹치면",
  "5, 6, 7, 8, 9",
  "한가운데",
  "직각",
  "대응변",
  "분모",
  "같거나 큰",
];

export function fuzzSheets(seed: number): ConceptBlankSheet[] {
  const r = rng(seed);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
  /** 낱말을 통째로 잇는다 — 자르지 않으니 `$…$` 짝이 깨지지 않는다. */
  const words = (maxLen: number, minLen = 8, plain = false) => {
    const target = minLen + Math.floor(r() * (maxLen - minLen));
    const pool = plain ? WORDS.filter((w) => !w.includes("$")) : WORDS;
    const out: string[] = [];
    for (;;) {
      const next = [...out, pick(pool)].join(" ");
      if (next.length > maxLen) break;
      out.push(next.slice(out.join(" ").length).trim());
      if (next.length >= target) break;
    }
    return out.join(" ") || "도형";
  };
  /** 핵심어 1~4곳 · 160자 안 — 넘칠 조각은 붙이지 않는다(핵심어 하나는 반드시). */
  const definition = () => {
    const n = 1 + Math.floor(r() * 4);
    let s = "";
    for (let i = 0; i < n; i++) {
      const next = `${s ? `${s} ` : ""}${words(40, 4)} {${pick(KEYS)}}`;
      if (i > 0 && next.length > 150) break;
      s = next;
    }
    const tail = `${s} ${words(30, 4)}.`;
    return tail.length <= 160 ? tail : `${s}.`;
  };
  const header = (form: SheetHeader["form"]): SheetHeader => ({
    title: words(40, 4, true),
    unitLabel: "초5 · 2-3 합동과 대칭 외 1단원",
    date: "2026-10-01",
    form,
  });
  const section = "초5::2-3 합동과 대칭::2-3-1 도형의 합동 알아보기";
  const concept = (i: number): ConceptEntry => ({
    id: `fz-${seed}-${i}`,
    section,
    term: words(40, 2),
    kind: "정의",
    level: pick(["하", "중", "상"] as const),
    definition: definition(),
    ...(r() < 0.5
      ? {
          example: {
            prompt: words(80, 6),
            answer: words(60, 1),
          },
        }
      : {}),
  });
  const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
  const n = 10 + Math.floor(r() * 14);
  return [
    {
      form: "recall",
      header: header("recall"),
      zones: range(3).map((i) => ({
        section: `${section}-${i}`,
        title: words(30, 6, true),
        hint: "정의 · 성질",
        side: "예" as const,
      })),
      key: range(n).map(concept),
    },
    {
      form: "term",
      header: header("term"),
      terms: range(n).map(concept),
      ox: range(2 + Math.floor(r() * 8)).map((i) => ({
        id: `fz-${seed}-o${i}`,
        section,
        level: "중" as const,
        statement: words(120, 6),
        answer: r() < 0.5,
        why: words(120, 4),
      })),
    },
    {
      form: "cloze",
      header: header("cloze"),
      sentences: range(n).map(concept),
      apply: range(1 + Math.floor(r() * 5)).map((i) => ({
        id: `fz-${seed}-a${i}`,
        section,
        level: "상" as const,
        prompt: words(120, 6),
        answer: words(80, 1),
      })),
    },
    {
      form: "map",
      header: header("map"),
      maps: [{ hub: words(20, 2, true), nodes: range(6).map(concept) }],
    },
    {
      form: "figure",
      header: header("figure"),
      figures: range(3).map((i) => ({
        ...FIXTURE_BANK.figures[i % 2]!,
        id: `fz-${seed}-f${i}`,
        prompt: words(60, 2),
      })),
    },
  ];
}
