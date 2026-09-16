/**
 * **오늘의 개념 — 원장님 메뉴 화면 계약** (D-124 ⑴⑺⑼ · D-125 ⑹ · 05 §8.9, 2026-09-15).
 *
 * 대응 API 경로:
 *   GET   /api/concept                  — 첫 화면: 반별 이번 주 차시 · 요약 · 끝까지 본 학생
 *   GET   /api/concept/units            — 전체 차시(학년 › 단원 › 차시, 차시마다 강의 상태)
 *   GET   /api/concept/lectures?unitId= — 한 차시의 강의 목록(오른쪽 차시 판)
 *   POST  /api/concept/lectures         — meta.json 으로 초안 등록 (관리자만)
 *   PATCH /api/concept/lectures/{id}    — 게시 · 게시 내리기 · 다시 게시 · 끝까지 봤다 · 주소 넣기 (관리자만)
 *
 * ## 화면이 **계산하지 않는** 것
 *
 * - 게시 판정은 서버가 `checkPublish` 로 내서 `gate` 에 싣는다. 화면은 그대로 그린다 — 화면이
 *   따로 판정하면 버튼과 라우트가 갈라진다(`publishGate.ts` 머리말).
 * - «끝까지 본 학생 n/m» 과 «아직 안 본 학생 이름»은 서버가 `countWatchedToEnd` **한 번**으로
 *   낸다. 그래서 둘이 어긋날 수 없고, 어긋나면 이 계약이 먼저 거절한다(`conceptWatchSchema`).
 *
 * 저장 행의 계약은 `conceptLecture.contract.ts`(concept-port) 다. 여기는 원장님 화면으로 가는
 * 모양만 둔다 — 학생에게 가는 모양(`conceptLectureForStudentSchema`)과 달리 AI 고지가 **있다**
 * (D-124 ⑹: 고지는 원장님 화면에만).
 */
import { z } from "zod";

import { classOwnerSchema } from "./class.contract";
import {
  CONCEPT_LECTURE_LIMITS,
  conceptLectureStatusSchema,
} from "./conceptLecture.contract";
import {
  isoDateSchema,
  isoDateTimeSchema,
  uuidSchema,
} from "./common.contract";

const count = z.number().int().min(0);

// ─────────────────────────────────────────────
// 강의 한 편 (원장님 화면)
// ─────────────────────────────────────────────

export const conceptPublishGateSchema = z.strictObject({
  canPublish: z.boolean(),
  blockers: z.array(
    z.strictObject({
      code: z.enum([
        "title",
        "seconds",
        "video_missing",
        "video_invalid",
        "disclosure",
      ]),
      message: z.string().min(1),
    }),
  ),
  warnings: z.array(
    z.strictObject({ code: z.enum(["review"]), message: z.string().min(1) }),
  ),
});
export type ConceptPublishGateView = z.infer<typeof conceptPublishGateSchema>;

/**
 * 원장님 화면의 강의 한 편. 제목·주소는 **느슨하게** 받는다 — 빈 제목·유튜브가 아닌 주소는
 * 게시 관문이 «막는 것»으로 말해야 하는 상태라, 계약이 먼저 거절하면 그 이유를 그릴 수 없다.
 * 잡 ID 는 싣지 않는다 — 화면이 쓸 곳이 없고(판정은 서버의 `gate`) 등록 멱등 열쇠일 뿐이다.
 */
export const conceptLectureAdminSchema = z.strictObject({
  id: uuidSchema,
  unitId: uuidSchema,
  title: z.string().max(CONCEPT_LECTURE_LIMITS.titleMax),
  videoUrl: z.string().max(CONCEPT_LECTURE_LIMITS.videoUrlMax).nullable(),
  seconds: count,
  /** AI 고지 — 원장님 화면에만(D-124 ⑹) */
  disclosure: z.string().nullable(),
  sortOrder: count,
  status: conceptLectureStatusSchema,
  reviewedAt: isoDateTimeSchema.nullable(),
  publishedAt: isoDateTimeSchema.nullable(),
  gate: conceptPublishGateSchema,
});
export type ConceptLectureAdmin = z.infer<typeof conceptLectureAdminSchema>;

// ─────────────────────────────────────────────
// 차시
// ─────────────────────────────────────────────

export const conceptLectureCountsSchema = z.strictObject({
  published: count,
  draft: count,
  archived: count,
});
export type ConceptLectureCounts = z.infer<typeof conceptLectureCountsSchema>;

export const conceptUnitSchema = z.strictObject({
  id: uuidSchema,
  grade: z.string(),
  chapter: z.string(),
  section: z.string(),
  /** 차시 코드 = `Unit.problemCodePrefix` (예 `J30501`) — meta.json 의 `unitCode` 와 같은 값 */
  code: z.string(),
  orderIndex: z.number().int(),
  lectures: conceptLectureCountsSchema,
});
export type ConceptUnit = z.infer<typeof conceptUnitSchema>;

// ─────────────────────────────────────────────
// 첫 화면 (반별 표)
// ─────────────────────────────────────────────

/**
 * 반 × 게시 강의 한 편의 «끝까지 본 학생». `countWatchedToEnd` 의 결과 그대로다.
 * 🔴 **n/m 과 이름 수가 어긋나면 거절한다** — 서버가 이 계약으로 응답을 검사하므로(`jsonOk`)
 *    어긋난 응답은 화면까지 오지 못한다(D-125 ⑹ — 수가 어긋나면 빨개지게).
 */
export const conceptWatchSchema = z
  .strictObject({
    lectureId: uuidSchema,
    watched: count,
    total: count,
    /** 아직 끝까지 안 본 학생 — 반 목록 순서, 퇴원 학생 제외 */
    pending: z.array(z.strictObject({ id: uuidSchema, name: z.string() })),
  })
  .refine((w) => w.watched + w.pending.length === w.total, {
    error: "끝까지 본 학생 수와 안 본 학생 이름 수가 반 인원과 맞지 않습니다.",
  });
