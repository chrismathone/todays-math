/**
 * 리포트가 **학부모에게 하는 말** — 순수 함수 (D-134 트랙 2 · Hi-fi 브리프 §0 · §1 #2·#3 · §2).
 *
 * ## 🔴 두 산출물, 한 원천 (23 §7.2 Q0)
 *
 * 원장 화면과 학부모 A4 는 **같은 팩터 객체 · 이 파일의 함수**에서 문장을 얻는다. 화면마다 문장을
 * 따로 쓰면 안마다 말이 달라지고, 기준선(몇 %부터 «된다»인가)이 어디에도 안 적힌다.
 * 🔴 **문장을 만들 수 없어도 기록은 보인다** — 문장은 기록 위에 얹는 것이지 기록을 여는 열쇠가 아니다
 *    (그 분리는 그리는 쪽이 지킨다 — `reportAreas.ts`).
 *
 * ## 규칙
 *
 * ⑴ **전문용어를 쓰지 않는다** — 「정답률 62%」보다 「10문제 중 6문제」(23 §2.3).
 * ⑵ 🔴 **점수는 점수로 · 문제 수는 문항 기록으로만**(§1 #2). 배점 비율을 «10문제 중 N문제»로 바꿔
 *    말하면 시험지가 8문항인데 «10문제»가 지어지고, 배점 90·10 중 첫째만 맞히면 «10문제 중 9문제»가 된다.
 * ⑶ 🔴 **말할 수 없으면 말하지 않는다** — 근거가 모자라면 `null`. 밴드도 단원처럼 **12문항 문턱**
 *    (`MIN_UNIT_PROBLEMS`)이고, «까지·고르게·부터»(이어진 구간을 말하는 표현)는 그 구간의 단이
 *    **전부 측정·문턱 통과**일 때만 쓴다(§1 #3 — 심화 1문항만 맞혀도 «심화까지 고르게»가 나오던 자리).
 * ⑷ **느낌표·이모지 없음** (D-08 — 간결·사무적). **단일 종합 점수·등급·석차 없음**(23 §7 Q4).
 * ⑸ 🔴 **하단 한 줄은 학생이 아니라 리포트를 설명한다**(23 §7.2 Q5) — «시험 0회»·«숙제 기록 없음»처럼
 *    학생의 행동으로 읽히는 말, «칸이 아직 없다» 같은 개발 사정은 학부모 지면에 **0글자**.
 */
import { rollupScores } from "@/lib/testResults/scoreRollup";

import { isCalendarMonth, type Period } from "./period";
import {
  ACHIEVEMENT_BANDS,
  type AchievementBand,
  type AchievementFactors,
  type BandAccuracy,
  type HomeworkFactors,
  type LearnedFactors,
  type LectureFactors,
  MIN_UNIT_PROBLEMS,
  type ProblemTally,
  type ScoredRound,
} from "./types";

/** 이 위면 «된다». */
export const SOLID_ACCURACY = 70;
/** 이 아래면 «막힌다». */
export const WEAK_ACCURACY = 50;

// ─────────────────────────────────────────────
// 잔손
// ─────────────────────────────────────────────

/** 「10문제 중 6문제」 — 비율보다 학부모에게 가깝다. */
export function outOfPhrase(correct: number, total: number): string {
  return `${total}문제 중 ${correct}문제`;
}

