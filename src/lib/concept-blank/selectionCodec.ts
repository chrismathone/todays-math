import {
  conceptBlankSelectionSchema,
  type ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";

/**
 * 고르기 ↔ 주소 `?s=`(D-150). 같은 링크 = 같은 지면(고정 문항). base64url(JSON) — 브라우저 · 서버 둘 다.
 * 읽다 틀리면 null(인쇄 페이지는 «잘못된 주소»를 보인다).
 */
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  const b64 =
    code.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((code.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeSelection(selection: ConceptBlankSelection): string {
  if (selection.pick !== undefined)
    throw new RangeError(
      "정확한 선택은 저장 문서 또는 교재 참조로 인쇄하세요.",
    );
  return toBase64Url(
    JSON.stringify(conceptBlankSelectionSchema.parse(selection)),
  );
}

export function decodeSelection(
  code: string | null | undefined,
): ConceptBlankSelection | null {
  if (!code) return null;
  try {
    const parsed = conceptBlankSelectionSchema.safeParse(
      JSON.parse(fromBase64Url(code)),
    );
    return parsed.success && parsed.data.pick === undefined
      ? parsed.data
      : null;
  } catch {
    return null;
  }
}
