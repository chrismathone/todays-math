import { z } from "zod";

/**
 * 사진 위 첨삭 한 개 (docs/planning/cb-scan-markup-plan-20261126.md §3.1 · §6).
 * 모델은 «말»만 낸다 — 자리는 코드가 정한다. 좌표 칸은 없다.
 */
const line = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !/[\r\n]/.test(s), "첨삭은 한 줄입니다.");

export const SCAN_MARKUP_MAX_NOTES_PER_TARGET = 3;

export const scanMarkupNoteSchema = z.strictObject({
  targetId: z.string().min(1).max(240),
  slotId: z.string().min(1).max(240),
  /** wrong 틀린 말 · missing 빠진 근거 · example 예의 계산 실수 */
  kind: z.enum(["wrong", "missing", "example"]),
  /** 학생이 그 칸에 쓴 글에서 그대로 따온 부분 */
  quote: line(120).pipe(z.string().min(1)),
  /** 종이에 쓰는 말 */
  say: line(60).pipe(z.string().min(1)),
  /** 바른 계산·문장 — 교사 승인 화면에만 (D3). 없으면 빈 문자열 */
  fix: line(80),
});
export type ScanMarkupNote = z.infer<typeof scanMarkupNoteSchema>;

export const SCAN_MARKUP_DROP_REASONS = [
  "malformed",
  "unknown-target",
  "not-model-graded",
  "label-not-marked",
  "slot-not-in-target",
  "direct-entry",
  "reading-not-read",
  "quote-not-found",
  "quote-not-unique",
  "duplicate",
  "too-many",
] as const;
export type ScanMarkupDropReason = (typeof SCAN_MARKUP_DROP_REASONS)[number];
export type ScanMarkupResult = {
  notes: ScanMarkupNote[];
  dropped: { index: number; reason: ScanMarkupDropReason }[];
};
