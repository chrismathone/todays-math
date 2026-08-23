/**
 * 물결 2D 유형의 **산출물 지문** — 변이 시험이 「동작이 정말 바뀌었나」를 묻는 자리.
 *
 * 파일이 바뀐 것과 동작이 바뀐 것은 다르다. 이 지문이 그대로면 그 변이는
 * 아무것도 안 바꾼 것이고, 그때 나온 「초록」은 «가드가 아니다»가 아니라
 * «변이가 무효였다»는 뜻이다 (CLAUDE.md 2026-08-21 교훈).
 *
 * 사용: npx tsx scripts/qa/dump-real-scene.ts
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M1_REAL } from "../../src/lib/middle/m1Real";
import { M2_REAL } from "../../src/lib/middle/m2Real";

const SEEDS = [20260823, 1, 7777];

const rows = [...M1_REAL, ...M2_REAL].flatMap((e) =>
  SEEDS.map((seed) => {
    const p = generateMiddleProblem(e.key, seed);
    return {
      key: e.key,
      minor: e.rpmMinor,
      seed,
      content: p.content,
      answer: p.answer,
      facts: p.facts,
      figureSpec: p.figureSpec,
    };
  }),
);

process.stdout.write(JSON.stringify(rows, null, 1));
