/**
 * 「보기에서 **모두 고르는**」 문항의 규칙 — **한 곳**에 둔다.
 *
 * 세는 쪽(`scripts/qa/census-choose-all.ts`)·지키는 쪽(엔진 시험)·고치는 쪽이
 * **같은 파일**을 읽는다. 목록을 손으로 두 벌 쓰면 한쪽만 옮겨도 아무도 모른다
 * (CLAUDE.md 2026-08-18 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」).
 *
 * ⚠️ **「모두 고르시오」와 「모두 몇 개인지 구하시오」는 다른 부류다.**
 *    뒤엣것은 정답이 **하나**(개수)다. 낱말 「모두」로 묶으면 같이 딸려 온다.
 *    가르는 축은 낱말이 아니라 **「보기에서 고르는가」** 다 — 아래 `isChooseAll`.
 *
 * ⚠️ 여기 있는 함수는 **판정을 하지 않는 것과 하는 것**이 섞여 있다. 발견기가 쓰는
 *    `instructionTail`·`answerShape` 는 «기계가 셀 수 있는 사실»만 내고,
 *    `isChooseAll` 만 판정이다. 발견기는 판정을 안 쓰고 사실만 쓴다.
 */

/** 정답 항목 수를 못 세는 경우. 0으로 뭉개면 «없다»와 «못 센다»가 안 갈린다. */
export const UNCOUNTABLE = -1;

/**
 * 보기 표식으로 쓰이는 «둘러싸인 글자» — 유니코드 **블록**으로 본다.
 * 손 목록이면 새 표식이 들어올 때 구조적으로 0이 된다.
 */
const ENCLOSED_BLOCKS: readonly (readonly [number, number])[] = [
  [0x2460, 0x24ff], // Enclosed Alphanumerics — ①②③ ⓐ ⑴
  [0x2776, 0x2793], // Dingbats — ❶❷
  [0x3200, 0x32ff], // Enclosed CJK — ㉠㉡ ㈀
];

export function isEnclosedMark(ch: string): boolean {
  const cp = ch.codePointAt(0);
  return (
    cp !== undefined && ENCLOSED_BLOCKS.some(([lo, hi]) => cp >= lo && cp <= hi)
  );
}

/** 정답 문자열이 «둘러싸인 표식들»로만 이루어졌으면 그 표식 배열, 아니면 null. */
export function enclosedAnswerMarks(answer: string): string[] | null {
  const marks: string[] = [];
  for (const ch of answer) {
    if (isEnclosedMark(ch)) {
      marks.push(ch);
      continue;
    }
    // 표식 사이에 올 수 있는 것: 공백·쉼표·가운뎃점·「와/과」 정도.
    if (/[\s,、·和]/.test(ch)) continue;
    if (ch === "와" || ch === "과") continue;
    return null;
  }
  return marks.length > 0 ? marks : null;
}

/**
 * 정답의 «모양» — 발견기의 축. **판정이 아니다.**
 *
 *   `표식`  ①②③ 처럼 보기 표식만으로 된 정답 (개수는 정확하다)
 *   `나열`  한 수식 **안**에 쉼표로 늘어놓은 값 — `$1,\ 2,\ 8$` (「모두 쓰시오」류)
 *   `조각`  수식 **밖** 쉼표로 나뉜 조각 — `$x=3$, $y=4$` (대개 **한 답의 여러 부분**)
 *   `단일`  그 밖의 하나
 *
 * ⚠️ `조각` 은 정답 «개수»가 아니다. 연립방정식의 해 `$x=3$, $y=4$` 는 답이 하나다.
 *    개수로 읽으면 과다 계수가 된다 — 그래서 이름을 달리 둔다.
 */
export type AnswerShape = {
  kind: "표식" | "나열" | "조각" | "단일";
  n: number;
};

