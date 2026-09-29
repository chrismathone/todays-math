/**
 * 오늘의 영어 — 원문 복원 연습 (D-148 · 25 §4.2). **AI 가 아니다** — 규칙 하나:
 * 7단어 이상인 문장마다 6글자 이상인 가장 긴 단어를 빈칸으로 바꾸고, 첫 글자와 글자 수를 힌트로 준다.
 * 정답은 그 단어, 근거는 그 문장, 유형은 «원문 복원»(보기 없음). 순수 함수 — 서버·클라이언트 같이.
 */
import type {
  EnglishDraft,
  EnglishQuestion,
} from "@/contracts/english.contract";

export const CLOZE_MIN_WORDS = 7;
export const CLOZE_MIN_WORD_LENGTH = 6;
export const CLOZE_COUNTS = [3, 5, 10, 15] as const;
export const CLOZE_BLANK = "________";

/** 문장으로 나눈다 — `.`·`!`·`?` 뒤에서. 끝에 구두점이 없는 마지막 조각도 문장으로 센다 */
export function splitEnglishSentences(passage: string): string[] {
  return (passage.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function pickWord(sentence: string): string | null {
  const words = sentence.match(/\b[A-Za-z]{6,}\b/g) ?? [];
  if (!words.length) return null;
  // 가장 긴 단어 — 같은 길이면 먼저 나온 것(안정 정렬)
  return [...words].sort((a, b) => b.length - a.length)[0] ?? null;
}

export type ClozeResult =
  { ok: true; draft: EnglishDraft } | { ok: false; message: string };

/**
 * 지문에서 최대 `count` 문항을 만든다. 쓸 만한 문장이 하나도 없으면 실패 문구를 돌려준다.
 * 제목은 부르는 쪽이 붙인다(학교 이름 · «원문 복원 연습»).
 */
export function makeCloze(
  passage: string,
  count: number,
  title = "원문 복원 연습",
): ClozeResult {
  const chosen: { sentence: string; word: string }[] = [];
  for (const sentence of splitEnglishSentences(passage)) {
    if (sentence.split(/\s+/).length < CLOZE_MIN_WORDS) continue;
    const word = pickWord(sentence);
    if (!word) continue;
    chosen.push({ sentence, word });
    if (chosen.length >= count) break;
  }
  if (!chosen.length)
    return {
      ok: false,
      message: `${CLOZE_MIN_WORDS}단어 이상인 영어 문장과 ${CLOZE_MIN_WORD_LENGTH}글자 이상인 단어가 있어야 합니다.`,
    };
  const questions: EnglishQuestion[] = chosen.map(({ sentence, word }) => ({
    type: "원문 복원",
    prompt: `원문에 쓰인 단어를 넣어 문장을 완성하시오.\n${sentence.replace(
      new RegExp(`\\b${word}\\b`),
      CLOZE_BLANK,
    )}\n(첫 글자: ${word[0]}, ${word.length}글자)`,
    options: [],
    answer: word,
    explanation: `원문에 쓰인 단어는 ${word} 입니다. 대소문자는 구별하지 않습니다.`,
    evidence: sentence,
  }));
  return {
    ok: true,
    draft: { title, source: "cloze", passage: passage.trim(), questions },
  };
}
