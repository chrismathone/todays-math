/**
 * 중학 유형 엔진 진입점 — RPM 유형 색인을 뼈대로 유형별 생성기를 등록한다.
 *
 * 초등 엔진(`src/lib/elementary/`)과 같은 성질: AI 아님 · 씨앗이 같으면 결과가
 * 같음 · 정답은 생성기가 같은 숫자로 계산. 다른 점: 초등은 «소단원» 단위,
 * 중학은 **RPM 유형** 단위다 — 원장님이 「이 유형으로 몇 문항」을 고를 수 있게.
 *
 * 커버리지는 `registeredTypes()` 로 묻는다 — 873유형 중 등록된 것만 나온다.
 * 미등록 유형을 부르면 던진다 (조용히 다른 유형을 내지 않는다).
 */
import { createRng } from "../elementary/rng";

import { assertChooseAllAnswerCount } from "../problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "../problem/choiceCountRule";

import { tidySolution } from "./solutionText";
import { middleStudentInputIdentity } from "./studentInputIdentity";
import { resolveMiddleTier } from "./tier";
import { wrapDanClause } from "../problemText";

import { M1_CALC } from "./m1Calc";
import { M1EXTRA_TYPES } from "./m1Extra";
import { M1_EXPR } from "./m1Expr";
import { M1_GEO1 } from "./m1Geo1";
import { M1_GEO2 } from "./m1Geo2";
import { M1_GEO3 } from "./m1Geo3";
import { M1_LINEAR_APPLY } from "./m1LinearApply";
import { M1_NUM } from "./m1Num";
import { M1_PROP } from "./m1Prop";
import { M1_REAL } from "./m1Real";
import { M1_SOLID_TYPES } from "./m1Solid";
import { M1_STAT_TYPES } from "./m1Stat";
import { M1_STAT_FIG } from "./m1StatFig";
import { M1_TOP } from "./m1Top";
import { M1_TOP_2 } from "./m1Top2";
import { M1_TOP_3 } from "./m1Top3";
import { M1_TOP_4 } from "./m1Top4";
import { M1_TOP_5A } from "./m1Top5a";
import { M1_TOP_5B } from "./m1Top5b";
import { M1_TOP_5C } from "./m1Top5c";
import { M1_TOP_5D } from "./m1Top5d";
import { M1_TOP_5E } from "./m1Top5e";
import { M1_TOP_5F } from "./m1Top5f";
import { M1_TOP_5G } from "./m1Top5g";
import { M1_TOP_5H } from "./m1Top5h";
import { M1_TOP_5I } from "./m1Top5i";
import { M1_TYPES_10 } from "./m1Types10";
import { M2_TYPES } from "./m2";
import { M2_TOP } from "./m2Top";
import { M2_TOP_2 } from "./m2Top2";
import { M2_TOP_3 } from "./m2Top3";
import { M2_TOP_4 } from "./m2Top4";
import { M2_TOP_5A } from "./m2Top5a";
import { M2_TOP_5B } from "./m2Top5b";
import { M2_TOP_5C } from "./m2Top5c";
import { M2_TOP_5D } from "./m2Top5d";
import { M2_TOP_5E } from "./m2Top5e";
import { M2_TOP_5F } from "./m2Top5f";
import { M2_TOP_5G } from "./m2Top5g";
import { M2_TOP_5H } from "./m2Top5h";
import { M2_TOP_5I } from "./m2Top5i";
import { M2_TOP_5J } from "./m2Top5j";
import { M3_TYPES } from "./m3";
import { M3_REINFORCEMENT_20261018 } from "./m3Reinforcement20261018";
import { M3_TOP } from "./m3Top";
import { M3_TOP_2 } from "./m3Top2";
import { M3_TOP_3 } from "./m3Top3";
import { M3_TOP_4 } from "./m3Top4";
import { M3_TOP_5A } from "./m3Top5a";
import { M3_TOP_5B } from "./m3Top5b";
import { MID_SUP_B } from "./midSupB";
import type { MidProblem, TypeEntry } from "./types";