export function answerShape(answer: string): AnswerShape {
  const marks = enclosedAnswerMarks(answer);
  if (marks) return { kind: "표식", n: marks.length };

  // 수식 밖 쉼표 — `$…$` 를 통째로 가린 뒤에 남는 쉼표.
  const outside = answer.replace(/\$[^$]*\$/g, "▦");
  const outsidePieces = outside
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (outsidePieces.length > 1)
    return { kind: "조각", n: outsidePieces.length };

  // 수식 «안» 쉼표 나열 — `$1,\ 2,\ 8$`. 괄호 안 쉼표(좌표 `(5, 8)`)는 세지 않는다.
  const spans = [...answer.matchAll(/\$([^$]*)\$/g)].map((m) => m[1] ?? "");
  for (const span of spans) {
    const flat = span.replace(/\([^()]*\)/g, "▦").replace(/\{[^{}]*\}/g, "▦");
    const parts = flat
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length > 1) return { kind: "나열", n: parts.length };
  }
  return { kind: "단일", n: 1 };
}

/** 줄머리가 보기 표식인가 — `① …`, `⑴ …`. */
function isChoiceLine(line: string): boolean {
  const t = line.trimStart();
  return t.length > 0 && isEnclosedMark(t[0]!);
}

/** 본문에서 **보기 줄을 걷어낸** 발문 부분. */
export function stemOf(content: string): string {
  const lines = content.split("\n");
  const first = lines.findIndex(isChoiceLine);
  return (first < 0 ? lines : lines.slice(0, first)).join("\n");
}

/** 본문에 «고를 보기»가 몇 줄 있나 — 줄머리가 표식인 줄 수. */
export function choiceLineCount(content: string): number {
  return content.split("\n").filter(isChoiceLine).length;
}

/**
 * 발문의 **지시 꼬리** — 마지막 지시 문장의 끝 부분. 발견기의 축이고 **판정이 아니다.**
 * 수식은 ▦ 로 가려서 같은 지시가 숫자 때문에 흩어지지 않게 한다.
 */
export function instructionTail(content: string, tailLen = 22): string {
  const flat = stemOf(content)
    .replace(/\$[^$]*\$/g, "▦")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = flat
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const last = sentences[sentences.length - 1] ?? flat;
  return last.length <= tailLen ? last : `…${last.slice(-tailLen)}`;
}

/**
 * «옳은 것을 **모두 고른 것**» — 「모두」가 꾸미는 것은 **고른 조합**이다(2026-10-08 엔진 보강 0단계).
 *
 * «…모두 고른 것은?» 은 «고른»(U+B978)이 «고르»(U+B974)를 품지 않아 원래 안 걸렸다.
 * 새던 것은 «…모두 고른 것을 **고르시오**» — 뒤의 «고르» 앞에 이 «모두»가 있어 «모두 고르기»로 읽혔다.
 * 그래서 이 구절을 **지운 뒤에** 아래 순서 규칙을 댄다(지운 뒤에도 진짜 «모두 고르시오»가 남으면 잡는다).
 */
const COMBO_PICK_PHRASE = /(?:모두|모든)\s*(?:바르게\s*)?고른\s*것/g;

/** 보기 낱말 하나가 ㄱㄴㄷ 꼴 «이름표»인가 — `ㄱ` · `㉠` · `(가)`. */
const COMBO_LABEL = /^(?:[ㄱ-ㅎ]|[㉠-㉭]|\([가-하]\))$/;

/**
 * 보기 줄(둘 이상)이 **전부** ㄱㄴㄷ 이름표의 조합인가 — `① ㄱ, ㄴ` · `② ㉠` · `③ (가), (다)`.
 *
 * 보기 하나가 조합 하나이므로 정답은 그 번호 **하나**다. 발문이 «모두 고르면?» 이어도 그렇다
 * (교과서에 이 꼴이 섞여 있다). 하나라도 진술 · 식이면 조합형이 아니다 — 전부여야 한다.
 */
function choicesAreLabelCombos(content: string): boolean {
  const lines = content.split("\n").filter(isChoiceLine);
  if (lines.length < 2) return false;
  return lines.every((line) => {
    const body = [...line.trimStart()].slice(1).join("").trim();
    const parts = body
      .split(/\s*[,、·]\s*|\s+(?:와|과)\s+|\s+/)
      .filter((s) => s.length > 0);
    return parts.length > 0 && parts.every((p) => COMBO_LABEL.test(p));
  });
}

