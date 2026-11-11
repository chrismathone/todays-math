/**
 * 오늘의 영어 — 외부지문 내신 스튜디오 계약 (D-148, docs/planning/25-english-studio.md §2~§4).
 *
 * 대응 API 경로:
 *   GET    /api/english/exams                    — 내 범위의 시험 목록 + 요약
 *   POST   /api/english/exams                    — 새 시험(학교 · 학년 · 이름 · 날짜)
 *   PATCH  /api/english/exams/{id}               — 이름 · 날짜 · 출제 설정
 *   DELETE /api/english/exams/{id}
 *   GET    /api/english/exams/{id}/materials     — 자료 목록(파일 원본 없이)
 *   POST   /api/english/exams/{id}/materials     — JSON {name, content} 또는 multipart file(≤10MB)
 *   GET    /api/english/materials/{id}           — 내려받기 (JSON 아님 — 이 파일의 대상이 아니다)
 *   DELETE /api/english/materials/{id}
 *   POST   /api/english/materials/{id}/read      — 사진 자료에서 읽은 글(저장하지 않는다 · D-158)
 *   GET    /api/english/exams/{id}/sets          — 세트 요약 목록
 *   POST   /api/english/exams/{id}/sets          — 세트 저장(검증기 통과 · 항상 «초안»)
 *   GET    /api/english/sets/{id}                — 세트 전체
 *   PUT    /api/english/sets/{id}                — 고치기 (revision CAS — 어긋나면 409 REVISION_MISMATCH)
 *   DELETE /api/english/sets/{id}
 *   POST   /api/english/generate                 — AI 직접 생성(기본 Claude Sonnet 5.5 · 저장하지 않고 초안을 돌려준다)
 *
 * 정책: 모든 object 는 `z.strictObject`(common.contract.ts 머리말). 세트의 `questions` 는 저장 표에서
 * jsonb 이지만 **쓰기 때 이 계약으로 잠근다** — 개인 작업물 계약(`z.record`)과 다르다(25 §2).
 * 소유·지점 범위는 부모 시험(`english_exam.userId`)으로 판정한다(25 §3).
 */
import { z } from "zod";

import {
  dataResponseSchema,
  isoDateTimeSchema,
  uuidSchema,
} from "./common.contract";

// ─────────────────────────────────────────────
// 값 목록 — 화면·검증기·DB CHECK 가 같은 글자를 쓴다 (25 §2 · §4.4)
// ─────────────────────────────────────────────

/** 대상 학년 — ChatGPT 앱과 같은 여섯 */
export const ENGLISH_GRADES = [
  "중1",
  "중2",
  "중3",
  "고1",
  "고2",
  "고3",
] as const;
export const englishGradeSchema = z.enum(ENGLISH_GRADES);
export type EnglishGrade = z.infer<typeof englishGradeSchema>;

/**
 * 문항 유형 — 어휘를 포함한 앞의 유형은 AI·ChatGPT 가 만든다.
 * «원문 복원»은 규칙 기반(25 §4.2)이라 생성 요청에는 들어가지 않는다.
 *
 * 「언급 없음」부터 「단어 배열」까지 여섯은 D-158(2026-10-06 · 25 §13) — 학교 «총괄 평가» 시험지에서 못 만들던 꼴이다.
 * 🔴 앞선 일곱의 차례는 바꾸지 않는다(저장된 출제 설정 · 체크박스 순서). 새 유형은 «원문 복원» 앞에 더한다.
 */
export const ENGLISH_QUESTION_TYPES = [
  "주제",
  "내용 일치",
  "어법",
  "빈칸 추론",
  "문장 삽입",
  "서술형",
  "어휘",
  "언급 없음",
  "해석",
  "영영풀이",
  "공통 빈칸",
  "문장 전환",
  "단어 배열",
  "원문 복원",
] as const;
export const englishQuestionTypeSchema = z.enum(ENGLISH_QUESTION_TYPES);
export type EnglishQuestionType = z.infer<typeof englishQuestionTypeSchema>;

