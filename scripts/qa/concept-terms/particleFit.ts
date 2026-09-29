// 문장 조립 카드의 «조사 · 품사 단서» 판정 — 시험(`conceptSentenceSymmetry.test.ts`)과 채움 원장 생성기(`build-fillings-audit.ts --mechanical`)가
// 함께 쓴다(리드 검토 B M3 — 기계 거름을 저장소에서 다시 낼 수 있게. 옛 거름은 저장소 밖 임시 스크립트라 규칙이 바뀐 뒤 81칸이 판정 없이 남았다).
import { orderFreeCards } from "../../../src/lib/math-explorers/conceptOrderFree";

// 받침으로 갈리는 조사 — [받침 있을 때, 없을 때]. «으로/로»는 ㄹ 받침이면 «로».
export const PARTICLES: [string, string][] = [
  ["으로", "로"],
  ["이라고", "라고"],
  ["을", "를"],
  ["이", "가"],
  ["은", "는"],
  ["과", "와"],
];
const DIGIT_BATCHIM: Record<string, number> = {
  "0": 21,
  "1": 8,
  "2": 0,
  "3": 16,
  "4": 0,
  "5": 0,
  "6": 1,
  "7": 8,
  "8": 8,
  "9": 0,
  "°": 0,
  "²": 17,
};
// 로마자 — 숫자 뒤(또는 홀로)의 단위는 단위 이름으로(«그램»만 받침 ㅁ), 나머지는 글자 이름으로 읽는다(리드 검토 A2 L1 · B —
// 모르는 글자로 두면 «들어갈 수 있음»이 되어 kg · n 같은 단서를 놓친다). 230장에 나오는 글자로 맞췄다.
const UNIT_BATCHIM: Record<string, number> = {
  kg: 16,
  g: 16,
  mL: 0,
  L: 0,
  km: 0,
  cm: 0,
  mm: 0,
  m: 0,
};
const LETTER_BATCHIM: Record<string, number> = {
  a: 0,
  b: 0,
  c: 0,
  k: 0,
  p: 0,
  q: 0,
  x: 0,
  y: 0,
  A: 0,
  B: 0,
  n: 4, // 엔
  N: 4,
  l: 8, // 엘
  m: 16, // 엠
};
/** 마지막 글자의 받침 번호(0 = 없음, 8 = ㄹ). 읽기가 갈리는 글자(표에 없는 로마자 · 기호)는 null.
 * 분수 a/b 는 «b분의 a»로 읽어 끝소리가 분자다(1/2 → «이분의 일» → ㄹ · 리드 검토 A2 L1). */
export const batchim = (word: string): number | null => {
  // 글자 분수도 같다 — «중심각/360°»는 «360도분의 중심각»
  const fraction = /^(.*[^\s/])\s*\/\s*[^/]+$/.exec(word.trim());
  if (fraction) return batchim(fraction[1]!);
  const unit = /(?:^|\d)\s*(kg|mL|km|cm|mm|g|L|m)$/.exec(word.trim());
  if (unit) return UNIT_BATCHIM[unit[1]!]!;
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28;
  if (ch in LETTER_BATCHIM) return LETTER_BATCHIM[ch]!;
  return ch in DIGIT_BATCHIM ? DIGIT_BATCHIM[ch]! : null;
};
// 품사(리드 검토 A2 M2) — 명사 자리에 동사꼴 · 관형형 말이 오면 받침과 상관없이 안 맞는다. 목록은 230장의 말로 맞췄다
// (끝 글자만 보면 동사꼴인 명사: 순서 · 무게 · 해).
const NOUNS_LOOKING_LIKE_VERBS = new Set([
  "순서",
  "숫자 순서",
  "덧셈 순서",
  "무게",
  "해",
]);
const lastSyllable = (word: string) => word.trim().slice(-1);
export const isVerbForm = (word: string) => {
  const w = word.trim();
  if (NOUNS_LOOKING_LIKE_VERBS.has(w)) return false;
  const last = lastSyllable(w);
  // 관형형 «-는» · 부사형 «-게» · 연결형 «-고 · -서 · -며» · 종결형 «-다»(230장에 «다»로 끝나는 명사는 없다)
  if (["는", "게", "고", "서", "며", "다"].includes(last)) return true;
  // 연결형 «-어 · -여»(한 글자 «해»는 명사)
  return (
    w.length >= 2 &&
    ["어", "여", "아", "워", "해", "져", "려", "쳐"].includes(last)
  );
};
// 관형형 «-ㄴ»(더한 · 작은 · 짝수인 …) — 230장에서 이 끝 글자로 끝나는 명사는 없다
export const isAdnominal = (word: string) =>
  ["한", "은", "인", "큰", "뺀", "른", "긴", "눈", "된", "진"].includes(
    lastSyllable(word),
  );
