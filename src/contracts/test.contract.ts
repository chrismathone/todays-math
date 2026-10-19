/**
 * 출제/시험지 계약 — FEAT-1, FEAT-2, FEAT-3 (이 프로젝트의 심장).
 *
 * 대응 API 경로:
 *   POST   /api/tests/generate                — 자동 출제 실행 (draft TEST + TEST_PROBLEM 생성)
 *   GET    /api/tests                          — 테스트 목록 조회 (classId/studentId/status 필터)
 *   GET    /api/tests/{id}                     — 테스트 단건 조회 (문항 목록 포함 — 검수 화면 S-05)
 *   PUT    /api/tests/{id}/problems/{seq}      — 문제 교체 (1클릭, 중복 제외 유지)
 *   POST   /api/tests/{id}/confirm             — 테스트 확정 (draft → confirmed)
 *   POST   /api/tests/{id}/print               — 인쇄 기록 (confirmed → printed, printedAt 기록)
 *
 * 참조: docs/planning/04-database-design.md §2.4~2.5 (TEST/TEST_PROBLEM)
 *       docs/planning/03-user-flow.md §3 (자동 출제 플로우), §6 (에러 처리)
 *       docs/planning/06-tasks.md T4.1/T4.2 (INSUFFICIENT_PROBLEMS, 인접 난이도 대체)
 */
import { z } from "zod";

import {
  dataResponseSchema,
  DIFFICULTY_LADDER,
  difficultyRatioSchema,
  difficultySchema,
  errorCodeSchema,
  isoDateSchema,
  isoDateTimeSchema,
  listResponseSchema,
  paginationParamsSchema,
  testStatusSchema,
  testTypeSchema,
  uuidSchema,
} from "./common.contract";
import { classOwnerSchema } from "./class.contract";
import { problemSchema } from "./problem.contract";
import { formatIntentFits, formatIntentSchema } from "./formatIntent.contract";

// ─────────────────────────────────────────────
// 출제 요청 (S-04 출제 설정)
// ─────────────────────────────────────────────

export const testGenerateRequestSchema = z
  .strictObject({
    classId: uuidSchema,
    /** 미지정 시 반 전체 대상. */
    studentId: uuidSchema.optional(),
    testType: testTypeSchema,
    testDate: isoDateSchema,
    /** 미지정 시 반의 defaultProblemCount 사용. */
    problemCount: z
      .number()
      .int()
      .min(1, { error: "문항 수는 1개 이상이어야 합니다." })
      .max(30, { error: "문항 수는 30개를 초과할 수 없습니다." })
      .optional(),
    /** 미지정 시 반의 difficultyRatio 사용. */
    difficultyRatio: difficultyRatioSchema.optional(),
    /** 출제할 실제 형식의 수. 생략은 기존 미지정 정책, 0은 그 형식을 내지 않음. */
    formats: formatIntentSchema.optional(),
    /** 확인테스트(review) 범위 시작 — 일일테스트(daily)는 사용하지 않는다. */
    rangeStartUnitId: uuidSchema.optional(),
    /** 확인테스트 범위 끝 — 일일테스트는 서버가 현재 진도 소단원으로 자동 결정하므로 생략 가능. */
    rangeEndUnitId: uuidSchema.optional(),
  })
  .refine(
    (v) =>
      v.testType !== "review" ||
      (v.rangeStartUnitId !== undefined && v.rangeEndUnitId !== undefined),
    {
      error: "확인테스트는 범위 시작/끝 단원을 모두 지정해야 합니다.",
      path: ["rangeEndUnitId"],
    },
  )
  .refine(
    (value) =>
      value.problemCount === undefined ||
      value.difficultyRatio === undefined ||
      DIFFICULTY_LADDER.reduce(
        (sum, tier) => sum + value.difficultyRatio![tier],
        0,
      ) === value.problemCount,
    {
      error: "난이도 배분의 합이 문항 수와 같아야 합니다.",
      path: ["difficultyRatio"],
    },
  )
  .refine(
    (value) =>
      value.formats === undefined ||
      value.problemCount === undefined ||
      formatIntentFits(value.formats, value.problemCount),
    { error: "형식별 문항 수의 합을 확인해 주세요.", path: ["formats"] },
  );
