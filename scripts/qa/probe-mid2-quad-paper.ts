/**
 * **「등변사다리꼴, 여러 가지 사각형」로 일일테스트 10문항이 실제로 서는가.**
 *
 *   npx tsx scripts/qa/probe-mid2-quad-paper.ts
 *
 * 「유형이 12개다」와 「10문항이 나온다」는 **다른 물음**이다. 한 시험지에 같은
 * 문항류는 하나뿐이므로(원장님 확정 2026-08-26), 유형 수가 채워져도 난이도 배분이
 * 안 맞으면 대체만 하다 끝난다. 그래서 여기서는 세는 대신 **제품 선택기를 부른다.**
 *
 * ⚠️ 풀을 손으로 짓지 않고 **적재기가 부르는 그 함수**(`buildMiddleRows`)로 만든다.
 *    손으로 지으면 형식 파생(단답형·객관식)·`familyKey`·난이도가 제품과 갈라지고,
 *    그러면 「제품에서 되는가」가 아니라 「내 흉내에서 되는가」를 재게 된다
 *    (CLAUDE.md 2026-08-29 「가드가 초록이면 모집단부터 의심하라」).
 */
import {
  defaultRatioFor,
  DIFFICULTY_LADDER,
} from "../../src/contracts/difficulty";
import {
  selectProblems,
  type SelectableProblem,
} from "../../src/lib/generator/selectProblems";
import { typesForSection } from "../../src/lib/middle/generate";
import { buildMiddleRows } from "../import/load-engine-problems";

const GRADE = "중2";
const SECTION = "등변사다리꼴, 여러 가지 사각형";
const COUNT = 10;

const types = typesForSection(SECTION).filter((e) => e.grade === GRADE);
console.log(`학년 필터 뒤 유형 수: ${types.length}`);
console.log(`  ${types.map((e) => e.rpmType).join(", ")}`);

const rows = buildMiddleRows(
  { engine: "middle", grade: GRADE, unitSection: SECTION, variants: 3 },
  20260829,
);
const pool: SelectableProblem[] = rows.map((r) => ({
  id: r.externalId,
  unitId: r.unitKey,
  difficulty: r.difficulty,
  problemType: r.problemType,
  directUseAllowed: true,
  familyKey: r.familyKey,
  content: r.content,
}));

const byTier = new Map<string, number>();
const families = new Set<string>();
for (const p of pool) {
  byTier.set(p.difficulty, (byTier.get(p.difficulty) ?? 0) + 1);
  families.add(p.familyKey ?? p.id);
}
console.log(`풀 ${pool.length}문항 · 문항류 ${families.size}개`);
console.log(
  `  갈래별 ${DIFFICULTY_LADDER.map((t) => `${t} ${byTier.get(t) ?? 0}`).join(" · ")}`,
);
console.log(`목표 배분 ${JSON.stringify(defaultRatioFor(COUNT))}\n`);

let worst = COUNT;
for (const seed of ["2026-08-29", "a", "b", "c", "d", "e", "f", "g"]) {
  const r = selectProblems({
    pool,
    count: COUNT,
    difficultyRatio: defaultRatioFor(COUNT),
    recentProblemIds: [],
    seed,
  });
  const fam = new Set(r.problems.map((p) => p.familyKey));
  const tiers = DIFFICULTY_LADDER.map(
    (t) => `${t}${r.problems.filter((p) => p.difficulty === t).length}`,
  ).join(" ");
  worst = Math.min(worst, r.problems.length);
  console.log(
    `씨앗 ${seed}: ${r.problems.length}문항 · 문항류 ${fam.size}개 · ${tiers}` +
      ` · 대체 ${r.substitutions.length} · 부족 ${r.shortfall.length}`,
  );
  if (fam.size !== r.problems.length) {
    console.log("  🔴 같은 문항류가 두 번 실렸다");
  }
  for (const s of r.shortfall) console.log(`  ↳ 부족 ${JSON.stringify(s)}`);
}
console.log(
  worst === COUNT
    ? `\n✅ 씨앗 8개 전부 ${COUNT}문항을 채웠다`
    : `\n🔴 가장 나쁜 씨앗이 ${worst}문항에 그쳤다`,
);
