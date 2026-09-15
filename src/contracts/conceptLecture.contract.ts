/**
 * **오늘의 개념 — 강의 자료 계약** (D-123 ⑥′, 2026-09-15).
 *
 * 차시(`Unit`)마다 붙는 자체 제작 개념 강의 영상과, 학생 × 강의 시청 기록.
 * 수맥 `learning_materials`(0009a) · 고지·잡 ID(0012a) 를 우리 구성으로 옮겼다.
 * 대응 API 경로: **아직 없다** — 화면·라우트는 D-07 시안 뒤다. 지금 이 계약을 부르는 곳은
 * 등록 계획기(`src/lib/concept/registerPlan.ts`)와 등록 CLI 다.
 *
 * ## 수맥과 다른 것 (브리프 §2.1)
 *
 * - 붙는 자리가 **차시**다(수맥은 개념 `concept_id`).
 * - **종류는 영상 하나**다 — 수맥 `kind`(reading·video·practice) 칸이 없다(D-123 ⑵).
 * - **조직이 없다.** 강의는 서비스 공용 목록(D-31 공용 풀과 같은 결)이고 쓰기는 `isAdmin`
 *   만. 소유(`userId`) 칸을 두지 않는다 — 계정별로 따로 두는 안은 원장님께 묻는 중이다.
 * - **주소 없는 초안을 허용한다** — 호스팅(유튜브·자체)이 열린 질문이다(21번 §5-3).
 *   주소는 **게시 관문**이 요구한다(`src/lib/concept/publishGate.ts`).
 *
 * ## 원장님 결정 D-124 (2026-09-15) 가 여기에 거는 것
 *
 * - **AI 고지는 원장님 화면에만**(⑹) — 저장은 그대로 하고, 학생에게 가는 모양
 *   (`conceptLectureForStudentSchema`)에는 고지·잡 ID·시청 확인 칸이 없다.
 * - **게시 전 원장님 시청은 권장**(⑻) — `reviewedAt` 이 없어도 게시할 수 있다. 게시 관문이
 *   막지 않고 알리기만 한다(`warnings`).
 * - **시청 기록을 모은다**(⑺) — «끝까지 본 학생 n/m» 은 `src/lib/concept/watchSummary.ts`.
 *
 * ## 상태 — `draft → published → archived`
 *
 * 초안은 학생에게 보이지 않는다. **게시는 사람 버튼이다** — 초안 입력
 * (`conceptLectureDraftSchema`)에는 상태 칸이 아예 없어서, 만드는 길로 게시를 실어 보낼 수
 * 없다. 게시할 수 있는지와 그 이유는 게시 관문이 말한다.
 *
 * ## DB 와 나눠 지는 것
 *
 * 스키마 초안은 `prisma/schema.prisma` 의 `ConceptLecture`·`ConceptLectureView` 이고,
 * 마이그레이션 `prisma/migrations/20260915150000_concept_lecture` 는 **⚠️ 미적용**이다.
 * 「게시면 주소 있음」·「공백 고지 금지」는 DB CHECK 와 **여기 둘 다** 있다 — 쓰는 길이
 * 셋(화면·CLI·SQL)이라 가장 이른 자리(계약)와 가장 늦은 자리(DB)에서 같이 막는다.
 * 수맥은 길이 한계가 CLI 의 손 목록에만 있었고, 그 머리말이 스스로 「DB 에는 길이 CHECK 가
 * 없어서 여기서 막지 않으면 화면으로는 못 넣는 길이가 CLI 로만 들어간다」고 적어 두었다.
 * 우리는 한계를 **이 파일 한 곳**(`CONCEPT_LECTURE_LIMITS`)에 두고 DB 는 `VARCHAR` 길이로 받친다.
 */
import { z } from "zod";

import { parseYouTubeId, youTubeWatchUrl } from "@/lib/concept/youtube";

import { isoDateTimeSchema, uuidSchema } from "./common.contract";

export const CONCEPT_LECTURE_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;

export const conceptLectureStatusSchema = z.enum(CONCEPT_LECTURE_STATUSES, {
  error: "강의 상태 값이 올바르지 않습니다.",
});
export type ConceptLectureStatus = z.infer<typeof conceptLectureStatusSchema>;