// 부사(«똑같이 · 순서 없이 · 그대로 · 반으로 · 반드시») — 조사가 안 붙는다. «길이 · 넓이 · 가로»는 명사라 끝 두 글자로 가른다
export const isAdverb = (word: string) =>
  /(없이|같이|대로|으로)$/.test(word.trim()) ||
  ["반드시", "절대로", "따로", "함께"].includes(word.trim());
export const isNounLike = (word: string) =>
  !isVerbForm(word) && !isAdnominal(word) && !isAdverb(word);
/** 빈칸 뒤 조각에 그 말이 문법상 맞는가 — «하다» 칸 · 서술격 · «에» · 받침 조사. 판단할 수 없으면 null. */
export const fitsParticle = (word: string, after: string): boolean | null => {
  // «하다»가 붙는 칸 — 명사만(«-기» · «-만» 은 «하다»가 안 붙는다)
  if (/^(하고|하여|하며|하면|하는|한 |한$|한다|했|할 )/.test(after))
    return isNounLike(word) && !/[기만]$/.test(word.trim());
  // 서술격 «이다 · 이며 · 이고 · 이면 · 이므로» — 받침과 상관없이 명사면 맞다(리드 검토 A2 L2). «그대로이다»처럼 부사도 받는다
  if (/^이(다|며|고|면|므로|지만)/.test(after))
    return !isVerbForm(word) && !isAdnominal(word);
  // «에» — 명사만, «-만» 뒤는 어색하다
  if (after.startsWith("에"))
    return isNounLike(word) && !word.trim().endsWith("만");
  for (const [withB, without] of PARTICLES) {
    const used = after.startsWith(withB)
      ? withB
      : after.startsWith(without)
        ? without
        : null;
    if (!used) continue;
    if (!isNounLike(word)) return false;
    const b = batchim(word);
    if (b === null) return null;
    if (withB === "으로")
      return used === "으로" ? b !== 0 && b !== 8 : b === 0 || b === 8;
    return used === withB ? b !== 0 : b === 0;
  }
  return null;
};
/** 조사가 답을 알려 주는 칸 — (칸, 까닭) 목록. */
export const particleGiveaways = (card: {
  id: string;
  pieces: string[];
  words: string[];
}) => {
  const out: string[] = [];
  const slotFits = [0, 1].map((slot) =>
    card.words.map((w) => fitsParticle(w, card.pieces[slot + 1]!)),
  );
  // 판단할 수 없는 말(null)은 «맞을 수도 있음»으로 센다 — 칸 전체를 건너뛰면 정답만 모르는 말일 때 단서를 놓친다(리드 검토 A2 L3)
  slotFits.forEach((fits, slot) => {
    if (fits[slot] === false)
      out.push(
        `칸 ${slot + 1} — 정답 «${card.words[slot]}»이 제 조사에 안 맞음`,
      );
    const ok = card.words.filter((_, i) => fits[i] !== false);
    if (ok.length === 1 && fits[slot] !== false)
      out.push(`칸 ${slot + 1} — «${ok[0]}» 하나`);
  });
  // 한 칸에 정답 둘만 맞으면 그 칸은 정답 둘 중 하나로 좁혀진다(리드 검토 A2 L7 — 경우의 수 첫 칸 · 순서 무관 카드도 같다)
  slotFits.forEach((fits, slot) => {
    if (
      fits[0] === true &&
      fits[1] === true &&
      fits[2] === false &&
      fits[3] === false
    )
      out.push(`칸 ${slot + 1} — 정답 둘만 맞음`);
  });
  // 오답 둘이 어느 칸에도 못 들어가면 — 순서 무관 카드는 조사만으로 정답이 정해지고, 순서 있는 카드는 순서만 묻는다
  // (리드 검토 A2 L2 — 크기가 같은 분수 · 상대도수)
  if (
    [2, 3].every((i) => slotFits[0]![i] === false && slotFits[1]![i] === false)
  )
    out.push(
      orderFreeCards.has(card.id)
        ? "순서 무관인데 오답이 두 칸 어디에도 못 들어감"
        : "오답이 두 칸 어디에도 못 들어가 순서만 물음",
    );
  return out;
};
