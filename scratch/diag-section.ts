/**
 * 한 소단원의 **풀 구성**을 뜯어본다 — 「10유형인데 갈래가 9개」가 왜 나는가.
 *
 * 판정기와 같은 길로 간다(`expandFamily` → 단답형만 풀에). 이미 객관식인 유형은
 * 파생이 없어 풀에 못 들어가므로, 그 소단원은 유형 수가 10이어도 **갈래가 9**다.
 */
import { expandFamily } from "../src/lib/engine/expandEngine";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../src/lib/middle/generate";

const SECTION = process.argv[2] ?? "합동";
const SEED = 20260827;

for (const t of registeredTypes()) {
  if (t.unitSection !== SECTION) continue;
  let got;
  try {
    got = expandFamily((v) => {
      const p = generateMiddleProblem(t.key, SEED, v);
      return {
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        familyKey: `mid:${t.key}`,
        problemType: p.difficulty === "연산" ? "계산" : "활용",
        difficulty: p.difficulty,
      };
    }, 3);
  } catch (err) {
    console.log(`🔴 ${t.key} 던짐: ${String(err).slice(0, 60)}`);
    continue;
  }
  const short = got.items.filter((i) => i.questionType === "단답형").length;
  const mcq = got.items.filter((i) => i.questionType === "객관식").length;
  const p = generateMiddleProblem(t.key, SEED);
  console.log(
    `${t.rpmType} ${t.rpmTitle.slice(0, 26).padEnd(28)} ${p.difficulty}  단답 ${short} · 객관 ${mcq}`,
  );
}