export type TestGenerateRequest = z.infer<typeof testGenerateRequestSchema>;

// ─────────────────────────────────────────────
// 엔티티
// ─────────────────────────────────────────────

export const testSchema = z.strictObject({
  id: uuidSchema,
  userId: uuidSchema,
  classId: uuidSchema,
  studentId: uuidSchema.nullable(),
  testType: testTypeSchema,
  rangeStartUnitId: uuidSchema.nullable(),
  rangeEndUnitId: uuidSchema,
  status: testStatusSchema,
  /** 검수 중 문제 교체 발생 여부 — 무수정 사용률 측정(입력 지표 ②). */
  modified: z.boolean(),
  testDate: isoDateSchema,
  printedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type TestEntity = z.infer<typeof testSchema>;

/** 시험지에 포함된 문항 — 검수 화면(S-05)이 KaTeX 렌더링에 쓸 문제 본문까지 포함해 반환한다. */
export const testProblemItemSchema = z.strictObject({
  id: uuidSchema,
  problemId: uuidSchema,
  orderIndex: z.number().int().min(1),
  replaced: z.boolean(),
  /** Present only when this test reads an immutable textbook capture. */
  snapshotId: uuidSchema.optional(),
  // This read model preserves imported text exactly; problem-bank write limits remain unchanged.
  problem: problemSchema.extend({
    content: z.string().max(100_000),
    answer: z.string().max(100_000),
    solution: z.string().max(100_000).nullable(),
    figureDims: z.array(z.number().nullable()).max(400).optional(),
    figureSourceMm: z.array(z.number().nullable()).max(200).optional(),
    choiceFigureIndex: z
      .array(z.number().int().nonnegative().nullable())
      .max(200)
      .optional(),
  }),
});
export type TestProblemItem = z.infer<typeof testProblemItemSchema>;
/** Snapshot geometry can be unknown at individual indices; bank writes keep their original schema. */
export type TestProblemFigureFields = Pick<
  TestProblemItem["problem"],
  "figureDims" | "figureSourceMm" | "choiceFigureIndex"
>;

/**
 * 출제 엔진이 요청 배분을 완전히 채우지 못했을 때(인접 난이도 대체 등) 투명하게 보고하는 항목.
 * 빈 배열(`[]`)이면 요청 배분을 완전히 충족했다는 뜻이다.
 * ⚠️ 아래 insufficientProblemsDetailSchema(에러 응답용)와는 별개 스키마다 — 이쪽은 "부분 대체가
 *    있었지만 draft는 생성됨"을 알리는 성공 응답의 일부이고, 에러 쪽은 "draft 생성 자체가
 *    불가능했음"을 알리는 실패 응답이다.
 */
export const shortfallItemSchema = z.strictObject({
  unitId: uuidSchema,
  difficulty: difficultySchema,
  available: z.number().int().min(0),
  required: z.number().int().min(0),
});
export type ShortfallItem = z.infer<typeof shortfallItemSchema>;

export const testGenerateResponseSchema = dataResponseSchema(
  z.strictObject({
    test: testSchema,
    problems: z.array(testProblemItemSchema),
    shortfall: z.array(shortfallItemSchema),
  }),
);
export type TestGenerateResponse = z.infer<typeof testGenerateResponseSchema>;

// ─────────────────────────────────────────────
// INSUFFICIENT_PROBLEMS 에러 (draft 생성 자체가 불가능한 경우)
// 06-tasks.md T0.5.1 지시 형태: { unitId, available, required } — TRD §8.2의
// 범용 예시({field, message} 배열)와 details 형태가 다르다. 이 계약에서는 T0.5.1 지시를
// 채택하고 불일치를 이 주석 + 완료 보고에 기록한다(임의 조정 금지, 하단 완료 보고 참조).
// ─────────────────────────────────────────────

export const insufficientProblemsDetailSchema = z.strictObject({
  unitId: uuidSchema,
  available: z.number().int().min(0),
  required: z.number().int().min(0),
});
export type InsufficientProblemsDetail = z.infer<
  typeof insufficientProblemsDetailSchema
>;

export const insufficientProblemsErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: errorCodeSchema.extract(["INSUFFICIENT_PROBLEMS"]),
    message: z.string().min(1),
    details: insufficientProblemsDetailSchema,
  }),
});
export type InsufficientProblemsErrorResponse = z.infer<
  typeof insufficientProblemsErrorResponseSchema
