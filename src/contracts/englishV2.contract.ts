/**
 * 오늘의 영어 — 문항 형식 2판 계약 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §A-3 · §B).
 *
 * 대응 API 경로: **없음.** M0 는 계약 · 변환 · 요청 거절까지다 — 2판을 저장하거나 화면에 내는 경로를 켜지 않는다.
 * 1판(`english.contract.ts` — 세트 하나에 지문 하나, 문항마다 `answer` 문자열 하나)과 **따로 둔다.**
 * 1판 문항에 `targets` 를 선택 칸으로 섞지 않는다 — 섞으면 옛 저장 경로가 그 칸을 모른 채 지운다.
 *
 * 2판이 1판과 다른 것:
 *   - `schemaVersion` 이 payload 안에 있다(형식 판). 동시 수정 CAS 인 `revision` 과 **다른 칸**이다.
 *   - 지문 · 문항 · 표적에 바뀌지 않는 ID 가 있다(uuid). 1판 읽기 변환이 짓는 임시 ID 는 이 꼴을 통과하지 못한다.
 *   - 정답은 **표적마다** 하나다. 여러 정답을 문항의 `answer` 문자열 하나에 합치지 않는다.
 *   - 표적 · 근거의 자리는 지문 개정(`sourceRevision`)의 JS UTF-16 `[start, end)` 이고 `quote` 가 `text.slice(start, end)` 와 같다.
 *   - 해설은 상태를 가진다(none · source · ai_suggested · teacher_confirmed). 사용 권한 · 출처도 구조로 싣는다.
 *
 * 정책: 모든 object 는 `z.strictObject` — 모르는 칸은 거절한다(조용히 버리지 않는다). 🔴 **변환이 없다**(`trim` · 기본값 없음) —
 * 읽은 값이 쓴 값과 글자까지 같아야 자리(span)가 안 밀리고, parse → serialize → parse 가 같은 값을 낸다.
 * 뜻(ID 유일 · 지문 대응 · 자리 경계와 겹침 · 보기 밖 정답)은 `src/lib/english/v2/validate.ts` 가 본다 — 계약은 모양만 잠근다.
 */
import { z } from "zod";

import { isoDateTimeSchema, uuidSchema } from "./common.contract";
import { ENGLISH_PASSAGE_MAX } from "./english.contract";

// ─────────────────────────────────────────────
// 형식 판 — CAS `revision` 과 다른 칸이다
// ─────────────────────────────────────────────

/** 1판 — `schemaVersion` 칸이 없는 옛 payload 도 1판이다 */
export const ENGLISH_SCHEMA_VERSION_V1 = 1;
export const ENGLISH_SCHEMA_VERSION_V2 = 2;
/** 이 코드가 읽을 줄 아는 판. 그 밖은 거절한다(더 높은 판을 낮은 판으로 읽지 않는다) */
export const ENGLISH_SCHEMA_VERSIONS = [
  ENGLISH_SCHEMA_VERSION_V1,
  ENGLISH_SCHEMA_VERSION_V2,
] as const;
export type EnglishSchemaVersion = (typeof ENGLISH_SCHEMA_VERSIONS)[number];

// ─────────────────────────────────────────────
// 값 목록
// ─────────────────────────────────────────────

/**
 * 상호작용 — **구현된 것만** 적는다. `inline_alternatives` 는 지문 속 표적마다 표현 둘 이상 가운데 하나를 고르는 꼴.
 * 순서 · 삽입 · 조건 영작 같은 꼴은 검증기와 채점 규칙이 생길 때 여기에 더한다 — 이름만 먼저 올리지 않는다.
 * 🔴 1판의 생성 유형 목록(`ENGLISH_GENERATED_TYPES`)에 넣지 않는다 — 만들기 화면이 준비 안 된 꼴을 고르게 된다.
 */
export const ENGLISH_V2_INTERACTION_TYPES = ["inline_alternatives"] as const;
export const englishV2InteractionTypeSchema = z.enum(
  ENGLISH_V2_INTERACTION_TYPES,
);
export type EnglishV2InteractionType = z.infer<
  typeof englishV2InteractionTypeSchema
>;

