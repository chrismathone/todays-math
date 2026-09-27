/**
 * 보정 문장 표 — 원본(`definition-content.ts` · PROVENANCE)은 그대로 두고 **보이는 문장만** 고친다
 * (원장님 2026-09-28, D-143 ④).
 *
 * 고치는 것은 빈칸 밖의 말뿐이다 — 빈칸 두 곳(정답 조각 `words[0]`·`words[1]`)과 보기는 그대로라 채점(조각 번호)이
 * 바뀌지 않는다. 문장이 보이는 자리 셋(정의 조립 조각 · 뜻 만나기 뜻 · 도감 «뜻 다시 보기»)은 모두 서버 뷰
 * (`engine.ts`)가 `conceptSentence` 를 지난다(«모든 화면 일치»).
 *
 * 다른 카드는 교재 용어 전수(`docs/reference/concept-terms/*`)와 대조해 **고칠 목록만** 만들고, 원장님 확정 전에는
 * 여기에 넣지 않는다.
 */
type SentenceCard = {
  id: string;
  definition: string;
  pieces: string[];
  words: string[];
};
type SentenceFix = {
  /** 조립 문장 세 조각 — 앞 · 빈칸 사이 · 뒤. */
  pieces: readonly [string, string, string];
  reason: string;
};

export const conceptSentenceFixes: Readonly<Record<string, SentenceFix>> = {
  "g8-substitution": {
    // 원문 «한 식에서 구한 미지수의 표현을 [다른 식]에 [넣어] 푸는 방법.»
    pieces: [
      "한 식에서 구한 미지수의 표현을 ",
      "에 ",
      " 연립방정식을 푸는 방법.",
    ],
    reason: "무엇을 푸는지(연립방정식)가 빠졌다 — 원장님 제보 캡처(2026-09-28)",
  },
  "g8-elimination": {
    // 원문 «두 식을 더하거나 빼서 한 [미지수]를 [없애는] 방법.»
    pieces: ["연립방정식을 풀 때 두 식을 더하거나 빼서 한 ", "를 ", " 방법."],
    reason: "무엇을 풀 때의 방법인지(연립방정식)가 빠졌다 — 대입법과 같은 결함",
  },
};

/** 보이는 문장 — 표에 있으면 보정 조각과 그 조각으로 다시 이은 뜻, 없으면 원문 그대로. */
export function conceptSentence(card: SentenceCard): {
  pieces: string[];
  definition: string;
} {
  const fix = Object.prototype.hasOwnProperty.call(
    conceptSentenceFixes,
    card.id,
  )
    ? conceptSentenceFixes[card.id]
    : undefined;
  if (!fix) return { pieces: card.pieces, definition: card.definition };
  const [before, between, after] = fix.pieces;
  return {
    pieces: [before, between, after],
    definition: before + card.words[0] + between + card.words[1] + after,
  };
}
