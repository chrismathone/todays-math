/**
 * 교사 교재 API 가운데 `textbook.contract.ts` 에 아직 없던 요청 · 응답 — 배치 고치기/견주기/다시 캡처/연결 ·
 * 올리기 끝맺기 · 재출제 · 영상 목록 · 백지 활동 목록.
 *
 * 라우트(`src/app/api/textbook/**`)가 **이 스키마로 본문을 검증하고 응답을 거른다.** 화면(`src/lib/textbook/client.ts`)도
 * 같은 스키마를 읽는다 — 화면이 모양을 지어내지 않는다. 전부 `strictObject` 라 모르는 칸은 버리지 않고 거절한다.
 * 기존 계약의 스키마를 고쳐 쓰지 않는다(가져다 쓸 뿐이다).
 */
import { z } from "zod";

import {
  textbookConceptRecordSchema,
  textbookRequestSchema,
  textbookVideoSchema,
} from "./textbook.contract";
import { sectionKeySchema } from "./conceptBlank.contract";
import {
  textbookConceptAttemptSchema,
  textbookConceptReviewSchema,
} from "./textbookConcept.contract";
import {
  textbookAssetSchema,
  textbookItemSchema,
  textbookVideoBindingSchema,
} from "./textbookExchange.contract";
import {
  textbookEntryKindSchema,
  textbookHashSchema,
  textbookKeySchema,
  textbookRevisionSchema,
  textbookTitleSchema,
} from "./textbookPrimitives.contract";

/** 배치를 고친 결과 — 고치기 · 다시 캡처 · 연결이 같은 모양을 낸다 */
export const textbookItemMutationResultSchema = z.strictObject({
  item: textbookItemSchema,
  aggregateRevision: textbookRevisionSchema,
  replayed: z.boolean(),
});

/** 확정본 ↔ 지금 은행 문항. `blocked` 가 있으면 견줄 수 없는 사유다(지워짐 · 자격 잃음 · 연결 안 됨) */
export const textbookItemDiffSchema = z.strictObject({
  itemId: z.uuid(),
  changed: z.boolean(),
  contentChanged: z.boolean(),
  metadataChanged: z.boolean(),
  blocked: z.string().max(2000).nullable(),
  fields: z
    .array(z.enum(["content", "answer", "solution", "questionType", "figures"]))
    .max(5),
  summary: z.string().max(4000),
});

/** 연결 후보 — 가져온 패키지가 «이 은행 문항»이라고 주장한 것. 확정 출처가 아니다 */
export const textbookLinkCandidateSchema = z.strictObject({
  system: z.literal("todays-math"),
  problemId: z.uuid(),
  problemCode: z.string().min(1).max(100),
});

/** 배치 하나 — 교환 형식의 배치에 연결 후보를 붙여 낸다(후보는 교환 형식의 배치에 싣지 않는다) */
export const textbookItemDetailSchema = z.strictObject({
  item: textbookItemSchema,
  linkCandidates: z.array(textbookLinkCandidateSchema).max(50),
});

/**
 * 연결 확정 — 사람이 후보 하나를 고른다. `expectedRevision` 은 판본 집계 revision 이다.
 * 서버가 그 은행 문항을 다시 캡처해 **내용 해시가 배치의 확정본과 같을 때만** 연결한다.
 */
export const textbookLinkItemSchema = textbookRequestSchema.extend({
  expectedRevision: textbookRevisionSchema,
  problemId: z.uuid(),
});

export const textbookUploadChunkResultSchema = z.strictObject({
  uploadId: z.uuid(),
  completed: z.boolean(),
});

export const textbookUploadAssetKindSchema = z.enum([
  "figure",
  "image",
  "portrait",
  "font",
]);

/** 올리기 끝맺기 — `asset` 을 주면 그 바이트를 원고의 자산으로 올린다(형식은 서버가 바이트에서 읽는다) */
export const textbookUploadCompleteSchema = z.strictObject({
  byteLength: z
    .number()
    .int()
    .min(1)
    .max(64 * 1024 * 1024),
  fileName: z.string().min(1).max(255).optional(),
  asset: z
    .strictObject({
      kind: textbookUploadAssetKindSchema,
      name: z.string().min(1).max(255),
    })
    .optional(),
});

export const textbookUploadCompleteResultSchema = z.strictObject({
  uploadId: z.uuid(),
  sha256: textbookHashSchema,
  byteLength: z.number().int().positive(),
  asset: z
    .strictObject({
      assetId: textbookHashSchema,
      mimeType: textbookAssetSchema.shape.mimeType,
      widthPx: z.number().int().positive().nullable(),
      heightPx: z.number().int().positive().nullable(),
    })
    .nullable(),
});

/**
 * 재출제 결과 — 새 시험지의 id 와 문항 수.
 * 요청의 `title` 은 **저장되지 않는다**: 시험지 표에 제목 칸이 없다(기존 시험지도 제목이 없다). 받되 쓰지 않는다.
 */
export const textbookReissueResultSchema = z.strictObject({
  testId: z.uuid(),
  problemCount: z.number().int().positive(),
  replayed: z.boolean(),
});

export const textbookVideoListSchema = z.strictObject({
  videos: z.array(textbookVideoSchema).max(2000),
  bindings: z.array(textbookVideoBindingSchema).max(5000),
});

export const textbookConceptListSchema = z
  .array(textbookConceptRecordSchema)
  .max(500);

/** 내 학생 한 명의 백지 활동 — 탐험 기록 · 시험 관측은 여기 섞지 않는다 */
export const textbookConceptEvidenceSchema = z.strictObject({
  attempts: z.array(textbookConceptAttemptSchema).max(500),
});

/**
 * 개념 백지의 소단원 → 그 소단원을 가리키는 교재 개념(`GET /api/textbook/concepts/lookup?blankSectionKey=…`).
 * 맞추는 것은 `blankSectionKey` 글자 그대로다 — 이름이 비슷한 것 · 다른 이름공간으로 바꿔 찾지 않는다.
 * `access` 가 `branch` 면 동료가 지점에 공유한 발행본이다(읽기만). `entries` 는 그 소단원의 항목만 싣는다.
 */
export const textbookConceptLookupMatchSchema = z.strictObject({
  bookId: z.uuid(),
  bookTitle: textbookTitleSchema,
  editionId: z.uuid(),
  editionLabel: z.string().min(1).max(80),
  status: z.enum(["draft", "published"]),
  access: z.enum(["owner", "branch"]),
  conceptKey: textbookKeySchema,
  conceptTitle: textbookTitleSchema,
  entries: z
    .array(
      z.strictObject({
        entryKind: textbookEntryKindSchema,
        entryId: z.string().min(1).max(200),
        reviewStatus: textbookConceptReviewSchema.shape.status,
      }),
    )
    .min(1)
    .max(2000),
});
export const textbookConceptLookupQuerySchema = z.strictObject({
  blankSectionKey: sectionKeySchema,
});
export const textbookConceptLookupSchema = z.strictObject({
  blankSectionKey: sectionKeySchema,
  matches: z.array(textbookConceptLookupMatchSchema).max(500),
});

export type TextbookConceptLookup = z.infer<typeof textbookConceptLookupSchema>;
export type TextbookItemDiff = z.infer<typeof textbookItemDiffSchema>;
export type TextbookItemDetail = z.infer<typeof textbookItemDetailSchema>;
export type TextbookItemMutationResult = z.infer<
  typeof textbookItemMutationResultSchema
>;
export type TextbookUploadCompleteResult = z.infer<
  typeof textbookUploadCompleteResultSchema
>;
