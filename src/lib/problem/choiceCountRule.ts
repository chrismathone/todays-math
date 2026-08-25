/**
 * 「보기가 있으면 **정확히 다섯 개**」 — 규칙을 **한 곳**에 둔다 (D-80).
 *
 * 원장님 지시 2026-08-25: *「일부 4지선다 문항들이 있는데 전부 삭제후 5지선다로 교체.
 * 혹은 정답을 방해하지 않는 5번 보기 생성」*.
 *
 * 세는 쪽(`scripts/qa/census-choice-count.ts`)·지키는 쪽(엔진 시험)·엔진이
 * **같은 파일**을 읽는다.
 *
 * ## 열쇠를 손으로 정하지 않는다
 *
 * ㉠ **개수**는 `parseProblemContent(content).choices.length` — 지면이 실제로 그리는
 *    그 목록이다. 「①~⑤ 를 세면 되겠지」로 손수 세면 지면과 갈라진다.
 * ㉡ **분모**를 `question_type` 으로 가르지 않는다 — 못 믿는 컬럼이다
 *    (CLAUDE.md 2026-08-18: 「정답이 ①인데 «서술형» 이라 적힌 행이 36건」).
 *
 * 🔴 **정답 모양으로도 못 가른다.** 「정답이 보기 표식인 것」만 분모로 잡으면
 *    원장님이 지목하신 `J30401-A04-002` 가 **사라진다** — 보기가 ①②③④ 넷인데
 *    정답이 `$3$`(계수 값)이다. 그래서 분모는 **「지면에 보기가 그려지는가」** 하나뿐이고,
 *    정답 모양은 거르는 자가 아니라 **교차축**이다.
 */
import { parseProblemContent } from "./parseProblemContent";

/** 원장님 확정 (2026-08-25): 보기가 있으면 정확히 다섯 개. */
export const CHOICE_COUNT = 5;

/** 지면이 그리는 보기 개수. 규칙은 **제품 파서 한 곳**에서 온다. */
export function choiceCountOf(content: string): number {
  return parseProblemContent(content).choices.length;
}

/** 🔴 **분모** — 지면에 보기가 그려지는 문항인가 (머리말 참조). */
export function hasChoices(content: string): boolean {
  return choiceCountOf(content) > 0;
}

/**
 * 🔴 **두 번째 축** — 「줄머리가 **둥근 표식**인 줄」의 수.
 *
 * `choiceCountOf` 만 보면 **못 보는 부류**가 있다. 제품 렌더러는 개행 뒤에 `①~⑮`
 * 또는 `1.` 이 올 때만 보기로 읽는데, 엔진에는 `㉠~㉤` 로 목록을 내는 유형이 있다
 * (`2-1|일차함수와 그 그래프 ⑴|01·03` 등). 그 목록은 파서에게 **보기 0개**로 보여서
 * 「보기 넷」이 개수 세는 자에 안 걸렸다.
 *
 * ⚠️ 여기 처음 적었던 「지면에서 한 줄로 죽 이어진다」는 **틀린 말이었다** — 실물을
 *    `/dev/choice-marks` 로 그려 세어 보고 알았다(2026-08-25). 줄은 `hardBreaks` 로
 *    이미 바뀐다. 남는 차이는 «보기 목록 대접을 받는가» 다 — 아래 `assertChoiceMarks`.
 * 실제로 원장님 지시를 재는 동안 여기서 **4개짜리 목록 하나**가 더 나왔다.
 *
 * ## 왜 «둥근» 표식만인가 — 손 목록이 아니라 유니코드 블록이다
 *
 * `㈎㈏㈐`(괄호 친 한글)는 우리말 관행에서 **조건**이지 보기가 아니고, 실제로
 * `1-2|다면체와 회전체|07` 이 그렇게 쓴다. 상자 이름표(`㉠ $6$, $-1$ / ㉡ …` 가
 * **한 줄에** 있는 `1-1|정수와 유리수의 계산|11`)도 보기가 아니다.
 * 그래서 ⑴ **둥근** 표식이고 ⑵ **줄머리**에 있는 것만 센다 — 둘 다 기계가 셀 수 있다.
 */
const ROUND_MARK_BLOCKS: readonly (readonly [number, number])[] = [
  [0x2460, 0x24ff], // ①②③ ⓐ ⑴
  [0x2776, 0x2793], // ❶❷
  [0x3260, 0x327f], // ㉠㉡㉢ (괄호 친 ㈎㈏ 는 0x321x 라 빠진다)
];
function isRoundMark(ch: string): boolean {
  const cp = ch.codePointAt(0);
  return (
    cp !== undefined &&
    ROUND_MARK_BLOCKS.some(([lo, hi]) => cp >= lo && cp <= hi)
  );
}

