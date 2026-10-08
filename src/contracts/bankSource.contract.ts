/**
 * 문제은행 «출처 고르기» 계약 — 출처 갈래 · 학기 · 교과서 책 · 자료 종류 (D-161 · 05 S-08 H1 [확정 — 2026-10-08]).
 *
 *   필터 줄의 «출처» 칸 → 고르기 창(`PickerDialog`)
 *     맨 위 출처 줄      전체 · 엔진 · 교과서 · 기출 · 그 밖      → `sourceGroup`
 *     교과서일 때 세 단  과목 │ 그 과목의 책 │ 자료 종류          → `books` · `materialKinds`
 *   첫 줄의 «학기» 칸                                         → `semester`(차시의 `unit.semester`)
 *
 * 목록(`GET …/problems`)과 랜덤 추가(`POST …/problems/random`)가 **같은 조건**을 쓴다(`unifiedPreview.ts`).
 * 고르기 창의 수는 `GET …/problems/sources` 가 준다(`bankSourceCountsSchema`).
 */
import { z } from "zod";

import type { ProblemSource } from "./common.contract";
import { problemFilterQuerySchema } from "./problem.contract";
import { sourceMaterialKindSchema } from "./sourceMaterial.contract";

/**
 * 출처 줄의 갈래 — 출처 값 다섯을 넷으로 묶는다(리드 결정 2026-10-08).
 *
 * ⚠️ «엔진»은 `source = 'manual'` **전부**다. manual 에는 엔진 표지(`familyKey`) 없는 옛 수작업 행이 섞여 있다
 *    (`provenance.ts` `classifyOrigin` 의 `unknown`) — 출처 줄은 표지를 보지 않고 출처 값으로만 가른다.
 *    그래서 문항 상세의 출처 이름(`SOURCE_LABEL.manual` = «자작»)과 이 줄의 «엔진»은 다른 말이다.
 */
export const BANK_SOURCE_GROUPS = [
  "engine",
  "school_textbook",
  "past_exam",
  "other",
] as const;
export const bankSourceGroupSchema = z.enum(BANK_SOURCE_GROUPS);
export type BankSourceGroup = z.infer<typeof bankSourceGroupSchema>;

/** 갈래 → 출처 값. 출처 값 하나는 꼭 한 갈래에만 든다(시험이 지킨다). */
export const BANK_SOURCE_GROUP_SOURCES: Record<
  BankSourceGroup,
  readonly ProblemSource[]
> = {
  engine: ["manual"],
  school_textbook: ["school_textbook"],
  past_exam: ["past_exam"],
  other: ["transformed", "ai_generated"],
};

/** 학기 — 차시의 `unit.semester`(D-161). 학기가 없는 차시(고등 선택 과목)는 «전체 학기»일 때만 나온다. */
export const BANK_SEMESTERS = ["1", "2"] as const;
export const bankSemesterSchema = z.enum(BANK_SEMESTERS, {
  error: "학기는 1학기 또는 2학기만 고를 수 있습니다.",
});
export type BankSemester = z.infer<typeof bankSemesterSchema>;

/** 한 번에 고를 수 있는 책의 상한 — 지금 교과서 책은 35권이다(2026-10-08). 주소 길이를 막는 방어선. */
export const BANK_BOOK_LIMIT = 100;

/**
 * 쉼표로 이은 값 → 겹치지 않는 배열. 빈 조각은 버리고, 남은 것이 없으면 잘못된 값이다
 * (화면은 빈 고르기를 **아예 안 보낸다** — 보냈다면 무언가 어긋난 것이다).
 * 항목 검사는 배열 쪽이 한다(책은 uuid · 자료 종류는 계약의 목록).
 */
const splitComma = z.string().transform((value) => [
  ...new Set(
    value
      .split(",")
      .map((piece) => piece.trim())
      .filter(Boolean),
  ),
]);
const EMPTY_PICK = { error: "고른 값이 비어 있습니다." };

