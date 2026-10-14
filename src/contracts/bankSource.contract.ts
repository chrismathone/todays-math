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
import { DIFFICULTY_LADDER, type Difficulty } from "./difficulty";
import { uuidSchema } from "./common.contract";
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
/** 한 번에 고를 수 있는 자료의 상한 — 책 한 권의 자료가 가장 많아야 216편이다(2026-10-14 실측). 주소 길이를 막는 방어선. */
export const BANK_MATERIAL_LIMIT = 300;

/**
 * 자료 열쇠 — `source_material.id`(문제은행 P0 2026-10-14 · 책 → 자료 → 자료 안 번호). 교과서일 때만 받는다.
 * 고르면 목록 차례가 자료 → 자료 안 번호(`questionNumber`)가 된다 — 번호는 자료 안에서도 겹칠 수 있어
 * (실측 86편) 번호만으로 문항을 가리키지 않는다(화면은 문항 코드와 함께 보인다).
 */
export const bankMaterialIdsParamSchema = splitComma.pipe(
  z
    .array(z.uuid({ error: "자료 식별자 형식이 올바르지 않습니다." }))
    .min(1, EMPTY_PICK)
    .max(BANK_MATERIAL_LIMIT, {
      error: `자료는 한 번에 ${BANK_MATERIAL_LIMIT}편까지 고를 수 있습니다.`,
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
const idList = (max: number) =>
  z
    .string()
    .transform((value) => value.split(","))
    .pipe(z.array(uuidSchema).min(1).max(max));

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
    unitIds: idList(1000).optional(),
    excludeIds: idList(100).optional(),
    ids: idList(100).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).default(12),
    semester: bankSemesterSchema.optional(),
    sourceGroup: bankSourceGroupSchema.optional(),
    books: bankBookIdsParamSchema.optional(),
    materialKinds: bankMaterialKindsParamSchema.optional(),
    materials: bankMaterialIdsParamSchema.optional(),
  })
  .superRefine((query, ctx) => {
    const textbook =
      query.sourceGroup === "school_textbook" ||
      query.source === "school_textbook";
    if (textbook) return;
    for (const key of ["books", "materialKinds", "materials"] as const)
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

// ── 가용량 보기 (`GET|POST …/problems/sources?view=available`) — 문제은행 P0 (2026-10-14) ──────────
//
// 위의 `bankSourceCountsSchema` 는 **전역 재고**다(D-161 — 다른 필터와 무관). 그 숫자의 뜻을 바꾸지 않으려고
// 현재 조건의 가용량은 **따로 부르는 보기**로 둔다(`view=available` · `version=1`). 기본 응답은 그대로다.
//
//   held       조건 F + 공용 풀(출제 자격 무관)                — «원문 30»
//   available  조건 F + 출제 자격(`problemEligibleWhere`)       — «사용 가능 24»
//              = 목록 total(검수 상태를 고르지 않았을 때) = 랜덤 고르기 풀(난이도 합) = 구성 풀
//
// F 는 목록 · 랜덤 · 구성과 **같은 함수**(`resolveUnifiedBankQuery`)가 해석한다. 각 갈래(facet)는 **자기 축만 빼고**
// 센다 — 고르기 창이 «이것을 고르면 몇 개»를 보이려는 것이다. 축마다 문항당 값이 하나라 갈래의 합은 문항 ID 의 합집합과 같다.

/** 가용량 보기의 판 — 모양을 바꾸면 올린다(옛 화면이 새 모양을 오독하지 않게). */
export const BANK_SOURCE_AVAILABILITY_VERSION = 1;
export const BANK_SOURCE_VIEWS = ["available", "materials"] as const;
export const bankSourceViewSchema = z.enum(BANK_SOURCE_VIEWS, {
  error: "알 수 없는 보기입니다.",
});

/** 갈래가 빼는 축 — 이 이름들은 목록의 조회 조건(`unifiedBankQuerySchema`) 이름 그대로다. */
export const BANK_AVAILABILITY_AXES = {
  units: ["unitIds", "unitFrom", "unitTo"],
  difficulties: ["difficulty"],
  sources: ["source", "sourceGroup", "books", "materialKinds", "materials"],
} as const;

/** 한 칸의 두 수 — 사용 가능은 보유를 넘지 않는다. */
export const bankAvailabilityTallySchema = z
  .strictObject({ held: countSchema, available: countSchema })
  .refine((tally) => tally.available <= tally.held, {
    error: "사용 가능 수가 보유 수보다 클 수 없습니다.",
  });
export type BankAvailabilityTally = z.infer<typeof bankAvailabilityTallySchema>;

export const bankAvailabilityBookSchema = z.strictObject({
  id: z.uuid(),
  held: countSchema,
  available: countSchema,
  /** 자료 종류별 — 책 × 종류는 서로 겹치지 않는다(자료 하나에 책 하나 · 종류 하나). */
  kinds: z.record(z.string().min(1), bankAvailabilityTallySchema),
});

export const bankSourceAvailabilitySchema = z.strictObject({
  view: z.literal("available"),
  version: z.literal(BANK_SOURCE_AVAILABILITY_VERSION),
  held: countSchema,
  available: countSchema,
  /**
   * 갈래별 수. 🔴 `null` 은 **세지 않았다**는 뜻이다(문항 형식 `format` 조건은 본문을 읽어 가르므로 갈래를 안 센다) —
   * 화면은 0 이 아니라 «미확인»으로 둔다.
   */
  facets: z
    .strictObject({
      /** F 에서 차시 고르기(`unitIds` · `unitFrom` · `unitTo`)만 뺀 차시별. 보유가 0 인 차시는 싣지 않는다(없는 키 = 0). */
      units: z.record(z.uuid(), bankAvailabilityTallySchema),
      /** F 에서 난이도만 뺀 난이도별 — 랜덤 고르기의 `available[난이도]` 와 같은 수. 사다리의 칸이 늘 다 있다. */
      difficulties: z.strictObject(
        Object.fromEntries(
          DIFFICULTY_LADDER.map((tier) => [tier, bankAvailabilityTallySchema]),
        ) as Record<Difficulty, typeof bankAvailabilityTallySchema>,
      ),
      /** F 에서 출처 축(`source` · `sourceGroup` · `books` · `materialKinds`)을 뺀 갈래별. `total` 은 갈래 전부. */
      sources: z.strictObject({
        total: bankAvailabilityTallySchema,
        engine: bankAvailabilityTallySchema,
        school_textbook: bankAvailabilityTallySchema,
        past_exam: bankAvailabilityTallySchema,
        other: bankAvailabilityTallySchema,
      }),
      /**
       * 위와 같은 조건 + 출처 = 교과서. `held` · `available` 은 자료가 없는 교과서 문항까지,
       * `books` 는 자료가 붙은 것만(보유가 0 인 책은 싣지 않는다 — 책의 이름 · 과목은 전역 응답에 있다).
       */
      textbook: z.strictObject({
        held: countSchema,
        available: countSchema,
        books: z.array(bankAvailabilityBookSchema),
      }),
    })
    .nullable(),
});
export type BankSourceAvailability = z.infer<
  typeof bankSourceAvailabilitySchema
>;

// ── 자료 보기 (`GET|POST …/problems/sources?view=materials&books=…`) — 문제은행 P0 (2026-10-14) ──────────
//
// 책 → 자료 → 자료 안 번호 탐색의 둘째 단. 고른 책들의 자료 전부를, 저장된 메타데이터 **그대로**(빈 칸은 null —
// 파일 이름이나 문항에서 추정해 채우지 않는다) 싣고, 자료마다 현재 조건 F(출처 축은 뺀다 — 이 보기는 늘 교과서)의
// 보유 · 사용 가능 수를 붙인다. 수가 0 인 자료도 싣는다(화면이 «이 조건에서는 없음»으로 둔다).
// 차례: 요청한 책 차례 → 교과서 대 · 중 · 소단원 번호(없으면 뒤) → 자료 종류 → 회차(없으면 뒤) → 제목.

export const bankSourceMaterialSchema = z
  .strictObject({
    id: z.uuid(),
    bookId: z.uuid(),
    kind: z.string().min(1),
    /** 출판사가 부른 이름 그대로 */
    kindRaw: z.string(),
    /** 자료 제목(파일 이름) */
    title: z.string(),
    chapterNo: z.number().int().nullable(),
    middleNo: z.number().int().nullable(),
    sectionNo: z.number().int().nullable(),
    unitRaw: z.string().nullable(),
    semester: z.number().int().nullable(),
    round: z.string().nullable(),
    levelRaw: z.string().nullable(),
    sequence: z.number().int().nullable(),
    held: countSchema,
    available: countSchema,
  })
  .refine((material) => material.available <= material.held, {
    error: "사용 가능 수가 보유 수보다 클 수 없습니다.",
  });
export type BankSourceMaterial = z.infer<typeof bankSourceMaterialSchema>;

export const bankSourceMaterialsSchema = z.strictObject({
  view: z.literal("materials"),
  version: z.literal(BANK_SOURCE_AVAILABILITY_VERSION),
  materials: z.array(bankSourceMaterialSchema),
});
export type BankSourceMaterials = z.infer<typeof bankSourceMaterialsSchema>;
