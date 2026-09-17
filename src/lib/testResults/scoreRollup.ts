/**
 * **채점 기록을 합산하는 단 하나의 자리** — 결시·미채점이 0점으로 새지 않게 (D-134 트랙 1).
 *
 * ## 🔴 왜 함수 하나로 두나
 *
 * 23 §4 ③ 이 이름을 붙인 결함이다 — 「없는 값의 빈칸이 0으로 읽힌다」. 그 결함은
 * **합산하는 곳마다** 다시 난다. `rows.reduce((s, r) => s + (r.score ?? 0), 0) / rows.length`
 * 는 한 줄이라 어디서든 다시 써지고, 그때마다 결시가 0점짜리 응시자가 된다.
 * 20번 교훈 ««칸이 없다»를 0점으로 채우면 합계가 유일한 그물이 된다»가 그 자리다.
 *
 * 그래서 합산은 **여기 한 곳**에서만 한다. 화면·리포트·트랙 2 의 기간 누적이 전부 이것을 부른다.
 *
 * ## 무엇을 세나 — 셋을 가른다
 *
 *   · **채점됐다** — `absent` 가 아니고 `score` 가 숫자다. 평균의 분모는 **이것뿐**이다.
 *   · **결시**     — 시험을 안 봤다. 점수가 없다.
 *   · **없는 값**  — `absent` 가 아닌데 `score` 가 null. 지금 이 저장소는 이런 행을 만들지 않지만,
 *                   만들어졌다고 0으로 세지 않는다(「없다」와 「0점」은 다르다).
 *
 * 「**아직 안 봄**」은 여기 안 들어온다 — 행이 없기 때문이다. 그래서 이 함수의 분모는
 * **대상 학생 수가 아니라 행 수**이고, 호출하는 쪽이 「몇 명 중 몇 명을 쟀나」를 따로 대야 한다.
 */

/** 합산이 보는 최소한 — `TestResult` 행의 부분집합. */
export interface ScoreRow {
  score: number | null;
  absent: boolean;
}

export interface ScoreRollup {
  /** 점수가 있는 행 수 — 평균의 분모. */
  gradedCount: number;
  absentCount: number;
  /**
   * 🔴 **잴 것이 하나도 없으면 `0` 이 아니라 `null` 이다.**
   *    0 을 내면 「전원 결시」가 「전원 0점」으로 읽힌다.
   */
  averageScore: number | null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function rollupScores(rows: readonly ScoreRow[]): ScoreRollup {
  const absentCount = rows.filter((r) => r.absent).length;
  // 🔴 `absent` 만 거르지 않는다 — 결시가 아닌데 점수가 없는 행도 «잰 것»이 아니다.
  const scored = rows
    .filter((r) => !r.absent && r.score !== null)
    .map((r) => r.score as number);

  return {
    gradedCount: scored.length,
    absentCount,
    averageScore:
      scored.length === 0
        ? null
        : round1(scored.reduce((sum, s) => sum + s, 0) / scored.length),
  };
}