export type ConceptWatch = z.infer<typeof conceptWatchSchema>;

export const conceptBoardRowSchema = z.strictObject({
  classId: uuidSchema,
  className: z.string(),
  grade: z.string(),
  /** 담당 — **관리자에게만**(D-132, `classOwnerSchema`). 이 칸이 있으면 표에 «담당» 열이 서고 내 반이 맨 위다 */
  owner: classOwnerSchema.optional(),
  /** 퇴원을 뺀 반 인원 — n/m 의 m 과 같은 모집단 */
  enrolled: count,
  /** 반 진도 최신 행(`/api/progress` 와 같은 판정). 없으면 null */
  progress: z
    .strictObject({ unitId: uuidSchema, recordedAt: isoDateSchema })
    .nullable(),
  /** 교육과정 다음 차시(`nextOrderIndex`). 마지막 차시거나 진도가 없으면 null */
  nextUnitId: uuidSchema.nullable(),
  /** 최근 진도 차시의 **게시** 강의마다 한 줄(순서대로). 게시 강의가 없으면 빈 배열 */
  watch: z.array(conceptWatchSchema),
});
export type ConceptBoardRow = z.infer<typeof conceptBoardRowSchema>;

export const conceptBoardSummarySchema = z.strictObject({
  /** 이번 주 닿는 차시(반마다 최근 진도 + 다음 차시, 겹치면 하나) */
  units: count,
  classes: count,
  published: count,
  /** 게시 강의는 없고 초안만 있는 차시 */
  draftOnly: count,
  /** 게시도 초안도 없는 차시(내린 강의만 있는 차시 포함) */
  none: count,
});
export type ConceptBoardSummary = z.infer<typeof conceptBoardSummarySchema>;

export const conceptBoardSchema = z.strictObject({
  /** 학원 날짜(KST) */
  today: isoDateSchema,
  /** 등록·게시·내리기·«끝까지 봤다» 를 할 수 있나 — `User.isAdmin`(D-124 ⑼). 라우트가 따로 또 막는다 */
  canEdit: z.boolean(),
  /** 전체 차시 수(735) */
  unitTotal: count,
  summary: conceptBoardSummarySchema,
  rows: z.array(conceptBoardRowSchema),
  /** 표에 나오는 차시(최근 진도 · 다음 차시) */
  units: z.array(conceptUnitSchema),
  /** 그 차시들에 붙은 강의(초안·게시·내림 전부) */
  lectures: z.array(conceptLectureAdminSchema),
  /** 표에 쓴 시청 기록 행 수 — 0 이면 빈 상태 문구를 둔다(학생 로그인 전에는 0 이 정상) */
  watchRecords: count,
});
export type ConceptBoard = z.infer<typeof conceptBoardSchema>;
export const conceptBoardResponseSchema = z.strictObject({
  data: conceptBoardSchema,
});

// ─────────────────────────────────────────────
// 전체 차시 · 한 차시
// ─────────────────────────────────────────────

export const conceptUnitsResponseSchema = z.strictObject({
  data: z.strictObject({
    canEdit: z.boolean(),
    units: z.array(conceptUnitSchema),
  }),
});
export type ConceptUnits = z.infer<typeof conceptUnitsResponseSchema>["data"];

export const conceptUnitLecturesQuerySchema = z.strictObject({
  unitId: uuidSchema,
});

export const conceptUnitLecturesResponseSchema = z.strictObject({
  data: z.strictObject({
    unit: conceptUnitSchema,
    lectures: z.array(conceptLectureAdminSchema),
  }),
});
export type ConceptUnitLectures = z.infer<
  typeof conceptUnitLecturesResponseSchema
>["data"];

// ─────────────────────────────────────────────
// 쓰기 (관리자만)
// ─────────────────────────────────────────────

/** meta.json 파일 크기 상한 — 도구가 쓰는 파일은 1KB 안팎이다 */
export const CONCEPT_META_RAW_MAX = 100_000;

/**
 * meta.json 으로 등록. 차시는 meta 의 `unitCode` → 없으면 `unitId`(지금 고른 차시).
 * 해석·한계·멱등은 `parseLectureMeta` · `planRegistration` 이 한다(CLI 와 같은 길).
 */
export const conceptRegisterRequestSchema = z.strictObject({
  raw: z.string().max(CONCEPT_META_RAW_MAX, {
    error: "붙여넣은 내용이 너무 깁니다. meta.json 파일 하나만 붙여넣으세요.",
  }),
  unitId: uuidSchema.nullable(),
});
export type ConceptRegisterRequest = z.infer<
  typeof conceptRegisterRequestSchema
>;

/** 상태·주소 바꾸기 — 규칙은 `src/lib/concept/lectureTransition.ts` 한 곳 */
export const conceptLectureActionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("publish") }),
  z.strictObject({ action: z.literal("archive") }),
  z.strictObject({ action: z.literal("review") }),
  z.strictObject({
    action: z.literal("video"),
    videoUrl: z
      .string()
      .trim()
      .min(1, { error: "영상 주소가 비어 있습니다." })
      .max(CONCEPT_LECTURE_LIMITS.videoUrlMax, {
        error: `영상 주소는 ${CONCEPT_LECTURE_LIMITS.videoUrlMax}자 이하여야 합니다.`,
      }),
  }),
]);
export type ConceptLectureAction = z.infer<typeof conceptLectureActionSchema>;

export const conceptLectureResponseSchema = z.strictObject({
  data: conceptLectureAdminSchema,
});
