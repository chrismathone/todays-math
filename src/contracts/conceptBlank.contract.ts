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
  term: "개념 질문",
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

/** 뜻 문장 조각 — 글(수식 `$...$` 이 섞일 수 있다) 또는 핵심어(`{ }` 안). */
export type BlankSentencePiece =
  { kind: "text"; text: string } | { kind: "key"; text: string };

/**
 * `open` 자리의 `{` 가 여는 핵심어의 닫는 `}` 자리. 핵심어 안의 `$...$` 는 통째로 건너뛴다(그 안의 `{ }` 는 TeX 묶음).
 * 수식 밖에서 `{` 를 또 만나거나(겹침) 수식 · 괄호가 안 닫히면 -1.
 */
function keywordEnd(sentence: string, open: number): number {
  let j = open + 1;
  while (j < sentence.length) {
    const ch = sentence[j]!;
    if (ch === "$") {
      const close = sentence.indexOf("$", j + 1);
      if (close < 0) return -1;
      j = close + 1;
      continue;
    }
    if (ch === "{") return -1;
    if (ch === "}") return j;
    j += 1;
  }
  return -1;
}

/**
 * 뜻 문장을 글 · 핵심어 조각으로 나눈다 — 핵심어를 가르는 **하나뿐인 자리**다(계약 · 은행 시험 · 지면이 같이 쓴다).
 * 🔴 `$...$` 안의 `{ }` 는 TeX 묶음(`\frac{1}{2}`)이라 핵심어가 아니다 — 글에 그대로 둔다.
 * 핵심어는 수식을 품을 수 있다(`{$\frac{\sqrt{3}}{2}$}` — 원장님 2026-09-30 «카텍스 사용할 것»).
 * 짝이 없거나 겹친 `{` 는 핵심어로 치지 않고 글에 남긴다(스키마가 그 남은 괄호를 거절한다).
 */
export function splitBlankSentence(sentence: string): BlankSentencePiece[] {
  const pieces: BlankSentencePiece[] = [];
  let text = "";
  let i = 0;
  while (i < sentence.length) {
    const ch = sentence[i]!;
    if (ch === "$") {
      const close = sentence.indexOf("$", i + 1);
      const end = close < 0 ? sentence.length : close + 1;
      text += sentence.slice(i, end);
      i = end;
      continue;
    }
    if (ch === "{") {
      const close = keywordEnd(sentence, i);
      const inner = close < 0 ? "" : sentence.slice(i + 1, close);
      if (inner.trim()) {
        if (text) pieces.push({ kind: "text", text });
        text = "";
        pieces.push({ kind: "key", text: inner.trim() });
        i = close + 1;
        continue;
      }
    }
    text += ch;
    i += 1;
  }
  if (text) pieces.push({ kind: "text", text });
  return pieces;
}

/** 지면에 아무것도 찍지 않는 TeX 명령(묶음 · 글꼴 · 크기) — 보이는 글자 수에서 뺀다. 그 밖의 명령은 한 글자로 센다. */
const SILENT_TEX =
  /\\(?:d?frac|tfrac|overline|underline|mathrm|mathit|mathbf|text|left|right|displaystyle|dot|bar|hat|widehat|overrightarrow|overleftrightarrow|overset|underset)(?![A-Za-z])/g;

/**
 * 지면에 **보이는 글자 수** 어림 — 글자 수 상한을 재는 자다. `$...$` 의 KaTeX 마크업(명령 · 묶음 · 간격)과
 * 핵심어 괄호는 세지 않는다. 수식으로 옮겼다고 같은 글이 상한에 걸리면 말을 돌려 쓰게 된다(2026-09-30 은행 2차).
 * 폭을 재는 자가 아니다 — 폭은 지면(cb-paper `textEm`)이 잰다.
 */
