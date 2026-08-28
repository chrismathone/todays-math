/**
 * **라벨 배치를 재려고 그림 코퍼스를 SVG 로 뽑는다.**
 *
 *   npx tsx scripts/qa/dump-figure-svgs.ts [나갈디렉터리] [씨앗수]
 *
 * 모집단은 `build-figure-compare.ts` 와 같다 — 초등은 등록 소단원 전량을 씨앗으로
 * 돌려 **나온 `kind` 를 관측**하고(손 목록을 두지 않는다), 중등은 등록 유형 전량.
 * 종류마다 처음 하나만 담는다.
 *
 * ⚠️ 산출물은 `.tmp-orca/` 에 둔다 — 재려고 만드는 물건이고 커밋 대상이 아니다.
 */
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";
import {
  registeredTypes,
  generateMiddleProblem,
} from "../../src/lib/middle/generate";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";

const outDir = process.argv[2] ?? path.join(".tmp-orca", "label-audit");
const seeds = Number(process.argv[3] ?? 6);

/**
 * 파일 이름으로 쓸 수 있게 다듬는다.
 *
 * ⚠️ **번호를 앞에 붙여 «반드시 다른 이름»으로 만든다.** 처음엔 키만 다듬어
 *    썼는데 `\w` 가 한글을 안 잡아서 「중2|삼각형의 성질|06」이 통째로 `_` 가
 *    되고, **296장을 쓴 자리에 143장만 남았다**(덮어썼다). 그러면 「전량을
 *    쟀다」가 거짓이 되는데 **에러도 경고도 안 난다.**
 */
let counter = 0;
function safe(name: string): string {
  counter += 1;
  const body = name.replace(/[^\w.-]+/gu, "_").slice(0, 70);
  return `${String(counter).padStart(4, "0")}-${body}`;
}

async function main(): Promise<void> {
  // ⚠️ **`rmSync` 를 쓰지 마라** — 노드(win32)는 해석된 경로에 한글이 있으면 그 호출로
  //    **프로세스째 죽는다**(`probe-rmsync-crash.mjs`, 2026-08-19). 워크트리 이름에
  //    한글이 있는 날 이 스크립트가 통째로 사라진다. 파일만 하나씩 지운다.
  mkdirSync(outDir, { recursive: true });
  if (existsSync(outDir)) {
    for (const name of readdirSync(outDir)) {
      if (name.endsWith(".svg") || name === "manifest.json") {
        unlinkSync(path.join(outDir, name));
      }
    }
  }
  const seen = new Set<string>();
  const manifest: Record<string, string> = {};
  let written = 0;
  let failed = 0;

  for (const unit of elementaryUnits()) {
    for (let seed = 1; seed <= seeds; seed += 1) {
      let spec: unknown;
      try {
        spec = generateElementaryProblem(unit, seed)?.figureSpec;
      } catch {
        continue;
      }
      if (!spec) continue;
      const kind = String((spec as Record<string, unknown>).kind ?? "v2");
      if (seen.has(`e:${kind}`)) continue;
      const r = await renderFigureSpec(spec);
      if (!r.ok) {
        failed += 1;
        continue;
      }
      seen.add(`e:${kind}`);
      const name = `elem-${safe(kind)}.svg`;
      writeFileSync(path.join(outDir, name), r.svg, "utf8");
      manifest[name] =
        `${unit.grade} ${unit.chapter} · ${unit.section} · ${kind}`;
      written += 1;
    }
  }

  // 중등은 씨앗·변형을 함께 훑는다 — 스펙 «모양»이 달라지면 다른 그림이다.
  for (const { key } of registeredTypes()) {
    for (let seed = 1; seed <= seeds; seed += 1) {
      for (let v = 0; v < 3; v += 1) {
        let spec: unknown;
        try {
          spec = generateMiddleProblem(key, seed, v)?.figureSpec;
        } catch {
          continue;
        }
        if (!spec) continue;
        const shape = JSON.stringify(
          Object.keys(spec as Record<string, unknown>).sort(),
        );
        const tag = `m:${key}|${shape}`;
        if (seen.has(tag)) continue;
        const r = await renderFigureSpec(spec);
        if (!r.ok) {
          failed += 1;
          continue;
        }
        seen.add(tag);
        const name = `mid-${safe(`${key}-${seed}-${v}`)}.svg`;
        writeFileSync(path.join(outDir, name), r.svg, "utf8");
        manifest[name] = `${key} · 씨앗 ${seed} · 변형 ${v}`;
        written += 1;
      }
    }
  }

  // ⚠️ **못 그린 것을 말없이 버리지 않는다** — 버린 수를 찍어야 「전부 봤다」로 안 읽힌다.
  //    그리고 **쓴 수와 남은 수가 다르면 멈춘다**: 이름이 겹쳐 덮어써도 에러가 안 난다.
  // 파일 이름은 한글을 못 담는다(`safe`). **어느 유형인지**를 따로 적어 두지
  // 않으면 결함을 찾아 놓고 그 유형을 되짚느라 시간을 버린다(실제로 그랬다).
  writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 1),
    "utf8",
  );
  const left = readdirSync(outDir).filter((f) => f.endsWith(".svg")).length;
  console.log(`SVG ${written}장 → ${outDir} (렌더 실패 ${failed}회)`);
  if (left !== written) {
    throw new Error(`쓴 것 ${written}장인데 남은 것 ${left}장 — 이름이 겹쳤다`);
  }
}

void main();
