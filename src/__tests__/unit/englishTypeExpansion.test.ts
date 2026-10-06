/**
 * 오늘의 영어 — 유형 확장 (D-158 · 25 §13). 학교 «총괄 평가» 시험지에서 못 만들던 꼴을 1판 계약에 들인다:
 * 새 유형 여섯(언급 없음 · 해석 · 영영풀이 · 공통 빈칸 · 문장 전환 · 단어 배열) · «언급 없음»의 보기 넷 · 짧은 원문.
 * 표본 지문은 우리가 지은 짧은 글이다(교재·출판사 지문 아님).
 */
import { describe, expect, it } from "vitest";

import {
  ENGLISH_FOUR_CHOICE_TYPES,
  ENGLISH_GENERATED_TYPES,
  ENGLISH_OPEN_TYPES,
  ENGLISH_QUESTION_TYPES,
  ENGLISH_SOURCE_PASSAGE_MIN,
  ENGLISH_WORDS_MIN,
  englishExamUpdateSchema,
  englishGenerateRequestSchema,
  englishSetMetaSchema,
  type EnglishDraft,
  type EnglishQuestion,
} from "@/contracts/english.contract";
import {
  ENGLISH_EXAM_PROMPT_VERSION,
  ENGLISH_TYPE_GUIDE,
  buildEnglishSystemPrompt,
} from "@/lib/ai/prompts/englishExam";
import { planEnglishBundles } from "@/lib/english/bundle";
import { VARIANT_TYPES, findVariantLeaks } from "@/lib/english/leak";
import { validateEnglishDraft } from "@/lib/english/validate";

const NEW_TYPES = [
  "언급 없음",
  "해석",
  "영영풀이",
  "공통 빈칸",
  "문장 전환",
  "단어 배열",
] as const;
const NEW_OPEN_TYPES = [
  "해석",
  "영영풀이",
  "공통 빈칸",
  "문장 전환",
  "단어 배열",
] as const;

const passage =
  "Students worked together to build a small garden behind their school. They learned that cooperation makes difficult tasks easier. Now the garden is a quiet place where everyone can rest.";
const second = "They learned that cooperation makes difficult tasks easier.";

const notMentioned: EnglishQuestion = {
  type: "언급 없음",
  prompt: "윗글을 읽고 알 수 없는 것은?",
  options: [
    "학생들이 만든 것",
    "학생들이 배운 점",
    "정원을 만드는 데 걸린 기간",
    "정원의 지금 쓰임",
  ],
  answer: "3",
  explanation: "기간은 글에 없습니다. ① 정원 ② 협력의 힘 ④ 쉬는 곳은 나옵니다.",
  evidence: "Now the garden is a quiet place where everyone can rest.",
};
const translate: EnglishQuestion = {
  type: "해석",
  prompt: `다음 문장을 우리말로 해석하시오.\n${second}`,
  options: [],
  answer: "그들은 협력이 어려운 일을 더 쉽게 만든다는 것을 배웠다.",
  explanation: "learned that ~: ~라는 것을 배웠다 · make A B: A를 B하게 만들다",
  evidence: second,
};
const definition: EnglishQuestion = {
  type: "영영풀이",
  prompt:
    "다음 영영풀이에 해당하는 단어를 윗글에서 찾아 쓰시오.\nthe act of working together to do something",
  options: [],
  answer: "cooperation",
  explanation: "함께 일하는 것 — cooperation(협력)",
  evidence: second,
};
const common: EnglishQuestion = {
  type: "공통 빈칸",
  prompt:
    "빈칸에 공통으로 들어갈 말을 쓰시오.\n① They learned ________ cooperation makes difficult tasks easier.\n② It is true ________ the garden is a quiet place.\n③ The garden ________ the students built is behind their school.",
  options: [],
  answer: "that",
  explanation: "①② 명사절 접속사 ③ 관계대명사",
  evidence: second,
};
const transform: EnglishQuestion = {
  type: "문장 전환",
  prompt: `두 문장의 뜻이 같도록 빈칸을 완성하시오.\n${second}\n= They learned that difficult tasks ________ by cooperation.`,
  options: [],
  answer: "They learned that difficult tasks are made easier by cooperation.",
  explanation: "능동태 → 수동태",
  evidence: second,
};
const arrange: EnglishQuestion = {
  type: "단어 배열",
  prompt:
    "우리말과 일치하도록 주어진 말을 배열하시오.\n그들은 협력이 어려운 일을 더 쉽게 만든다는 것을 배웠다.\n( makes / they learned that / easier / cooperation / difficult tasks )",
  options: [],
  answer: second,
  explanation: "learned that + 주어 + 동사",
  evidence: second,
};
const blank: EnglishQuestion = {
  type: "빈칸 추론",
  prompt:
    "다음 빈칸에 들어갈 말로 가장 적절한 것은?\nStudents worked together to build a small garden behind their school. They learned that cooperation makes difficult tasks easier. Now the garden is ________ where everyone can rest.",
  options: [
    "a calm spot",
    "a busy market",
    "a noisy hall",
    "a closed room",
    "a long road",
  ],
  answer: "1",
  explanation: "쉬는 곳이라는 내용과 맞는 것은 ①입니다.",
  evidence: "Now the garden is a quiet place where everyone can rest.",
};

