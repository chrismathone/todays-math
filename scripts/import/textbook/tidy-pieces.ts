/**
 * 준비 단계의 글 조각에 표기 손질을 건다 (교과서 이관 · 2026-10-08).
 *
 *   npx tsx scripts/import/textbook/tidy-pieces.ts <조각.json> <낼 파일.json>
 *
 * `prepare.py --tidy` 가 부른다. 조각은 `[{ id: "<문항>#c|#a|#s", text }]` 꼴이다.
 *
 * 왜 여기서 거나 — 표기 손질(`hwpNotation.ts`)은 처음에 적재기에만 있었다. 글 문항은 검토가 끝난 뒤에 그 규칙이 생겨서
 * 그랬다. 그러면 검토자는 손질 전의 글(`$dyad\mathrm{AB}$` · `$boldx$`)을 읽는다 — 그림 문항의 시범 검토에서
 * 검토자가 «직선 기호가 깨져 있어 확정할 수 없다»로 멀쩡한 문항을 뺐다. **검토자가 읽는 글이 실을 글이어야 한다.**
 * 적재기의 손질은 그대로 둔다(두 번 걸어도 같다).
 *
 * 본문(`#c`)에는 문항이 아닌 글(머리의 번호 · 배점 · 유형 제목 · 출처 표지)도 걷는다 — `cleanContent`.
 */
import { readFileSync, writeFileSync } from "node:fs";

import {
  cleanContent,
  tidyHwpNotation,
} from "../../../src/lib/import/schoolTextbook/hwpNotation";

const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error("사용: tidy-pieces.ts <조각.json> <낼 파일.json>");

const pieces = JSON.parse(readFileSync(input, "utf8")) as Array<{
  id: string;
  text: string;
}>;
let changed = 0;
const tidied = pieces.map((piece) => {
  const text = piece.id.endsWith("#c")
    ? cleanContent(tidyHwpNotation(piece.text))
    : tidyHwpNotation(piece.text);
  if (text !== piece.text) changed += 1;
  return { ...piece, text };
});
writeFileSync(output, JSON.stringify(tidied), "utf8");
console.log(`조각 ${pieces.length} · 손질한 것 ${changed}`);
