/**
 * 오늘의 영어 모델 벤치 — 프롬프트 «근거 인용 조이기» 시험판. 제품 v2 를 그대로 쓰고 **근거(evidence) 규칙만** 단계별로 세게 바꾼다.
 *
 *   npx tsx scripts/qa/english-bench/generate.ts --prompt v2s|v2s2|v2s3|v2s4|v2s5 …   ·   refine.ts --prompt …
 *
 * 원장님 2026-09-30 «루나의 그 버릇을 강력하게 조였을 때 해결 가능한지» · «계속 강력하게 쪼여서 통과율 높여 봐».
 * gpt-6-luna 는 원문 변형 과제에서 v2 그대로 8회 중 4회 **서술형 근거**로 거절됐다 — 요약형이라 근거를 3~4문장씩 길게 옮기다가
 * 사이 문장을 건너뛰거나 제 지문 문장을 바꿔 썼다.
 *   v2s  1단계 — 연속 구간 하나(한두 문장) · 이어 붙이기/줄이기/바꿔 쓰기 금지 · 어기면 세트가 버려진다
 *   v2s2 2단계 — **딱 한 문장**을 통째로 · «프로그램이 글자 그대로 검색한다» · 틀린 예 · passage 를 고쳤으면 다시 복사
 *   v2s3 3단계 — 2단계 + 문항마다 **근거를 맨 먼저**(답 형식에서 evidence 가 첫 칸)
 *   v2s4 4단계 — 3단계 + **대명사를 풀어 쓰지 않는다**(1단계 1회차: 지문 «It seems to…» 를 «Sleep seems to…» 로 옮겨 거절)
 *   v2s5 5단계 — 2단계의 이유 · 틀린 예 · 다시 복사는 두고 근거는 **이어진 한두 문장**까지(요약형 서술형에 한 문장만 강요하지 않는다)
 * 3·4단계(근거를 첫 칸으로)는 luna 가 문항 사이 `},{` 를 빼먹어 여섯 문항을 한 객체에 이어 쓴 일이 있다(원문 과제 1회).
 */
// 기준은 얼린 v2(promptV2.ts) — 제품이 v3 로 올라가도 단계별 시험판의 뜻이 바뀌지 않게
import * as v2 from "./promptV2";
import type { EnglishGrade } from "@/contracts/english.contract";

export type StrictVersion = "v2s" | "v2s2" | "v2s3" | "v2s4" | "v2s5";

export function isStrictVersion(
  value: string | undefined,
): value is StrictVersion {
  return value !== undefined && value in SPEC;
}

const V2_EVIDENCE_RULE = v2.ENGLISH_EXAM_RULES[2]!;
const V2_SELF_CHECK = v2.ENGLISH_EXAM_RULES[v2.ENGLISH_EXAM_RULES.length - 1]!;
const V2_FORMAT = `객체 모양: ${v2.ENGLISH_ANSWER_FORMAT_EXAMPLE}`;

const RULE_1 =
  "evidence 는 passage 의 **한 자리**를 복사해 붙인 연속 구간 하나입니다(한두 문장). 떨어진 문장을 이어 붙이거나, 줄이거나, 바꿔 쓰거나, 요약하지 않습니다 — 서술형 · 요약형도 똑같습니다. 근거가 여러 곳에 흩어져 있으면 가장 핵심인 한 구간만 고릅니다. 대소문자 · 문장부호까지 한 글자도 바꾸지 않고, 문제용으로 바꾼 지문이나 주어진 원문(<passage-data>)이 아니라 이 답의 passage 에서 가져옵니다. 이 규칙을 어기면 세트 전체가 자동으로 버려집니다.";
const RULE_2 =
  "evidence 는 passage 에 있는 **딱 한 문장**을 첫 글자부터 끝 문장부호까지 통째로 복사한 것입니다. 프로그램이 passage 안에서 evidence 를 글자 그대로 문자열 검색해, 한 글자라도 다르면 세트 전체를 자동으로 버립니다. 주제 · 서술형 · 요약형도 한 문장만 씁니다 — 근거가 글 전체에 퍼져 있으면 가장 핵심인 한 문장(주제문 · 결론문)만 고릅니다. 틀린 예: 두 문장 이상 옮기기 · 사이 문장을 건너뛰고 붙이기 · 두 문장을 한 문장으로 합치기 · 낱말 하나라도 바꾸기 · «...» 로 줄이기. 문제용으로 바꾼 지문이나 주어진 원문(<passage-data>)이 아니라 이 답의 passage 에서 가져옵니다.";
/** 4단계에 더하는 문장 — 인용이 혼자 읽히게 하려고 대명사를 앞 명사로 바꾸는 버릇 */
const PRONOUN_RULE =
  " 대명사(It · They · This · That · These · Such …)를 앞 문장의 명사로 풀어 쓰지 않습니다 — 인용이 혼자 읽히지 않아도 passage 글자 그대로가 맞습니다.";
const RULE_5 =
  "evidence 는 passage 에서 **이어진 한두 문장**을 첫 글자부터 끝 문장부호까지 통째로 복사한 것(연속 인용)입니다. 프로그램이 passage 안에서 evidence 를 글자 그대로 문자열 검색해, 한 글자라도 다르면 세트 전체를 자동으로 버립니다. 근거가 여러 곳에 흩어져 있으면 가장 핵심인 한 자리만 고릅니다(서술형 · 요약형도 같습니다). 틀린 예: 떨어진 문장을 이어 붙이기 · 사이 문장을 건너뛰기 · 두 문장을 한 문장으로 합치기 · 낱말이나 대명사 하나라도 바꾸기 · «...» 로 줄이기. 문제용으로 바꾼 지문이나 주어진 원문(<passage-data>)이 아니라 이 답의 passage 에서 가져옵니다.";