const draftOf = (...questions: EnglishQuestion[]): EnglishDraft => ({
  title: "유형 확장",
  source: "chatgpt",
  passage,
  questions,
});
const messagesOf = (value: unknown) => {
  const verdict = validateEnglishDraft(value);
  return verdict.ok ? "" : verdict.issues.map((i) => i.message).join(" ");
};

describe("계약 — 새 유형 여섯과 낮춘 하한 (D-158)", () => {
  it("새 유형은 유형 목록과 생성 목록에 있고, 원문 복원은 여전히 생성 목록에 없다", () => {
    for (const type of NEW_TYPES) {
      expect(ENGLISH_QUESTION_TYPES).toContain(type);
      expect(ENGLISH_GENERATED_TYPES).toContain(type);
    }
    expect(ENGLISH_GENERATED_TYPES).not.toContain("원문 복원");
    // 앞선 일곱 유형의 차례는 그대로다 — 저장된 출제 설정 · 만들기 화면의 체크박스 순서
    expect(ENGLISH_QUESTION_TYPES.slice(0, 7)).toEqual([
      "주제",
      "내용 일치",
      "어법",
      "빈칸 추론",
      "문장 삽입",
      "서술형",
      "어휘",
    ]);
  });

  it("보기 없는 유형은 다섯이 늘고, 보기 넷을 받는 객관식은 «언급 없음» 하나다", () => {
    for (const type of NEW_OPEN_TYPES)
      expect(ENGLISH_OPEN_TYPES).toContain(type);
    expect(ENGLISH_OPEN_TYPES).not.toContain("언급 없음");
    expect(ENGLISH_FOUR_CHOICE_TYPES).toEqual(["언급 없음"]);
  });

  it("출제 설정과 생성 요청이 새 유형을 받는다", () => {
    expect(
      englishExamUpdateSchema.safeParse({ types: [...NEW_TYPES] }).success,
    ).toBe(true);
    expect(
      englishGenerateRequestSchema.safeParse({
        examId: "11111111-1111-4111-8111-111111111111",
        mode: "original",
        passage,
        difficulty: "표준",
        count: 6,
        words: 100,
        types: [...NEW_TYPES],
      }).success,
    ).toBe(true);
  });

  it("짧은 실용문도 원문으로 받는다 — 20자 이상 · 지문 길이 30단어 이상", () => {
    expect(ENGLISH_SOURCE_PASSAGE_MIN).toBe(20);
    expect(ENGLISH_WORDS_MIN).toBe(30);
    const request = (patch: Record<string, unknown>) =>
      englishGenerateRequestSchema.safeParse({
        examId: "11111111-1111-4111-8111-111111111111",
        mode: "original",
        passage: "We apologize for any inconvenience.",
        difficulty: "기본",
        count: 3,
        words: 30,
        types: ["해석"],
        ...patch,
      });
    expect(request({}).success).toBe(true);
    const short = request({ passage: "Keep this clear." });
    expect(short.success).toBe(false);
    if (!short.success)
      expect(short.error.issues.map((i) => i.message).join(" ")).toContain(
        "20자 이상",
      );
    expect(request({ words: 29 }).success).toBe(false);
    expect(
      englishSetMetaSchema.safeParse({ path: "api", words: 30 }).success,
    ).toBe(true);
  });
});

describe("검증기 — «언급 없음»의 보기 넷", () => {
  it("보기 넷 · 다섯은 통과하고, 정답 번호는 보기 수 안이어야 한다", () => {
    expect(validateEnglishDraft(draftOf(notMentioned)).ok).toBe(true);
    expect(
      validateEnglishDraft(
        draftOf({
          ...notMentioned,
          options: [...notMentioned.options, "정원을 만든 사람들"],
        }),
      ).ok,
    ).toBe(true);
    expect(messagesOf(draftOf({ ...notMentioned, answer: "5" }))).toContain(
      "1~4",
    );
    expect(
      messagesOf(
        draftOf({ ...notMentioned, options: notMentioned.options.slice(0, 3) }),
      ),
    ).toContain("4개 또는 5개");
  });

  it("다른 객관식은 여전히 보기 다섯이다", () => {
    expect(
      messagesOf(draftOf({ ...blank, options: blank.options.slice(0, 4) })),
    ).toContain("보기는 5개여야 합니다 (지금 4개).");
    expect(messagesOf(draftOf({ ...blank, answer: "6" }))).toContain(
      "정답은 보기 번호 1~5 여야 합니다.",
    );
  });
});

