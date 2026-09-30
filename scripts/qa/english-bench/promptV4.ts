/**
 * 오늘의 영어 모델 벤치 — 프롬프트 v4 시험판 둘(주제 · 내용 일치의 «수렴 단서» 없애기, D-151 · 25 §12.8 · §12.9).
 *
 *   npx tsx scripts/qa/english-bench/generate.ts --taskset v4 --prompt v3|v4a|v4b …
 *
 * 채점관 AI 셋이 주제 · 내용 일치 116문항을 **지문 없이 100%** 맞혔다(v1 · v2). 3자 협의(리드 · codex · grok)의 합의:
 * 문장을 덧붙이지 않고 **주제 오답 레시피를 갈아 끼운다**. 둘이 갈린 곳은 두 판을 만들어 재서 정한다.
 *   v4a 엄격판(grok) — 극단어 · 한정어를 다섯 보기 어디에도 쓰지 않고 «좁음/넓음/정면 반대» 범주 지시를 뺀다
 *   v4b 완화판(codex) — 낱말 · 범주를 금지하지 않고 «특정 낱말이나 범위 오류가 오답에만 되풀이되지 않게»만 요구한다
 * 내용 일치는 두 판이 같다: 다섯 보기는 비슷한 범위 · 구체성의 명제 · 정답을 요지 문장으로 쓰지 않는다 · 틀린 보기는
 * 지문이 이미 말한 요소 하나만 바꾼다(지문이 수치 · 순서 · 인과를 주지 않으면 그 요소로 오답을 만들지 않는다).
 * 기준은 얼린 v3(`promptV3.ts`). 제품 파일은 여기서 고치지 않는다 — 채택 규칙은 `analyze-v4.ts` 가 든다.
 */
import * as v3 from "./promptV3";
import type { EnglishGrade } from "@/contracts/english.contract";

export type V4Version = "v4a" | "v4b";

export function isV4Version(value: string | undefined): value is V4Version {
  return value === "v4a" || value === "v4b";
}

const TOPIC_COMMON =
  "주제 — 글의 주제를 묻습니다. 보기 5개는 모두 같은 꼴의 영어 명사구로, 길이 · 추상도 · 범위 · 구체성을 맞춥니다. 다섯 모두 이 소재로 쓴 글의 주제로 그럴듯해야 하고, 서로 다른 것은 핵심 관계나 주장뿐입니다 — 지문을 읽어야만 하나로 좁혀지게 합니다. 정답만 균형 잡힌 문장으로 남지 않게 합니다.";
const TOPIC_TAIL = " 정답은 지문 문장을 그대로 옮기지 않고 바꿔 씁니다";

export const V4_TOPIC_GUIDE: Record<V4Version, string> = {
  v4a: `${TOPIC_COMMON} 극단어 · 한정어(only · always · never · all · sole · chief · entirely · replace 같은 말)는 다섯 보기 어디에도 쓰지 않습니다.${TOPIC_TAIL}`,
  v4b: `${TOPIC_COMMON} 특정 낱말(극단어 · 한정어)이나 범위 오류(너무 좁음 · 너무 넓음)가 오답에만 되풀이되어 단서가 되지 않게 합니다 — 쓰려면 정답과 오답에 고르게 씁니다.${TOPIC_TAIL}`,
};

export const V4_MATCH_GUIDE =
  "내용 일치 — 발문에 «일치하는» 또는 «일치하지 않는»을 밝힙니다. 보기 5개는 한국어 문장이고 지문 순서를 따릅니다. 다섯 보기는 지문의 한 문장 또는 여러 문장에서 확인되는, 비슷한 범위와 구체성의 명제입니다 — 정답 보기를 글 전체의 요지 문장으로 쓰지 않습니다. 틀린 보기는 지문이 이미 말한 요소 하나(주체 · 조건 · 인과 방향 · 순서 · 수량)만 바꾸고, 상식만으로는 가려지지 않게 합니다. 지문이 수치 · 순서 · 인과를 주지 않으면 그 요소로 오답을 만들지 않습니다. 지문에 없는 내용이나 문장 전체의 정면 부정으로 만들지 않습니다. 맞는 보기는 직역하지 않고 바꿔 씁니다. «모든·항상·절대» 같은 절대어를 단서로 쓰지 않습니다";

export interface V4Prompt {
  ENGLISH_EXAM_PROMPT_VERSION: V4Version;
  buildEnglishSystemPrompt(): string;
  buildEnglishUserPrompt(
    input: v3.EnglishPromptInput,
    grade: EnglishGrade,
  ): string;
}

export function v4Prompt(version: V4Version): V4Prompt {
  return {
    ENGLISH_EXAM_PROMPT_VERSION: version,
    buildEnglishSystemPrompt() {
      const text = v3.buildEnglishSystemPrompt();
      const topic = `- ${v3.ENGLISH_TYPE_GUIDE.주제}`;
      const match = `- ${v3.ENGLISH_TYPE_GUIDE["내용 일치"]}`;
      if (!text.includes(topic) || !text.includes(match))
        throw new Error(
          "v3 유형 안내 문장이 바뀌었다 — promptV4.ts 를 다시 맞출 것",
        );
      return text
        .replace(topic, `- ${V4_TOPIC_GUIDE[version]}`)
        .replace(match, `- ${V4_MATCH_GUIDE}`);
    },
    // 요청문에는 유형 안내가 없다 — v3 그대로
    buildEnglishUserPrompt: v3.buildEnglishUserPrompt,
  };
}