export function visibleLength(text: string): number {
  const shown = text.replace(/\$([^$]*)\$/g, (_, math: string) =>
    math
      .replace(SILENT_TEX, "")
      .replace(/\\[A-Za-z]+/g, "·")
      .replace(/\\[,;:! ]/g, "")
      .replace(/[{}^_\s]/g, ""),
  );
  return [...shown.replace(/[{}]/g, "")].length;
}

/** 지면 글 한 칸 — 상한은 보이는 글자로 잰다(마크업까지 친 길이는 그 네 배에서 막는다). */
const paperText = (min: number, max: number) =>
  z
    .string()
    .min(min)
    .max(max * 4)
    .refine((s) => visibleLength(s) <= max, `보이는 글자 ${max}자 이내`);

/**
 * 뜻 문장 — 핵심어를 `{ }` 로 감싼다(1~4곳). 빈칸 형식은 `{ }` 자리를 비우고, 채점표는 `{ }` 를 핵심어로 굵게 쓴다.
 * 수식은 `$...$`(KaTeX) — 수식 안의 `{ }` 는 TeX 묶음이라 핵심어로 세지 않는다. 답이 식이면 핵심어에 수식을 싣는다(`{$...$}`).
 */
export const blankSentenceSchema = paperText(8, 160).refine((s) => {
  const pieces = splitBlankSentence(s);
  const n = pieces.filter((p) => p.kind === "key").length;
  const stray = pieces.some(
    (p) => p.kind === "text" && /[{}]/.test(p.text.replace(/\$[^$]*\$/g, "")),
  );
  return n >= 1 && n <= 4 && !stray;
}, "핵심어 { } 는 1~4곳, 겹치거나 짝이 안 맞으면 안 된다");

/** B의 물음과 참고 답. anyOf는 같은 내용을 표현한 대안이며, 자동 문자열 채점 규칙이 아니다. */
export type ConceptQuestion = {
  prompt: string;
  answer: string;
  requiredIdeas: { anyOf: string[] }[];
};
// 중첩 스키마의 내부 제네릭을 모든 교재 계약으로 전파하지 않고 입출력 타입을 명시한다.
export const conceptQuestionSchema: z.ZodType<
  ConceptQuestion,
  ConceptQuestion
> = z.strictObject({
  prompt: paperText(6, 240),
  answer: paperText(1, 240),
  requiredIdeas: z
    .array(
      z.strictObject({
        anyOf: z.array(paperText(1, 160)).min(1).max(8),
      }),
    )
    .min(1)
    .max(6),
});

/** C는 일반 설명과 별도의 문항이다. 유지한 문항도 문장과 빈칸별 인정 답을 명시적으로 저장한다. */
export type ConceptClozeQuestion = {
  sentence: string;
  acceptedAnswers: string[][];
};
export const conceptClozeQuestionSchema: z.ZodType<
  ConceptClozeQuestion,
  ConceptClozeQuestion
> = z
  .strictObject({
    sentence: blankSentenceSchema,
    acceptedAnswers: z
      .array(z.array(paperText(1, 80)).min(1).max(10))
      .min(1)
      .max(4),
  })
  .superRefine((question, ctx) => {
    const keys = blankKeywords(question.sentence);
    if (
      keys.length !== question.acceptedAnswers.length ||
      keys.some((key, index) => !question.acceptedAnswers[index]?.includes(key))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "빈칸마다 지문의 정답을 포함한 인정 답이 필요합니다.",
      });
    }
  });

