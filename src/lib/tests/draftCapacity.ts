/**
 * **이 범위로 한 시험지에 몇 문항까지 낼 수 있나** — 「문항 부족」 판정의 유일한 자.
 *
 * ## 왜 행 수가 아니라 갈래 수인가 (2026-09-18 시뮬레이션)
 *
 * 한 시험지에 같은 갈래는 1개다(D-105 · `balanceDifficulty`). 그러니 출제의 진짜 상한은
 * **갈래 수**다 — `generateDraftTest` 도 422 를 낼 때 `countFamilies(usable)` 을 `available` 로
 * 보고한다. 그런데 화면(`daily-review`)과 아침 회차(`runAutoDraft`)는 **행 수**
 * (`countEligibleProblems`)로 「부족 아님」을 판정했다. 공유 DB 의 자격 문항은 전부 엔진 문항이라
 * 한 단원이 행 200~700 · 갈래 10~12 다 — 15문항 반은 「문항 228/15 · 자동」으로 보이고
 * 아침마다 422 로 죽었다(882 시나리오 실측: 실패 17,100 학생-일 중 99.8%).
 * 보고서: docs/planning/tracks/reports/daily-auto-test-simulation.md §4 ⑴
 *
 * ## 최근 출제(D-20)
 *
 * `recentProblemIds` 를 주면 그 행을 빼고 센다 — 출제(`selectProblems`)가 빼는 것과 같다.
 * 갈래의 행이 **전부** 빠지면 그 갈래가 없어지고, 일부만 빠지면 남은 변형으로 낼 수 있다.
 * 화면은 학생과 무관한 «범위의 상한»을 보여 주려고 비워 부르고, 아침 회차는 학생마다
 * 그때까지의 최근 출제를 넣어 부른다.
 *
 * 판정(갈래의 정체)은 `familyKey.ts` 한 곳이다 — 여기서 다시 정하지 않는다.
 */
import { db } from "@/lib/db";
import { eligibleProblemsWhere } from "@/lib/findEligibleProblems";
import {
  countFamilies,
  type FamilyIdentifiable,
} from "@/lib/generator/familyKey";
import { questionIdOf } from "@/lib/problem/questionIdentity";

/** 상한을 재는 데 필요한 열 — 본문·그림은 읽지 않는다. */
export type CapacityRow = FamilyIdentifiable & {
  questionGroupKey?: string | null;
};

/** 이 후보로 한 시험지에 넣을 수 있는 문항 수 — 갈래 수(최근 출제를 뺀 뒤). 순수 함수. */
export function draftCapacityOf(
  rows: readonly CapacityRow[],
  recentProblemIds: readonly string[] = [],
): number {
  if (recentProblemIds.length === 0) return countFamilies(rows);
  const recent = new Set(recentProblemIds);
  const questions = new Set(
    rows.filter((row) => recent.has(row.id)).map(questionIdOf),
  );
  return countFamilies(
    rows.filter(
      (row) => !recent.has(row.id) && !questions.has(questionIdOf(row)),
    ),
  );
}

/**
 * 범위의 출제 자격 후보 — **출제와 같은 where**(`eligibleProblemsWhere`)로, 갈래 판정에 필요한
 * 세 열만 읽는다. 갈리면 「부족 아님」이 출제에서 422 로 죽는다(그 결함을 고치러 온 자리다).
 */
export async function loadCapacityRows(
  unitIds: string[],
): Promise<CapacityRow[]> {
  if (unitIds.length === 0) return [];
  return db.problem.findMany({
    where: eligibleProblemsWhere({ unitIds }),
    select: { id: true, unitId: true, familyKey: true, questionGroupKey: true },
  });
}
