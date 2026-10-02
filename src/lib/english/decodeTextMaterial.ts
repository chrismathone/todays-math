/**
 * TXT 자료는 UTF-8(BOM 포함)만 지원한다. 인코딩을 추측하거나 잘못된 바이트를 U+FFFD 로 바꾸지 않는다.
 * 실패하면 호출자가 UTF-8 재저장을 안내한다. 자르기 전에 파일 전체를 검사해야 한다.
 */
export function decodeEnglishTextMaterial(bytes: Uint8Array): string | null {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // BOM 없는 UTF-16 영문도 UTF-8 바이트 검사만 통과할 수 있다. NUL 은 DB 텍스트에도 넣을 수 없다.
    return text.includes("\u0000") ? null : text;
  } catch {
    return null;
  }
}
