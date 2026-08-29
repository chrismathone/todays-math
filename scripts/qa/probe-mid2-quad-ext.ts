/**
 * **「등변사다리꼴, 여러 가지 사각형」 확장 유형 29~32 의 산출물 지문.**
 *
 *   npx tsx scripts/qa/probe-mid2-quad-ext.ts
 *
 * 변이 하네스(`mutate-mid2-quad-ext.py`)의 ⑶ 「**산출물이 바뀌었나**」를 재는 자다.
 * 파일이 바뀌는 것과 뜻이 바뀌는 것은 다르고, 그 둘을 안 가르면 「가드가 아니다」가
 * 거짓말이 된다(CLAUDE.md 2026-08-21).
 *
 * ⚠️ 지문이 **좁으면 그 거짓말이 도로 산다.** 답만 찍으면 그림을 통째로 망가뜨린
 *    변이가 「산출물 그대로」로 거부된다. 그래서 발문·정답·해설·facts·**그림 스펙**을
 *    전부 담고, 씨앗과 변형도 넉넉히 돈다(2026-08-25 「⑶ 의 지문이 좁으면」).
 */
import {
  generateMiddleProblem,
  typesForSection,
} from "../../src/lib/middle/generate";

const SECTION = "등변사다리꼴, 여러 가지 사각형";
const SEEDS = [20260829, 1, 7777, 424242, 99991];
const EXT = ["29", "30", "31", "32"];

const rows: string[] = [];
for (const entry of typesForSection(SECTION)) {
  if (!EXT.includes(entry.rpmType)) continue;
  for (const seed of SEEDS) {
    for (let v = 0; v < 8; v += 1) {
      let line: string;
      try {
        const p = generateMiddleProblem(entry.key, seed, v);
        line = JSON.stringify({
          k: entry.key,
          seed,
          v,
          d: p.difficulty,
          c: p.content,
          a: p.answer,
          s: p.solution,
          f: p.facts,
          g: p.figureSpec ?? null,
        });
      } catch (err) {
        // 던지는 것도 «바뀐 산출물»이다 — 조용히 빼면 그 변이가 지문에서 사라진다.
        line = JSON.stringify({
          k: entry.key,
          seed,
          v,
          throw: (err as Error).message,
        });
      }
      rows.push(line);
    }
  }
}
process.stdout.write(`${rows.join("\n")}\n`);
