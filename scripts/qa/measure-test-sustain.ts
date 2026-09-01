/**
 * **같은 범위로 시험을 몇 번 낼 수 있나** — 되풀이 없이.
 *
 * 제품 함수를 그대로 부른다. 낸 문항을 `recentProblemIds` 에 쌓아 가며(D-20 이
 * 최근 14일을 빼는 것과 같은 효과) 25문항을 못 채울 때까지 반복한다.
 *
 * 실측(2026-09-02, 3단원 범위 · 25문항):
 *   초5(3벌) **6회** · 중3(12벌) **22회** · 중1(12벌) **24회**.
 * 3벌 → 12벌과 같은 배수다.
 *
 * ⚠️ 배분은 «비율»이다 — `fitDifficultyRatio(ratio, count)` 를 빼먹으면 합(8)만큼만
 *    뽑혀서 **모든 학년이 못 채우는 것처럼** 보인다. 실제로 그렇게 한 번 속았다.
 */
import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_DIFFICULTY_RATIO,
  fitDifficultyRatio,
} from "@/contracts/difficulty";
import { findEligibleProblems } from "@/lib/findEligibleProblems";
import { selectProblems } from "@/lib/generator/selectProblems";
const prisma = new PrismaClient();
const COUNT = Number(process.env.COUNT ?? 25);
const GRADES = (process.env.GRADES ?? "중3,중1").split(",");
(async () => {
  for (const g of GRADES) {
    const us = await prisma.unit.findMany({
      where: { grade: g },
      select: { id: true, section: true },
      orderBy: { orderIndex: "asc" },
    });
    const mid = Math.max(0, Math.floor(us.length / 2) - 1);
    const unitIds = us.slice(mid, mid + 3).map((u) => u.id);
    const pool = await findEligibleProblems({ unitIds });
    const used: string[] = [];
    let n = 0;
    for (; n < 200; n++) {
      const sel = selectProblems({
        pool,
        difficultyRatio: fitDifficultyRatio(DEFAULT_DIFFICULTY_RATIO, COUNT),
        count: COUNT,
        recentProblemIds: used,
        seed: `sustain:${g}:${n}`,
      });
      if (sel.problems.length < COUNT) break;
      used.push(...sel.problems.map((p) => p.id));
    }
    console.log(
      `${g}: 풀 ${pool.length} · **${n}회** 연속 출제(각 ${COUNT}문항) 뒤 못 채움 · 쓴 문항 ${used.length}`,
    );
  }
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(String(e).slice(0, 300));
  await prisma.$disconnect();
});