/**
 * 입력 한계 — 수맥 폼(createSchema)·CLI(fieldLimits)와 같은 수. `videoUrlMax` 만 우리가
 * 정했다(정규 watch 주소는 43자다 — 자체 호스팅 주소가 들어올 여지를 남겼다).
 * ⚠️ 바꾸면 `prisma/schema.prisma` 의 `@db.VarChar(n)` 도 같이 바꾼다.
 */
export const CONCEPT_LECTURE_LIMITS = {
  titleMax: 200,
  disclosureMax: 300,
  sourceJobIdMax: 120,
  sortOrderMax: 999,
  videoUrlMax: 200,
} as const;

const L = CONCEPT_LECTURE_LIMITS;

const notBlank = (s: string) => s.trim() !== "";

/**
 * 저장 형태의 영상 주소 — **정규 watch 주소만.** 다른 형태(youtu.be·임베드·shorts)는
 * `normalizeYouTubeUrl` 을 거쳐서 온다. 판정은 `youtube.ts` 한 곳을 부른다(사본 금지).
 */
export const canonicalVideoUrlSchema = z
  .string()
  .max(L.videoUrlMax, {
    error: `영상 주소는 ${L.videoUrlMax}자 이하여야 합니다.`,
  })
  .refine(
    (s) => {
      const id = parseYouTubeId(s);
      return id !== null && youTubeWatchUrl(id) === s;
    },
    {
      error:
        "영상 주소는 정규 유튜브 주소(https://www.youtube.com/watch?v=…)여야 합니다.",
    },
  );

const titleSchema = z
  .string()
  .trim()
  .min(1, { error: "제목이 비어 있습니다." })
  .max(L.titleMax, { error: `제목은 ${L.titleMax}자 이하여야 합니다.` });

/** 공백 고지는 고지가 아니다(수맥 0012a `disclosure_not_blank_ck`) — 없으면 null 로 온다. */
const disclosureSchema = z
  .string()
  .max(L.disclosureMax, {
    error: `고지는 ${L.disclosureMax}자 이하여야 합니다.`,
  })
  .refine(notBlank, { error: "고지가 공백입니다. 없으면 비워 두세요." });

const sourceJobIdSchema = z
  .string()
  .max(L.sourceJobIdMax, {
    error: `잡 ID는 ${L.sourceJobIdMax}자 이하여야 합니다.`,
  })
  .refine(notBlank, { error: "잡 ID가 공백입니다. 없으면 비워 두세요." });

const secondsSchema = z
  .number()
  .int({ error: "영상 길이는 초 단위 정수여야 합니다." })
  .min(0, { error: "영상 길이는 0 이상이어야 합니다." });

const sortOrderSchema = z
  .number()
  .int({ error: "순서는 정수여야 합니다." })
  .min(0, { error: "순서는 0 이상이어야 합니다." })
  .max(L.sortOrderMax, { error: `순서는 ${L.sortOrderMax} 이하여야 합니다.` });

/**
 * 초안 만들기 입력. **상태·종류·소유 칸이 없다**(위 머리말) — strictObject 라 보내면 거절된다.
 * 주소는 비어도 된다(주소 없는 초안). 길이 `seconds` 는 0 이어도 받는다 — 0 은 «아직 모름»이고
 * 게시 관문이 막는다.
 */
export const conceptLectureDraftSchema = z.strictObject({
  unitId: uuidSchema,
  title: titleSchema,
  videoUrl: canonicalVideoUrlSchema.nullable(),
  seconds: secondsSchema,
  disclosure: disclosureSchema.nullable(),
  /** 도구가 만든 강의의 잡 ID — 등록 멱등 열쇠. 사람이 만든 강의는 null */
  sourceJobId: sourceJobIdSchema.nullable(),
  sortOrder: sortOrderSchema,
});
export type ConceptLectureDraft = z.infer<typeof conceptLectureDraftSchema>;