>;

// ─────────────────────────────────────────────
// 목록/단건 조회 (S-03 메인, S-05 검수)
// ─────────────────────────────────────────────

export const testListQuerySchema = z.strictObject({
  classId: uuidSchema.optional(),
  studentId: uuidSchema.optional(),
  status: testStatusSchema.optional(),
  page: paginationParamsSchema.shape.page,
  pageSize: paginationParamsSchema.shape.pageSize,
});
export type TestListQuery = z.infer<typeof testListQuerySchema>;

export const testListResponseSchema = listResponseSchema(testSchema);

export const testDetailResponseSchema = dataResponseSchema(
  z.strictObject({
    test: testSchema,
    /**
     * 반 이름 — 검수 화면(S-05)이 「어느 반의 시험을 보고 있는가」를 적으려고 쓴다.
     *
     * 🔴 **`testSchema` 가 아니라 이 응답에만 둔다.** 시험 엔티티에 넣으면 목록·생성·교체·
     *    확정·인쇄 응답까지 전부 이 값을 요구하게 되고(`strictObject`), 그 응답들은 반 이름이
     *    필요 없다. 반 이름은 **이 화면의 맥락**이지 시험의 속성이 아니다.
     */
    className: z.string(),
    /**
     * 학생 이름 — 반 전체 시험이면 `null`.
     *
     * 🔴 **반 이름만으로는 안 갈리는 경우가 있다.** 학생별 출제(`studentId`)가 있어서
     *    같은 반·같은 날·같은 유형의 시험이 학생 수만큼 생긴다. 그것들을 연속으로
     *    검수하면 머리말이 전부 똑같아진다 — 무엇을 보고 있는지 모른 채 확정하게 된다.
     *    (2026-09-08 협의에서 드러났다. 첫 시안 넷 다 이 칸이 없었다.)
     */
    studentName: z.string().nullable(),
    /**
     * 반의 담당 — **관리자에게만** 싣는다(D-132, `classOwnerSchema`). 관리자가 아니면 키가 없다.
     * 검토 머리 «반 · 학생» 뒤 딱지. 인쇄 지면에는 안 간다(D-132 ⑺).
     */
    classOwner: classOwnerSchema.optional(),
    problems: z.array(testProblemItemSchema),
  }),
);
export type TestDetailResponse = z.infer<typeof testDetailResponseSchema>;

// ─────────────────────────────────────────────
// 문제 교체 (S-05, 1클릭 — 확인 모달 없음)
// ─────────────────────────────────────────────

/** 요청 본문 없음 — 서버가 동일 unit/difficulty 조건 + 중복 제외 로직으로 대체 문제를 자동 선정한다.
 *  대상은 경로 파라미터(testId, seq=orderIndex)로 식별한다. */
export const testProblemReplaceRequestSchema = z.strictObject({});
export type TestProblemReplaceRequest = z.infer<
  typeof testProblemReplaceRequestSchema
>;

export const testProblemReplaceResponseSchema = dataResponseSchema(
  z.strictObject({
    test: testSchema,
    problem: testProblemItemSchema,
  }),
);

// ─────────────────────────────────────────────
// 확정 / 인쇄 기록
// ─────────────────────────────────────────────

export const testConfirmRequestSchema = z.strictObject({});
export type TestConfirmRequest = z.infer<typeof testConfirmRequestSchema>;
export const testConfirmResponseSchema = dataResponseSchema(testSchema);

export const testPrintRequestSchema = z.strictObject({});
export type TestPrintRequest = z.infer<typeof testPrintRequestSchema>;
export const testPrintResponseSchema = dataResponseSchema(testSchema);

// ─────────────────────────────────────────────
// 확인테스트 기본 범위 (S-04 — 진도가 정한다)
// ─────────────────────────────────────────────

