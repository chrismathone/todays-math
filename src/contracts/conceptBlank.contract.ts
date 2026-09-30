import { z } from "zod";
import { CONCEPT_KINDS } from "@/lib/math-explorers/conceptKinds";

/**
 * 개념 백지 — 고정 문항 은행 · 고르기 · 지면 모델 (D-150, 원장님 2026-09-30 · 26번 문서).
 *
 * 🔴 고정 문항이다 — 같은 고르기면 언제나 같은 지면이 나온다(무작위 · AI 변형 없음). 문제은행 `Problem` 과
 * 섞지 않고 DB 도 안 쓴다: 은행은 코드 데이터(`src/lib/concept-blank/bank/*.ts`)다.
 * 🔴 문장은 우리 말로 새로 쓴다 — 교재 원문을 옮기지 않는다(`scripts/qa/concept-blank/check-leak.ts`).
 */

export const CONCEPT_BLANK_LEVELS = ["하", "중", "상"] as const;
export type ConceptBlankLevel = (typeof CONCEPT_BLANK_LEVELS)[number];

/** 다섯 형식 — 시안 A~E(원장님 «모든 폼 적용»). */
export const CONCEPT_BLANK_FORMS = [
  "recall", // A 완전 백지 — 소단원 이름만 보고 떠올려 쓴다
  "term", // B 용어 → 뜻 쓰기 (+ ○×)
  "cloze", // C 교재 문장 빈칸 (+ 적용)
  "map", // D 개념 지도 — 가지마다 뜻 + 예
  "figure", // E 그림 보고 쓰기 — 그림 문항이 있는 소단원만
] as const;
export type ConceptBlankForm = (typeof CONCEPT_BLANK_FORMS)[number];

export const CONCEPT_BLANK_FORM_LABELS: Readonly<
  Record<ConceptBlankForm, string>
> = {
  recall: "완전 백지",
  term: "용어 → 뜻",
  cloze: "문장 빈칸",
  map: "개념 지도",
  figure: "그림 보고 쓰기",
};

/**
 * 소단원 열쇠 — `CURRICULUM_UNITS` 의 학년 · 대단원 · 소단원 글을 그대로 `::` 로 잇는다.
 * 예: `초5::1-2 약수와 배수::1-2-3 공약수와 최대공약수` · `중1::1. 소인수분해::소수와 거듭제곱`.
 * 중학 소단원에는 번호가 없어 글 전체를 열쇠로 쓴다. 은행의 모든 열쇠가 교육과정에 있는지는 시험이 잠근다.
 */
export const sectionKeySchema = z
  .string()
  .regex(
    /^(초[1-6]|중[1-3])::[^:]+::[^:]+$/,
    "소단원 열쇠는 «학년::대단원::소단원» 꼴",
  );

const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id 는 소문자 · 숫자 · 붙임표");
const levelSchema = z.enum(CONCEPT_BLANK_LEVELS);

/**
 * 뜻 문장 — 핵심어를 `{ }` 로 감싼다(1~4곳). 빈칸 형식은 `{ }` 자리를 비우고, 채점표는 `{ }` 를 핵심어로 굵게 쓴다.
 * 수식은 `$...$`(KaTeX). `{ }` 안에 `$` 를 넣지 않는다.
 */
export const blankSentenceSchema = z
  .string()
  .min(8)
  .max(160)
  .refine((s) => {
    const n = (s.match(/\{[^{}]+\}/g) ?? []).length;
    return (
      n >= 1 &&
      n <= 4 &&
      !/\{[^}]*\{|\}[^{]*\}/.test(s.replace(/\{[^{}]+\}/g, ""))
    );
  }, "핵심어 { } 는 1~4곳, 겹치거나 짝이 안 맞으면 안 된다")
  .refine((s) => !/\{[^}]*\$[^}]*\}/.test(s), "{ } 안에 수식($)을 넣지 않는다");

/** 개념 한 장 — B · C 문항, A 의 채점 항목, D 의 가지가 모두 여기서 나온다. */
export const conceptEntrySchema = z.strictObject({
  id: idSchema,
  section: sectionKeySchema,
  term: z.string().min(1).max(40),
  kind: z.enum(CONCEPT_KINDS),
  level: levelSchema,
  definition: blankSentenceSchema,
  /** D 가지의 «예» — 짧은 물음과 답(없으면 빈 예 칸). */
  example: z
    .strictObject({
      prompt: z.string().min(4).max(80),
      answer: z.string().min(1).max(60),
    })
    .optional(),
});
export type ConceptEntry = z.infer<typeof conceptEntrySchema>;

/** ○× — B 뒤에 붙는다. */
export const oxItemSchema = z.strictObject({
  id: idSchema,
  section: sectionKeySchema,
  level: levelSchema,
  statement: z.string().min(6).max(120),
  answer: z.boolean(),
  /** 채점표의 까닭 한 줄. */
  why: z.string().min(4).max(120),
});
export type OxItem = z.infer<typeof oxItemSchema>;