/**
 * 🔴 **판정** — 「보기에서 여럿을 고르라」는 발문인가.
 *
 * 열쇠를 **낱말 「모두」로 잡지 않는다.** 「모두 몇 개인지 구하시오」가 같이 걸리고
 * 그건 정답이 하나다(브리프의 경고). 세 가지를 **모두** 요구한다:
 *
 *   ㉠ 「고르」 가 있다 — 보기에서 **고르는** 문항이다
 *   ㉡ 「모두」·「모든」 이 그 앞에 있다 — 하나만 고르는 것이 아니다
 *   ㉢ 본문에 **고를 보기가 둘 이상** 있다 — 셀 수 있는 반증 근거(본문 밖 열쇠)
 *
 * ㉢ 이 핵심이다. 「모두 고르시오」라고 써 놓고 보기가 없으면 그건 다른 부류다.
 * 낱말 둘만으로는 그것을 못 가른다.
 *
 * ㉣ **ㄱㄴㄷ 조합형은 뺀다** — 보기가 전부 이름표 조합이거나(`choicesAreLabelCombos`),
 *    «모두»가 «고른 것»(조합)을 꾸미면(`COMBO_PICK_PHRASE`) 고르는 것은 조합 **하나**다.
 */
export function isChooseAll(content: string): boolean {
  // ㄱㄴㄷ **조합형**은 보기 하나가 조합 하나다 — 정답이 하나라 이 부류가 아니다(아래 둘).
  if (choicesAreLabelCombos(content)) return false;
  const stem = stemOf(content).replace(COMBO_PICK_PHRASE, "▦");
  if (!/고르/.test(stem)) return false;
  if (!/모두|모든/.test(stem)) return false;
  // 「모두」가 「고르」보다 뒤에 있으면 다른 문장이다 — 앞에 와야 「모두 고르라」다.
  const pick = stem.search(/고르/);
  const all = stem.search(/모두|모든/);
  if (all > pick) return false;
  return choiceLineCount(content) >= 2;
}

/**
 * 「모두 고르시오」 문항의 **정답 개수** — 못 세면 `UNCOUNTABLE`.
 * 보기 표식 정답만 셀 수 있다. 그 밖의 모양은 0으로 뭉개지 않는다.
 */
export function chooseAllAnswerCount(answer: string): number {
  const marks = enclosedAnswerMarks(answer);
  if (!marks) return UNCOUNTABLE;
  return new Set(marks).size;
}

/** 원장님 확정 (2026-08-25): 「모두 고르시오」의 정답은 **정확히 2개**. */
export const CHOOSE_ALL_ANSWER_COUNT = 2;

/**
 * 🔴 **관문** — 엔진이 낸 문항이 규칙을 어기면 **멈춘다.**
 *
 * 생성기마다 「정답 2개」를 따로 지키면 새 유형이 하나 늘 때마다 그 자리가 하나
 * 더 생기고, 빠뜨려도 아무도 모른다. 그래서 **엔진 진입점 한 곳**이 산출물을
 * 다시 보고 아니면 던진다 — 조용히 정답 셋짜리 문항을 내보내지 않는다.
 *
 * 「모두 고르시오」가 아닌 문항은 **그냥 지나간다** — 「모두 몇 개인지 구하시오」·
 * 「…을 모두 쓰시오」는 다른 부류이고 이 규칙의 대상이 아니다.
 */
export function assertChooseAllAnswerCount(
  content: string,
  answer: string,
  where: string,
): void {
  if (!isChooseAll(content)) return;
  const n = chooseAllAnswerCount(answer);
  if (n === CHOOSE_ALL_ANSWER_COUNT) return;
  throw new Error(
    `「모두 고르시오」의 정답은 ${CHOOSE_ALL_ANSWER_COUNT}개여야 합니다 — ` +
      `${where} 가 ${n === UNCOUNTABLE ? "«셀 수 없는»" : `${n}개짜리`} 정답을 냈습니다 (정답 «${answer}»)`,
  );
}
