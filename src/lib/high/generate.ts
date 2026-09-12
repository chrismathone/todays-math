/**
 * 고등 유형 엔진 진입점 — RPM 고등(2022) 유형 색인을 뼈대로 유형별 생성기를 등록한다.
 *
 * 중학 엔진(`src/lib/middle/generate.ts`)과 같은 성질: AI 아님 · 씨앗이 같으면 결과가 같음 ·
 * 정답은 생성기가 같은 숫자로 계산. 단위도 같다 — **RPM 유형**(`과목|중단원|번호`).
 *
 * 지면 다듬기(해설 되풀이 · 「단,」 괄호 · 밑단 `연산` 판정 · 보기 다섯 · 「모두 고르시오」)는
 * **중등과 같은 함수**를 부른다. 규칙이 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.
 * 고등이라서 더한 것은 하나다 — 생성기가 낸 **오답 넷**(`distractors`)이 성한지 여기서 본다.
 *
 * 커버리지는 `registeredHighTypes()` 로 묻는다. 미등록 유형을 부르면 던진다.
 */
import { createRng } from "../elementary/rng";
import { tidySolution } from "../middle/solutionText";
import { resolveMiddleTier } from "../middle/tier";
import { assertChooseAllAnswerCount } from "../problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "../problem/choiceCountRule";
import { wrapDanClause } from "../problemText";

import { H1_IDENTITY } from "./h1Identity";
import type { HighProblem, HighTypeEntry } from "./types";

// 세션별 소유 모듈을 여기서만 합친다 — 병렬 세션은 자기 모듈 파일만 만진다
// (`docs/planning/tracks/high-engine-plan.md` §2).
const ALL: HighTypeEntry[] = [...H1_IDENTITY];

const BY_KEY = new Map<string, HighTypeEntry>();
for (const e of ALL) {
  if (BY_KEY.has(e.key)) {
    throw new Error(`고등 유형 키가 겹칩니다: ${e.key}`);
  }
  BY_KEY.set(e.key, e);
}

export function registeredHighTypes(): HighTypeEntry[] {
  return ALL;
}

export function highTypesForSection(unitSection: string): HighTypeEntry[] {
  return ALL.filter((e) => e.unitSection === unitSection);
}

/** 유형 키마다 rng 흐름을 가르는 소금 — 키 문자열에서 결정적으로 만든다. */
function keySalt(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * 생성기가 낸 오답 넷이 성한가 — 아니면 **던진다**.
 *
 * 공용 파생(`asMultipleChoice`)도 같은 것을 다시 보지만, 거기서 실패하면 그 변형의
 * 객관식이 **조용히 건너뛰어진다**(`skippedMcq`). 생성기 결함은 건너뛸 일이 아니라
 * 고칠 일이므로 나가는 자리에서 먼저 막는다.
 */
export function assertDistractors(p: HighProblem, where: string): void {
  if (p.distractors === undefined) return;
  const ds = p.distractors.map((d) => d.trim());
  if (ds.length !== 4) {
    throw new Error(`${where}: 오답은 넷이어야 합니다 (${ds.length}개)`);
  }
  for (const d of ds) {
    if (!/^\$[^$]+\$$/.test(d)) {
      throw new Error(`${where}: 오답이 수식 한 덩어리가 아닙니다 — ${d}`);
    }
  }
  if (new Set([p.answer.trim(), ...ds]).size !== 5) {
    throw new Error(`${where}: 오답이 서로 겹치거나 정답과 같습니다`);
  }
}

export function generateHighProblem(
  key: string,
  seed: number,
  variant = 0,
): HighProblem {
  const entry = BY_KEY.get(key);
  if (!entry) {
    throw new Error(
      `등록되지 않은 고등 유형입니다: ${key} — registeredHighTypes() 로 먼저 확인`,
    );
  }
  const p = entry.handler(createRng(seed + keySalt(key) + variant * 0x9e37));
  const where = `고등 유형 ${key}`;
  const solution = tidySolution(p.solution);
  const content = wrapDanClause(p.content);
  const difficulty = resolveMiddleTier(p.difficulty, content, !!p.figureSpec);
  assertChooseAllAnswerCount(content, p.answer, where);
  assertChoiceCount(content, where);
  assertChoiceMarks(content, where);
  assertDistractors(p, where);
  if (
    solution === p.solution &&
    content === p.content &&
    difficulty === p.difficulty
  ) {
    return p;
  }
  return { ...p, solution, content, difficulty };
}

/**
 * 한 유형에서 n 문항 — 발문이 같은 것은 버리고 다시 뽑는다.
 * 변형 공간이 좁아 n 을 못 채우면 던진다 (조용히 모자란 세트를 내지 않는다).
 */
export function generateHighSet(
  key: string,
  seed: number,
  n: number,
): HighProblem[] {
  const out: HighProblem[] = [];
  const seen = new Set<string>();
  let variant = 0;
  while (out.length < n) {
    if (variant > n * 30) {
      throw new Error(
        `고등 유형 ${key} 의 변형 공간이 좁아 ${n}문항을 못 채웠습니다 (${out.length}까지)`,
      );
    }
    const p = generateHighProblem(key, seed, variant);
    variant += 1;
    if (seen.has(p.content)) continue;
    seen.add(p.content);
    out.push(p);
  }
  return out;
}
