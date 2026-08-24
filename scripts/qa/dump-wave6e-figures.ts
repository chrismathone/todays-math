/**
 * 6E 실렌더 시트용 figureSpec 덤프 — **실제 문제 생성기가 낸 것 그대로**를
 * JSON 으로 찍는다(손으로 다시 짓지 않는다 — 09-figure-engine-guide.md §5
 * 「작업 순서」의 정신과 같다: 실제로 쓰이는 스펙을 검수한다).
 *
 *   npx tsx scripts/qa/dump-wave6e-figures.ts > scripts/qa/_wave6e-figures.json
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M2_PYTHA } from "../../src/lib/middle/m2Pytha";
import { M3_STAT2 } from "../../src/lib/middle/m3Stat2";

// 씨앗 하나로는 특정 seed 에서만 우연히 안전한 좌표가 나올 수 있다 — 실렌더
// 판정은 **여러** 씨앗을 훑어야 「이 유형은 항상 그려진다」를 말할 수 있다
// (2026-08-24 04번 마름모가 정확히 이 자리에서 씨앗마다 다르게 걸렸다).
const SEEDS = [20260824, 1, 7777, 424242, 99991];

type Card = { group: string; name: string; spec: unknown };
const cards: Card[] = [];
const seen = new Set<string>();

for (const seed of SEEDS) {
  for (const e of M2_PYTHA) {
    const p = generateMiddleProblem(e.key, seed);
    const key = `${e.key}|${JSON.stringify(p.figureSpec)}`;
    if (p.figureSpec && !seen.has(key)) {
      seen.add(key);
      cards.push({
        group: "① 2-2 피타고라스 정리",
        name: `${e.rpmType} ${e.rpmTitle} (씨앗 ${seed})`,
        spec: p.figureSpec,
      });
    }
  }
  for (const e of M3_STAT2) {
    const p = generateMiddleProblem(e.key, seed);
    const key = `${e.key}|${JSON.stringify(p.figureSpec)}`;
    if (p.figureSpec && !seen.has(key)) {
      seen.add(key);
      cards.push({
        group: "② 3-2 상자그림·산점도",
        name: `${e.rpmMinor} ${e.rpmType} ${e.rpmTitle} (씨앗 ${seed})`,
        spec: p.figureSpec,
      });
    }
  }
}

console.log(JSON.stringify(cards, null, 2));
