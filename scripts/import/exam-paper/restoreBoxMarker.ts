/** Restore only a box witnessed by the PDF; retain HWP text and source labels. */
import { BOX_BULLET_CHARS } from "../../../src/lib/math/boxBlock";

export const BOX_MARKER_RE =
  /[<〈［[＜《≪〔【]\s*(보\s*기|조\s*건|상\s*자)\s*[>〉］\]＞》≫〕】]/;
const FIRST_ITEM_RE = new RegExp(
  "(㉠|㈀|㉮|㈎|Ⓐ" +
    "|\\(\\s*ㄱ\\s*\\)" +
    "|[(（]\\s*가\\s*[)）](?=\\s|$)" +
    "|(?<![(（])ㄱ\\s*[.)]" +
    `|(?:^|\\n)\\s*[${BOX_BULLET_CHARS.join("")}]` +
    "|(?:^|[\\n\\s])가\\s*[.)])",
);

export function restoreBoxMarker(
  stem: string,
  fromPdf: string,
  n: number,
  isTable = false,
): string {
  const found = BOX_MARKER_RE.exec(fromPdf);
  if (!found || BOX_MARKER_RE.test(stem)) return stem;
  if (isTable && !FIRST_ITEM_RE.test(stem)) return stem;
  const label = found[1]!.replace(/\s+/g, "");
  const m = FIRST_ITEM_RE.exec(stem);
  if (!m) {
    throw new Error(
      `[중단] 문${n}: PDF 는 상자가 있다는데 HWP 발문에서 **첫 항목을 못 찾았다** — ` +
        "손으로 보고 규칙을 고칠 것",
    );
  }
  if (
    /^[(（]\s*가/.test(m[1]!) &&
    !/[(（]\s*나\s*[)）]/.test(stem.slice(m.index + m[1]!.length))
  ) {
    throw new Error(
      `[중단] 문${n}: «${m[1]!.trim()}» 뒤에 형제 «(나)» 가 없다 — 항목 표지가 아니라 ` +
        "참조일 수 있다. 손으로 지면을 보고 정할 것",
    );
  }
  return `${stem.slice(0, m.index)}<${label}> ${stem.slice(m.index)}`;
}