/** 생성 요청에 고를 수 있는 유형(«원문 복원» 제외) */
export const ENGLISH_GENERATED_TYPES = ENGLISH_QUESTION_TYPES.filter(
  (type) => type !== "원문 복원",
) as Exclude<EnglishQuestionType, "원문 복원">[];
export const englishGeneratedTypeSchema = z.enum(
  ENGLISH_GENERATED_TYPES as [
    Exclude<EnglishQuestionType, "원문 복원">,
    ...Exclude<EnglishQuestionType, "원문 복원">[],
  ],
);

/** 보기 없는 유형 — 정답이 번호가 아니라 글이다 */
export const ENGLISH_OPEN_TYPES: readonly EnglishQuestionType[] = [
  "서술형",
  "해석",
  "영영풀이",
  "공통 빈칸",
  "문장 전환",
  "단어 배열",
  "원문 복원",
];

/**
 * 보기를 넷 **또는** 다섯 받는 객관식 (D-158). 학교 시험의 «윗글을 읽고 알 수 없는 것은?»이 4지선다다.
 * 다른 객관식은 여전히 정확히 다섯이다 — 검증기 `src/lib/english/validate.ts` 가 이 목록으로 가른다.
 */
export const ENGLISH_FOUR_CHOICE_TYPES: readonly EnglishQuestionType[] = [
  "언급 없음",
];

/** 검토 상태 — DB `english_question_set.status` CHECK 와 같은 글자 */
export const ENGLISH_SET_STATUSES = ["초안", "검토 중", "검토 완료"] as const;
export const englishSetStatusSchema = z.enum(ENGLISH_SET_STATUSES);
export type EnglishSetStatus = z.infer<typeof englishSetStatusSchema>;

/** 세트가 어디서 왔나 — DB `source` CHECK 와 같은 글자 */
export const ENGLISH_SET_SOURCES = [
  "chatgpt",
  "cloze",
  "deepseek",
  "manual",
] as const;
export const englishSetSourceSchema = z.enum(ENGLISH_SET_SOURCES);
export type EnglishSetSource = z.infer<typeof englishSetSourceSchema>;

/**
 * 자료 파일 상한 — 🔴 Vercel Serverless Function 의 요청 본문 상한이 4.5MB 라 10MB 는 라우트에 닿기 전에
 * 플랫폼이 413 으로 끊는다(base 트랙 보고 ⑤-1, 2026-09-30). 그래서 4MB. 문구는 `ENGLISH_MATERIAL_MAX_LABEL` 하나에서.
 */
export const ENGLISH_MATERIAL_MAX_BYTES = 4 * 1024 * 1024;
export const ENGLISH_MATERIAL_MAX_LABEL = "4MB";
export const ENGLISH_MATERIAL_CONTENT_MAX = 30_000;
export const ENGLISH_PASSAGE_MAX = 24_000;
/**
 * 원문(원문 유지 · 원문 변형)의 최소 글자 수와 지문 길이(단어 수)의 하한 — D-158.
 * 표지판 · 안내문 · 라벨 같은 짧은 실용문도 원문이 된다(전에는 80자 · 80단어라 한 줄짜리 안내문이 들어가지 않았다).
 */
export const ENGLISH_SOURCE_PASSAGE_MIN = 20;
export const ENGLISH_WORDS_MIN = 30;
/**
 * 한 번에 만드는 문항 수의 상한. 유형마다 한 문항 이상이라 **고를 수 있는 유형 수의 상한**이기도 하다 —
 * 유형이 13개가 된 뒤로 만들기 화면이 이 수를 넘겨 고르게 두면 요청이 늘 거절된다(D-158 검토 #4).
 */
export const ENGLISH_GENERATE_COUNT_MAX = 8;

