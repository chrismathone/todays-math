import { z } from "zod";
import { unzlibSync, zlibSync } from "fflate";

import {
  conceptBlankSelectionSchema,
  type ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";

// URL 한 개의 디코딩 작업량을 제한한다(문항 수는 기존 계약의 2,000개 상한과 같다).
const MAX_CODE_LENGTH = 64 * 1024;
const COMPRESS_AFTER = 8 * 1024;
const MAX_EXACT_BYTES = 64 * 1024;
const MAX_PICKS = 2000;
// v1의 인덱스 순서다. 계약의 표시 순서가 바뀌어도 이 순서는 바꾸지 않는다.
const PICK_KINDS = ["concept", "ox", "apply", "figure"] as const;
const PICK_LEVELS = ["하", "중", "상"] as const;
const index = z.number().int().nonnegative();
const exactUrlSchema = z.strictObject({
  v: z.literal(1),
  s: conceptBlankSelectionSchema.refine(
    (selection) => selection.pick === undefined,
  ),
  i: z.array(z.string()).min(1).max(MAX_PICKS),
  p: z
    .array(
      z.tuple([
        index.max(59), // s.sections
        index.max(3), // PICK_KINDS
        index.max(MAX_PICKS - 1), // i (entry IDs, first occurrence order)
        index.max(4), // s.forms
        index.max(2), // PICK_LEVELS
      ]),
    )
    .min(1)
    .max(MAX_PICKS),
});

/**
 * 고르기 ↔ 주소 `?s=`(D-150). 같은 링크 = 같은 지면(고정 문항). base64url(JSON) — 브라우저 · 서버 둘 다.
 * 자동 선택은 기존 JSON 바이트 그대로. 정확한 선택은 v1 {v,s,i,p}: 선택(소단원·형식·수·제목·날짜),
 * ID 사전, [소단원, 종류, ID, 형식, 난이도] 인덱스 튜플로 실어 긴 소단원 이름을 반복하지 않는다.
 * 8KiB를 넘는 정확한 선택만 z1. + base64url(zlib)로 압축하며 해제 크기는 64KiB로 제한한다.
 * 읽다 틀리면 null(인쇄 페이지는 «잘못된 주소»를 보인다).
 */
function toBase64Url(text: string): string {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(base64UrlBytes(code));
}

function base64UrlBytes(code: string): Uint8Array {
  const b64 =
    code.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((code.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return b * 65536 + a;
}

export function encodeSelection(selection: ConceptBlankSelection): string {
  const { pick, ...base } = conceptBlankSelectionSchema.parse(selection);
  let value: unknown = base;
  if (pick !== undefined) {
    const ids = [...new Set(pick.map((entry) => entry.entryId))];
    const idIndexes = new Map(ids.map((id, position) => [id, position]));
    value = {
      v: 1,
      s: base,
      i: ids,
      p: pick.map((entry) => [
        base.sections.indexOf(entry.blankSectionKey),
        PICK_KINDS.indexOf(entry.entryKind),
        idIndexes.get(entry.entryId)!,
        base.forms.findIndex(({ form }) => form === entry.form),
        PICK_LEVELS.indexOf(entry.level),
      ]),
    };
  }
  const json = JSON.stringify(value);
  let code = toBase64Url(json);
  // 큰 정확한 선택도 GET 인쇄 경로에 들어가게 한다. 기존 자동·짧은 v1 주소는 바이트 그대로다.
  if (pick && code.length > COMPRESS_AFTER) {
    const bytes = new TextEncoder().encode(json);
    if (bytes.length > MAX_EXACT_BYTES)
      throw new RangeError("인쇄 주소가 너무 깁니다. 문항 수를 줄여 주세요.");
    code = `z1.${bytesToBase64Url(zlibSync(bytes))}`;
  }
  if (code.length > MAX_CODE_LENGTH)
    throw new RangeError("인쇄 주소가 너무 깁니다. 문항 수를 줄여 주세요.");
  return code;
}

export function decodeSelection(
  code: string | null | undefined,
): ConceptBlankSelection | null {
  if (!code || code.length > MAX_CODE_LENGTH) return null;
  try {
    let json: string;
    if (code.startsWith("z1.")) {
      const compressed = base64UrlBytes(code.slice(3));
      if (compressed.length < 6) return null; // zlib 헤더 2바이트 + Adler-32 4바이트
      // fflate의 고정 출력 버퍼는 과대 해제를 잘라 낸다. 상한+1이면 잘린 결과까지 확실히 거절한다.
      const bytes = unzlibSync(compressed, {
        out: new Uint8Array(MAX_EXACT_BYTES + 1),
      });
      if (bytes.length > MAX_EXACT_BYTES) return null;
      // unzlibSync는 체크섬을 검증하지 않는다. 손상된 ID가 유효한 다른 문항이 되기 전에 거절한다.
      const checksum = new DataView(
        compressed.buffer,
        compressed.byteOffset,
        compressed.byteLength,
      ).getUint32(compressed.length - 4, false);
      if (adler32(bytes) !== checksum) return null;
      json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } else json = fromBase64Url(code);
    const value: unknown = JSON.parse(json);
    if (
      code.startsWith("z1.") &&
      !(typeof value === "object" && value !== null && "v" in value)
    )
      return null;
    if (typeof value === "object" && value !== null && "v" in value) {
      const compact = exactUrlSchema.safeParse(value);
      if (!compact.success) return null;
      const { s, i, p } = compact.data;
      const pick = p.map(([section, kind, id, form, level]) => ({
        blankSectionKey: s.sections[section],
        entryKind: PICK_KINDS[kind],
        entryId: i[id],
        form: s.forms[form]?.form,
        level: PICK_LEVELS[level],
      }));
      // 실제 사전 크기 밖의 인덱스 · 잘못된 ID · 중복 · 수 불일치는 원래 계약이 거른다.
      const parsed = conceptBlankSelectionSchema.safeParse({ ...s, pick });
      return parsed.success ? parsed.data : null;
    }
    const parsed = conceptBlankSelectionSchema.safeParse(value);
    return parsed.success && parsed.data.pick === undefined
      ? parsed.data
      : null;
  } catch {
    return null;
  }
}