const CHECK_1 =
  " 특히 evidence 는 하나씩 passage 에서 글자 그대로 한 번에 찾아지는지 대 보고, 안 찾아지면 passage 에서 한두 문장을 다시 복사해 바꿉니다.";
const CHECK_2 =
  " 특히 답을 내기 직전 evidence 마다 passage 에서 그 문장을 찾아 한 글자씩 대 봅니다. 문항을 만들다 passage 를 고쳤다면 evidence 를 모두 새 passage 에서 다시 복사합니다.";

const TAIL_1 =
  "근거(evidence)는 passage 를 다 쓴 뒤 그 passage 에서 한 구간씩 복사합니다(원문 변형이면 주어진 원문이 아니라 바꿔 쓴 passage 에서).";
const TAIL_2 =
  "근거(evidence)는 passage 를 확정한 뒤 그 passage 에서 문항마다 한 문장씩 통째로 복사합니다(원문 변형이면 주어진 원문이 아니라 바꿔 쓴 passage 에서). 여러 문장을 이어 인용하지 않습니다.";
const TAIL_3 =
  "문항마다 evidence 를 맨 먼저 씁니다 — passage 를 확정한 뒤 근거가 될 한 문장을 골라 통째로 복사해 두고, 그 문장을 바탕으로 발문 · 보기 · 정답 · 해설을 씁니다(원문 변형이면 주어진 원문이 아니라 바꿔 쓴 passage 에서). 여러 문장을 이어 인용하지 않습니다.";
const TAIL_5 =
  "근거(evidence)는 passage 를 확정한 뒤 그 passage 에서 문항마다 이어진 한두 문장을 통째로 복사합니다(원문 변형이면 주어진 원문이 아니라 바꿔 쓴 passage 에서). 떨어진 문장을 이어 붙이지 않습니다.";

/** 3·4단계 답 형식 — 열쇠는 같고 evidence 만 문항의 첫 칸으로(읽는 쪽은 열쇠 순서를 안 본다) */
const EVIDENCE_FIRST_FORMAT =
  '객체 모양: {"title":"세트 이름","passage":"지문 전문","questions":[{"type":"주제","evidence":"passage 에서 통째로 복사한 한 문장","prompt":"발문","options":["보기 1","보기 2","보기 3","보기 4","보기 5"],"answer":"1","explanation":"해설 또는 채점 기준"}]}';

interface LevelSpec {
  rule: string;
  check: string;
  tail: string;
  evidenceFirst: boolean;
}

const SPEC: Record<StrictVersion, LevelSpec> = {
  v2s: { rule: RULE_1, check: CHECK_1, tail: TAIL_1, evidenceFirst: false },
  v2s2: { rule: RULE_2, check: CHECK_2, tail: TAIL_2, evidenceFirst: false },
  v2s3: { rule: RULE_2, check: CHECK_2, tail: TAIL_3, evidenceFirst: true },
  v2s4: {
    rule: `${RULE_2}${PRONOUN_RULE}`,
    check: CHECK_2,
    tail: TAIL_3,
    evidenceFirst: true,
  },
  v2s5: { rule: RULE_5, check: CHECK_2, tail: TAIL_5, evidenceFirst: false },
};

export interface StrictPrompt {
  ENGLISH_EXAM_PROMPT_VERSION: StrictVersion;
  buildEnglishSystemPrompt(): string;
  buildEnglishUserPrompt(
    input: v2.EnglishPromptInput,
    grade: EnglishGrade,
  ): string;
  buildEnglishRefinePrompt(
    input: v2.EnglishPromptInput,
    grade: EnglishGrade,
    previous: string,
    issues: readonly string[],
  ): string;
}

export function strictPrompt(version: StrictVersion): StrictPrompt {
  const spec = SPEC[version];
  function buildEnglishSystemPrompt(): string {
    const text = v2.buildEnglishSystemPrompt();
    if (
      !text.includes(V2_EVIDENCE_RULE) ||
      !text.includes(V2_SELF_CHECK) ||
      !text.includes(V2_FORMAT)
    )
      throw new Error(
        "v2 규칙 문장이 바뀌었다 — promptStrict.ts 를 다시 맞출 것",
      );
    const out = text
      .replace(V2_EVIDENCE_RULE, spec.rule)
      .replace(V2_SELF_CHECK, `${V2_SELF_CHECK}${spec.check}`);
    return spec.evidenceFirst
      ? out.replace(V2_FORMAT, EVIDENCE_FIRST_FORMAT)
      : out;
  }
  function buildEnglishUserPrompt(
    input: v2.EnglishPromptInput,
    grade: EnglishGrade,
  ): string {
    const text = v2.buildEnglishUserPrompt(input, grade);
    const last = "JSON 객체 하나로만 답하십시오.";
    return text.replace(last, `- ${spec.tail}\n${last}`);
  }
  return {
    ENGLISH_EXAM_PROMPT_VERSION: version,
    buildEnglishSystemPrompt,
    buildEnglishUserPrompt,
    buildEnglishRefinePrompt(input, grade, previous, issues) {
      return v2
        .buildEnglishRefinePrompt(input, grade, previous, issues)
        .replace(
          v2.buildEnglishUserPrompt(input, grade),
          buildEnglishUserPrompt(input, grade),
        );
    },
  };
}