/** 해설 상태 — 원본에 해설이 없으면 `none` 으로 남긴다(지어내서 채우지 않는다) */
export const ENGLISH_V2_EXPLANATION_STATUSES = [
  "none",
  "source",
  "ai_suggested",
  "teacher_confirmed",
] as const;
export type EnglishV2ExplanationStatus =
  (typeof ENGLISH_V2_EXPLANATION_STATUSES)[number];

/** 권리 상태 — 새로 들이는 자료의 처음 값은 `unknown` */
export const ENGLISH_V2_RIGHTS_STATUSES = [
  "unknown",
  "reference_only",
  "approved",
] as const;
export type EnglishV2RightsStatus = (typeof ENGLISH_V2_RIGHTS_STATUSES)[number];

/**
 * 용도 — 허락은 용도마다 따로다. `approved` 만으로 전부 열리지 않는다.
 * 보관(원본 파일) · 교사 검수와 생성 입력 · 검색 색인 · 외부 모델 전송 · 배포 출력은 서로 다른 행위다.
 */
export const ENGLISH_V2_USES = [
  "store_original",
  "teacher_review",
  "generation_input",
  "search_index",
  "external_model",
  "distribution",
] as const;
export const englishV2UseSchema = z.enum(ENGLISH_V2_USES);
export type EnglishV2Use = z.infer<typeof englishV2UseSchema>;

// ─────────────────────────────────────────────
// 원자
// ─────────────────────────────────────────────

/** 영구 ID — uuid. 1판 읽기 변환의 임시 ID(`legacy:…`)는 이 꼴이 아니라 2판으로 저장되지 못한다 */
export const englishV2IdSchema = uuidSchema;

/** 지문 개정 번호 — 1부터. 지문 글이 바뀌면 새 번호이고, 옛 번호에 건 자리는 그대로 두고 재검토한다 */
export const englishV2RevisionSchema = z.number().int().min(1);

/** 빈 글이 아닌 글 — 다듬지 않는다(앞뒤 공백을 자르지 않는다). 공백뿐이면 거절한다 */
const filledText = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((text) => text.trim().length > 0, {
      message: "내용이 비어 있습니다.",
    });

/** 누가 언제 했나 — 「교사 확정」 「정답 확인」처럼 실제 행위가 있었을 때만 쓴다 */
export const englishV2ActionRecordSchema = z.strictObject({
  actorId: uuidSchema,
  at: isoDateTimeSchema,
});
export type EnglishV2ActionRecord = z.infer<typeof englishV2ActionRecordSchema>;

/**
 * 지문 속 자리 — JS UTF-16 단위의 `[start, end)`. `quote` 는 그 자리의 글자 그대로(`text.slice(start, end)`).
 * 경계 · 일치 · 서로게이트 쌍 가운데를 끊지 않는지는 검증기가 지문과 함께 본다.
 */
export const englishV2SpanSchema = z.strictObject({
  start: z.number().int().min(0).max(ENGLISH_PASSAGE_MAX),
  end: z.number().int().min(1).max(ENGLISH_PASSAGE_MAX),
  quote: z.string().min(1).max(ENGLISH_PASSAGE_MAX),
});
export type EnglishV2Span = z.infer<typeof englishV2SpanSchema>;

// ─────────────────────────────────────────────
// 해설 · 정답 확인
// ─────────────────────────────────────────────

const explanationText = filledText(6_000);

/**
 * 해설 — 상태마다 모양이 다르다. `teacher_confirmed` 는 확정한 사람과 시각이 **있어야** 한다.
 * 1판의 «검토 완료» 상태나 저장된 해설 문자열을 이 상태로 옮겨 적지 않는다(재분류 금지).
 */
export const englishV2ExplanationSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("none") }),
  z.strictObject({ status: z.literal("source"), text: explanationText }),
  z.strictObject({ status: z.literal("ai_suggested"), text: explanationText }),
  z.strictObject({
    status: z.literal("teacher_confirmed"),
    text: explanationText,
    confirmedBy: englishV2ActionRecordSchema,
  }),
]);
export type EnglishV2Explanation = z.infer<typeof englishV2ExplanationSchema>;

/** 정답 확인 — `verified: true` 는 확인한 사람과 시각이 있을 때만. 세트 상태 «검토 완료»는 이 값이 아니다 */
export const englishV2AnswerVerificationSchema = z.discriminatedUnion(
  "verified",
  [
    z.strictObject({ verified: z.literal(false) }),
    z.strictObject({
      verified: z.literal(true),
      verifiedBy: englishV2ActionRecordSchema,
    }),
  ],
);
export type EnglishV2AnswerVerification = z.infer<
  typeof englishV2AnswerVerificationSchema