/**
 * 줄머리에 **실제로 쓰인** 표식 글자들 — 나온 순서대로.
 *
 * 「무엇이 나쁜 표식인가」를 미리 나열하지 않는다. 산출물에서 뽑아 그대로 보여
 * 주므로, 아무도 목록에 안 적은 표식(❶ · ⓐ …)도 신고문에 그대로 실린다.
 */
export function lineHeadMarks(content: string): string[] {
  const out: string[] = [];
  for (const line of content.split("\n")) {
    const t = line.trimStart();
    if (t.length > 0 && isRoundMark(t[0]!)) out.push(t[0]!);
  }
  return out;
}

export function markListCount(content: string): number {
  return lineHeadMarks(content).length;
}

/**
 * 지면이 읽든(`choiceCountOf`) 표식 목록이든 — **보기 목록의 크기**.
 * 둘 다 0이면 보기가 없는 문항이다.
 */
export function anyChoiceCount(content: string): number {
  return Math.max(choiceCountOf(content), markListCount(content));
}

/**
 * 🔴 **관문** — 엔진이 낸 문항이 규칙을 어기면 **멈춘다.**
 *
 * 생성기마다 「보기 다섯」을 따로 지키면 새 유형이 하나 늘 때마다 그 자리가 하나
 * 더 생기고, 빠뜨려도 아무도 모른다. 그래서 **엔진 진입점 한 곳**이 산출물을
 * 다시 보고 아니면 던진다.
 *
 * 보기가 **아예 없는** 문항(단답형·서술형)은 그냥 지나간다 — 이 규칙의 대상이 아니다.
 */
export function assertChoiceCount(content: string, where: string): void {
  // 지면이 읽는 목록과 «줄머리 표식» 목록을 **둘 다** 본다 — 하나만 보면
  // ㉠ 목록이 구조적으로 안 걸린다(위 `markListCount` 머리말).
  const n = anyChoiceCount(content);
  if (n === 0 || n === CHOICE_COUNT) return;
  throw new Error(
    `보기는 ${CHOICE_COUNT}개여야 합니다 — ${where} 가 ${n}개짜리 보기를 냈습니다`,
  );
}

/**
 * 🔴 **표식 SSOT** — 보기 줄머리에 붙는 글자 (원장님 확정 2026-08-25).
 *
 * 엔진 세 모듈이 각자 손으로 `["①","②",…]` 를 적고 있었고(`m2Func`·`m2Line` 은
 * `㉠~㉤`, `m3Func` 은 `①~⑤`), 그래서 **같은 것을 세 벌** 두고 있었다. 한 벌만
 * 고치면 나머지는 조용히 남는다 — 이 저장소가 여러 번 적은 그 자리다.
 */
export const CHOICE_MARKS = ["①", "②", "③", "④", "⑤"] as const;

/**
 * 🔴 **관문 둘째 축** — 「보기 목록이 지면에서 **보기 대접을 받는가**」.
 *
 * `assertChoiceCount` 는 **개수**만 본다. ㉠~㉤ 다섯 줄은 개수가 다섯이라 그
 * 관문을 **통과한다.** 그런데 제품 파서는 개행 뒤 `①~⑮`·`1.` 만 보기로 읽으므로
 * 그 목록은 그냥 **본문 글줄**이 되고, 지면에서 ㉠ 표식이 제 자리에 서지 않아
 * 넘친 줄이 표식 아래로 파고들며 인쇄에서 두 단으로도 안 앉는다.
 *
 * **「개수가 맞나」로는 이 부류를 구조적으로 못 센다 — 축이 다르다.**
 * 그래서 두 자를 **맞대어** 본다: 줄머리 표식 목록이 있으면, 제품 파서도
 * **같은 수**를 읽어야 한다. 열쇠를 손으로 정하지 않는 판정이다(무엇이 나쁜
 * 표식인지 미리 나열하지 않는다 — 파서가 못 읽으면 그것이 나쁜 표식이다).
 *
 * 실측 2026-08-25: 엔진 1,103유형 × 40씨앗에서 어기는 유형 **3** (전부 ㉠ 목록),
 * 공유 DB 출제 가능 2,410건 중 **6건**. `scripts/qa/census-choice-marks.ts` 가 센다.
 */
export function assertChoiceMarks(content: string, where: string): void {
  const m = markListCount(content);
  if (m === 0) return;
  const read = choiceCountOf(content);
  if (read === m) return;
  const heads = [...new Set(lineHeadMarks(content))].join("");
  throw new Error(
    `보기 표식은 ${CHOICE_MARKS.join("")} 여야 합니다 — ${where} 가 «${heads}» 로 ` +
      `${m}줄을 냈는데 지면은 ${read}개만 보기로 읽습니다`,
  );
}
