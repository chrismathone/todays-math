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
import { sameValueChoicePairs } from "../math/exactChoiceValue";
import { hasChoices } from "../problem/choiceCountRule";
import { parseProblemContent } from "../problem/parseProblemContent";
import { answerIsChoiceNumber } from "../problem/provenance";
import {
  asMultipleChoice,
  asShortAnswer,
  type DerivedProblem,
  type StemProblem,
} from "./deriveFormats";
import { collectDistinctVariantsResult } from "./variants";

export type ExpandResult = {
  items: DerivedProblem[];
  skippedMcq: number;
  reasons: string[];
  /**
   * 요구한 변형 수를 **못 채운 만큼**. 0 이면 다 채웠다.
   * `allowShort` 를 준 부르는 쪽은 이 값을 **반드시 찍어야** 한다 —
   * 안 찍으면 「말없는 상한」이 된다.
   */
  shortBy: number;
};

export function expandFamily(
  generateStem: (variant: number) => StemProblem,
  nVariants = 3,
  /**
   * `allowShort` — 변형 공간이 좁으면 던지지 말고 **있는 만큼** 낸다.
   * 초등 문형에는 「사다리꼴의 꼭짓점은 몇 개인가?」처럼 씨앗이 무엇이든 한
   * 문항인 것이 실측 30개 있고, 던지면 그 **단원이 통째로 적재 거부**가 된다
   * (실측 6개 단원). 중등은 기본(던진다)을 그대로 쓴다.
   */
  opts: { allowShort?: boolean; allowMultipleChoice?: boolean } = {},
): ExpandResult {
  const got = collectDistinctVariantsResult(generateStem, nVariants, opts);
  const stems = got.items;
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
      // Native MC stems bypass asMultipleChoice. Their numeric options need the
      // same exact-value check, including equal wrong options (q22's failure).
      // Unknown symbolic expressions stay outside this bounded numeric proof.
      const choices = parseProblemContent(stem.content).choices;
      const duplicatePairs = sameValueChoicePairs(choices);
      if (duplicatePairs.length > 0)
        throw new Error(
          `생성기가 직접 낸 객관식에 같은 값 보기가 있습니다: ${duplicatePairs.map(([a, b]) => `${a + 1}=${b + 1}`).join(", ")}`,
        );
      items.push({ ...stem, questionType: "객관식" });
      continue;
    }
    items.push(asShortAnswer(stem));
    if (opts.allowMultipleChoice === false) {
      skippedMcq += 1;
      reasons.push("문형 정책: 객관식 파생을 허용하지 않는 단답 전용 문형");
      continue;
    }
    try {
      // 🔴 씨앗에 **갈래**를 넣는다 (2026-10-17). 종전 `0x9e37 + i * 17` 은 모든 갈래의 i 번째 변형이
      //    같은 씨앗이라 정답 자리가 몰렸다 — 공유 DB 엔진 객관식 48,025건이 ① 33% · ② 9% · ⑤ 9%.
      //    보기 섞기만 쓰는 rng 다 — 발문의 수(생성기 씨앗)는 그대로라 «같은 문제»는 안 바뀐다(D-155).
      items.push(
        asMultipleChoice(stem, createRng(choiceSeed(stem.familyKey, i))),
      );
    } catch (err) {
      skippedMcq += 1;
      reasons.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { items, skippedMcq, reasons, shortBy: got.shortBy };
}

/** 보기 섞기 씨앗 — 갈래 열쇠(FNV-1a 32비트)와 변형번호. 같은 갈래 · 같은 변형은 늘 같은 보기다. */
export function choiceSeed(familyKey: string, variant: number): number {
  let h = 0x811c9dc5;
  for (let k = 0; k < familyKey.length; k += 1) {
    h ^= familyKey.charCodeAt(k);
    h = Math.imul(h, 0x01000193);
  }
  return (h ^ (0x9e37 + variant * 17)) >>> 0;
}
