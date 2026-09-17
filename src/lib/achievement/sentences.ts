/**
 * 리포트가 **학부모에게 하는 말** — 순수 함수 (D-134 트랙 2, 브리프 §1.3 «문구는 학부모가 읽는다»).
 *
 * ## 왜 문장을 코드로 만드나
 *
 * 「기본까지는 되는데 응용에서 무너진다」는 **우리만 댈 수 있는 문장**이다 — 경쟁사에 난이도
 * 4단 축이 없다(23 §5). 그 문장을 화면마다 손으로 적으면 안마다 말이 달라지고, 기준선
 * (몇 %부터 «된다»인가)이 어디에도 안 적힌다. 그래서 **문턱과 말투를 한 곳**에 둔다.
 *
 * ## 규칙 셋
 *
 * ⑴ **전문용어를 쓰지 않는다** — 「정답률 62%」보다 「10문제 중 6문제」다(23 §2.3: «몇 점
 *    만점 중 몇 점»을 같이 적으면 계산 방식 이해가 올라간다).
 * ⑵ **느낌표·이모지 없음** (D-08 — 간결·사무적).
 * ⑶ 🔴 **말할 수 없으면 말하지 않는다** — 근거가 모자라면 `null` 을 낸다. 화면이 그 자리에
 *    「아직 말씀드릴 수 없습니다」를 적을 수 있게. 애매한 문장을 지어내지 않는다.
 */
import {
  ACHIEVEMENT_BANDS,
  type AchievementBand,
  type BandAccuracy,
} from "./types";

/** 이 위면 «된다». */
export const SOLID_ACCURACY = 70;
/** 이 아래면 «막힌다». */
export const WEAK_ACCURACY = 50;

/** 「10문제 중 6문제」 — 비율보다 학부모에게 가깝다. */
export function outOfPhrase(correct: number, total: number): string {
  return `${total}문제 중 ${correct}문제`;
}

/** 「3주 동안 7차시」 — 기간을 주 수로 말한다. */
export function lessonsPhrase(lessons: number, units: number): string {
  return `${units}개 소단원 · ${lessons}차시`;
}

/**
 * 난이도 4단을 **한 문장**으로. 근거가 모자라면 `null`.
 *
 * 「어디까지 되나」는 사다리에서 **연속으로 잘 풀린 마지막 단**이고, 「어디서 막히나」는
 * 그 뒤로 처음 무너지는 단이다. 사다리 순서(연산 → 기본 → 응용 → 심화)가 곧 뜻이라
 * 순서를 바꿔 읽으면 안 된다.
 */
export function bandSentence(
  bands: Record<AchievementBand, BandAccuracy | null> | null,
): string | null {
  if (bands === null) return null;
  const measured = ACHIEVEMENT_BANDS.filter(
    (band) => (bands[band]?.total ?? 0) > 0,
  );
  if (measured.length === 0) return null;

  let solid: AchievementBand | null = null;
  for (const band of measured) {
    if ((bands[band]?.accuracy ?? 0) >= SOLID_ACCURACY) solid = band;
    else break;
  }
  const after =
    solid === null ? measured : measured.slice(measured.indexOf(solid) + 1);
  const weak =
    after.find((band) => (bands[band]?.accuracy ?? 100) < WEAK_ACCURACY) ??
    null;

  if (solid !== null && weak !== null)
    return `${solid}까지는 잘 풀고, ${weak}에서 막힙니다.`;
  if (solid !== null && solid === measured[measured.length - 1])
    return `${solid}까지 고르게 잘 풀고 있습니다.`;
  if (solid !== null) return `${solid}까지는 잘 풉니다.`;
  if (weak !== null) return `${weak}부터 많이 어려워합니다.`;
  return null;
}

/** 「10문제 중 6문제를 맞았습니다」 — 평균을 문제 수로 바꿔 말한다. */
export function scoreSentence(
  averagePercent: number | null,
  outOf = 10,
): string | null {
  if (averagePercent === null) return null;
  const correct = Math.round((averagePercent / 100) * outOf);
  return `평균 ${outOfPhrase(correct, outOf)}를 맞았습니다.`;
}

/** 계획 대비 밀림을 말로. 못 재면 `null` — 「0일 밀림」으로 적지 않는다. */
export function driftSentence(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "계획한 진도대로 나가고 있습니다.";
  return days > 0
    ? `계획보다 ${days}일 앞서 있습니다.`
    : `계획보다 ${-days}일 늦습니다.`;
}