describe("검증기 — 보기 없는 새 유형", () => {
  it("다섯 유형 모두 통과한다", () => {
    const verdict = validateEnglishDraft(
      draftOf(translate, definition, common, transform, arrange),
    );
    expect(verdict).toEqual({
      ok: true,
      draft: draftOf(translate, definition, common, transform, arrange),
    });
  });

  it.each([translate, definition, common, transform, arrange])(
    "$type 문항에 보기가 있으면 막는다",
    (question) => {
      expect(
        messagesOf(
          draftOf({ ...question, options: ["a", "b", "c", "d", "e"] }),
        ),
      ).toContain(`${question.type} 문항에는 보기가 없어야 합니다.`);
    },
  );

  it("공통 빈칸은 빈칸 든 문장이 둘 이상이어야 한다", () => {
    expect(
      messagesOf(
        draftOf({
          ...common,
          prompt:
            "빈칸에 공통으로 들어갈 말을 쓰시오.\n① They learned ________ cooperation makes difficult tasks easier.",
        }),
      ),
    ).toContain("공통 빈칸");
  });

  it("단어 배열은 배열할 말이 « / »로 나뉘어 있어야 한다", () => {
    expect(
      messagesOf(
        draftOf({
          ...arrange,
          prompt: "우리말과 일치하도록 문장을 쓰시오.\n그들은 배웠다.",
        }),
      ),
    ).toContain("단어 배열");
  });
});

describe("프롬프트 v7 — 새 유형 안내 줄", () => {
  it("판 번호가 오르고, 새 유형마다 «유형 — » 으로 시작하는 안내 줄이 시스템 프롬프트에 실린다", () => {
    expect(ENGLISH_EXAM_PROMPT_VERSION).toBe("v7");
    const system = buildEnglishSystemPrompt();
    for (const type of NEW_TYPES) {
      expect(ENGLISH_TYPE_GUIDE[type].startsWith(`${type} — `)).toBe(true);
      expect(system).toContain(`- ${ENGLISH_TYPE_GUIDE[type]}`);
    }
  });

  it("보기 없는 유형의 안내는 빈 보기 배열을, «언급 없음»은 보기 넷을 말한다", () => {
    for (const type of NEW_OPEN_TYPES)
      expect(ENGLISH_TYPE_GUIDE[type]).toContain("options 는 빈 배열");
    expect(ENGLISH_TYPE_GUIDE["언급 없음"]).toContain("보기는 4개");
    expect(ENGLISH_TYPE_GUIDE["언급 없음"]).toContain('"1"~"4"');
  });
});

describe("누출 · 묶음 — 답이 원 지문에 그대로 있는 새 유형은 변형이다", () => {
  it("공통 빈칸 · 단어 배열만 변형 목록에 든다", () => {
    expect(VARIANT_TYPES).toContain("공통 빈칸");
    expect(VARIANT_TYPES).toContain("단어 배열");
    for (const type of ["언급 없음", "해석", "영영풀이", "문장 전환"] as const)
      expect(VARIANT_TYPES).not.toContain(type);
  });

  it("단어 배열의 답 문장이 다른 변형 문항의 지문에 그대로 있으면 누출로 잰다", () => {
    const leaks = findVariantLeaks(draftOf(arrange, blank));
    expect(leaks).toContainEqual(
      expect.objectContaining({ source: 0, target: 1, kind: "단어 배열" }),
    );
    // 근거 구절은 원 지문에서 그대로 옮긴 것이고 답 문장을 담는다
    const leak = leaks.find((item) => item.source === 0)!;
    expect(passage).toContain(leak.snippet);
    expect(leak.snippet).toContain(second);
  });

  it("변형은 원 지문 상자 없이 앞 묶음에, 해석 · 언급 없음은 원 지문과 함께 맨 뒤에 찍는다", () => {
    const plan = planEnglishBundles(
      draftOf(arrange, blank, translate, notMentioned),
    );
    expect(plan.bundles).toEqual([
      { no: 1, kind: "변형", questions: [0], passage: false },
      { no: 2, kind: "변형", questions: [1], passage: false },
      { no: 3, kind: "독해", questions: [2, 3], passage: true },
    ]);
    const alone = planEnglishBundles(draftOf(common, definition));
    expect(alone.bundles).toEqual([
      { no: 1, kind: "변형", questions: [0], passage: false },
      { no: 2, kind: "독해", questions: [1], passage: true },
    ]);
  });
});
