/**
 * 기준 글 만들기 — 한 팔의 결과를 밑글로 복사하고, 사진과 대조해 정한 치환 목록을 건다.
 *
 *   node scripts/qa/english-read-bench/mkref.mjs <결과 폴더> <사진 이름(확장자 없이)> <팔/회차> <치환.json> [alt 이름]
 *
 * 치환.json = [[찾을 글, 바꿀 글], …] — 찾을 글은 밑글에 정확히 한 곳이어야 한다.
 * 기준 글 안의 ⟦ … ⟧ 는 «있어도 없어도 되는 글»이다(쪽 번호 · 답 줄의 빈칸 · 화살표 · 가장자리에서 잘린 줄처럼 판정이 갈리는 것).
 * 읽는 차례가 둘 다 옳은 쪽(짝짓기 표 · 나란한 낱말표)은 `<사진>.alt1.txt` 로 하나 더 둔다 — 채점은 가까운 쪽으로 잰다.
 * `<사진>.ignore` 에 정규식을 두면 그 낱말은 양쪽에서 걷고 잰다(손으로 매겨 복사한 번호처럼 자리까지 갈리는 것).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [, , outDir, stem, spec, editsFile, alt = ""] = process.argv;
const [arm, run] = spec.split("/");
let text = readFileSync(
  path.join(outDir, arm, `run${run}`, `${stem}.txt`),
  "utf8",
).replace(/\r\n?/g, "\n");
for (const [from, to] of JSON.parse(readFileSync(editsFile, "utf8"))) {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`«${from.slice(0, 40)}» 가 ${count}곳`);
  text = text.replace(from, () => to);
}
mkdirSync(path.join(outDir, "ref"), { recursive: true });
const file = path.join(outDir, "ref", `${stem}${alt ? `.${alt}` : ""}.txt`);
writeFileSync(file, text, "utf8");
console.log("ok", file, text.length);
