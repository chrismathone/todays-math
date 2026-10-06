/**
 * 오늘의 영어 유형 확장(D-158)의 적대적 검토에서 나온 구멍 (25 §13.7).
 * 첫 시험 묶음(`englishTypeExpansion.test.ts`)이 초록인 채 살아남던 변이와 실제 결함을 잠근다:
 * 문제용 표지 규칙의 경계 · 공통 빈칸의 헛짚는 누출 근거 · 단어 배열의 놓친 누출.
 * 표본 지문은 우리가 지은 짧은 글이다(교재·출판사 지문 아님).
 */
import { describe, expect, it } from "vitest";

import {
  ENGLISH_GENERATE_COUNT_MAX,
  englishGenerateRequestSchema,
  type EnglishDraft,
  type EnglishQuestion,
} from "@/contracts/english.contract";
import { ENGLISH_TYPE_GUIDE } from "@/lib/ai/prompts/englishExam";
import { planEnglishBundles } from "@/lib/english/bundle";
import { findVariantLeaks } from "@/lib/english/leak";
import {
  englishOptionGap,
  trimTrailingBlankOptions,
} from "@/lib/english/options";
import { validateEnglishDraft } from "@/lib/english/validate";

const first =
  "Students worked together to build a small garden behind their school.";
const second = "They learned that cooperation makes difficult tasks easier.";
const third = "Now the garden is a quiet place where everyone can rest.";
const passage = `${first} ${second} ${third}`;

const draftOf = (...questions: EnglishQuestion[]): EnglishDraft => ({
  title: "유형 확장 — 검토",
  source: "chatgpt",
  passage,
  questions,
});
const messagesOf = (...questions: EnglishQuestion[]) => {
  const verdict = validateEnglishDraft(draftOf(...questions));
  return verdict.ok ? "" : verdict.issues.map((i) => i.message).join(" ");
};

const open = (
  type: EnglishQuestion["type"],
  prompt: string,
  answer: string,
  evidence = second,
): EnglishQuestion => ({
  type,
  prompt,
  options: [],
  answer,
  explanation: "해설",
  evidence,
});
/** 빈칸 추론 — 문제용 지문만 바꿔 끼운다 */
const blankWith = (shown: string): EnglishQuestion => ({
  type: "빈칸 추론",
  prompt: `다음 빈칸에 들어갈 말로 가장 적절한 것은?\n${shown}`,
  options: [
    "a calm spot",
    "a busy market",
    "a noisy hall",
    "a closed room",
    "a long road",
  ],
  answer: "1",
  explanation: "쉬는 곳이라는 내용과 맞는 것은 ①입니다.",
  evidence: third,
});
const blankFull = blankWith(
  `${first} ${second} Now the garden is ________ where everyone can rest.`,
);

const common = open(
  "공통 빈칸",
  "빈칸에 공통으로 들어갈 말을 쓰시오.\n① They learned ________ cooperation makes difficult tasks easier.\n② It is true ________ the garden is a quiet place.\n③ The garden ________ the students built is behind their school.",
  "that",
);
const arrange = open(
  "단어 배열",
  "우리말과 일치하도록 주어진 말을 배열하시오.\n그들은 협력이 어려운 일을 더 쉽게 만든다는 것을 배웠다.\n( makes / they learned that / easier / cooperation / difficult tasks )",
  second,
);

describe("검증기 — 문제용 표지의 경계", () => {
  it("공통 빈칸은 빈칸 둘이면 받고 하나면 막는다", () => {
    const two = open(
      "공통 빈칸",
      "빈칸에 공통으로 들어갈 말을 쓰시오.\n① They learned ________ it works.\n② It is true ________ the garden is quiet.",
      "that",
    );
    expect(messagesOf(two)).toBe("");
    expect(
      messagesOf({
        ...two,
        prompt: two.prompt.split("\n").slice(0, 2).join("\n"),
      }),
    ).toContain("공통 빈칸 문항에는 빈칸(____)이 든 문장을 둘 이상");
  });

  it("단어 배열은 한 괄호 안에 « / »로 나눈 말이 셋 이상이어야 한다", () => {
    const withList = (list: string) =>
      open(
        "단어 배열",
        `우리말과 일치하도록 주어진 말을 배열하시오.\n${list}`,
        second,
      );
    expect(
      messagesOf(
        withList("( they learned that / cooperation / makes tasks easier )"),
      ),
    ).toBe("");
    // 전각 괄호 · 전각 빗금도 같은 표지다
    expect(
      messagesOf(
        withList(
          "（ they learned that ／ cooperation ／ makes tasks easier ）",
        ),
      ),
    ).toBe("");
    expect(
      messagesOf(
        withList("[ they learned that / cooperation / makes tasks easier ]"),
      ),
    ).toBe("");
    // 둘뿐이면 배열이 아니다
    expect(
      messagesOf(
        withList("( they learned that / cooperation makes tasks easier )"),
      ),
    ).toContain("단어 배열 문항에는");
    // 괄호 밖의 빗금 · 날짜 · and/or · 닫는 꺾쇠는 배열할 말이 아니다
    expect(
      messagesOf(
        withList(
          "2026/10 시험 범위입니다. and/or 를 쓰지 마시오. <u>learned</u> <u>that</u>",
        ),
      ),
    ).toContain("단어 배열 문항에는");
  });
});