/** 책 열쇠 — `source_book.id`. 이름(출판사 · 저자)은 바뀔 수 있어 열쇠로 쓰지 않는다. */
export const bankBookIdsParamSchema = splitComma.pipe(
  z
    .array(z.uuid({ error: "책 식별자 형식이 올바르지 않습니다." }))
    .min(1, EMPTY_PICK)
    .max(BANK_BOOK_LIMIT, {
      error: `책은 한 번에 ${BANK_BOOK_LIMIT}권까지 고를 수 있습니다.`,
    }),
);
/** 자료 종류 — 계약의 목록(`SOURCE_MATERIAL_KINDS`)만. 적재기도 목록 밖의 값을 거절한다. */
export const bankMaterialKindsParamSchema = splitComma.pipe(
  z.array(sourceMaterialKindSchema).min(1, EMPTY_PICK),
);

/**
 * 통합 문제은행의 조회 조건 — 옛 필터(`problemFilterQuerySchema`)에서 이 화면이 쓰는 것 + 새 넷.
 *
 * 🔴 책 · 자료 종류는 **출처가 교과서일 때만** 받는다. 다른 출처와 섞이면 질의가 조용히 0건이 되고,
 *    화면은 «조건에 맞는 문제가 없어요»만 말한다 — 원인을 못 짚는 0 보다 400 이 낫다.
 */
export const unifiedBankQuerySchema = problemFilterQuerySchema
  .pick({
    q: true,
    grade: true,
    chapter: true,
    chapterPrefix: true,
    unitFrom: true,
    unitTo: true,
    difficulty: true,
    problemType: true,
    format: true,
    source: true,
    reviewStatus: true,
    hasFigure: true,
    hasSolution: true,
    hasAnswer: true,
    page: true,
  })
  .extend({
    semester: bankSemesterSchema.optional(),
    sourceGroup: bankSourceGroupSchema.optional(),
    books: bankBookIdsParamSchema.optional(),
    materialKinds: bankMaterialKindsParamSchema.optional(),
  })
  .superRefine((query, ctx) => {
    const textbook =
      query.sourceGroup === "school_textbook" ||
      query.source === "school_textbook";
    if (textbook) return;
    for (const key of ["books", "materialKinds"] as const)
      if (query[key])
        ctx.addIssue({
          code: "custom",
          path: [key],
          message:
            "교과서 책 · 자료 종류는 출처가 교과서일 때만 고를 수 있습니다.",
        });
  });
export type UnifiedBankQuery = z.infer<typeof unifiedBankQuerySchema>;

// ── 고르기 창의 수 (`GET …/problems/sources`) ───────────────────────────
const countSchema = z.number().int().min(0);

/**
 * 교과서 책 한 권 — 과목(`unit.grade` 와 같은 값) · 출판사 · 저자.
 *
 * `count` 는 공용 풀에 실린 문항 · `open` 은 그 가운데 출제 자격이 있는 문항 · `materials` 는 문항이 실린 자료 수다.
 * `kinds` 는 자료 종류별 문항 수 — 창이 «고른 책에 맞춘 자료 종류별 수»와 «걸리는 문항»을 요청 없이 센다.
 */
export const bankSourceBookSchema = z.strictObject({
  id: z.uuid(),
  grade: z.string().min(1),
  publisher: z.string().min(1),
  author: z.string().min(1).nullable(),
  title: z.string().min(1),
  count: countSchema,
  open: countSchema,
  materials: countSchema,
  kinds: z.record(z.string().min(1), countSchema),
});
export type BankSourceBook = z.infer<typeof bankSourceBookSchema>;

/**
 * 고르기 창이 받는 수 — **다른 필터와 무관하게** 공용 풀(`pool = shared`) 전부로 센다(리드 결정 2026-10-08).
 *
 * `sources.total` 은 출처 줄의 «전체» · `textbook.total` 은 «걸리는 문항 n개 / 교과서 N» 의 N 이다
 * (자료가 붙지 않은 교과서 문항까지 든다 — 책을 하나도 안 골랐을 때의 «걸리는 문항»이 이 값이다).
 * `textbook.grades` 는 책이 있는 과목만, 교육과정 차례(`unit.orderIndex`)로 · `kinds` 는 계약의 차례로.
 */
export const bankSourceCountsSchema = z.strictObject({
  sources: z.strictObject({
    total: countSchema,
    engine: countSchema,
    school_textbook: countSchema,
    past_exam: countSchema,
    other: countSchema,
  }),
  textbook: z.strictObject({
    total: countSchema,
    grades: z.array(z.string().min(1)),
    kinds: z.array(z.string().min(1)),
    books: z.array(bankSourceBookSchema),
  }),
});
export type BankSourceCounts = z.infer<typeof bankSourceCountsSchema>;
