/** 변이 하네스용 산출물 지문 — 갈래 B 유형 전량, 씨앗 하나. (내 파일) */
import { generateMiddleProblem } from "../src/lib/middle/generate";
import { MID_SUP_B } from "../src/lib/middle/midSupB";
const out: string[] = [];
for (const e of MID_SUP_B)
  for (let v = 0; v < 4; v += 1) {
    const p = generateMiddleProblem(e.key, 20260827, v);
    out.push(`${e.key}|${v}|${p.content}|${p.answer}|${p.solution}`);
  }
console.log(out.join("\n"));