export const defaultReviewRangeQuerySchema = z.strictObject({
  classId: uuidSchema,
  /** 미지정 시 반 전체 기준. 지정하면 그 학생의 진도·직전 확인테스트를 본다. */
  studentId: uuidSchema.optional(),
});
export type DefaultReviewRangeQuery = z.infer<
  typeof defaultReviewRangeQuerySchema
>;

/**
 * 화면이 **손대지 않아도 맞는** 범위. `null` 이면 진도 기록이 없어 범위를 못 낸다
 * (화면은 그때 범위를 비우고 원장이 직접 고르게 한다).
 */
export const defaultReviewRangeResponseSchema = dataResponseSchema(
  z
    .strictObject({
      rangeStartUnitId: uuidSchema,
      rangeEndUnitId: uuidSchema,
      /** 범위 안 소단원 수 — 화면 한 줄에 「소단원 N개」로 적는다. */
      unitCount: z.number().int().min(1),
      /** 시작을 무엇이 정했나 — 화면 안내 문구가 갈린다. */
      startedFrom: z.enum([
        "last-review",
        "progress-start",
        "chapter-start",
        "current-only",
      ]),
    })
    .nullable(),
);
export type DefaultReviewRangeResponse = z.infer<
  typeof defaultReviewRangeResponseSchema
>;

/* ── 오늘의 학생별 확인테스트 (2단계 화면, D-63·D-64) ─────────────────────── */

const dailyGroupStudentSchema = z.strictObject({
  id: uuidSchema,
  name: z.string(),
  /** 출제 요청이 요구한다 — 「모두 출제」가 학생별로 POST /api/tests/generate 를 부른다. */
  classId: uuidSchema,
  grade: z.string(),
  className: z.string(),
  problemCount: z.number().int().min(1).max(30).optional(),
  /** 담당(D-132) — **관리자에게만** 실린다. 관리자가 아니면 키째로 없다. */
  classOwner: classOwnerSchema.optional(),
});

/** 같은 범위 학생 한 묶음 — 한 묶음이 시험지 한 종이다. */
export const dailyReviewGroupSchema = z.strictObject({
  key: z.string(),
  rangeStartUnitId: uuidSchema,
  rangeEndUnitId: uuidSchema,
  startedFrom: z.enum([
    "last-review",
    "progress-start",
    "chapter-start",
    "current-only",
  ]),
  unitCount: z.number().int().min(1),
  /** 이 묶음에 필요한 문항 수(구성원 반 기본값의 최댓값) — 부족 판정 기준. */
  neededCount: z.number().int().min(1),
  /**
   * **이 범위로 한 시험지에 낼 수 있는 문항 수** — 출제 자격 후보(`eligibleProblemsWhere`)의 **갈래 수**
   * (D-105 · `src/lib/tests/draftCapacity.ts`). 화면의 「문항 N/8」이 이것이다.
   *
   * 🔴 예전 칸 `poolTotal` 은 **행 수**였다. 엔진 문항은 한 단원이 행 200~700 · 갈래 10~12 라
   *    15문항 반이 「문항 228/15 · 자동」으로 보이고 출제는 422 로 죽었다(2026-09-18 시뮬레이션).
   *    뜻이 바뀌어 이름도 바꿨다 — 같은 이름에 다른 뜻을 싣지 않는다.
   * ⚠️ 학생과 무관한 **범위의 상한**이다 — 최근 출제(D-20)는 빼지 않는다(아침 회차는 학생마다 뺀다).
   */
  capacity: z.number().int().min(0),
  students: z.array(dailyGroupStudentSchema).min(1),
});

