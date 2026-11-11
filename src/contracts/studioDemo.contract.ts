import { z } from "zod";

/**
 * 문제 추출 시연 — AI 응답 녹화본(원장님 2026-11-11 «실제로 분석하지 않고 시연용으로 속도 조절해서
 * 마치 진짜 분석하는 것처럼»). 동영상이 아니라 **데이터**다: 요청을 알아보는 열쇠와, 그때 받은 응답 ·
 * 걸린 시간만 남긴다. 그림 자체는 남기지 않는다(열쇠는 지문뿐).
 */
export const STUDIO_DEMO_ACTIONS = [
  "ocr",
  "page-ocr",
  "figures",
  "figure-redraw",
  "figure-edit",
  "solution",
] as const;
/** 그림 지문의 한 변(16×16 회색조). */
export const STUDIO_DEMO_FINGERPRINT_SIDE = 16;
export const STUDIO_DEMO_MAX_ENTRIES = 600;
/** 녹화본 저장 요청의 본문 상한 — 운영 플랫폼 상한(4.5MB)보다 낮게. */
export const STUDIO_DEMO_MAX_BODY_BYTES = 4_000_000;

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);

export const StudioDemoEntrySchema = z
  .object({
    action: z.enum(STUDIO_DEMO_ACTIONS),
    /** 보낸 그림(data URL) 글자 그대로의 SHA-256 — 같은 브라우저에서 같은 원본이면 그대로 맞는다. */
    image: sha256.optional(),
    /** 보낸 그림을 16×16 회색조로 줄인 값 — 그리는 기기가 달라 글자가 어긋나도 가까운 것을 찾는다. */
    fingerprint: z
      .array(z.number().int().min(0).max(255))
      .length(STUDIO_DEMO_FINGERPRINT_SIDE * STUDIO_DEMO_FINGERPRINT_SIDE)
      .optional(),
    /** 그림의 가로 ÷ 세로. */
    aspect: z.number().positive().max(100).optional(),
    /** 보낸 글(`content`)의 SHA-256 — 해설 · 도형 다시 그리기 요청을 가른다. */
    content: sha256.optional(),
    /** 실제 분석에 걸린 시간(ms). */
    ms: z.number().int().min(0).max(900_000),
    /** 그때 받은 응답 본문 그대로. */
    body: z.record(z.string(), z.unknown()),
  })
  .strict();
export type StudioDemoEntry = z.infer<typeof StudioDemoEntrySchema>;

export const StudioDemoRecordingSchema = z
  .object({
    entries: z.array(StudioDemoEntrySchema).max(STUDIO_DEMO_MAX_ENTRIES),
  })
  .strict();
export type StudioDemoRecording = z.infer<typeof StudioDemoRecordingSchema>;

export const StudioDemoSaveSchema = z
  .object({
    sha256,
    entries: z.array(StudioDemoEntrySchema).max(STUDIO_DEMO_MAX_ENTRIES),
  })
  .strict();
export type StudioDemoSave = z.infer<typeof StudioDemoSaveSchema>;
