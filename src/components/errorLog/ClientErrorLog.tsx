"use client";

/**
 * 브라우저 보고기를 설치한다 — 루트 레이아웃에 한 번(원장님 2026-09-22 «브라우저 쪽 오류»).
 * 화면에는 아무것도 그리지 않는다. 무엇을 보내는지는 `src/lib/errorLog/clientReporter.ts` 머리말.
 */
import { useEffect } from "react";

import { installClientErrorLog } from "@/lib/errorLog/clientReporter";

export default function ClientErrorLog() {
  useEffect(() => installClientErrorLog(), []);
  return null;
}