/** 적용 — C 뒤 «나»에 붙는다. 답은 짧게(수 · 낱말 · 짧은 구). */
export const applyItemSchema = z.strictObject({
  id: idSchema,
  section: sectionKeySchema,
  level: levelSchema,
  prompt: z.string().min(6).max(120),
  answer: z.string().min(1).max(80),
});
export type ApplyItem = z.infer<typeof applyItemSchema>;

/**
 * 그림 문항 — E. 그림은 손으로 쓴 SVG 조각(바깥 `<svg>` 없이, `viewBox` 따로). 빈 이름표는 `tags` 의
 * x · y · w(viewBox 좌표, 높이 18)에 지면이 점선 네모로 그린다 — SVG 안에 이름표를 그리지 않는다.
 * 🔴 `<script>` · `on*=` · `href` · 바깥 이미지 금지 — 은행 시험이 막는다.
 */
export const figureItemSchema = z.strictObject({
  id: idSchema,
  section: sectionKeySchema,
  level: levelSchema,
  prompt: z.string().min(2).max(60),
  viewBox: z.string().regex(/^0 0 \d{2,3} \d{2,3}$/),
  svg: z
    .string()
    .min(20)
    .max(4000)
    .refine(
      (s) => !/<script|\son\w+=|href=|<image|<foreignObject/i.test(s),
      "안전하지 않은 SVG",
    ),
  /** 그림 위 빈 이름표 — 답은 그 자리의 이름. */
  tags: z
    .array(
      z.strictObject({
        x: z.number(),
        y: z.number(),
        w: z.number().min(20).max(80),
        answer: z.string().min(1).max(20),
      }),
    )
    .max(4),
  /** 그림 아래 줄 — 줄 이름과 채점 기준. */
  lines: z
    .array(
      z.strictObject({
        label: z.string().min(1).max(24),
        answer: z.string().min(2).max(120),
      }),
    )
    .min(1)
    .max(2),
});
export type FigureItem = z.infer<typeof figureItemSchema>;

/** 한 학년 묶음 파일(`bank/e34.ts` 등)의 꼴. */
export const conceptBlankBankSchema = z.strictObject({
  concepts: z.array(conceptEntrySchema),
  ox: z.array(oxItemSchema),
  apply: z.array(applyItemSchema),
  figures: z.array(figureItemSchema),
});
export type ConceptBlankBank = z.infer<typeof conceptBlankBankSchema>;

/* ───────── 고르기(화면 → 지면) ───────── */

const countsSchema = z.strictObject({
  하: z.number().int().min(0).max(40),
  중: z.number().int().min(0).max(40),
  상: z.number().int().min(0).max(40),
});
export type LevelCounts = z.infer<typeof countsSchema>;

/**
 * 원장님이 고른 것 — 소단원 여럿 · 형식 여럿 · 형식마다 난이도별 문항 수. 이것만으로 지면이 정해진다(고정).
 * 주소(`?s=`)에 실어 같은 링크 = 같은 지면.
 */
export const conceptBlankSelectionSchema = z.strictObject({
  sections: z.array(sectionKeySchema).min(1).max(60),
  forms: z
    .array(
      z.strictObject({
        form: z.enum(CONCEPT_BLANK_FORMS),
        /** B · C · E 본 문항 수(난이도별). A · D 는 고른 소단원의 개념에서 난이도로 거른다. */
        counts: countsSchema,
        /** B 의 ○× · C 의 적용 문항 수(난이도별). 다른 형식은 0. */
        extras: countsSchema,
      }),
    )
    .min(1)
    .max(5),
  title: z.string().max(40).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type ConceptBlankSelection = z.infer<typeof conceptBlankSelectionSchema>;

/* ───────── 지면 모델(합치기 → 인쇄) ───────── */

export type SheetHeader = {
  title: string;
  unitLabel: string;
  date: string | null;
  form: ConceptBlankForm;
};

/** 형식 하나 = 학생지 한 벌 + 채점표 한 벌. 쪽 나누기는 지면 쪽이 한다. */
export type ConceptBlankSheet =
  | {
      form: "recall";
      header: SheetHeader;
      zones: {
        section: string;
        title: string;
        hint: string;
        side: "그림" | "예";
      }[];
      key: ConceptEntry[];
    }
  | { form: "term"; header: SheetHeader; terms: ConceptEntry[]; ox: OxItem[] }
  | {
      form: "cloze";
      header: SheetHeader;
      sentences: ConceptEntry[];
      apply: ApplyItem[];
    }
  | {
      form: "map";
      header: SheetHeader;
      maps: { hub: string; nodes: ConceptEntry[] }[];
    }
  | { form: "figure"; header: SheetHeader; figures: FigureItem[] };

/** 핵심어 꺼내기 — `{ }` 안 글. */
export function blankKeywords(sentence: string): string[] {
  return [...sentence.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]!.trim());
}