/** Exact immutable bank revision; source text lives in the server-side usage snapshot. */
export const englishPassageRefSchema = z.strictObject({
  passageId: uuidSchema,
  textRevision: z.number().int().min(1).max(2_147_483_647),
  snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type EnglishPassageRef = z.infer<typeof englishPassageRefSchema>;

// ─────────────────────────────────────────────
// 시험 (english_exam)
// ─────────────────────────────────────────────

const schoolSchema = z.string().trim().min(1).max(80);
const examTitleSchema = z.string().trim().min(1).max(100);
/** 시험 날짜 — 달력 날짜(YYYY-MM-DD). 없어도 된다 */
const examDateSchema = z.iso.date().nullable();
/** 출제 설정 — 이번 시험에서 중점적으로 다룰 유형(중복 없이, «원문 복원» 제외) */
const examTypesSchema = z
  .array(englishGeneratedTypeSchema)
  .max(ENGLISH_GENERATED_TYPES.length)
  .refine((types) => new Set(types).size === types.length, {
    message: "같은 유형이 두 번 들어 있습니다.",
  });

export const englishExamSchema = z.strictObject({
  id: uuidSchema,
  school: schoolSchema,
  grade: englishGradeSchema,
  title: examTitleSchema,
  examDate: examDateSchema,
  types: examTypesSchema,
  /** 요약 — 목록 화면의 «이번 시험 준비» 세 단계 */
  materialCount: z.number().int().min(0),
  setCount: z.number().int().min(0),
  reviewedCount: z.number().int().min(0),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type EnglishExam = z.infer<typeof englishExamSchema>;

export const englishExamCreateSchema = z.strictObject({
  school: schoolSchema,
  grade: englishGradeSchema,
  title: examTitleSchema,
  examDate: examDateSchema.optional(),
});
export type EnglishExamCreate = z.infer<typeof englishExamCreateSchema>;

export const englishExamUpdateSchema = z
  .strictObject({
    title: examTitleSchema.optional(),
    examDate: examDateSchema.optional(),
    types: examTypesSchema.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "고칠 내용이 없습니다.",
  });
export type EnglishExamUpdate = z.infer<typeof englishExamUpdateSchema>;

export const englishExamListResponseSchema = dataResponseSchema(
  z.array(englishExamSchema),
);
export const englishExamResponseSchema = dataResponseSchema(englishExamSchema);

// ─────────────────────────────────────────────
// 자료 (english_material)
// ─────────────────────────────────────────────

export const englishMaterialSchema = z.strictObject({
  id: uuidSchema,
  examId: uuidSchema,
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  size: z.number().int().min(0),
  /** 파일 원본이 있으면 true(내려받기 가능). 텍스트 자료는 false */
  hasFile: z.boolean(),
  /** 문제 제작에 쓸 지문 글 — 텍스트 자료와 .txt 파일만. 그 밖은 null */
  content: z.string().max(ENGLISH_MATERIAL_CONTENT_MAX).nullable(),
  createdAt: isoDateTimeSchema,
});
export type EnglishMaterial = z.infer<typeof englishMaterialSchema>;

/** 지문 직접 입력(JSON 본문). 파일은 multipart 라 계약이 아니라 라우트가 재고 거른다 */
export const englishMaterialTextCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1).max(ENGLISH_MATERIAL_CONTENT_MAX),
});
export type EnglishMaterialTextCreate = z.infer<
  typeof englishMaterialTextCreateSchema
>;

export const englishMaterialListResponseSchema = dataResponseSchema(
  z.array(englishMaterialSchema),
);
export const englishMaterialResponseSchema = dataResponseSchema(
  englishMaterialSchema,
);

/**
 * 사진 자료에서 읽은 글 (D-158 · 25 §13.8) — **저장 전**이다. 선생님이 사진과 견주어 고친 뒤 글 자료
 * (`englishMaterialTextCreateSchema`)로 저장한다. 그래서 상한이 자료 지문과 같다.
 */
export const englishMaterialReadResponseSchema = dataResponseSchema(
  z.strictObject({
    text: z.string().min(1).max(ENGLISH_MATERIAL_CONTENT_MAX),
  }),
);
export type EnglishMaterialRead = z.infer<
  typeof englishMaterialReadResponseSchema
>["data"];

// ─────────────────────────────────────────────
// 문항 · 세트 (english_question_set)
// ─────────────────────────────────────────────

/**
 * 문항 하나. 모양만 여기서 잠그고, 뜻(보기 5개 · 정답 번호 범위 · 근거가 지문 안 · 유형별 보기 유무)은
 * 검증기 `src/lib/english/validate.ts` 가 지문과 함께 본다(25 §4.4) — 계약은 지문을 모른다.
 */
export const englishQuestionSchema = z.strictObject({
  type: englishQuestionTypeSchema,
  prompt: z.string().trim().min(1).max(12_000),
  options: z.array(z.string().trim().min(1).max(1_500)).max(5),
  answer: z.string().trim().min(1).max(3_000),
  explanation: z.string().trim().max(6_000),
  evidence: z.string().trim().max(6_000),
});
export type EnglishQuestion = z.infer<typeof englishQuestionSchema>;

export const ENGLISH_GENERATE_MODES = ["new", "original", "variation"] as const;
export const englishGenerateModeSchema = z.enum(ENGLISH_GENERATE_MODES);
export const ENGLISH_DIFFICULTIES = ["기본", "표준", "심화"] as const;
export const englishDifficultySchema = z.enum(ENGLISH_DIFFICULTIES);

/** 세트를 만든 길 — 만들기 화면의 세 탭(ChatGPT 붙여넣기 · 서버 AI · 원문 복원) */
export const ENGLISH_SET_PATHS = ["chatgpt", "api", "cloze"] as const;

/**
 * 세트의 «만든 조건» — 원장님 2026-10-01 «수학 문제처럼 생성된 영어 문제도 입력할 수 있는 모든 메타데이터 기억되게».
 * 만들기 화면의 칸 그대로(제작 방식 · 소재 · 원문 변형의 원문 · 난이도 · 문항 수 · 지문 길이 · 유형 · 불러온 자료 이름)와
 * 서버 AI 길이면 부른 모델 · 프롬프트 판. 원문 유지 · 원문 복원의 원문은 세트 지문과 같아 따로 싣지 않는다.
 * DB `english_question_set.meta`(jsonb · 없으면 NULL — 옛 세트 · 손으로 만든 세트). 세트를 고쳐도 바뀌지 않는다(만든 때의 기록).
 */
export const englishSetMetaSchema = z.strictObject({
  path: z.enum(ENGLISH_SET_PATHS),
  mode: englishGenerateModeSchema.optional(),
  topic: z.string().trim().max(300).optional(),
  sourcePassage: z.string().trim().max(18_000).optional(),
  difficulty: englishDifficultySchema.optional(),
  /** 문항 수 — 원문 복원은 «최대 문항 수» */
  count: z.number().int().min(1).max(30).optional(),
  words: z.number().int().min(ENGLISH_WORDS_MIN).max(400).optional(),
  types: z
    .array(englishGeneratedTypeSchema)
    .max(ENGLISH_GENERATED_TYPES.length)
    .optional(),
  materialName: z.string().trim().max(255).optional(),
  model: z.string().trim().max(80).optional(),
  promptVersion: z.string().trim().max(16).optional(),
  /**
   * 저장 재시도 키 — 만들기 화면이 검증을 통과한 초안마다 하나 짓는다.
   * 같은 시험·같은 키·같은 본문은 그 행을 돌려주고, 본문이 다르면 409. 없으면 매번 새 행.
   */
  clientKey: uuidSchema.optional(),
  passageRef: englishPassageRefSchema.optional(),
});
export type EnglishSetMeta = z.infer<typeof englishSetMetaSchema>;

const setTitleSchema = z.string().trim().min(1).max(160);
const passageSchema = z.string().trim().min(1).max(ENGLISH_PASSAGE_MAX);
const questionsSchema = z.array(englishQuestionSchema).min(1).max(30);

export const englishSetSummarySchema = z.strictObject({
  id: uuidSchema,
  examId: uuidSchema,
  title: setTitleSchema,
  status: englishSetStatusSchema,
  source: englishSetSourceSchema,
  questionCount: z.number().int().min(1),
  /** 들어 있는 유형(순서대로, 중복 없이) — 목록 카드의 작은 딱지 */
  types: z.array(englishQuestionTypeSchema),
  revision: z.number().int().min(1),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type EnglishSetSummary = z.infer<typeof englishSetSummarySchema>;

export const englishSetSchema = englishSetSummarySchema.extend({
  passage: passageSchema,
  questions: questionsSchema,
  /** 만든 조건 — 없으면 null(옛 세트 · 손으로 만든 세트) */
  meta: englishSetMetaSchema.nullable().optional(),
});
export type EnglishSet = z.infer<typeof englishSetSchema>;

/** 새 세트 — 상태는 서버가 «초안»으로 둔다(검증 통과 ≠ 검토 완료) */
export const englishSetCreateSchema = z.strictObject({
  title: setTitleSchema,
  source: englishSetSourceSchema,
  passage: passageSchema,
  questions: questionsSchema,
  meta: englishSetMetaSchema.optional(),
});
export type EnglishSetCreate = z.infer<typeof englishSetCreateSchema>;

/** 고치기 — `revision` 은 읽었을 때의 값. 서버 값과 다르면 409 REVISION_MISMATCH */
export const englishSetUpdateSchema = z.strictObject({
  title: setTitleSchema,
  status: englishSetStatusSchema,
  passage: passageSchema,
  questions: questionsSchema,
  revision: z.number().int().min(1),
});
export type EnglishSetUpdate = z.infer<typeof englishSetUpdateSchema>;

export const englishSetListResponseSchema = dataResponseSchema(
  z.array(englishSetSummarySchema),
);
export const englishSetResponseSchema = dataResponseSchema(englishSetSchema);

// ─────────────────────────────────────────────
// AI 직접 생성 (25 §4.3 — 기본 Claude Sonnet 5.5, 2026-11-11) — ChatGPT 요청문(§4.1)도 같은 입력을 쓴다
// ─────────────────────────────────────────────

export const englishGenerateRequestSchema = z
  .strictObject({
    examId: uuidSchema,
    passageRef: englishPassageRefSchema.optional(),
    /** new: 새 지문 · original: 원문 유지(문제만) · variation: 원문 변형 */
    mode: englishGenerateModeSchema,
    topic: z.string().trim().max(300).default(""),
    passage: z.string().trim().max(18_000).default(""),
    difficulty: englishDifficultySchema,
    count: z.number().int().min(1).max(ENGLISH_GENERATE_COUNT_MAX),
    /** 지문 길이(단어 수, 약) — original 에서는 무시 */
    words: z.number().int().min(ENGLISH_WORDS_MIN).max(400),
    types: z
      .array(englishGeneratedTypeSchema)
      .min(1)
      .max(ENGLISH_GENERATED_TYPES.length),
  })
  .superRefine((input, ctx) => {
    if (
      input.mode !== "new" &&
      input.passage.length < ENGLISH_SOURCE_PASSAGE_MIN
    )
      ctx.addIssue({
        code: "custom",
        path: ["passage"],
        message: `원문을 ${ENGLISH_SOURCE_PASSAGE_MIN}자 이상 입력해 주세요.`,
      });
    if (input.mode === "new" && !input.topic)
      ctx.addIssue({
        code: "custom",
        path: ["topic"],
        message: "새 지문의 소재를 입력해 주세요.",
      });
    if (new Set(input.types).size !== input.types.length)
      ctx.addIssue({
        code: "custom",
        path: ["types"],
        message: "같은 유형이 두 번 들어 있습니다.",
      });
    if (new Set(input.types).size > input.count)
      ctx.addIssue({
        code: "custom",
        path: ["count"],
        message: "고른 유형 수 이상으로 문항 수를 정해 주세요.",
      });
  });
export type EnglishGenerateRequest = z.infer<
  typeof englishGenerateRequestSchema
>;

/** 생성 결과 — 저장 전 초안. `source` 는 서버가 붙인다 */
export const englishDraftSchema = z.strictObject({
  title: setTitleSchema,
  source: englishSetSourceSchema,
  passage: passageSchema,
  questions: questionsSchema,
});
export type EnglishDraft = z.infer<typeof englishDraftSchema>;
export const englishDraftResponseSchema =
  dataResponseSchema(englishDraftSchema);

/** 서버 AI 생성 응답 — 초안 + 부른 모델 · 프롬프트 판(만든 조건 `meta` 에 싣는다) */
export const englishGenerateResponseSchema = z.strictObject({
  data: englishDraftSchema,
  model: z.strictObject({
    name: z.string().min(1).max(80),
    promptVersion: z.string().min(1).max(16),
  }),
});

/** 검증기 실패 — 어느 문항(0부터, 지문이면 null)이 어느 규칙에 걸렸나 */
export const englishDraftIssueSchema = z.strictObject({
  question: z.number().int().min(0).nullable(),
  message: z.string().min(1),
});
export type EnglishDraftIssue = z.infer<typeof englishDraftIssueSchema>;
