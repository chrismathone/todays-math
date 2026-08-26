/**
 * `deriveQuestionType` 의 **지문** — 변이 하네스의 ⑶「동작이 바뀌었나」가 읽는다.
 *
 *   npx tsx scripts/qa/ai-question-type-fingerprint.ts
 *
 * 파일이 바뀌어도 뜻이 그대로면 「가드가 아니다」가 거짓말이 된다(CLAUDE.md 2026-08-21).
 * 그래서 하네스는 변이 뒤 이 출력을 다시 찍어 기준과 대조하고, 같으면 **판정을 거부**한다.
 *
 * 표본은 둘이다 — ㉠ 2026-08-26 공유 DB 의 `ai_generated` 10행 전량(실측),
 * ㉡ 갈래를 실제로 **가르는** 손 표본(경계). ㉡ 이 없으면 실측 10행이 전부 주관식이라
 * 객관식 갈래를 건드리는 변이가 지문에 안 나타난다.
 */
import { deriveQuestionType } from "@/lib/ai/questionType";

import AI_ROWS from "../../src/__tests__/fixtures/aiGeneratedRows.json";

const EDGE: ReadonlyArray<{
  content: string;
  answer: string;
  problemType: string;
}> = [
  {
    content: "다음 중 소수는?\n① 4\n② 6\n③ 7\n④ 8\n⑤ 9",
    answer: "③",
    problemType: "개념",
  },
  {
    content: "다음 중 소수는?\n1. 4\n2. 6\n3. 7\n4. 8\n5. 9",
    answer: "③",
    problemType: "개념",
  },
  {
    content: "다음 중 소수는 몇 개인가?\n① 4\n② 6\n③ 7\n④ 8\n⑤ 9",
    answer: "1",
    problemType: "개념",
  },
  {
    content: "다음 중 옳은 것은?\n① 4\n② 6\n③ 7\n④ 8\n⑤ 9",
    answer: "②",
    problemType: "서술형",
  },
  { content: "물음에 답하시오.\n① 가", answer: "①", problemType: "개념" },
  { content: "이유를 설명하시오.", answer: "2", problemType: "서술형" },
  { content: "값을 구하시오.", answer: "30", problemType: "계산" },
  // 비표준 원문자 계열(➂ U+2782) — 손으로 `①~⑤` 만 적으면 여기서 갈린다.
  {
    content: "다음 중 옳은 것은?\n① 4\n② 6\n③ 7\n④ 8\n⑤ 9",
    answer: "\u2782",
    problemType: "개념",
  },
];

const lines: string[] = [];
for (const row of AI_ROWS) {
  lines.push(`실측 ${row.problemCode}\t${deriveQuestionType(row)}`);
}
for (const [i, row] of EDGE.entries()) {
  lines.push(`경계 ${String(i).padStart(2, "0")}\t${deriveQuestionType(row)}`);
}
process.stdout.write(lines.join("\n") + "\n");