/** 저장된 강의 한 행. 「게시면 주소 있음」은 DB CHECK `concept_lecture_published_has_video` 와 같다. */
export const conceptLectureSchema = z
  .strictObject({
    id: uuidSchema,
    unitId: uuidSchema,
    title: titleSchema,
    videoUrl: canonicalVideoUrlSchema.nullable(),
    seconds: secondsSchema,
    disclosure: disclosureSchema.nullable(),
    sourceJobId: sourceJobIdSchema.nullable(),
    sortOrder: sortOrderSchema,
    status: conceptLectureStatusSchema,
    /** 원장님 전편 시청 확인 시각 — **권장**이라 게시를 막지 않는다(D-124 ⑻ — 게시 관문의 warnings) */
    reviewedAt: isoDateTimeSchema.nullable(),
    publishedAt: isoDateTimeSchema.nullable(),
    createdById: uuidSchema.nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .refine((l) => l.status !== "published" || l.videoUrl !== null, {
    error: "게시된 강의에는 영상 주소가 있어야 합니다.",
    path: ["videoUrl"],
  });
export type ConceptLecture = z.infer<typeof conceptLectureSchema>;

/**
 * 시청 기록 한 행 — **한 학생 × 한 강의 = 한 행**(수맥 `learner_material_progress_uq`).
 * 진도를 중복으로 쌓으면 «다 봤는가»를 셀 수 없다. 완료는 `completedAt` 이 찍혔는가다
 * (수맥의 `status` 칸 대신 — 「한 번 완료면 완료」가 시각 하나로 표현된다).
 * 쓰는 규칙은 `src/lib/concept/watchRules.ts` 의 `mergeWatchRecord` 한 곳이다.
 */
export const conceptLectureViewSchema = z.strictObject({
  studentId: uuidSchema,
  lectureId: uuidSchema,
  maxSeconds: z.number().int().min(0),
  percent: z.number().int().min(0).max(100),
  completedAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema,
});
export type ConceptLectureView = z.infer<typeof conceptLectureViewSchema>;

/**
 * 재생기가 보내는 시청 보고. 서버는 보내온 값을 받되 **뒤로만 가지 않게** 한다
 * (수맥 소유자 결정: 우회 방지는 목표가 아니다 — 목표는 스킵 없이 끝까지 보게 하는 것).
 */
export const conceptWatchReportSchema = z.strictObject({
  lectureId: uuidSchema,
  /** 이어서 본 최대 지점(초) */
  seconds: z.number().min(0),
  /** 0–100 */
  percent: z.number().min(0).max(100),
});
export type ConceptWatchReport = z.infer<typeof conceptWatchReportSchema>;

/**
 * **학생에게 가는 강의 한 편** (D-124 ⑵·⑹) — 학생 화면(목록 → 재생)이 받는 모양.
 *
 * 🔴 **고지(`disclosure`)·잡 ID(`sourceJobId`)·원장님 시청 확인(`reviewedAt`)이 없다.**
 * AI 고지는 원장님 화면에만 둔다(D-124 ⑹ — 수맥 2026-08-04 결정과 같다). 저장은 그대로
 * 하고(검수·감사 기록), 학생에게 가는 길에서만 뺀다. strict 라 실어 보내면 거절된다.
 * 저장 행 → 이 모양으로 옮기는 것은 `src/lib/concept/studentLecture.ts` 한 곳이다.
 *
 * 게시된 강의만 학생에게 간다(D-124 ⑵) — 그래서 주소가 반드시 있다(DB CHECK 가 받친다).
 */
export const conceptLectureForStudentSchema = z.strictObject({
  id: uuidSchema,
  unitId: uuidSchema,
  title: titleSchema,
  videoUrl: canonicalVideoUrlSchema,
  seconds: secondsSchema,
  sortOrder: sortOrderSchema,
  /** 이 학생의 시청 기록 — 없으면 아직 안 봤다. 이어 보기 위치는 `resumePosition` 이 정한다 */
  watch: z
    .strictObject({
      maxSeconds: z.number().int().min(0),
      percent: z.number().int().min(0).max(100),
      completed: z.boolean(),
    })
    .nullable(),
});
export type ConceptLectureForStudent = z.infer<
  typeof conceptLectureForStudentSchema
>;
