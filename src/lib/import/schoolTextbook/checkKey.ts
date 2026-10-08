/**
 * 교과서 이관 — 지면 검토가 본 글의 지문 (D-161).
 *
 * 지면 검토의 판정은 «그 글»에 묶인다 — 검토 뒤에 본문 · 정답 · 해설 후보의 **글자**가 바뀌면 그 판정은 버린다.
 * 빈칸 · 줄바꿈은 지문에 넣지 않는다 — 끊긴 낱말을 붙이거나 줄을 잇는 손질은 판정이 본 것을 바꾸지 않는다.
 *
 * 🔴 같은 셈을 파이썬 쪽(`scripts/import/textbook/final-check/check_collect.py` 의 `check_key`)이 한다 —
 *    검토자가 본 묶음의 글에서 지문을 내어 판정에 붙인다. 두 쪽의 시험이 **같은 예 · 같은 값**을 쥐고 있다.
 *    한쪽만 바꾸면 모든 판정이 «다른 글»로 읽혀 전부 잠긴다.
 */
import { createHash } from "node:crypto";

/** 지문에서 빼는 것 — 반각 빈칸 · 탭 · 줄바꿈뿐이다(두 언어의 `\s` 는 범위가 다르다) */
const squeeze = (text: string): string => text.replace(/[ \t\r\n]+/g, "");

export function checkKeyOf(
  content: string,
  answer: string,
  candidateSolution: string | null,
): string {
  return createHash("sha1")
    .update(
      [content, answer, candidateSolution ?? ""].map(squeeze).join("\n::\n"),
    )
    .digest("hex")
    .slice(0, 16);
}