>;

// ─────────────────────────────────────────────
// 표적 · 문항 · 지문
// ─────────────────────────────────────────────

/** 보기 열쇠 — 표적 안에서만 유일하면 된다(짧은 글자) */
export const englishV2AlternativeIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_-]{0,31}$/, {
    message: "보기 열쇠는 소문자로 시작하는 32자 이하 글자여야 합니다.",
  });

export const englishV2AlternativeSchema = z.strictObject({
  alternativeId: englishV2AlternativeIdSchema,
  text: filledText(1_500),
});
export type EnglishV2Alternative = z.infer<typeof englishV2AlternativeSchema>;

/**
 * 표적 하나 — 자리 · 보기 · **이 표적의** 정답 · 정답 확인 · 근거 자리 · 해설.
 * 근거는 비어 있어도 된다(정답만 있는 원본에는 근거가 없다 — 지어내지 않는다).
 */
export const englishV2TargetSchema = z.strictObject({
  targetId: englishV2IdSchema,
  span: englishV2SpanSchema,
  alternatives: z.array(englishV2AlternativeSchema).min(2).max(5),
  answer: z.strictObject({ alternativeId: englishV2AlternativeIdSchema }),
  answerVerification: englishV2AnswerVerificationSchema,
  evidence: z.array(englishV2SpanSchema).max(8),
  explanation: englishV2ExplanationSchema,
  /** 무엇을 묻나(어법 · 어휘 …) — 자유 글. 모르면 null */
  skillTag: filledText(40).nullable(),
});
export type EnglishV2Target = z.infer<typeof englishV2TargetSchema>;

/**
 * `inline_alternatives` 문항 — 발문 하나에 표적 여럿.
 * `sourceRevision` 은 이 문항이 자리를 건 지문 개정이다 — 지문의 개정과 다르면 자리를 믿을 수 없다(검증기가 막는다).
 * 🔴 `answer` 칸이 없다 — 정답은 표적에 있다. `constraints` 칸도 없다 — 이 꼴은 서술 조건을 받지 않는다.
 */
export const englishV2InlineAlternativesItemSchema = z.strictObject({
  itemId: englishV2IdSchema,
  passageId: englishV2IdSchema,
  sourceRevision: englishV2RevisionSchema,
  interactionType: z.literal("inline_alternatives"),
  prompt: filledText(2_000),
  targets: z.array(englishV2TargetSchema).min(1).max(20),
});

/** 문항 — 상호작용마다 모양이 갈린다. 새 꼴은 여기에 더한다 */
export const englishV2ItemSchema = z.discriminatedUnion("interactionType", [
  englishV2InlineAlternativesItemSchema,
]);
export type EnglishV2Item = z.infer<typeof englishV2ItemSchema>;

/** 지문 — 개정 번호와 글. 글은 다듬지 않는다(자리가 밀린다) */
export const englishV2PassageSchema = z.strictObject({
  passageId: englishV2IdSchema,
  sourceRevision: englishV2RevisionSchema,
  text: z.string().min(1).max(ENGLISH_PASSAGE_MAX),
});
export type EnglishV2Passage = z.infer<typeof englishV2PassageSchema>;

// ─────────────────────────────────────────────
// 출처 · 사용 권한
// ─────────────────────────────────────────────

/**
 * 출처 — 저장된 자료의 어느 개정에서 왔나, 또는 사용자가 «내가 넣은 글»이라고 밝힌 선언.
 * 🔴 `user_supplied` 는 권리가 확인됐다는 뜻이 아니다 — 재배포 · 코퍼스 허락이 아니다. 누가 · 언제 · 무슨 근거로만 남긴다.
 */
export const englishV2ProvenanceSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("material"),
    sourceId: englishV2IdSchema,
    materialId: englishV2IdSchema,
    materialRevision: englishV2RevisionSchema,
  }),
  z.strictObject({
    kind: z.literal("user_supplied"),
    declaredBy: uuidSchema,
    declaredAt: isoDateTimeSchema,
    basis: filledText(500),
  }),
]);
export type EnglishV2Provenance = z.infer<typeof englishV2ProvenanceSchema>;

