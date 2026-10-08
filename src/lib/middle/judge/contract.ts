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

/** 참거짓 문형의 물음 — 보기 가운데 «옳지 않은 것» 하나, 또는 «옳은 것» 하나를 고른다. */
export type TruthAsk = "옳지 않은 것" | "옳은 것";

/**
 * 비교 문형의 물음 (2026-10-08 엔진 보강 2단계 — 합의안 §3-2 · §5 의 2단계).
 *
 *   «나머지 넷과 다른 하나»  보기 다섯은 **식**이고, 값의 묶음이 정확히 **4+1** 이다. 정답은 혼자인 하나.
 *   «가장 큰 것» · «가장 작은 것»  다섯 값이 **서로 다르다**. 정답은 가장 큰(작은) 하나.
 *
 * 🔴 «값이 같은 보기 금지»는 참거짓 문형의 규칙이지 4+1 의 규칙이 아니다 — 4+1 은 같은 값 넷이 정답 구조다.
 *    그래서 **식의 중복 · 값의 중복 · 정답의 유일성**을 문형별로 따로 본다(`registry.ts` 의 `assembleCompare`).
 */
export type CompareAsk =
  "나머지 넷과 다른 하나" | "가장 큰 것" | "가장 작은 것";

/** 판정형의 물음 전부. */
export type JudgeAsk = TruthAsk | CompareAsk;

/**
 * 다시 재는 함수가 받는 **지면의 문맥** — 보기 글만으로는 못 재는 문형이 있다.
 * «$x=-3$일 때, 다음 중 식의 값이 옳지 않은 것은?» 의 대입값은 보기가 아니라 **발문 줄**에 있다.
 * 등록부가 지면 본문에서 그 줄을 다시 읽어 넘긴다(생성기의 수를 넘기지 않는다).
 */
export type JudgeReadContext = {
  /** 지면에 찍힌 발문 줄(본문의 첫 줄) */
  lead: string;
};

/** 다시 잰 값 — 약분하지 않은 분수(분모 ≠ 0). 같은가 · 큰가는 교차곱으로 본다. */
export type JudgeValue = { n: bigint; d: bigint };

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
  /** 판단 근거를 짧게 — 해설 첫 줄에 보기 다섯이 나란히 선다(계산 판정이면 왼쪽을 계산한 값). */
  brief: string;
  /** 이 보기가 «다른 하나»(정답)일 때의 풀이 — 과정 전체와 «옳다/옳지 않다». */
  detail: string;
  /** 거짓 보기의 «어디가 틀렸나» — 참인 보기는 null. */
  why: string | null;
};

/**
 * 생성기 한 번의 산출 — 보기의 **차례는 아직 정하지 않는다**(등록부가 섞는다).
 *
 * 해설은 등록부가 넉 줄로 짠다(`registry.ts` 의 `assembleJudge`) — 보기마다 한 줄씩 다섯 줄을 쓰면 정답지
 * 한 쪽(8문항 · 2단)에 다 안 들어가 해설이 **통째로 사라진다**(2026-10-08 표본 실측 · `assessAnswerKeyRisk`).
 *   ⑴ `briefLead` + 보기 다섯의 `brief`   ⑵ 정답 보기의 `detail`
 *   ⑶ 정답이 아닌 거짓 보기의 `why`(없으면 «나머지는 모두 옳다»)   ⑷ «따라서 … ③이다»
 */
export type JudgeBody = {
  /** 발문 — `…것은?` 으로 끝난다(해설의 마지막 줄 «따라서 … 것은 ③이다»를 여기서 만든다). */
  lead: string;
  /** 해설 첫 줄의 머리 — «보기의 왼쪽을 계산하면» */
  briefLead: string;
  options: readonly JudgeOption[];
  /** 생성기가 쓴 원 수치 — 시험이 검산에 쓴다. DB 적재 대상이 아니다. */
  facts: Record<string, number>;
};

/**
 * 비교 문형의 보기 하나 — 글은 **식**이고(등호 · 값 없음), 생성기는 그 식의 값을 **주장**한다.
 * 등록부가 지면 글을 `valueOf` 로 다시 재서 주장과 견준다.
 */
export type CompareOption = {
  /** 지면에 나갈 보기 글(번호 뗀 것) — `$식$` */
  text: string;
  /** 생성기의 주장 — 이 식의 값 */
  claimed: JudgeValue;
  /** 해설 첫 줄에 서는 값 — `$-\dfrac{3}{4}$`. 등록부가 이것도 다시 재서 보기의 값과 같은지 본다. */
  brief: string;
  /** 이 보기가 정답일 때 둘째 줄에 서는 계산 과정 — «통분하면 $…$»(문장 끝 없이). */
  work: string;
};

