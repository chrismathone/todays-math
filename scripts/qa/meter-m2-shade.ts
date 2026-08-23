/**
 * 계량기 — 채색 축이 실제로 내는 것을 stdout 에 그대로 쏟는다.
 *
 * `mutate-m2-shade.py` 가 이 출력을 해시해 **「변이가 산출물을 바꿨나」** 를
 * 먼저 묻는다. 파일이 바뀐 것과 동작이 바뀐 것은 다르다 — 그 한 겹이 없어서
 * 2026-08-20~21 에 두 번, 멀쩡한 가드를 「장식」으로 오판할 뻔했다.
 *
 * 그림 스펙까지 통째로 쏟는다. 발문·정답만 쏟으면 **그림만 바꾸는 변이**가
 * 「산출물 그대로」로 찍혀 판정 거부로 새 버린다.
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";

const KEYS = ["2-2|경우의 수|15", "2-2|확률|01", "2-2|확률|03", "2-2|확률|06"];
const SEEDS = [20260823, 1, 7777, 424242, 99991];

const out: string[] = [];
for (const key of KEYS) {
  for (const seed of SEEDS) {
    for (let variant = 0; variant < 12; variant += 1) {
      const p = generateMiddleProblem(key, seed, variant);
      out.push(
        JSON.stringify({
          key,
          seed,
          variant,
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          facts: p.facts,
          figureSpec: p.figureSpec ?? null,
        }),
      );
    }
  }
}
process.stdout.write(out.join("\n"));
