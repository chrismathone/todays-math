/**
 * 중등 **판정형** 문항의 계약 — «다음 중 계산이 옳지 않은 것은?» 처럼 보기 다섯의 참거짓을 따져 하나를 고른다
 * (2026-10-08 엔진 보강 3자 합의 — `docs/planning/tracks/engine-upgrade-consensus-20261008.md` §1 Q1 · §5 0단계).
 *
 * ## 왜 따로 두나 — RPM 등록부에도 결합형에도 넣지 않는다
 *
 * `MidProblem` 은 `rpmBook/Minor/Type/Title` 을 **필수**로 갖는다(`../types.ts`) — «이 문항이 RPM 유형 하나에서
 * 나왔다»는 계약이다. 판정형은 RPM 에 없는 **묻는 꼴**이고 보기 다섯을 재료 유형에서 지어 묶는다. 그 자리에
 * RPM 값을 채우면 원천과 커버리지의 뜻이 흐려진다(codex 1회전 Q1). 결합형(`../combo.ts`)은 «소단원 개념 둘이
 * 각각 필수»라는 다른 정의를 갖는다. 그래서 **별도 등록부**(`registry.ts`)를 두고, 산출 형식은 기존 **객관식**
 * 그대로다(보기 ①~⑤ · 번호 정답 — 새 형식을 만들지 않는다).
 *
 * ## 등록 단위와 열쇠 (합의안 Q1 표)
 *
 *   등록 단위   `grade + unitSection + familyId` — 판정키 `중1|유리수의 덧셈과 뺄셈|calc-add2`
 *   문항류      `familyKey  = mid:judge:<판정키>`
 *   적재 열쇠   `externalId = engine-mid-judge:<판정키>|r<규칙판>|s<seed>|v<variant>|객관식`
 *
 * 🔴 **열쇠를 만드는 쪽과 읽는 쪽이 이 파일 하나를 쓴다.** 적재기(`scripts/import/load-engine-problems.ts`)는
 *    `judgeExternalId` 로 쓰고, 미적재 검사(`scripts/qa/checkUnloadedTypes.ts`)는 `parseJudgeExternalId` 로 읽는다.
 *    한쪽이 모양을 따로 적으면 «넣고도 빚이 안 줄어드는» 자리가 다시 생긴다(결합형이 겪은 것 —
 *    `loadComboRows.test.ts` 머리말).
 *
 * 🔴 **규칙판(`r`)** — 생성 규칙이 바뀌어 같은 씨앗이 **다른 문제**를 내게 되면 판을 올린다. 옛 판의 열쇠를
 *    다시 쓰지 않는다 — 제자리 갱신이 «같은 문항 코드 · 다른 문제»를 만든 사고가 있다(2026-10-03 «298행»).
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../../elementary/types";

/** 판정형의 물음 — 보기 가운데 «옳지 않은 것» 하나, 또는 «옳은 것» 하나를 고른다. */
export type JudgeAsk = "옳지 않은 것" | "옳은 것";

/**
 * 생성기가 낸 보기 하나.
 *
 * `claimedTrue` 는 **생성기의 주장**이다 — 등록부가 지면 글을 `truthOf` 로 **다시 재서** 이것과 견준다.
 * 주장과 재 본 값이 다르면 문항을 내지 않는다(조용히 정답을 옮기지 않는다).
 */
export type JudgeOption = {
  /** 지면에 나갈 보기 글(번호 뗀 것) — `$…$` */
  text: string;
  claimedTrue: boolean;
  /** 해설 한 줄 — 이 보기가 왜 옳은가/어디가 틀렸는가. 보기와 함께 순서가 섞인다. */
  explain: string;
};

/** 생성기 한 번의 산출 — 보기의 **차례는 아직 정하지 않는다**(등록부가 섞는다). */
export type JudgeBody = {
  /** 발문 — `…것은?` 으로 끝난다(해설의 마지막 줄 «따라서 … 것은 ③이다»를 여기서 만든다). */
  lead: string;
  options: readonly JudgeOption[];
  /** 생성기가 쓴 원 수치 — 시험이 검산에 쓴다. DB 적재 대상이 아니다. */
  facts: Record<string, number>;
};