/**
 * 비교 문형의 생성기 산출 — 차례는 등록부가 섞는다. 해설도 등록부가 넉 줄로 짠다:
 *   ⑴ `briefLead` + 보기 다섯의 값   ⑵ 정답 보기의 계산 과정
 *   ⑶ 4+1 이면 «나머지 넷은 모두 …» · 극값이면 «크기를 비교하면 a<b<c<d<e»   ⑷ «따라서 … ③이다»
 */
export type CompareBody = {
  /** 발문 — 4+1 은 `…하나는?`, 극값은 `…것은?` 으로 끝난다 */
  lead: string;
  briefLead: string;
  options: readonly CompareOption[];
  facts: Record<string, number>;
};

/** 문형과 상관없이 같은 등록 칸. */
type JudgeDefinitionBase = {
  grade: string;
  /** 우리 `Unit.section` 정확한 이름 — 적재 시 단원 매칭 키 */
  unitSection: string;
  /** 차시 안에서 이 문항류를 가르는 이름 — `[a-z0-9-]` */
  familyId: string;
  title: string;
  /**
   * **허용 원천** — 보기 다섯의 재료가 되는 RPM 유형 키. 보기 다섯은 **같은 유형 · 같은 꼴**에서 온다
   * (합의안 §2 Q2 — 섞기는 차시별 허용 목록을 시험이 지킬 때만).
   *
   * 참거짓 문형의 계산 판정은 원천 유형 생성기를 **그대로 불러** 재료를 얻는다. 목표값에 맞춰 식을
   * **역산**해야 하는 문형(4+1 · 대입값을 함께 쓰는 식의 값)은 원천 생성기를 부를 수 없다 — 그때 원천은
   * «그 식의 **꼴**이 어느 유형의 것인가»이고, 꼴이 그 유형의 것인지는 시험이 잰다.
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
};

/** 참거짓 문형 하나의 등록 — 차시(`grade + unitSection`) 안의 문항류 하나. */
export type JudgeDefinition = JudgeDefinitionBase & {
  /** 문형 — 안 적으면 참거짓(1단계 등록이 그대로 읽히게) */
  form?: "truth";
  /** 이 문항류가 내는 물음 — 변형 번호 차례로 돌아가며 낸다 */
  asks: readonly [TruthAsk, ...TruthAsk[]];
  generate: (rng: Rng, ask: TruthAsk) => JudgeBody;
  /**
   * 🔴 **지면에 찍힌 보기 글을 다시 재는 함수** — 참이면 true, 거짓이면 false, 못 읽으면 null.
   * 생성기의 셈을 다시 부르지 않는다(동어반복). 글을 읽어 따로 센다.
   */
  truthOf: (choiceText: string, ctx: JudgeReadContext) => boolean | null;
};

/** 비교 문형 하나의 등록. */
export type CompareJudgeDefinition = JudgeDefinitionBase & {
  form: "compare";
  asks: readonly [CompareAsk, ...CompareAsk[]];
  generate: (rng: Rng, ask: CompareAsk) => CompareBody;
  /**
   * 🔴 **지면에 찍힌 보기 식의 값을 다시 재는 함수** — 못 읽으면 null. 생성기의 셈을 다시 부르지 않는다.
   * 해설 첫 줄의 값(`brief`)도 이것으로 읽는다.
   */
  valueOf: (choiceText: string, ctx: JudgeReadContext) => JudgeValue | null;
};

/** 등록부가 받는 등록 — 문형 둘 가운데 하나. */
export type AnyJudgeDefinition = JudgeDefinition | CompareJudgeDefinition;

/** 등록부가 낸 문항 한 건. */
export type JudgeProblem = {
  kind: "judge";
  judgeKey: string;
  familyKey: string;
  grade: string;
  unitSection: string;
  familyId: string;
  ruleVersion: number;
  /** 문형 — 참거짓 · 비교 */
  form: "truth" | "compare";
  ask: JudgeAsk;
  content: string;
  /** 보기 번호 하나 — `③` */
  answer: string;
  solution: string;
  difficulty: Difficulty;
  facts: Record<string, number>;
  /** 지면 차례대로 — `truthOf` 가 **다시 잰** 참거짓(비교 문형은 빈 배열) */
  truths: readonly boolean[];
  /** 지면 차례대로 — `valueOf` 가 **다시 잰** 값의 기약 글 `-3/2`(참거짓 문형은 빈 배열) */
  values: readonly string[];
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