/** 개념 한 장 — B · C 문항, A 의 채점 항목, D 의 가지가 모두 여기서 나온다. */
export const conceptEntrySchema = z
  .strictObject({
    id: idSchema,
    section: sectionKeySchema,
    term: paperText(1, 40),
    kind: z.enum(CONCEPT_KINDS),
    level: levelSchema,
    definition: blankSentenceSchema,
    /** 새 발행물에 질문의 판을 남긴다. 없는 옛 동결 자료는 당시 내용으로만 읽는다. */
    questionRevision: z.string().min(1).max(80).optional(),
    bQuestion: conceptQuestionSchema.nullable().optional(),
    clozeQuestion: conceptClozeQuestionSchema.nullable().optional(),
    /** null은 이 형식에서만 제외한다는 뜻이다. 개념 ID나 학습 설명을 폐기하지 않는다. */
    questionExclusions: z
      .strictObject({
        term: paperText(4, 240).optional(),
        cloze: paperText(4, 240).optional(),
      })
      .optional(),
    /** D 가지의 «예» — 짧은 물음과 답(없으면 빈 예 칸). */
    example: z
      .strictObject({
        prompt: paperText(4, 80),
        answer: paperText(1, 60),
      })
      .optional(),
    /**
     * 사례 문항 — 굵은 답이 **용어에 주어진 값**으로 정해진다(«$4\,\mathrm{m}$의 $0.3$배 구하기» → `{$1.2\,\mathrm{m}$}`).
     * A(완전 백지)는 소단원 이름만 보여 주므로 이런 카드는 떠올릴 수도, 채점표 줄과 맞춰 볼 수도 없다 — A 채점표에 싣지 않는다
     * (전수 검토 2026-10-02 합의 안건 11 · 26 §10). 답이 낱말이어도 해당한다. 단위 환산 · 자리값 · 직각 $90^\circ$처럼
     * 수 자체가 개념인 카드는 사례가 아니다. 읽는 곳은 A 를 고르는 `composeSheets` 하나다.
     */
    givenCase: z.literal(true).optional(),
  })
  .superRefine((entry, ctx) => {
    const assessed =
      entry.bQuestion !== undefined ||
      entry.clozeQuestion !== undefined ||
      entry.questionRevision !== undefined;
    if (!assessed) return;
    if (
      !entry.questionRevision ||
      entry.bQuestion === undefined ||
      entry.clozeQuestion === undefined
    )
      ctx.addIssue({
        code: "custom",
        message:
          "새 문항에는 판 번호와 B·C의 질문 또는 제외 결정이 모두 필요합니다.",
      });
    if (
      (entry.bQuestion === null && !entry.questionExclusions?.term) ||
      (entry.clozeQuestion === null && !entry.questionExclusions?.cloze)
    )
      ctx.addIssue({
        code: "custom",
        message: "출제에서 제외한 형식에는 사유가 필요합니다.",
      });
  });
export type ConceptEntry = z.infer<typeof conceptEntrySchema>;

/** ○× — B 뒤에 붙는다. */
export const oxItemSchema = z.strictObject({
  id: idSchema,
  section: sectionKeySchema,
  level: levelSchema,
  statement: paperText(6, 120),
  answer: z.boolean(),
  /** 채점표의 까닭 한 줄. */
  why: paperText(4, 120),
});
export type OxItem = z.infer<typeof oxItemSchema>;

