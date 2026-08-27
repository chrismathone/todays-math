/**
 * 내가 지은 확장 유형(70~99)의 **발문을 눈으로 본다.**
 *
 * 값 검산도 지면 냄새 판정기도 「오각형뿔」 같은 이름 결함은 구조적으로 못 본다.
 * 이 저장소가 여러 번 적은 그대로 — **표본을 눈으로 봐야 보인다.**
 *
 * 쓰기:  npx tsx scratch/print-mine.ts [소단원조각]
 */
import { registeredTypes } from "../src/lib/middle/generate";
import { generateMiddleProblem } from "../src/lib/middle/generate";

const filter = process.argv[2] ?? "";

for (const t of registeredTypes()) {
  if (Number(t.rpmType) < 70) continue;
  if (filter && !t.unitSection.includes(filter)) continue;
  let p;
  try {
    p = generateMiddleProblem(t.key, 20260827);
  } catch (err) {
    console.log(`🔴 ${t.key} 던짐: ${String(err).slice(0, 80)}`);
    continue;
  }
  console.log(`\n── ${t.grade} ${t.unitSection} ${t.rpmType} ${t.rpmTitle}`);
  console.log(`   발문 : ${p.content.replace(/\n/g, " / ").slice(0, 130)}`);
  console.log(`   정답 : ${p.answer}`);
}
