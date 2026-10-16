import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { deletePrintPreset, patchPrintPreset } from "@/lib/printPresets";

type Context = { params: Promise<{ presetId: string }> };
// 이름 바꾸기 · 적용(마지막 사용) · 기본으로 · 삭제.
export const PATCH = withErrorLog(
  "/api/studio/print-presets/[presetId]",
  async (request: Request, context: Context) =>
    patchPrintPreset(request, (await context.params).presetId),
);
export const DELETE = withErrorLog(
  "/api/studio/print-presets/[presetId]",
  async (request: Request, context: Context) =>
    deletePrintPreset(request, (await context.params).presetId),
);
