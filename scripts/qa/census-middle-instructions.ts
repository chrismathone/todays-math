/**
 * **중등 873유형의 «발문 지시»를 빈도순으로 늘어놓는다.** 읽기 전용.
 *
 *   npx tsx scripts/qa/census-middle-instructions.ts
 *   npx tsx scripts/qa/census-middle-instructions.ts --yeonsan   # 밑단 판정 결과만
 *
 * ## 왜 있나
 *
 * `src/lib/middle/tier.ts` 의 밑단(`연산`) 판정 낱말은 **여기서 골랐다**(D-106).
 * 「무엇이 계산 지시인가」를 머리로 정하면 목록에 없는 부류가 구조적으로 0이 된다 —
 * 이 저장소가 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」로 여러 번
 * 데인 자리다. 그래서 **먼저 전량을 훑어** 실제로 어떤 지시가 몇 번 나오는지 보고,
 * 거기서 고른다. 나중에 유형이 늘면 다시 돌려서 **새로 생긴 지시**를 확인할 것.
 *
 * ⚠️ 판정을 **바꾸는** 도구가 아니다. 판정은 `tier.ts` 에 있고, 그것이 지금 무엇을
 *    잡는지는 `src/__tests__/unit/middleTierYeonsan.test.ts` 가 키 그대로 잠근다.
 */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import { loneInstruction } from "../../src/lib/middle/tier";

const SEED = 20260825;
const ONLY_YEONSAN = process.argv.includes("--yeonsan");

type Row = { key: string; difficulty: string; instruction: string | null };

const rows: Row[] = [];
for (const t of registeredTypes()) {
  let p;
  try {
    p = generateMiddleProblem(t.key, SEED);
  } catch (e) {
    console.log(`   ⚠️ 생성 실패, 건너뜀: ${t.key} — ${(e as Error).message}`);
    continue;
  }
  rows.push({
    key: t.key,
    difficulty: p.difficulty,
    instruction: p.figureSpec ? null : loneInstruction(p.content),
  });
}

const byDifficulty = new Map<string, number>();
for (const r of rows)
  byDifficulty.set(r.difficulty, (byDifficulty.get(r.difficulty) ?? 0) + 1);
console.log(`등록 ${registeredTypes().length} · 생성 ${rows.length}`);
console.log(
  "난이도 분포: " +
    [...byDifficulty.entries()].map(([d, n]) => `${d} ${n}`).join(" · "),
);

if (ONLY_YEONSAN) {
  const y = rows.filter((r) => r.difficulty === "연산");
  console.log(`\n=== 연산 ${y.length}건 ===`);
  for (const r of y) console.log(`  ${r.key.padEnd(42)} «${r.instruction}»`);
} else {
  // 「지시문 하나뿐」인 골격 전량 — 판정에 쓸 낱말은 여기서만 고른다.
  const tally = new Map<string, { n: number; d: Record<string, number> }>();
  for (const r of rows) {
    if (!r.instruction) continue;
    const e = tally.get(r.instruction) ?? { n: 0, d: {} };
    e.n += 1;
    e.d[r.difficulty] = (e.d[r.difficulty] ?? 0) + 1;
    tally.set(r.instruction, e);
  }
  const total = [...tally.values()].reduce((s, e) => s + e.n, 0);
  console.log(
    `\n=== 「지시문 하나뿐」 ${tally.size}종 / ${total}건 (전량) ===`,
  );
  for (const [k, v] of [...tally.entries()].sort((a, b) => b[1].n - a[1].n)) {
    console.log(
      `  ${String(v.n).padStart(3)}  ${JSON.stringify(v.d).padEnd(34)} «${k}»`,
    );
  }
  console.log(
    `\n나머지 ${rows.length - total}건은 발문에 상황·조건·그림이 있어 밑단 후보가 아니다.`,
  );
}
