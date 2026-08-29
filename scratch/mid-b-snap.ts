/** 산출물 스냅숏 — 전후 대조용. (내 파일) */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../src/lib/middle/generate";

const SEED = 20260827;
const V = 4;
type E = { key: string; grade: string; unitSection: string };
const rows: string[] = [];
for (const e of registeredTypes() as unknown as E[]) {
  for (let v = 0; v < V; v += 1) {
    try {
      const p = generateMiddleProblem(e.key, SEED, v);
      rows.push(
        JSON.stringify({
          k: e.key,
          v,
          d: p.difficulty,
          c: p.content,
          a: p.answer,
          s: p.solution,
        }),
      );
    } catch (err) {
      rows.push(
        JSON.stringify({
          k: e.key,
          v,
          err: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
console.log(rows.join("\n"));
