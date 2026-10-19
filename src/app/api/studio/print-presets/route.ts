import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { createPrintPreset, listPrintPresets } from "@/lib/printPresets";

// 시험지 만들기 3단계 «내 양식»(W6) — 주인의 양식 목록 · 저장.
export const GET = withErrorLog(
  "/api/studio/print-presets",
  (request: Request) => listPrintPresets(request),
);
export const POST = withErrorLog(
  "/api/studio/print-presets",
  (request: Request) => createPrintPreset(request),
);
