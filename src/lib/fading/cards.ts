import {
  FADING_MARKS_MAX,
  fadingMarksTextSchema,
  type StoredFadingUnjudged,
} from "@/contracts/fading.contract";
import {
  fadingTargets,
  type FadingConcept,
  type FadingProposition,
  type FadingTarget,
} from "./concepts";
import { erasedTargets, type FadingStep } from "./erasure";

/**
 * 카드 풀이(1단계 카드 · 4단계 자판 A′ — 합의 2026-10-07)에서 화면이 쓰는 값 — 화면도 DB 도 모른다.
 * 규칙은 `session.ts`(풀이) · `typed.ts`(견주기) · `state.ts`(저장 칸)에 있고, 여기는 그 값을 화면의 꼴로 옮기는 것뿐이다.
 */

export { fadingJudgingComplete, fadingRatingsAfterJudging } from "./session";

/** 카드 하나의 진단 — `0` 은 묻지 않았거나 답하지 않은 것, `1` ~ `3` 은 고른 단추(사전 확인 · 확신)다. */
export type FadingMark = 0 | 1 | 2 | 3;

/** 카드마다의 진단을 명제 차례로 한 글자씩 — `read` 의 `seen` · `step` 의 `sure` 에 싣는 글. */
export function encodeFadingMarks(values: readonly FadingMark[]): string {
  const text = values.map((value) => String(value)).join("");
  if (!fadingMarksTextSchema.safeParse(text).success)
    throw new Error(
      `카드의 진단은 1 ~ ${FADING_MARKS_MAX}개, 값은 0 ~ 3 입니다.`,
    );
  return text;
}

/** `encodeFadingMarks` 의 거꾸로 — 꼴이 어긋나면 던진다. */
export function decodeFadingMarks(text: string): FadingMark[] {
  if (!fadingMarksTextSchema.safeParse(text).success)
    throw new Error("카드의 진단 글이 아닙니다.");
  return [...text].map((ch) => Number(ch) as FadingMark);
}

/** 대조 화면의 빈칸 하나 — 결과와, 학생이 쓴 글(모르면 `null` — 칩 풀이 · 새로고침 뒤의 맞은 칸). */
export type FadingComparisonBlank = {
  target: FadingTarget;
  /** `correct` 맞음 · `missed` 틀림(넘김 포함 — «다시») · `pending` 학생의 대조를 기다린다. */
  verdict: "correct" | "missed" | "pending";
  text: string | null;
};
export type FadingComparisonCard = {
  proposition: FadingProposition;
  blanks: FadingComparisonBlank[];
};

/**
 * 단계를 마친 뒤의 대조 — 카드(명제)마다 «내 답 | 기준안»을 나란히 놓을 재료. 기준안은 `target.text` 다.
 * 화면의 풀이(`FadingStepResult` 의 `missed` · `unjudged` · `answers`)로도, 다시 들어온 서버의 풀이(`missedAtFour` · `unjudged`)로도 같은 꼴이 선다.
 * 그 단계에서 지우지 않은 빈칸은 싣지 않는다(4단계는 전부다).
 */
export function fadingComparison(
  concept: FadingConcept,
  outcome: {
    missed: readonly string[];
    unjudged?: readonly StoredFadingUnjudged[];
    answers?: Readonly<Record<string, string>>;
  },
  step: FadingStep = 4,
): FadingComparisonCard[] {
  const erased = new Set(erasedTargets(concept, step).map((t) => t.id));
  const missed = new Set(outcome.missed);
  const waiting = new Map(
    (outcome.unjudged ?? []).map((u) => [u.targetId, u.text]),
  );
  return concept.propositions.map((proposition) => ({
    proposition,
    blanks: fadingTargets({ ...concept, propositions: [proposition] })
      .filter((target) => erased.has(target.id))
      .map((target) => ({
        target,
        verdict: missed.has(target.id)
          ? "missed"
          : waiting.has(target.id)
            ? "pending"
            : "correct",
        text: outcome.answers?.[target.id] ?? waiting.get(target.id) ?? null,
      })),
  }));
}

/** 카드(명제) 하나의 그 단계 빈칸 — 빈칸 차례. 지우는 양 · 자리는 단계가 정한다(방식과 무관 — 4단계는 전부다). */
export function fadingCardBlanks(
  concept: FadingConcept,
  step: FadingStep,
  propositionId: string,
): FadingTarget[] {
  return erasedTargets(concept, step).filter((target) =>
    target.id.startsWith(`${propositionId}#`),
  );
}

/** 견주는 꼴 — 호환 글자를 풀고 소문자로, 수식 명령은 뗀다. */
const plain = (text: string) =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\\[a-z]+/g, " ");
const squeezed = (text: string) => plain(text).replace(/[^\p{L}\p{N}]+/gu, "");
const words = (text: string) =>
  plain(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 2);
/** 낱말 안의 이어진 두 글자 전부. */
const pairs = (word: string) =>
  Array.from({ length: word.length - 1 }, (_, i) => word.slice(i, i + 2));

/**
 * 빈칸이 있는 단계의 화면에 늘 보이는 이름(용어 · 소단원 제목 · 종류)을 보여도 되는가 — 그 단계에서 지운 답을 드러내면 `false`.
 * - 이름이 답을 통째로 품거나 답이 이름을 품으면 숨긴다(«선분, 반직선, 직선» → 답 «직선»).
 * - **낱말 단위**(두 글자 이상) — 이름의 낱말과 답의 낱말이 이어진 두 글자를 하나라도 같이 가지면 숨긴다
 *   (여러 낱말 답의 한 낱말 · 조사가 다른 같은 낱말 — «동류항의» 와 «동류항끼리»). 넉넉히 숨기는 쪽이다.
 * - 견줄 글자가 없는 이름은 숨긴다. 지운 답이 없으면(1단계 · 대조) 보인다.
 * 번호(«1-5-1»)는 이 함수로 거르지 않는다 — 번호만은 늘 보인다(`curriculumName` 으로 가른 뒤 제목만 넣는다).
 */
export function fadingSafeLabel(
  label: string,
  erased: readonly Pick<FadingTarget, "text">[],
): boolean {
  if (!erased.length) return true;
  const whole = squeezed(label);
  if (!whole) return false;
  const mine = new Set(words(label).flatMap(pairs));
  return !erased.some((target) => {
    const answer = squeezed(target.text);
    if (!answer || whole.includes(answer) || answer.includes(whole))
      return true;
    return words(target.text).some((word) =>
      pairs(word).some((pair) => mine.has(pair)),
    );
  });
}
