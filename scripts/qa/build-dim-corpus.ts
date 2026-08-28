/**
 * 치수 라벨을 재려고 **그림을 한 벌 찍어 낸다** — 전·후를 같은 집합으로 견주려고.
 *
 *   npx tsx scripts/qa/build-dim-corpus.ts .tmp-orca/dim-after
 *   python scripts/qa/measure-dim-label-clear.py .tmp-orca/dim-after
 *
 * 전·후 비교는 **옛 코드를 git 에서 꺼내** 같은 집합에 돌린다(2026-08-18 교훈):
 *
 *   git show HEAD:scripts/figure/elem_advanced.py > /tmp/old.py   # 바이트로
 *   ... 갈아 끼우고 다시 찍은 뒤 **바이트로** 되돌린다 ...
 *
 * ⚠️ **파일 이름에 단원을 넣는다.** 처음엔 `1-2_08` 처럼 학년+유형번호만 썼는데
 *    `1-2|통계|08` 과 `1-2|입체도형의 겉넓이와 부피|08` 이 **서로 덮어** 정작 재려던
 *    `cutCuboid` 가 집합에서 통째로 사라졌다(실측 — 그 회차 표는 전부 헛것이었다).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";

const OUT = process.argv[2]!;
mkdirSync(OUT, { recursive: true });

async function main() {
  const seen = new Set<string>();
  let n = 0;
  let fail = 0;
  for (const unit of elementaryUnits()) {
    for (let seed = 1; seed <= 6; seed += 1) {
      let p;
      try {
        p = generateElementaryProblem(unit, seed);
      } catch {
        continue;
      }
      const spec = p?.figureSpec as Record<string, unknown> | undefined;
      if (!spec || spec.version !== "elem-1") continue;
      const tag = `elem-${String(spec.kind)}`;
      if (seen.has(tag)) continue;
      seen.add(tag);
      const r = await renderFigureSpec(spec as never);
      if (!r.ok) {
        fail += 1;
        continue;
      }
      writeFileSync(`${OUT}/${tag}.svg`, r.svg, "utf8");
      n += 1;
    }
  }
  for (const { key } of registeredTypes()) {
    for (let v = 0; v <= 1; v += 1) {
      let p;
      try {
        p = generateMiddleProblem(key, 1, v);
      } catch {
        continue;
      }
      const spec = p.figureSpec as Record<string, unknown> | undefined;
      if (!spec || spec.version !== "elem-1") continue;
      const parts_ = key.split("|");
      const unit_ = parts_[1]!.replace(/[^가-힣A-Za-z0-9]/g, "").slice(0, 8);
      const tag = `mid-${parts_[0]}_${unit_}_${parts_[2]}-${v}`;
      if (seen.has(tag)) continue;
      seen.add(tag);
      const r = await renderFigureSpec(spec as never);
      if (!r.ok) {
        fail += 1;
        continue;
      }
      writeFileSync(`${OUT}/${tag}.svg`, r.svg, "utf8");
      n += 1;
    }
  }
  console.log(`${OUT} — 그림 ${n}장 · 렌더 실패 ${fail}`);
}
void main();