/** 점수 표기 — 정수면 정수, 아니면 소수 첫째 자리. */
export function pointsText(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** «2026-08-06» → «8월 6일» */
export function dateText(day: string): string {
  const [, m, d] = day.split("-").map(Number) as [number, number, number];
  return `${m}월 ${d}일`;
}

/** 받침이 있으면 `withFinal`, 없으면 `withoutFinal` — «기본은» · «심화는». */
function josa(word: string, withFinal: string, withoutFinal: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return hasFinal ? withFinal : withoutFinal;
}

/** 지면 머리의 기간 이름 — 달이면 «2026년 8월», 아니면 «8월 24일 ~ 9월 18일». */
export function periodTitle(period: Period): string {
  if (!isCalendarMonth(period)) return periodRange(period);
  const [y, m] = period.from.split("-").map(Number) as [number, number];
  return `${y}년 ${m}월`;
}

/** «8월 1일 ~ 8월 31일» */
export function periodRange(period: Period): string {
  return `${dateText(period.from)} ~ ${dateText(period.to)}`;
}

/** 기간을 부르는 말 — 달력 한 달이면 «이번 달»·«월말», 아니면 «이 기간». */
function spanWord(period: Period): string {
  return isCalendarMonth(period) ? "이번 달" : "이 기간에";
}

// ─────────────────────────────────────────────
// ① 무엇을 배웠나
// ─────────────────────────────────────────────

/** 「이번 달 19차시 동안 소단원 17개를 배웠습니다.」 진도 0행이면 `null`. */
export function learnedSentence(
  learned: LearnedFactors,
  period: Period,
): string | null {
  if (learned.units === null || learned.lessons === null) return null;
  return `${spanWord(period)} ${learned.lessons}차시 동안 소단원 ${learned.units.length}개를 배웠습니다.`;
}

/** 계획 대비 밀림을 말로. 못 재면 `null` — 「0일 밀림」으로 적지 않는다. */
export function driftSentence(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "계획한 진도대로 나가고 있습니다.";
  return days > 0
    ? `계획보다 ${days}일 앞서 있습니다.`
    : `계획보다 ${-days}일 늦습니다.`;
}

/** 소단원 목록을 접었을 때 지면에 **요약했다는 사실**을 밝히는 말(Hi-fi 브리프 §2 규칙 1). */
export const FOLD_NOTE =
  "소단원 목록을 줄여 적었습니다 — 대단원마다 소단원 수만 적었습니다.";

// ─────────────────────────────────────────────
// ② 얼마나 맞았나
// ─────────────────────────────────────────────

/**
 * 🔴 **점수는 점수로** — 「시험 3회, 100점 만점에 평균 75점입니다.」 만점은 시험지 배점의 **실제 합**
 * (`maxScore.ts`)이라 67점 만점이면 67 이라고 말한다. 회차마다 만점이 다르면 평균을 지어내지 않고
 * **합계**로 말한다. 잴 회차(점수·만점이 다 있는 응시)가 없으면 `null`.
 */
export function scoreSentence(rounds: ScoredRound[] | null): string | null {
  if (rounds === null) return null;
  /**
   * 🔴 «잰 것»(결시 아님 · 점수 있음)과 평균은 **`rollupScores` 한 곳**이 정한다(트랙 1 보고서 ⑤-D).
   *    `rounds` 는 응시 회차뿐이라(결시는 `absentRounds`) `absent: false` 로 넘긴다 — 점수가 없는
   *    응시 행은 거기서 빠진다. 만점을 모르면 «몇 점 만점»을 못 말하므로 여기서 뺀다.
   */
  const scorable = rounds.filter(
    (r): r is ScoredRound & { score: number; maxScore: number } =>
      r.maxScore !== null &&
      r.maxScore > 0 &&
      rollupScores([{ score: r.score, absent: false }]).gradedCount === 1,
  );
  const rollup = rollupScores(
    scorable.map((r) => ({ score: r.score, absent: false })),
  );
  if (rollup.averageScore === null) return null;
  const n = rollup.gradedCount;
  const maxes = new Set(scorable.map((r) => r.maxScore));
  if (maxes.size === 1) {
    const max = scorable[0]!.maxScore;
    return `시험 ${n}회, ${pointsText(max)}점 만점에 평균 ${pointsText(rollup.averageScore)}점입니다.`;
  }
  // 만점이 회차마다 다르면 평균을 지어내지 않고 **합계**로 말한다.
  const sumScore = scorable.reduce((a, r) => a + r.score, 0);
  const sumMax = scorable.reduce((a, r) => a + r.maxScore, 0);
  return `시험 ${n}회 합계 ${pointsText(sumMax)}점 만점에 ${pointsText(sumScore)}점입니다.`;
}

/**
 * 🔴 **문제 수는 문항 기록으로만** — 「24문제 중 18문제를 맞혔습니다.」
 * 문항 기록이 없는 응시 회차가 섞이면(`problems.rounds < takenRounds`) 몇 회의 기록인지 밝힌다.
 */
export function problemSentence(
  problems: ProblemTally | null,
  takenRounds: number,
): string | null {
  if (problems === null) return null;
  const phrase = `${outOfPhrase(problems.correct, problems.total)}를 맞혔습니다.`;
  return problems.rounds < takenRounds
    ? `문항 기록이 있는 ${problems.rounds}회에서 ${phrase}`
    : phrase;
}

/** 「결시 1회는 평균에서 뺐습니다.」 — 결시를 0점으로 잇지 않았다는 사실. 날짜는 기록 줄에 있다. */
export function absentSentence(absent: ScoredRound[] | null): string | null {
  if (absent === null || absent.length === 0) return null;
  return `결시 ${absent.length}회는 평균에서 뺐습니다.`;
}

/**
 * 🔴 표본 부족 단원 — 학부모에게는 **개수 한 줄**(§2 규칙 6). «다음 달에 말씀드립니다»는 약속할 수
 * 없고(다음 달 문항은 보장되지 않고 집계는 달을 넘겨 누적하지 않는다), «표본»이라는 말도 쓰지 않는다.
 */
export function underSampledSentence(count: number): string | null {
  if (count === 0) return null;
  return `문제 수가 적은 ${count}개 단원은 이번 리포트에서 평가를 보류했습니다.`;
}

/** 한 단이 **문턱을 넘었나** — 문장은 넘은 단만 말한다. */
function confirmed(value: BandAccuracy | null): value is BandAccuracy {
  return value !== null && value.total >= MIN_UNIT_PROBLEMS;
}

/**
 * 난이도 한 칸의 **글자** — 🔴 **미측정과 실제 0 을 글자로 가른다**(§2 규칙 3).
 *   · 문항 없음 → «문제 없음»(「—」 하나로 둘을 같이 쓰지 않는다)
 *   · 12문항 미만 → 숫자 + «평가 보류»(숫자는 남긴다 — 문장만 안 만든다)
 */
export function bandCell(value: BandAccuracy | null): {
  count: string;
  status: "평가 보류" | null;
} {
  if (value === null) return { count: "문제 없음", status: null };
  return {
    count: outOfPhrase(value.correct, value.total),
    status: confirmed(value) ? null : "평가 보류",
  };
}

/**
 * 난이도 4단을 **한 문장**으로. 근거가 모자라면 `null`.
 *
 * 🔴 **12문항 미만인 단은 없는 것처럼 읽는다**(문장에서만 — 숫자는 `bandCell` 이 남긴다).
 * 🔴 «까지»·«고르게»·«부터»는 **이어진 구간**을 말한다 — 그 구간의 단이 전부 문턱을 넘고 같은 쪽일 때만:
 *   · «X까지는 잘 풀고» — 연산부터 X 까지(둘 이상) 전부 확인·잘함
 *   · «심화까지 고르게» — 네 단이 전부 확인·잘함
 *   · «Y부터 어려워합니다» — Y 부터 심화까지(둘 이상) 전부 확인·약함
 * 그 밖에는 **확인된 단의 이름을 그대로** 말한다(«기본은 잘 풀고, 응용에서 막힙니다»).
 */
export function bandSentence(
  bands: Record<AchievementBand, BandAccuracy | null> | null,
): string | null {
  if (bands === null) return null;
  const solid = ACHIEVEMENT_BANDS.filter((band) => {
    const v = bands[band];
    return confirmed(v) && v.accuracy >= SOLID_ACCURACY;
  });
  const weak = ACHIEVEMENT_BANDS.filter((band) => {
    const v = bands[band];
    return confirmed(v) && v.accuracy < WEAK_ACCURACY;
  });
  if (solid.length === 0 && weak.length === 0) return null;

  // 사다리 머리(연산)부터 끊김 없이 «확인·잘함»인 구간
  const head: AchievementBand[] = [];
  for (const band of ACHIEVEMENT_BANDS) {
    if (!solid.includes(band)) break;
    head.push(band);
  }
  // 사다리 꼬리(심화)까지 끊김 없이 «확인·약함»인 구간
  const tail: AchievementBand[] = [];
  for (const band of [...ACHIEVEMENT_BANDS].reverse()) {
    if (!weak.includes(band)) break;
    tail.unshift(band);
  }

  if (head.length === ACHIEVEMENT_BANDS.length)
    return "심화까지 고르게 잘 풀고 있습니다.";

  const lastSolid = solid[solid.length - 1];
  const solidSubject =
    solid.length === 0
      ? null
      : head.length >= 2 && head.length === solid.length
        ? `${head[head.length - 1]}까지는`
        : `${solid.join("·")}${josa(lastSolid!, "은", "는")}`;

  const weakPhrase =
    weak.length === 0
      ? null
      : tail.length >= 2 && tail.length === weak.length
        ? `${tail[0]}부터 어려워합니다`
        : `${weak.join("·")}에서 막힙니다`;

  if (solidSubject !== null && weakPhrase !== null)
    return `${solidSubject} 잘 풀고, ${weakPhrase}.`;
  if (solidSubject !== null) return `${solidSubject} 잘 풉니다.`;
  return `${weakPhrase}.`;
}

// ─────────────────────────────────────────────
// ③ 스스로 한 것
// ─────────────────────────────────────────────

/**
 * 🔴 영상은 **완료 편수만**(§2 규칙 8) — 부분 시청률(`percent`)은 시각이 없어 과거 달을 다시 뽑으면
 * 바뀐다. 「이번 달 배운 내용의 영상 6편 중 월말까지 4편을 끝까지 봤습니다.」
 */
export function lectureSentence(
  lectures: LectureFactors | null,
  period: Period,
): string | null {
  if (lectures === null) return null;
  const month = isCalendarMonth(period);
  const head = month
    ? `이번 달 배운 내용의 영상 ${lectures.assigned}편 중 월말까지`
    : `이 기간에 배운 내용의 영상 ${lectures.assigned}편 중`;
  return lectures.completed === 0
    ? `${head} 끝까지 본 영상은 없습니다.`
    : `${head} ${lectures.completed}편을 끝까지 봤습니다.`;
}

/** 🔴 숙제는 **확인 범위와 함께**(§2 규칙 7) — 「숙제를 확인한 8번 중 2번 안 해 왔습니다.」 */
export function homeworkSentence(
  homework: HomeworkFactors | null,
): string | null {
  if (homework === null) return null;
  return homework.missed === 0
    ? `숙제를 확인한 ${homework.checked}번 모두 해 왔습니다.`
    : `숙제를 확인한 ${homework.checked}번 중 ${homework.missed}번 안 해 왔습니다.`;
}

// ─────────────────────────────────────────────
// «이렇게 셉니다» — 근거 밑의 한 줄 (23 §2.3 — 계산 방식 안내가 이해도를 올린다)
// ─────────────────────────────────────────────

/** 난이도 — 12문항 미만인 단이 **있을 때만** 붙인다. */
export function bandMethodNote(
  bands: Record<AchievementBand, BandAccuracy | null> | null,
): string | null {
  if (bands === null) return null;
  const held = ACHIEVEMENT_BANDS.some((b) => {
    const v = bands[b];
    return v !== null && !confirmed(v);
  });
  return held
    ? `${MIN_UNIT_PROBLEMS}문제보다 적게 푼 단은 평가를 보류했습니다.`
    : null;
}

/** 영상 — 완료 편수만 센다는 것과 그 끝. */
export function lectureMethodNote(period: Period): string {
  return isCalendarMonth(period)
    ? "월말까지 끝까지 본 영상만 셉니다."
    : "기간이 끝나기 전에 끝까지 본 영상만 셉니다.";
}

/** 숙제 — 분모가 «확인한 날»이라는 것. */
export const HOMEWORK_METHOD_NOTE = "숙제를 확인한 날만 셉니다.";

// ─────────────────────────────────────────────
// 하단 한 줄 — «이번 기간 기록 현황» (23 §7.2 Q5)
// ─────────────────────────────────────────────

/**
 * 🔴 **리포트를 설명한다 — 학생이 아니라.** 「이번 리포트에 담은 기록: 진도 19차시 · 시험 3회.
 * 담지 않은 기록: 예습 영상 · 숙제.」 채점을 안 넣은 달의 «시험 0회»는 거짓이다 — 담지 않은 기록은
 * **이름만** 적는다.
 */
export function coverageLine(f: AchievementFactors): string {
  const inc: string[] = [];
  const exc: string[] = [];

  if (f.learned.lessons !== null) inc.push(`진도 ${f.learned.lessons}차시`);
  else exc.push("진도");

  const taken = f.scored.rounds?.length ?? 0;
  const absent = f.scored.absentRounds?.length ?? 0;
  if (f.scored.rounds !== null && taken + absent > 0)
    inc.push(
      absent > 0
        ? `시험 ${taken + absent}회(결시 ${absent}회 포함)`
        : `시험 ${taken}회`,
    );
  else exc.push("시험");

  if (f.selfStudy.lectures !== null)
    inc.push(`예습 영상 ${f.selfStudy.lectures.assigned}편`);
  else exc.push("예습 영상");

  if (f.selfStudy.homework !== null)
    inc.push(`숙제 확인 ${f.selfStudy.homework.checked}번`);
  else exc.push("숙제");

  if (inc.length === 0) return "이번 리포트에 담은 기록이 없습니다.";
  const included = `이번 리포트에 담은 기록: ${inc.join(" · ")}.`;
  return exc.length === 0
    ? included
    : `${included} 담지 않은 기록: ${exc.join(" · ")}.`;
}