export const dailyReviewResponseSchema = dataResponseSchema(
  z.strictObject({
    /** 기준일(KST) — 「오늘」의 정의. */
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** 이 계정이 eywa 소유자인가(`isEywaOwner`). 아니면 eywa 갈래(연계 학생·동기화)는 비어 있다 —
     *  eywa 는 원장님 학원 하나의 배선이다(2026-09-07). 계획 갈래는 소유 범위대로 차고, 화면은
     *  `eywaOwner || hasPlan` 일 때만 섹션을 그린다(D-131). 동기화 줄은 소유자에게만. */
    eywaOwner: z.boolean(),
    /** 마지막 동기화 — 없으면 null(한 번도 안 돌았다). 화면 스트립이 그대로 쓴다. */
    sync: z
      .strictObject({
        ranAt: z.string(),
        students: z.number().int(),
        /** 동기화가 **본 반의 수**. 범위가 좁혀져 있으므로(`syncScope.ts`) 이 값을
         *  안 보여 주면 화면이 「학원 전체를 가져왔다」로 읽힌다(원장님 지적 2026-08-25). */
        classes: z.number().int(),
        progressRows: z.number().int(),
        unresolvedLines: z.number().int(),
        ambiguous: z.number().int(),
      })
      .nullable(),
    /** 오늘 **대상이 된** 학생 수(분모) — 계획상 수업일이거나 오늘 보고서가 있는 학생.
     *  예전에는 「오늘 보고서가 있는 학생」이었다(D-129 ⑷ 로 계획 축이 붙었다). */
    attended: z.number().int().min(0),
    /** 문항이 충분한 묶음(capacity >= neededCount) — 「모두 출제」 대상. */
    auto: z.array(dailyReviewGroupSchema),
    /** 문항 부족 묶음 — 자동에서 뺀다. 화면이 사유와 함께 보여 준다. */
    lacking: z.array(dailyReviewGroupSchema),
    /** 시험기간·미분류 — D-64: 표시만. lines 가 보고서 원문 줄이다. */
    examOrUnread: z.array(
      dailyGroupStudentSchema.extend({ lines: z.array(z.string()) }),
    ),
    /** 범위를 못 낸 학생 — 조용히 버리지 않는다. */
    noRange: z.array(dailyGroupStudentSchema),
    /** 이 계정의 소유 범위 안에 진도 계획이 하나라도 있나(꺼 둔 계획 포함). 화면은
     *  `eywaOwner || hasPlan` 일 때 섹션을 그린다 — «계획이 있으면 누구에게나»(D-131). */
    hasPlan: z.boolean(),
    /** 오늘 대상 중 **계획보다 늦은** 학생 — `days` 는 밀린 일 수(양수). 시험기간·미분류(D-64)는
     *  세지 않는다. 화면 칩 「N일 밀림 M명」. 셈은 `resolveDailyPlan` 한 곳이다. */
    delayed: z.array(
      dailyGroupStudentSchema.extend({ days: z.number().int().min(1) }),
    ),
    /** 오늘 대상이 **한 명도 없는** 소유 범위의 반 — 「오늘 수업 계획이 없습니다.」(D-131). */
    noLessonClasses: z.array(
      z.strictObject({ id: uuidSchema, name: z.string(), grade: z.string() }),
    ),
    /** 오늘 이미 만든 학생별 확인테스트(최신 한 건) — 「모두 출제」가 이 학생을
     *  건너뛰고, 화면은 검수·인쇄 링크를 보여 준다(새로고침해도 중복 출제 없음). */
    todayTests: z.array(
      z.strictObject({
        studentId: uuidSchema,
        /** 검수 줄이 **자동 묶음 밖** 학생(문항 부족 · 시험기간 · 오늘 대상 아님)도 이름으로 그린다(D-133 후속). */
        studentName: z.string(),
        testId: uuidSchema,
        status: z.enum(["draft", "confirmed", "printed"]),
        /** 아침 자동 초안 회차가 세운 시험지인가 — 시험지 칸 `auto_draft_run_id` 가 있으면 참(D-133 ⑵).
         *  검수 줄 «자동 출제» 표지가 이것 하나만 본다. 시각으로 짐작하지 않는다. */
        autoDraft: z.boolean(),
      }),
    ),
  }),
);
export type DailyReviewResponse = z.infer<typeof dailyReviewResponseSchema>;

/** POST /api/eywa-sync — 「지금 가져오기」. 본체는 runEywaSync (CLI 와 같은 함수). */
export const eywaSyncResponseSchema = dataResponseSchema(
  z.strictObject({
    runId: z.string(),
    students: z.number().int(),
    classes: z.number().int(),
    progressRows: z.number().int(),
    unresolvedLines: z.number().int(),
    ambiguous: z.number().int(),
  }),
);
export type EywaSyncResponse = z.infer<typeof eywaSyncResponseSchema>;