/** 판정형 하나의 등록 — 차시(`grade + unitSection`) 안의 문항류 하나. */
export type JudgeDefinition = {
  grade: string;
  /** 우리 `Unit.section` 정확한 이름 — 적재 시 단원 매칭 키 */
  unitSection: string;
  /** 차시 안에서 이 문항류를 가르는 이름 — `[a-z0-9-]` */
  familyId: string;
  title: string;
  /** 이 문항류가 내는 물음 — 변형 번호 차례로 돌아가며 낸다 */
  asks: readonly [JudgeAsk, ...JudgeAsk[]];
  /**
   * **허용 원천** — 보기 다섯의 재료가 되는 RPM 유형 키. 보기 다섯은 **같은 유형 · 같은 꼴**에서 온다
   * (합의안 §2 Q2 — 섞기는 차시별 허용 목록을 시험이 지킬 때만).
   */
  sources: readonly [string, ...string[]];
  /**
   * 이 꼴의 난이도 — **직접 선언한다.** 원천 유형의 칸을 복사하지 않고, 판정형이라고 일괄 올리지도 않는다
   * (codex 1회전 Q1). 근거를 `difficultyBasis` 에 적는다.
   */
  difficulty: Difficulty;
  difficultyBasis: string;
  /** 생성 규칙판 — 1부터. 같은 씨앗이 다른 문제를 내게 바뀌면 올린다(머리말). */
  ruleVersion: number;
  generate: (rng: Rng, ask: JudgeAsk) => JudgeBody;
  /**
   * 🔴 **지면에 찍힌 보기 글을 다시 재는 함수** — 참이면 true, 거짓이면 false, 못 읽으면 null.
   * 생성기의 셈을 다시 부르지 않는다(동어반복). 글을 읽어 따로 센다.
   */
  truthOf: (choiceText: string) => boolean | null;
};

/** 등록부가 낸 문항 한 건. */
export type JudgeProblem = {
  kind: "judge";
  judgeKey: string;
  familyKey: string;
  grade: string;
  unitSection: string;
  familyId: string;
  ruleVersion: number;
  ask: JudgeAsk;
  content: string;
  /** 보기 번호 하나 — `③` */
  answer: string;
  solution: string;
  difficulty: Difficulty;
  facts: Record<string, number>;
  /** 지면 차례대로 — `truthOf` 가 **다시 잰** 참거짓 */
  truths: readonly boolean[];
};

export const JUDGE_FAMILY_PREFIX = "mid:judge:";
export const JUDGE_EXTERNAL_PREFIX = "engine-mid-judge:";

/** `familyId` 의 꼴 — 열쇠의 구분자(`|`)와 규칙판 꼬리(`|r1|s…`)를 흉내 낼 수 없게 좁힌다. */
export const JUDGE_FAMILY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function judgeKeyOf(d: {
  grade: string;
  unitSection: string;
  familyId: string;
}): string {
  return `${d.grade}|${d.unitSection}|${d.familyId}`;
}

export function judgeFamilyKey(judgeKey: string): string {
  return `${JUDGE_FAMILY_PREFIX}${judgeKey}`;
}

export type JudgeExternalParts = {
  judgeKey: string;
  ruleVersion: number;
  seed: number;
  variant: number;
  questionType: string;
};

export function judgeExternalId(p: JudgeExternalParts): string {
  return `${JUDGE_EXTERNAL_PREFIX}${p.judgeKey}|r${p.ruleVersion}|s${p.seed}|v${p.variant}|${p.questionType}`;
}

const EXTERNAL = /^engine-mid-judge:(.+)\|r(\d+)\|s(-?\d+)\|v(\d+)\|([^|]+)$/;

/**
 * 적재 열쇠를 **정확히** 읽는다 — 판정형 열쇠가 아니면 null.
 *
 * 🔴 `includes` 로 대지 않는다. `…|calc-add2` 는 `…|calc-add2x` 의 일부라, 포함으로 물으면 다른 문항류를
 *    넣고도 «나갔다»가 된다(비슷한 키의 «거짓 적재» — `unloadedTypes.test.ts` 가 반례로 잠근다).
 */
export function parseJudgeExternalId(id: string): JudgeExternalParts | null {
  const m = EXTERNAL.exec(id);
  if (!m) return null;
  return {
    judgeKey: m[1]!,
    ruleVersion: Number(m[2]),
    seed: Number(m[3]),
    variant: Number(m[4]),
    questionType: m[5]!,
  };
}
