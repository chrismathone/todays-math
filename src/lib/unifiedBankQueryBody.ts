import "server-only";
import { z } from "zod";
import { readStrictJson } from "@/lib/textbook/strictJson";
import { UnifiedBankQueryError } from "./unifiedPreview";

/** Large curriculum selections travel in a bounded body, not a proxy-sized URL. */
export async function readUnifiedBankQueryBody(request: Request) {
  try {
    const body = z
      .record(z.string().max(40), z.string().max(40_000))
      .parse(await readStrictJson(request, { maxBytes: 64 * 1024 }));
    return new URLSearchParams(body);
  } catch {
    throw new UnifiedBankQueryError(
      "검색 범위가 올바르지 않습니다. 범위를 다시 선택해 주세요.",
    );
  }
}
