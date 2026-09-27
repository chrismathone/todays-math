import type { MathSrsPublicMission } from "@/contracts/mathSrs.contract";

/**
 * 한 걸음 복습의 «연속 정답»(콤보) — 원장님 확정 규칙 ②ㄴ(2026-09-27, 05 §8.15).
 *
 * - 맞힘 · 힌트 없음 · 서버 시간 ≤ 목표 초 × 1.5 → 하나 더
 * - 늦게 맞힘 · 힌트 쓰고 맞힘 · «아직 모르겠어요»(빈 답) → 그대로(끊지 않음)
 * - 틀림 → 0
 * - 3 이상이고 **이번 답으로 늘었을 때만** 정답 연출이 «N문제 연속 정답»이라고 말한다.
 *
 * 🔴 세는 재료는 **서버가 매긴 값**뿐이다 — 공개 미션의 `attempts`(correct · usedHint · elapsedSeconds ·
 *    submittedAnswer)와 `problems[].expectedSeconds`. 화면이 보내는 `rating` 은 쓰지 않는다: 틀림과
 *    «모르겠어요»가 둘 다 «again» 이고, 기억 판정의 «2초 미만은 hard» 바닥이 섞여 있다(규칙에는 없다 —
 *    합의 결정 6, 2026-09-27). 새로고침 · 다른 기기에서도 같은 기록으로 다시 세므로 같은 값이 나온다.
 *
 * 1.5배는 기억 판정(`mission.ts` `suggestedRating`)과 같은 잣대다. 이 파일은 `mission.ts` 를 가져오지
 * 않는다 — 그쪽은 문제 생성기를 끌고 와 학생 화면 번들이 무거워진다. 잣대가 갈리지 않게
 * `mathSrsCombo.test.ts` 가 두 판정을 격자로 맞대 본다.
 *
 * 오답 다시 풀기 · 개념 탐험 활동 · 초등 복습에서는 세지 않는다 — 부르는 쪽(`StudentMathSrs` 첫 풀이)만 쓴다.
 */
export const COMBO_TIME_FACTOR = 1.5;
/** 이 수부터 정답 연출이 말한다 */
export const COMBO_SHOWN_FROM = 3;

type ComboMission = Pick<MathSrsPublicMission, "problems" | "attempts">;

/** 시도마다 «그 답 뒤의 콤보»와 «그 답으로 늘었나» — 시도 순서대로 */
function walk(mission: ComboMission) {
  const expected = new Map(
    mission.problems.map((problem) => [problem.id, problem.expectedSeconds]),
  );
  let combo = 0;
  return mission.attempts.map((attempt) => {
    const target = expected.get(attempt.problemId);
    const inTime =
      attempt.correct &&
      !attempt.usedHint &&
      target !== undefined &&
      attempt.elapsedSeconds <= target * COMBO_TIME_FACTOR;
    if (inTime) combo += 1;
    else if (!attempt.correct && attempt.submittedAnswer.trim() !== "")
      combo = 0;
    return { problemId: attempt.problemId, combo, grew: inTime };
  });
}

/** 지금까지 낸 답 뒤의 콤보 */
export function comboAfter(mission: ComboMission): number {
  return walk(mission).at(-1)?.combo ?? 0;
}

/** 이 문제의 정답 연출이 말할 연속 수 — 이번 답으로 늘었고 3 이상일 때만, 아니면 null */
export function comboToShow(
  mission: ComboMission,
  problemId: string,
): number | null {
  const step = walk(mission).find((s) => s.problemId === problemId);
  return step?.grew && step.combo >= COMBO_SHOWN_FROM ? step.combo : null;
}