const approvedUsesSchema = z
  .array(englishV2UseSchema)
  .min(1)
  .max(ENGLISH_V2_USES.length)
  .refine((uses) => new Set(uses).size === uses.length, {
    message: "같은 용도가 두 번 들어 있습니다.",
  });

/**
 * 사용 권한 — `unknown` · `reference_only` 는 허락된 용도가 **없다**(빈 배열만). `approved` 여도 적힌 용도만 된다.
 * 🔴 이 값은 요청이 보낸 대로 믿지 않는다 — 권리를 바꾸는 것은 따로 인가된 서버 명령이다(M1). `v2/rights.ts`.
 */
export const englishV2RightsSchema = z.discriminatedUnion("rightsStatus", [
  z.strictObject({
    rightsStatus: z.literal("unknown"),
    allowedUses: z.array(englishV2UseSchema).max(0),
  }),
  z.strictObject({
    rightsStatus: z.literal("reference_only"),
    allowedUses: z.array(englishV2UseSchema).max(0),
  }),
  z.strictObject({
    rightsStatus: z.literal("approved"),
    allowedUses: approvedUsesSchema,
  }),
]);
export type EnglishV2Rights = z.infer<typeof englishV2RightsSchema>;

// ─────────────────────────────────────────────
// 서술 조건 — 확장 자리(아직 어느 문항 꼴도 받지 않는다)
// ─────────────────────────────────────────────

/**
 * 조건 영작 · 요약 꼴이 들어올 때 쓸 조건의 모양만 정해 둔다 — 단어 수 · 제시어 · 문장 수.
 * 🔴 이 조건을 재는 검사기 · 채점기는 **없다.** 그래서 지금 있는 문항 꼴(`inline_alternatives`)은 `constraints` 칸을 받지 않는다.
 * 배점 · 부분점수 · 감점 규칙은 여기에 없다 — 원본이나 교사가 준 기준이 있을 때만 다루고, 없으면 만들지 않는다.
 */
export const englishV2ConstraintSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("word_count"),
    min: z.number().int().min(1).max(400),
    max: z.number().int().min(1).max(400),
  }),
  z.strictObject({
    kind: z.literal("required_words"),
    words: z.array(filledText(60)).min(1).max(20),
    inflectionAllowed: z.boolean(),
  }),
  z.strictObject({
    kind: z.literal("sentence_count"),
    min: z.number().int().min(1).max(20),
    max: z.number().int().min(1).max(20),
  }),
]);
export type EnglishV2Constraint = z.infer<typeof englishV2ConstraintSchema>;

// ─────────────────────────────────────────────
// 문서
// ─────────────────────────────────────────────

/** 문항 수 상한 — 1판 세트와 같은 30(늘리지 않는다) */
export const ENGLISH_V2_ITEM_MAX = 30;
export const ENGLISH_V2_PASSAGE_MAX_COUNT = 30;

export const englishV2DocumentSchema = z.strictObject({
  schemaVersion: z.literal(ENGLISH_SCHEMA_VERSION_V2),
  documentId: englishV2IdSchema,
  title: filledText(160),
  provenance: englishV2ProvenanceSchema,
  rights: englishV2RightsSchema,
  passages: z
    .array(englishV2PassageSchema)
    .min(1)
    .max(ENGLISH_V2_PASSAGE_MAX_COUNT),
  items: z.array(englishV2ItemSchema).min(1).max(ENGLISH_V2_ITEM_MAX),
});
export type EnglishV2Document = z.infer<typeof englishV2DocumentSchema>;

// ─────────────────────────────────────────────
// 2판에만 있는 칸 — 1판 경로가 이 칸을 보면 «버리고 저장»하지 않고 거절한다
// ─────────────────────────────────────────────

/** 세트(문서) 바깥 칸 — 1판 세트 · 초안에는 없다 */
export const ENGLISH_V2_ONLY_DOCUMENT_KEYS = [
  "documentId",
  "provenance",
  "rights",
  "passages",
  "items",
] as const;

/** 문항 안 칸 — 1판 문항에는 없다 */
export const ENGLISH_V2_ONLY_ITEM_KEYS = [
  "itemId",
  "passageId",
  "sourceRevision",
  "interactionType",
  "targets",
  "alternatives",
  "answerVerification",
] as const;
