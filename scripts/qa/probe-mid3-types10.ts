/**
 * **중3 다섯 소단원을 10유형으로 올린 회차의 산출물 지문** (2026-08-29).
 *
 * 쓰임은 둘이다.
 *
 *  ⑴ **변이 시험의 ⑶ 단계** — 「파일이 바뀌었나」와 「**동작이** 바뀌었나」는 다른
 *     질문이다(CLAUDE.md 2026-08-21). 앵커가 맞아 파일이 바뀌어도 뜻이 그대로면
 *     「가드가 아니다」가 거짓말이 된다. `mutate-mid3-types10.mjs` 가 변이 전후로
 *     이 지문을 찍어 **다르지 않으면 판정을 거부**한다.
 *  ⑵ 사람이 지면을 눈으로 볼 때 (`--show`).
 *
 * ⚠️ 지문에는 **발문·정답·해설·facts 를 전부** 넣는다. 답만 넣으면 「해설의 계산
 *    줄이 틀렸다」류 변이가 «산출물이 그대로»로 거부된다 — 그 부류가 이 회차에서
 *    실제로 있었다(19·20 의 «버린 근» 문장).
 *
 *   npx tsx scripts/qa/probe-mid3-types10.ts            # 지문(한 줄 요약)
 *   npx tsx scripts/qa/probe-mid3-types10.ts --show     # 지면을 눈으로
 *   npx tsx scripts/qa/probe-mid3-types10.ts --keys "3-2|산포도|09"
 */
import { createHash } from "node:crypto";

import {
  generateMiddleProblem,
  typesForSection,
} from "../../src/lib/middle/generate";

/** 이 회차가 지은 유형 — 소단원마다 둘씩. */
export const NEW_KEYS = [
  "3-1|이차방정식의 활용|17",
  "3-1|이차방정식의 활용|18",
  "3-1|이차방정식의 활용|19",
  "3-1|이차방정식의 활용|20",
  "3-2|삼각비|20",
  "3-2|삼각비|21",
  "3-2|산포도|09",
  "3-2|산포도|10",
  "3-2|상자그림과 산점도|14",
  "3-2|상자그림과 산점도|15",
] as const;

/** 이 회차가 10유형으로 올린 소단원. */
export const SECTIONS = [
  "이차방정식의 근의 공식과 응용",
  "이차방정식의 활용",
  "삼각비의 뜻",
  "대푯값과 산포도",
  "산점도와 상관관계",
] as const;

const SEEDS = [20260829, 1, 7777, 424242];
const VARIANTS = 6;

/** 한 유형의 산출물 지문 — 발문·정답·해설·facts·난이도를 전부 담는다. */
export function fingerprint(key: string): string {
  const lines: string[] = [];
  for (const seed of SEEDS) {
    for (let v = 0; v < VARIANTS; v += 1) {
      const p = generateMiddleProblem(key, seed, v);
      lines.push(
        [
          p.difficulty,
          p.content,
          p.answer,
          p.solution,
          JSON.stringify(p.facts),
          JSON.stringify(p.figureSpec ?? null),
        ].join(""),
      );
    }
  }
  return createHash("sha256").update(lines.join("")).digest("hex");
}

function main(): void {
  const args = process.argv.slice(2);
  const at = args.indexOf("--keys");
  const keys =
    at >= 0 && args[at + 1] ? args[at + 1]!.split(",") : [...NEW_KEYS];

  if (args.includes("--show")) {
    for (const key of keys) {
      console.log(`\n══════ ${key}`);
      const seen = new Set<number>();
      for (let v = 0; v < 40 && seen.size < 4; v += 1) {
        const p = generateMiddleProblem(key, 20260829, v);
        const mode = Number(p.facts.mode ?? 0);
        if (seen.has(mode)) continue;
        seen.add(mode);
        console.log(`── mode ${mode} · ${p.difficulty}`);
        console.log(`Q: ${p.content}`);
        console.log(`A: ${p.answer}`);
        console.log(`S: ${p.solution}`);
      }
    }
    return;
  }

  // 소단원 개수도 같이 찍는다 — 「10유형이 됐나」가 이 회차의 완료 조건이다.
  for (const sec of SECTIONS) {
    const n = typesForSection(sec).length;
    console.log(`${n >= 10 ? "🟢" : "🔴"} ${sec} — 유형 ${n}`);
  }
  for (const key of keys) console.log(`${fingerprint(key)}  ${key}`);
}

if (process.argv[1] && process.argv[1].includes("probe-mid3-types10")) main();
