/**
 * 교과서 이관 — 줄 끝에서 끊겼다가 빈칸으로 이어진 낱말을 다시 붙인다 (D-161).
 *
 * 출판사 파일은 줄마다 엔터를 친 것이 있다. 줄을 이을 때 «붙일지 띄울지»를 말뭉치에 물었는데(`normalize.py` 의 `Corpus`),
 * 근거가 모자란 자리는 띄웠다 — 그래서 «거 리는» · «방향으 로» · «같으 므로» 가 남았다(실은 문항의 1% 남짓).
 *
 * 사전은 **검토자가 쓴 해설**이다 — 줄 끝에서 끊긴 적이 없는 글이라 낱말의 꼴을 믿을 수 있다.
 * 붙이는 조건은 좁다. 두 조각을 붙인 꼴이 사전에 두 번 넘게 나오고,
 *   · 앞 조각이 사전에 혼자서는 한 번도 안 나오거나(«거» · «방향으» · «같으»)
 *   · 뒤 조각이 «므로» 다(혼자 쓰이는 일이 없는 어미 — «$x=3$이 므로»)
 * 빈칸 하나만 지운다 — 글자는 그대로다. 수식 안은 건드리지 않는다.
 */

/** 수식 덩이를 가르는 틀 — 갈라 낸 배열의 홀수 번째가 수식이다 */
const MATH_SPLIT = /(\$[^$]*\$)/;
const WORD = /[가-힣]+/g;
const SPLIT_PAIR = /(?<![가-힣])([가-힣]{1,8}) (?=([가-힣]{1,8})(?![가-힣]))/g;
/** 혼자 쓰이는 일이 없는 어미 — 앞 조각이 낱말이어도 붙인다 */
const BOUND_ENDINGS = new Set(["므로", "으므로"]);

export type Vocabulary = Map<string, number>;

/** 글 묶음에서 한글 낱말을 센다(수식 밖). */
export function buildVocabulary(texts: Iterable<string>): Vocabulary {
  const vocabulary: Vocabulary = new Map();
  for (const text of texts)
    text.split(MATH_SPLIT).forEach((chunk, index) => {
      if (index % 2 === 1) return;
      for (const word of chunk.match(WORD) ?? [])
        vocabulary.set(word, (vocabulary.get(word) ?? 0) + 1);
    });
  return vocabulary;
}

/** 끊겼다 이어진 낱말을 붙인다. 사전이 비어 있으면 아무것도 하지 않는다. */
export function unsplitWords(text: string, vocabulary: Vocabulary): string {
  if (vocabulary.size === 0) return text;
  const count = (word: string): number => vocabulary.get(word) ?? 0;
  return text
    .split(MATH_SPLIT)
    .map((chunk, index) =>
      index % 2 === 1
        ? chunk
        : chunk.replace(
            SPLIT_PAIR,
            (whole, left: string, right: string, offset: number) => {
              if (count(left + right) < 2) return whole;
              if (BOUND_ENDINGS.has(right)) return left;
              // 수식 바로 뒤의 조각은 조사다(«$x>1$의 해») — 사전에 혼자 안 나와도 낱말의 앞머리가 아니다
              const afterMath = offset === 0 && index > 0;
              return count(left) === 0 && !afterMath ? left : whole;
            },
          ),
    )
    .join("");
}