/** 적용 — C 뒤 «나»에 붙는다. 답은 짧게(수 · 낱말 · 짧은 구). */
export const applyItemSchema = z.strictObject({
  id: idSchema,
  section: sectionKeySchema,
  level: levelSchema,
  prompt: paperText(6, 120),
  answer: paperText(1, 80),
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
  prompt: paperText(2, 60),
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
        label: paperText(1, 24),
        answer: paperText(2, 120),
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

/** 지면 제목 상한 — 저장한 개념 백지의 자료 이름도 이 안이다. */
export const CONCEPT_BLANK_TITLE_MAX = 40;

/**
 * 원장님이 고른 것 — 소단원 여럿 · 형식 여럿 · 형식마다 난이도별 문항 수. 이것만으로 지면이 정해진다(고정).
 * 주소(`?s=`)에 실어 같은 링크 = 같은 지면.
 */
export const conceptBlankPickSchema = z.strictObject({
  blankSectionKey: sectionKeySchema,
  entryKind: z.enum(["concept", "ox", "apply", "figure"]),
  entryId: idSchema,
  form: z.enum(CONCEPT_BLANK_FORMS),
  level: levelSchema,
});
export type ConceptBlankPick = z.infer<typeof conceptBlankPickSchema>;

const conceptBlankSelectionBaseSchema = z.strictObject({
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
  title: z.string().max(CONCEPT_BLANK_TITLE_MAX).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  pick: z.array(conceptBlankPickSchema).min(1).max(2000).optional(),
});
function validateExactSelection(
  value: z.infer<typeof conceptBlankSelectionBaseSchema>,
  ctx: z.RefinementCtx,
) {
  if (!value.pick) return; // Existing selection bytes and behavior remain unchanged.
  const issue = (message: string, path: (string | number)[] = ["pick"]) =>
    ctx.addIssue({ code: "custom", message, path });
  const formSet = new Set(value.forms.map((f) => f.form));
  if (formSet.size !== value.forms.length)
    issue("정확한 선택의 형식을 중복 지정할 수 없습니다.", ["forms"]);
  if (new Set(value.sections).size !== value.sections.length)
    issue("소단원을 중복 지정할 수 없습니다.", ["sections"]);
  const seen = new Set<string>(),
    closedGroups = new Set<string>();
  let previous = "";
  for (const [i, pick] of value.pick.entries()) {
    const key = `${pick.form}:${pick.entryKind}:${pick.entryId}`;
    if (seen.has(key))
      issue("같은 형식의 같은 항목을 중복 선택할 수 없습니다.", ["pick", i]);
    seen.add(key);
    const group = `${pick.form}:${pick.blankSectionKey}`;
    if (group !== previous) {
      if (closedGroups.has(group))
        issue("분리된 형식·소단원 그룹이 다시 등장합니다.", ["pick", i]);
      if (previous) closedGroups.add(previous);
      previous = group;
    }
    if (
      !value.sections.includes(pick.blankSectionKey) ||
      !formSet.has(pick.form)
    )
      issue("선택 형식과 소단원이 일치하지 않습니다.", ["pick", i]);
    const compatible =
      pick.entryKind === "concept"
        ? pick.form !== "figure"
        : pick.entryKind === "ox"
          ? pick.form === "term"
          : pick.entryKind === "apply"
            ? pick.form === "cloze"
            : pick.form === "figure";
    if (!compatible)
      issue("항목 종류가 백지 형식과 맞지 않습니다.", ["pick", i]);
  }
  for (const [i, { form, counts, extras }] of value.forms.entries()) {
    for (const level of CONCEPT_BLANK_LEVELS) {
      const matches = value.pick.filter(
        (p) => p.form === form && p.level === level,
      );
      const main = matches.filter(
        (p) => p.entryKind === "concept" || p.entryKind === "figure",
      ).length;
      if (counts[level] !== main || extras[level] !== matches.length - main)
        issue("문항 수와 추가 문항 수가 정확한 선택과 다릅니다.", ["forms", i]);
    }
  }
  for (const section of value.sections)
    if (!value.pick.some((p) => p.blankSectionKey === section))
      issue("선택 항목이 없는 소단원입니다.", ["sections"]);
}
export const conceptBlankSelectionSchema =
  conceptBlankSelectionBaseSchema.superRefine(validateExactSelection);
export type ConceptBlankSelection = z.infer<typeof conceptBlankSelectionSchema>;

/**
 * 내 시험지에 저장한 개념 백지(원장님 2026-10-01 «담아서 내 시험지에 저장하고 다음에 또 쓸수 있게», 26 §9 ⑾) —
 * `workspace_document` 의 `conceptBlank` 종류의 payload. 고정 문항이라 **고르기만** 담으면 같은 지면이 다시 나온다.
 * 날짜는 담지 않는다 — 다음에 열면 그날(화면의 처음 값). 자료 이름은 지면 제목과 같이 간다(이름 바꾸기도 제목을 고친다).
 */
export const conceptBlankDocumentSchema = z.strictObject({
  selection: conceptBlankSelectionBaseSchema
    .omit({ date: true })
    .superRefine(validateExactSelection),
});
export type ConceptBlankDocument = z.infer<typeof conceptBlankDocumentSchema>;

/* ───────── 지면 코드(사진 채점의 첫 걸음 — 트랙 cb-code · 26 §8) ───────── */

/**
 * 지면 코드 글자표 — Crockford base32. 대문자 + 숫자에서 헷갈리는 `I` · `L` · `O` · `U` 를 뺐다(값 = 글자의 차례).
 * 읽을 때는 소문자 · `O`(→ 0) · `I` · `L`(→ 1)도 받는다 — 손으로 옮기거나 사진에서 읽은 글을 너그럽게.
 */
export const SHEET_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
/** 꼴 판 번호 — 코드 맨 앞 글자(`1`). 꼴을 바꾸면 올린다(옛 지면은 옛 판으로 읽는다). */
export const SHEET_CODE_VERSION = 1;
/** 은행 지문 글자 수(20비트) — 그 고르기로 지면에 찍힌 문항에서 낸다. */
export const SHEET_CODE_DIGEST_LENGTH = 4;

/** 찍힌 꼴 — `1` 로 시작해 네 글자마다 점(마지막 묶음은 1~4글자). */
export const sheetCodeSchema = z
  .string()
  .regex(
    /^1[0-9A-HJKMNP-TV-Z]{3}(?:\.[0-9A-HJKMNP-TV-Z]{4})*(?:\.[0-9A-HJKMNP-TV-Z]{1,3})?$/,
    "지면 코드는 «1» 로 시작하는 Crockford base32, 네 글자마다 점",
  );

/**
 * 코드를 읽은 것 — 🔴 코드는 **지면을 가리킬 뿐 학생을 가리키지 않는다**(이름 · 번호 · 제목 · 날짜를 싣지 않는다).
 * 그래서 `selection` 에는 제목 · 날짜가 없다(문항 · 쪽 나눔을 안 바꾸는 값이다).
 * `bankChanged` — 코드의 지문이 지금 은행으로 낸 지문과 다르다(선택은 그대로 돌려준다 — 옛 지면이다).
 */
export type SheetCodeReading = {
  selection: ConceptBlankSelection;
  bankDigest: string;
  bankChanged: boolean;
};

/** 지면 발 라벨의 몫 이름 — «코드 · 쪽/전체쪽 · 학생지|채점표». */
export const SHEET_PART_LABELS = { student: "학생지", key: "채점표" } as const;

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
      /** 고른 소단원의 사례 문항(`givenCase`) 수 — 채점표에 안 실린 것. 0 이 아니면 채점 안내가 그 말을 한다. */
      omittedCases?: number;
    }
  | {
      form: "term";
      header: SheetHeader;
      terms: ConceptEntry[];
      ox: OxItem[];
      entryOrder?: { entryKind: "concept" | "ox"; entryId: string }[];
    }
  | {
      form: "cloze";
      header: SheetHeader;
      sentences: ConceptEntry[];
      apply: ApplyItem[];
      entryOrder?: { entryKind: "concept" | "apply"; entryId: string }[];
    }
  | {
      form: "map";
      header: SheetHeader;
      maps: { hub: string; nodes: ConceptEntry[] }[];
      /** 질문 판의 지도. 없는 옛 동결 자료는 뜻·예 형식으로 읽는다. */
      questionMode?: true;
    }
  | { form: "figure"; header: SheetHeader; figures: FigureItem[] };

/** 핵심어 꺼내기 — `{ }` 안 글. */
export function blankKeywords(sentence: string): string[] {
  return splitBlankSentence(sentence)
    .filter((p) => p.kind === "key")
    .map((p) => p.text);
}
