import { z } from "zod";
import { conceptBlankSelectionSchema } from "./conceptBlank.contract";

export const scanIssueInputSchema = z.strictObject({
  requestId: z.uuid(),
  selection: conceptBlankSelectionSchema,
});
export const scanIssueResponseSchema = z.strictObject({
  data: z.strictObject({ id: z.uuid() }),
});

const slotId = z.string().min(1).max(240);
const coordinate = z.number().finite().nonnegative();
export const scanBoxSchema = z.strictObject({
  x: coordinate,
  y: coordinate,
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});
export const SCAN_MARKER_IDS = ["tl", "tr", "br", "bl"] as const;
export const scanLayoutPageSchema = z
  .strictObject({
    part: z.enum(["student", "key"]),
    number: z.number().int().positive(),
    /** Physical millimetres, measured after the exact fonts and final QR/marks have loaded. */
    width: z.literal(210),
    height: z.literal(297),
    markers: z
      .array(
        z.strictObject({
          id: z.enum(SCAN_MARKER_IDS),
          x: coordinate,
          y: coordinate,
        }),
      )
      .length(4),
    qr: scanBoxSchema,
    slots: z.array(z.strictObject({ slotId, box: scanBoxSchema })).max(8000),
  })
  .superRefine((page, ctx) => {
    const contained = (box: z.infer<typeof scanBoxSchema>) =>
      box.x + box.width <= page.width + 0.001 &&
      box.y + box.height <= page.height + 0.001;
    if (!contained(page.qr) || page.slots.some((s) => !contained(s.box)))
      ctx.addIssue({
        code: "custom",
        message: "답 칸 또는 QR이 지면 밖입니다.",
      });
    if (
      page.markers.some(
        (m, i) =>
          m.id !== SCAN_MARKER_IDS[i] ||
          m.x >= page.width ||
          m.y >= page.height,
      ) ||
      new Set(page.markers.map((m) => `${m.x}:${m.y}`)).size !== 4 ||
      page.markers[0].x >= page.markers[1].x ||
      page.markers[3].x >= page.markers[2].x ||
      page.markers[0].y >= page.markers[3].y ||
      page.markers[1].y >= page.markers[2].y
    )
      ctx.addIssue({
        code: "custom",
        message: "모서리 표식의 위치·차례가 맞지 않습니다.",
      });
    if (
      new Set(page.slots.map((s) => s.slotId)).size !== page.slots.length ||
      (page.part === "key" && page.slots.length > 0) ||
      (page.part === "student" && page.slots.length === 0)
    )
      ctx.addIssue({
        code: "custom",
        message: "답 칸의 몫·id가 맞지 않습니다.",
      });
  });
export const scanIssuedLayoutSchema = z
  .strictObject({
    version: z.literal(1),
    pages: z.array(scanLayoutPageSchema).min(1).max(4000),
  })
  .superRefine((layout, ctx) => {
    for (const part of ["student", "key"] as const) {
      if (
        layout.pages
          .filter((p) => p.part === part)
          .some((p, i) => p.number !== i + 1)
      )
        ctx.addIssue({
          code: "custom",
          message: "발행 지면의 쪽 차례가 맞지 않습니다.",
        });
    }
  });
export const scanPaperArtifactSchema = z.strictObject({
  version: z.literal(1),
  css: z.string().min(1).max(16_000_000),
  pages: z
    .array(
      z.strictObject({
        part: z.enum(["student", "key"]),
        number: z.number().int().positive(),
        html: z.string().min(1).max(2_000_000),
      }),
    )
    .min(1)
    .max(4000),
});
export const scanQrSchema = z.strictObject({
  printedSheetId: z.uuid(),
  page: z.number().int().positive().max(2000),
  part: z.enum(["student", "key"]),
});
export type ScanBox = z.infer<typeof scanBoxSchema>;
export type ScanLayoutPage = z.infer<typeof scanLayoutPageSchema>;
export type ScanIssuedLayout = z.infer<typeof scanIssuedLayoutSchema>;
export type ScanPaperArtifact = z.infer<typeof scanPaperArtifactSchema>;
export type ScanQr = z.infer<typeof scanQrSchema>;
