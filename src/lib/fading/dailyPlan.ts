/**
 * 하루 분량을 후보에 나누는 셈 — 화면도 저장도 기록의 꼴도 모른다. 받은 후보와 수만으로 일한다.
 *
 * 분량은 **넘지 않는 합계**다. 정해 둔 비율이 없다 — 후보를 받은 차례(부르는 쪽이 근거로 정한 우선순위)대로 넣는다.
 *   1. 빚진 것(`owed` — 풀던 것 · 학생이 «오늘 전부»로 고른 복습)은 먼저 넣는다. 분량을 넘어도 넣고, 넘긴 칸을 `over` 로 낸다.
 *   2. 나머지는 차례대로, **남은 칸에 통째로 들어가는 것만** 넣는다. 후보는 쪼개지 않는다 — 안 들어가면 건너뛰고 다음 것을 본다.
 *   3. 못 채운 칸은 채워 넣지 않고 `unfilled` 로 낸다.
 *
 * 같은 입력이면 같은 답이다 — 무작위도 시각도 없다.
 */

export type DailyCandidate = {
  key: string;
  /** 오늘 분량에서 차지할 칸 — 0 이면 칸 없이 낸다(목표를 채우고 다시 풀 것만 남은 탐험). */
  slots: number;
  /** 빚진 것 — 남은 칸과 상관없이 낸다. */
  owed?: boolean;
};

export type DailyAllocation = {
  /** 낼 후보의 열쇠 — 넣은 차례. */
  chosen: string[];
  /** 남은 칸에 안 들어가 건너뛴 후보의 열쇠 — 받은 차례. */
  skipped: string[];
  /** 이번에 넣은 칸(오늘 이미 한 것은 빼고). */
  planned: number;
  /** 못 채운 칸 — 분량에서 한 것과 넣은 것을 뺀 나머지. */
  unfilled: number;
  /** 분량을 넘긴 칸 — 빚진 것 때문에만 생긴다. */
  over: number;
};

export function allocateDaily(input: {
  /** 오늘 분량(칸) — 넘지 않는 합계. */
  quota: number;
  /** 오늘 이미 한 칸. */
  done: number;
  /** 후보 — 우선순위 차례. */
  candidates: readonly DailyCandidate[];
}): DailyAllocation {
  const quota = Math.max(0, Math.floor(input.quota));
  const chosen: string[] = [];
  const skipped: string[] = [];
  let used = Math.max(0, input.done);
  for (const candidate of input.candidates)
    if (candidate.owed) {
      chosen.push(candidate.key);
      used += candidate.slots;
    }
  for (const candidate of input.candidates) {
    if (candidate.owed) continue;
    if (candidate.slots > quota - used) {
      skipped.push(candidate.key);
      continue;
    }
    chosen.push(candidate.key);
    used += candidate.slots;
  }
  return {
    chosen,
    skipped,
    planned: used - Math.max(0, input.done),
    unfilled: Math.max(0, quota - used),
    over: Math.max(0, used - quota),
  };
}
