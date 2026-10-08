/**
 * 교과서 이관 — 문항 글에서 출판사를 드러내는 이름을 다른 이름으로 바꾼다 (D-161).
 *
 * 원장님 2026-10-08: «문제에 출판사 이름이나 학교 이름 등 노골적인 용어들은 다른 이름으로 대체».
 *
 * 출판사 자료는 제 이름을 문항 속에 심는다 — 천재교육 자료의 등장인물은 «천재»고(«천재와 원영이가 …» · «천재네 가족»),
 * 학교 이름에 붙이기도 한다(«천재중학교»). 그 이름을 딴 **사람 · 학교**만 바꾼다:
 *
 *   · 학교 — 출판사 이름 + 학교(«천재중학교» · «비상고등학교»)는 어느 출판사의 문항이든 «한빛…»으로.
 *   · 사람 — **그 출판사의 문항에서** 그 이름이 사람으로 쓰인 것만(뒤에 조사가 붙은 낱말 머리). 다른 이름은 받침 없는
 *            이름에서 고른다(조사가 그대로 맞는다 — «천재와» → «지우와»). 그 이름이 이미 글에 있으면 다음 이름.
 *
 * 🔴 낱말로 쓰인 것은 건드리지 않는다 — «동아리» · «미래에» · «비상구» · «수학 천재 가우스». 그래서 사람 이름 규칙은
 *    지금 **천재** 하나다(실린 글에서 본 것). 다른 출판사의 이름이 사람으로 쓰인 것이 나오면 예와 함께 더한다.
 * 🔴 인용한 글의 출처(«(출처: …, “암호의 세계”)»)는 지우지 않는다 — 남의 글을 실으면서 출처를 떼는 것이 더 나쁘다.
 *
 * 바꾸지 못한 «출판사의 온 이름»(«천재교육 교과서 87쪽»)은 `blatantWords` 가 대고, 적재기는 그런 문항을 잠근다.
 * 수식 안은 건드리지 않는다. 바꾼 것은 `renamed` 로 돌려준다(원장에 남긴다).
 */

const MATH_SPLIT = /(\$[^$]*\$)/;

/** 학교 이름에 붙는 출판사 낱말 — 뒤에 «…학교»가 오면 낱말일 수 없다 */
const SCHOOL_BRANDS = "천재|비상|미래엔|미래|동아|지학|교학|능률|와이비엠|YBM";
const SCHOOL =
  "초등학교|중학교|고등학교|대학교|여자중학교|여자고등학교|여중|여고";
const BRAND_SCHOOL = new RegExp(
  `(?<![가-힣A-Za-z])(?:${SCHOOL_BRANDS})\\s?(${SCHOOL})`,
  "g",
);
const NEUTRAL_SCHOOL = "한빛";

/** 출판사 → 그 자료에서 사람 이름으로 쓰이는 낱말(본 것만) */
const PERSON_BRAND: Record<string, string> = { 천재교육: "천재" };
/** 사람 이름 뒤에 오는 말 — 받침 없는 이름의 조사 */
const NAME_TAIL = "네|와|가|는|의|를|도|랑|에게|야";
/** 바꿀 이름 — 전부 받침이 없다(조사가 그대로 맞는다) */
const NEUTRAL_NAMES = ["지우", "서아", "하루", "도하", "미나"] as const;

/** 출판사의 온 이름 — 문항 글에 있으면 출처가 그대로 드러난다 */
const PUBLISHER_NAMES =
  /천재교육|천재교과서|비상교육|비상교과서|미래엔|동아출판|지학사|교학사|NE능률|능률교육|와이비엠|YBM/g;

interface Texts {
  content: string;
  answer: string;
  solution: string | null;
}

const outsideMath = (
  text: string,
  replace: (chunk: string) => string,
): string =>
  text
    .split(MATH_SPLIT)
    .map((chunk, index) => (index % 2 === 1 ? chunk : replace(chunk)))
    .join("");

/**
 * 한 문항의 글들에 **같은 이름**을 쓰는 바꾸개. `texts` 는 그 문항에 실릴 수 있는 글 전부다(본문 · 정답 · 해설 후보들) —
 * 바꿀 이름을 고를 때 «이미 글에 있는 이름»을 피하려고 받는다.
 */
export function createRenamer(
  publisher: string,
  texts: Array<string | null | undefined>,
): { fix: (text: string) => string; renamed: () => string[] } {
  const all = texts.filter(Boolean).join(" ");
  const person = PERSON_BRAND[publisher];
  const personPattern = person
    ? new RegExp(`(?<![가-힣A-Za-z])${person}(?=${NAME_TAIL})(?!적)`, "g")
    : null;
  const usesPerson =
    personPattern !== null &&
    all.split(MATH_SPLIT).some((chunk, index) => {
      personPattern.lastIndex = 0;
      return index % 2 === 0 && personPattern.test(chunk);
    });
  const name = usesPerson
    ? (NEUTRAL_NAMES.find((candidate) => !all.includes(candidate)) ?? null)
    : null;
  let schoolSeen = false;
  return {
    fix: (text) =>
      outsideMath(text, (chunk) => {
        let out = chunk.replace(BRAND_SCHOOL, (_all, school: string) => {
          schoolSeen = true;
          return NEUTRAL_SCHOOL + school;
        });
        if (personPattern && name) out = out.replace(personPattern, name);
        return out;
      }),
    renamed: () => [
      ...(usesPerson && name ? [`${person} → ${name}`] : []),
      ...(schoolSeen ? [`출판사 이름을 딴 학교 → ${NEUTRAL_SCHOOL}`] : []),
    ],
  };
}

/** 본문 · 정답 · 해설에서 이름을 바꾼다 — 세 칸에 같은 이름을 쓴다. */
export function neutralizeNames(
  texts: Texts,
  publisher: string,
): Texts & { renamed: string[] } {
  const renamer = createRenamer(publisher, [
    texts.content,
    texts.answer,
    texts.solution,
  ]);
  const content = renamer.fix(texts.content);
  const answer = renamer.fix(texts.answer);
  const solution = texts.solution === null ? null : renamer.fix(texts.solution);
  return { content, answer, solution, renamed: renamer.renamed() };
}

/** 글에 남은 «출판사의 온 이름» — 없으면 빈 배열. 수식 밖만 본다. */
export function blatantWords(text: string): string[] {
  const found = new Set<string>();
  text.split(MATH_SPLIT).forEach((chunk, index) => {
    if (index % 2 === 1) return;
    for (const match of chunk.matchAll(PUBLISHER_NAMES)) {
      // «미래엔» 은 «미래에는» 의 준말로도 쓰인다 — 뒤에 한글이 바로 붙으면 낱말이다
      if (match[0] === "미래엔" && /[가-힣]/.test(chunk[match.index + 3] ?? ""))
        continue;
      found.add(match[0]);
    }
  });
  return [...found];
}