describe("누출 — 공통 빈칸", () => {
  it("답을 넣은 문장이 다른 변형 문항의 지문에 그대로 있으면 그 문장을 근거로 낸다", () => {
    const leaks = findVariantLeaks(draftOf(common, blankFull));
    expect(leaks.filter((leak) => leak.source === 0)).toEqual([
      { source: 0, target: 1, kind: "공통 빈칸", snippet: second },
    ]);
  });

  it("새로 쓴 문장뿐이면 답의 출처로 재지 않는다 — 원 지문의 엉뚱한 구절을 근거로 내지 않는다", () => {
    const written = open(
      "공통 빈칸",
      "빈칸에 공통으로 들어갈 말을 쓰시오.\n① Many students think ________ reading is boring.\n② I heard ________ the library is closed today.\n③ This is the book ________ changed my mind.",
      "that",
    );
    expect(
      findVariantLeaks(draftOf(written, blankFull)).filter(
        (leak) => leak.source === 0,
      ),
    ).toEqual([]);
  });

  it("빈칸 하나만 빼고 답 문장을 다 보여 주면 단어 배열의 답을 보여 주는 쪽이다 — 묶음이 갈린다", () => {
    const draft = draftOf(common, arrange);
    expect(findVariantLeaks(draft)).toContainEqual(
      expect.objectContaining({ source: 1, target: 0, kind: "단어 배열" }),
    );
    // 답(단어 배열)이 먼저, 그 답을 보여 주는 지문(공통 빈칸)이 뒤 묶음
    expect(planEnglishBundles(draft).bundles).toEqual([
      { no: 1, kind: "변형", questions: [1], passage: false },
      { no: 2, kind: "변형", questions: [0], passage: false },
    ]);
  });
});

describe("누출 — 단어 배열", () => {
  it("답 문장만 그대로 보여도 잡는다 — 바로 뒤 낱말이 달라도", () => {
    const arrangeFirst = open(
      "단어 배열",
      "우리말과 일치하도록 주어진 말을 배열하시오.\n( to build a small garden / Students worked together / behind their school )",
      first,
      first,
    );
    const shown = blankWith(
      `${first} They found that ________ makes difficult tasks easier. ${third}`,
    );
    expect(findVariantLeaks(draftOf(arrangeFirst, shown))).toContainEqual({
      source: 0,
      target: 1,
      kind: "단어 배열",
      snippet: first,
    });
  });

  it("근거가 두 문장이어도 답 문장으로 찾는다", () => {
    const twoEvidence = { ...arrange, evidence: `${first} ${second}` };
    const shown = blankWith(
      `Students met after class to plant a garden. ${second} Now the garden is ________ where everyone can rest.`,
    );
    expect(validateEnglishDraft(draftOf(twoEvidence, shown)).ok).toBe(true);
    expect(findVariantLeaks(draftOf(twoEvidence, shown))).toContainEqual({
      source: 0,
      target: 1,
      kind: "단어 배열",
      snippet: second,
    });
  });
});

describe("보기 칸 — 빈 칸을 걷는 규칙", () => {
  it("끝의 빈 칸만 걷는다 — 가운데 빈 칸은 그대로 두고 «사이가 비었다»고 알린다", () => {
    expect(trimTrailingBlankOptions(["가", "나", "다", "라", ""])).toEqual([
      "가",
      "나",
      "다",
      "라",
    ]);
    expect(trimTrailingBlankOptions(["가", "나", "다", "라", "  "])).toEqual([
      "가",
      "나",
      "다",
      "라",
    ]);
    expect(trimTrailingBlankOptions(["", "나", "다", "라", "마"])).toEqual([
      "",
      "나",
      "다",
      "라",
      "마",
    ]);
    expect(englishOptionGap(["가", "나", "다", "라", ""])).toBe(false);
    expect(englishOptionGap(["", "나", "다", "라", "마"])).toBe(true);
    expect(englishOptionGap(["가", " ", "다", "라"])).toBe(true);
    expect(englishOptionGap([])).toBe(false);
  });
});

describe("생성 요청 — 유형 수와 문항 수의 상한", () => {
  it("한 번에 8문항까지이고, 유형을 아홉 고른 요청은 받지 않는다", () => {
    expect(ENGLISH_GENERATE_COUNT_MAX).toBe(8);
    const request = (types: string[], count: number) =>
      englishGenerateRequestSchema.safeParse({
        examId: "11111111-1111-4111-8111-111111111111",
        mode: "original",
        passage,
        difficulty: "표준",
        count,
        words: 100,
        types,
      });
    const nine = [
      "주제",
      "내용 일치",
      "빈칸 추론",
      "문장 삽입",
      "서술형",
      "언급 없음",
      "해석",
      "영영풀이",
      "공통 빈칸",
    ];
    expect(request(nine.slice(0, 8), 8).success).toBe(true);
    expect(request(nine, 8).success).toBe(false);
    expect(request(nine.slice(0, 8), 9).success).toBe(false);
  });
});

describe("프롬프트 — 공통 빈칸의 근거", () => {
  it("근거는 빈칸 든 문장이 아니라 원 지문의 문장이라고 말한다", () => {
    expect(ENGLISH_TYPE_GUIDE["공통 빈칸"]).toContain("evidence 는");
    expect(ENGLISH_TYPE_GUIDE["공통 빈칸"]).toContain(
      "빈칸이 든 문장이 아니라",
    );
  });
});
