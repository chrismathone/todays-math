/**
 * 엔진 단답 산출 → 변형 n개 × 형식 **2종**(단답·객관).
 *
 * generateElementaryProblem / generateMiddleProblem 을 바꾸지 않는다.
 * 그 함수들의 산출을 여기서만 펼친다. familyKey 는 호출부가 넘긴 값을
 * 형식·변형에 복사할 뿐 조립하지 않는다 (키 모양은 적재기 SSOT).
 *
 * 객관식 오답을 계산 실수로 못 만들면 그 변형의 객관식만 건너뛰고
 * 단답은 남긴다. 조용히 두 형식을 다 냈다고 하지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 **서술형은 여기서 만들지 않는다** (원장님 확정 2026-08-27).
 *
 * 종전에는 `asDescriptive` 가 **발문 끝맺음만 바꿔**(「구하시오」→「구하는 풀이
 * 과정과 답을 쓰시오」) 서술형을 냈다. 풀이·정답·그림은 단답형 그대로다.
 * 전수로 재니 이렇게 만든 서술형 **9,476건 중 9,467건(99.9%)** 이 같은 문항류에
 * **풀이가 글자까지 같은 단답형**을 짝으로 갖고 있었다 — 문항이 아니라 복제였다.
 *
 * 더 나쁜 것은 **쓸 과정이 없는데 쓰라고 한 것**이다. 풀이를 단계로 쪼개 보면
 * 절반(4,538건)이 한 단계뿐이고, 그 실제 풀이는 이렇다:
 *     「$13$은 두 수의 공배수가 아닙니다.」
 * 단계가 둘인 것도 대개 서술형이 아니다:
 *     「최소공배수는 $24$입니다. 짝수인 공배수 중 가장 작은 수는 $24$입니다.」
 * 그리고 보기 나열형은 단계가 6~7로 잡히지만 그것도 과정이 아니다
 *     (「ㄱ. 옳다 ㄴ. 옳다 ㄷ. 옳지 않다 …」).
 * **단계 수로는 못 가른다 — 파생 경로 자체가 틀렸다.**
 *
 * 원장님: 「앞으로도 서술형 문제를 단답형에서 발문 변경으로 만드는 짓은 하지 말고
 * 새 문제를 서술형답게 만드는 게 퀄리티가 좋겠어.」
 *
 * 서술형은 **생성기가 처음부터 서술형으로** 낸다 — 여러 단계를 거치는 물음과,
 * 단계별 배점을 매길 수 있는 풀이를 함께. 파생으로 흉내 내지 않는다.
 * `asDescriptive`·`toDescriptiveStem` 은 그 생성기가 쓸 **어투 변환기**로 남겨
 * 두었다(문법 시험이 지킨다). **여기서 다시 부르지 마라** — 아래 시험이 막는다.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { createRng } from "../elementary/rng";
import { hasChoices } from "../problem/choiceCountRule";
import { answerIsChoiceNumber } from "../problem/provenance";
import {
  asMultipleChoice,
  asShortAnswer,
  type DerivedProblem,
  type StemProblem,
} from "./deriveFormats";
import { collectDistinctVariants } from "./variants";

export type ExpandResult = {
  items: DerivedProblem[];
  skippedMcq: number;
  reasons: string[];
};

export function expandFamily(
  generateStem: (variant: number) => StemProblem,
  nVariants = 3,
): ExpandResult {
  const stems = collectDistinctVariants(generateStem, nVariants);
  const items: DerivedProblem[] = [];
  const reasons: string[] = [];
  let skippedMcq = 0;

  for (let i = 0; i < stems.length; i += 1) {
    const stem = stems[i]!;
    // 🔴 **이미 객관식인 발문은 파생하지 않는다.** 중등 873유형 가운데 20개가
    //    그렇다(2.3%). 파생하면 둘이 어긋난다 — `asShortAnswer` 가 보기 다섯인
    //    문항을 「단답형」으로 찍고, `asDescriptive` 가 보기를 단 채로
    //    「…풀이 과정과 답을 쓰시오」를 붙인다.
    //
    // ⚠️ 가르는 축은 **「보기가 있나」가 아니라 「정답이 번호인가」**다.
    //    「다음 보기 중 …인 것은 **모두 몇 개**인지 구하시오」는 보기가 세는
    //    대상이고 정답이 「$2$개」다 — 그건 단답이고, 서술 파생도 자연스럽다
    //    (「…몇 개인지 풀이 과정과 답을 쓰시오」). 보기만 보고 접으면 그 부류가
    //    통째로 `[?형식]` 이 된다(실측 3유형). `classifyFormat` 이 쓰는 바로
    //    그 축을 여기서도 쓴다.
    if (hasChoices(stem.content) && answerIsChoiceNumber(stem.answer)) {
      items.push({ ...stem, questionType: "객관식" });
      continue;
    }
    items.push(asShortAnswer(stem));
    try {
      items.push(asMultipleChoice(stem, createRng(0x9e37 + i * 17)));
    } catch (err) {
      skippedMcq += 1;
      reasons.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { items, skippedMcq, reasons };
}
