/**
 * 확률의 뜻과 성질 01A~05A 산출물 지문 — 변이 시험의 ⑵ 단계(«산출물이 바뀌었나»)용.
 *
 * ⚠️ 씨앗을 좁게 잡으면 ⑵ 가 거짓 「안 바뀌었다」를 낸다(2026-08-25 교훈).
 *    실제로 3개만 쓸 때 04A 의 배수관계 가드 변이가 「산출물 그대로」로 새었다.
 */
import { M2_PROB } from "../src/lib/middle/m2Prob";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const WIDE = process.argv.includes("--wide");
const seeds = WIDE
  ? Array.from({ length: 120 }, (_v, i) => i + 1)
  : [17, 203, 991];

for (const t of ["01A", "02A", "03A", "04A", "05A", "06A", "07A"]) {
  const e = M2_PROB.find((x) => x.rpmType === t)!;
  for (const s of seeds) {
    const p = e.handler(seeded(s));
    console.log(`--- ${t} seed=${s} [${p.difficulty}]`);
    console.log(p.content);
    console.log("ANS: " + p.answer);
    console.log("SOL: " + p.solution);
  }
}