// 세션별 소유 모듈을 여기서만 합친다 — 병렬 세션은 자기 모듈 파일만 만지므로
// 이 파일에서 병합 충돌이 나지 않는다 (한 줄짜리 spread 는 이미 다 있다).
const ALL: TypeEntry[] = [
  ...M1_LINEAR_APPLY,
  ...M1EXTRA_TYPES,
  ...M1_NUM,
  ...M1_PROP,
  ...M1_CALC,
  ...M1_EXPR,
  ...M1_GEO1,
  ...M1_GEO2,
  ...M1_REAL,
  ...M1_SOLID_TYPES,
  ...M1_STAT_TYPES,
  ...M1_STAT_FIG,
  ...M1_GEO3,
  ...M2_TYPES,
  ...M3_TYPES,
  // 갈래 B 가 지은 보강 유형 — RPM 색인 밖이라 모듈 명부에 안 섞는다(midSupB.ts 머리말).
  ...MID_SUP_B,
  // 중1 소단원 넷을 8 → 10유형으로 올린 몫 — 같은 이유로 명부 밖이다(m1Types10.ts 머리말).
  ...M1_TYPES_10,
  // 중1 상위 갈래(`심화중`·`심화상`) — D-116. 같은 이유로 명부 밖이다(m1Top.ts 머리말).
  ...M1_TOP,
  // 2차 물결 — 새 소단원 넷(D-116, 2026-09-02). 접미사 `U`.
  ...M1_TOP_2,
  // 3차 물결 — 새 소단원 셋(D-116, 2026-09-02). 접미사 `V`.
  ...M1_TOP_3,
  // 4차 물결 — 새 소단원 넷(D-116, 2026-09-03). 접미사 `W`.
  ...M1_TOP_4,
  // 5차 물결 — 남은 소단원(D-116, 2026-09-03). 접미사 `X`.
  ...M1_TOP_5A,
  ...M1_TOP_5B,
  ...M1_TOP_5C,
  ...M1_TOP_5D,
  ...M1_TOP_5E,
  ...M1_TOP_5F,
  ...M1_TOP_5G,
  ...M1_TOP_5H,
  ...M1_TOP_5I,
  // 중2 확대 갈래(심화중·심화상) — D-116, 학년별 병렬 세션 소유 모듈(m2Top.ts 머리말).
  ...M2_TOP,
  ...M2_TOP_2,
  ...M2_TOP_3,
  ...M2_TOP_4,
  ...M2_TOP_5A,
  ...M2_TOP_5B,
  ...M2_TOP_5C,
  ...M2_TOP_5D,
  ...M2_TOP_5E,
  ...M2_TOP_5F,
  ...M2_TOP_5G,
  ...M2_TOP_5H,
  ...M2_TOP_5I,
  ...M2_TOP_5J,
  // 중3 확대 갈래(심화중·심화상) — D-116. 같은 이유로 명부 밖이다(m3Top.ts 머리말).
  ...M3_TOP,
  ...M3_TOP_2,
  ...M3_TOP_3,
  ...M3_TOP_4,
  ...M3_TOP_5A,
  ...M3_TOP_5B,
  // R2 계획 B 자작 보강 — RPM 이관 유형과 별도 네임스페이스.
  ...M3_REINFORCEMENT_20261018,
];

const BY_KEY = new Map<string, TypeEntry>();
for (const e of ALL) {
  if (BY_KEY.has(e.key)) {
    throw new Error(`유형 키가 겹칩니다: ${e.key}`);
  }
  BY_KEY.set(e.key, e);
}

export function registeredTypes(): TypeEntry[] {
  return ALL;
}

export function typesForSection(unitSection: string): TypeEntry[] {
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

export function generateMiddleProblem(
  key: string,
  seed: number,
  variant = 0,
): MidProblem {
  const entry = BY_KEY.get(key);
  if (!entry) {
    throw new Error(
      `등록되지 않은 유형입니다: ${key} — registeredTypes() 로 먼저 확인`,
    );
  }
  const p = entry.handler(createRng(seed + keySalt(key) + variant * 0x9e37));
  // 지면 다듬기는 **여기 한 곳**에서 한다. 유형마다 조건을 달면 열 벌이 되고
  // 한쪽만 옮겨도 아무도 모른다 (`solutionText.ts` 머리말 참조). 뜻은 안 바뀐다 —
  // 글자까지 똑같은 되풀이를 지우는 것뿐이다.
  const tidied = tidySolution(p.solution);
  // 「단, …」 조건절은 괄호 안으로 (원장님 2026-08-25). **초등 엔진과 같은 함수**를
  // 부른다 — 규칙이 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.
  // 실측으로 중등은 이미 33유형 전부 괄호를 치고 있어 지금은 0건이 바뀐다.
  // 그래도 걸어 둔다: 새 유형이 괄호를 빠뜨려도 여기서 잡힌다.
  const content = wrapDanClause(p.content);
  // 밑단(`연산`)은 유형에 안 적혀 있다 — 발문 모양에서 가려낸다 (D-106).
  // 규칙과 그 근거는 `tier.ts`, 지금 무엇을 잡는지는 `middleTierYeonsan.test.ts` 가 잠근다.
  const difficulty = resolveMiddleTier(p.difficulty, content, !!p.figureSpec);
  // 「모두 고르시오」의 정답은 정확히 2개 (원장님 2026-08-25). 생성기마다 지키면
  // 새 유형이 늘 때 빠뜨려도 아무도 모른다 — **여기 한 곳**에서 다시 보고 던진다.
  assertChooseAllAnswerCount(content, p.answer, `중등 유형 ${key}`);
  // 보기가 있으면 정확히 다섯 (원장님 2026-08-25, D-80). 같은 이유로 여기 한 곳이다.
  assertChoiceCount(content, `중등 유형 ${key}`);
  assertChoiceMarks(content, `중등 유형 ${key}`);
  if (
    tidied === p.solution &&
    content === p.content &&
    difficulty === p.difficulty
  ) {
    return p;
  }
  return { ...p, solution: tidied, content, difficulty };
}

/**
 * 한 유형에서 n 문항 — 학생에게 주어진 발문·자료가 같은 것은 다시 뽑는다.
 * 산점도 아홉 유형은 점 자료도 비교한다(그 밖의 유형은 기존 발문 비교).
 * 변형 공간이 좁아 n 을 못 채우면 던진다 (조용히 모자란 세트를 내지 않는다).
 */
export function generateMiddleSet(
  key: string,
  seed: number,
  n: number,
): MidProblem[] {
  const out: MidProblem[] = [];
  const seen = new Set<string>();
  let variant = 0;
  while (out.length < n) {
    if (variant > n * 30) {
      throw new Error(
        `유형 ${key} 의 변형 공간이 좁아 ${n}문항을 못 채웠습니다 (${out.length}까지)`,
      );
    }
    const p = generateMiddleProblem(key, seed, variant);
    variant += 1;
    const identity = middleStudentInputIdentity(key, p);
    if (seen.has(identity)) continue;
    seen.add(identity);
    out.push(p);
  }
  return out;
}
