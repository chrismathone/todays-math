/**
 * 오늘의 영어 — ChatGPT 로 제작 (D-148 · 25 §4.1). 키 없는 주 경로.
 *
 *   요청문(`buildChatgptRequest`) — 조건 · 규칙 · 답 형식이 다 들어가는가.
 *   붙여넣기 읽기(`parseChatgptResult`) — 코드펜스 · 앞뒤 잡설 · 후행 쉼표를 지나 검증기까지 가는가.
 *   `parseAiJsonObject` — 배열 함수(`parseAiJsonArray`)와 같은 복구 단계로 **객체 하나**를 읽는가.
 *
 * 표본 지문은 우리가 지은 짧은 글이다(교재·출판사 지문 아님).
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AiParseError } from "@/lib/ai/errors";
import { parseAiJsonObject } from "@/lib/ai/jsonRepair";
import {
  ENGLISH_EXAM_PROMPT_VERSION,
  ENGLISH_EXAM_RULES,
  ENGLISH_TYPE_GUIDE,
} from "@/lib/ai/prompts/englishExam";
import {
  buildChatgptFixRequest,
  buildChatgptRequest,
  coerceEnglishDraftShape,
  parseChatgptResult,
} from "@/lib/english/chatgpt";
import { englishDraftFeedback } from "@/lib/english/feedback";

const passage =
  "Mina keeps a small notebook in her bag. Every evening she writes three things that went well during the day. After a month she noticed that she complained less and laughed more. Her teacher said the habit trains the mind to look for good moments.";

const exam = {
  school: "한빛중학교",
  grade: "중2" as const,
  title: "2학기 중간고사",
};

const conditions = {
  mode: "new" as const,
  topic: "감사 일기의 효과",
  passage: "",
  difficulty: "표준" as const,
  count: 3,
  words: 200,
  types: ["주제", "서술형"] as ("주제" | "서술형")[],
};

const goodDraft = {
  title: "감사 일기",
  passage,
  questions: [
    {
      type: "주제",
      prompt: "윗글의 주제로 가장 적절한 것은?",
      options: [
        "A habit that changes how we see the day",
        "How to buy a notebook",
        "Why teachers give homework",
        "The history of diaries",
        "A month of rain",
      ],
      answer: "1",
      explanation: "좋은 순간을 찾는 습관을 설명하는 글입니다.",
      evidence: "the habit trains the mind to look for good moments",
    },
    {
      type: "서술형",
      prompt: "미나가 한 달 뒤 알아차린 변화를 우리말로 쓰시오.",
      options: [],
      answer: "불평이 줄고 더 많이 웃게 되었다.",
      explanation: "불평이 줄었다(1점) · 더 웃었다(1점)",
      evidence: "she complained less and laughed more",
    },
    {
      type: "주제",
      prompt: "윗글의 제목으로 가장 적절한 것은?",
      options: [
        "Three Good Things",
        "A Bag Full of Books",
        "Evening Homework",
        "The Best Teacher",
        "Rainy Days",
      ],
      answer: "1",
      explanation: "매일 좋은 일 세 가지를 적는 습관이 핵심입니다.",
      evidence: "she writes three things that went well during the day",
    },
  ],
};

describe("buildChatgptRequest — 요청문에 조건 · 규칙 · 답 형식이 다 들어간다", () => {
  const text = buildChatgptRequest({ exam, request: conditions });

  it("학교 · 학년 · 시험 이름 · 제작 방식 · 소재 · 난이도 · 문항 수 · 지문 길이 · 유형", () => {
    expect(text).toContain("한빛중학교");
    expect(text).toContain("중2");
    expect(text).toContain("2학기 중간고사");
    expect(text).toContain("새 지문");
    expect(text).toContain("감사 일기의 효과");
    expect(text).toContain("표준");
    expect(text).toContain("3문항");
    expect(text).toContain("200단어");
    expect(text).toContain("주제");
    expect(text).toContain("서술형");
    // 고르지 않은 유형은 «고를 수 있는 목록»이 아니라 조건에 안 나온다 — 규칙의 type 값 목록에만 있다
    expect(text.split("[규칙]")[0]).not.toContain("문장 삽입");
  });

  it("규칙 — 보기 5개 서로 다름 · 정답 1~5 · 서술형 보기 없음 + 모범 답안 · 연속 인용 · 고른 유형만 · 변형 지문은 발문 안 · 지어낸 통계 금지", () => {
    expect(text).toMatch(/보기.*5개/);
    expect(text).toMatch(/서로 다르/);
    expect(text).toMatch(/"1".*"5"|1~5/);
    expect(text).toMatch(/서술형.*보기 없이|서술형.*보기가 없/);
    expect(text).toMatch(/서술형은 보기 없이[^\n]*모범 답안을 answer 에/);
    expect(text).toMatch(/이어진 인용|연속 인용/);
    expect(text).toMatch(/고른 유형만/);
    expect(text).toMatch(/각각 하나 이상|각 하나 이상/);
    expect(text).toMatch(/빈칸 추론 · 어법 · 문장 삽입[^\n]*prompt 안에/);
    expect(text).toMatch(/지어낸 통계/);
  });

  it("v6 — 서술형에 부분점수 · 감점을 쓰라고 강제하는 문장이 없고, 채점 기준은 주어졌을 때만 옮긴다", () => {
    // 요청문은 프롬프트 파일의 규칙 한 벌을 그대로 싣는다 — 따로 쓴 문장이 없다
    expect(text).toContain(`- ${ENGLISH_TYPE_GUIDE.서술형}`);
    expect(text).toContain(ENGLISH_EXAM_RULES[1]!);

    // 배점 낱말(부분점수 · 감점 · 배점 · «2점»)이 든 문장 — 낱말 유무가 아니라 그 문장이 무엇을 시키는지를 본다
    const scoring = text
      .split(/\n|(?<=[.?!])\s+/)
      .filter((sentence) => /부분점수|감점|배점|\d\s*점/.test(sentence));
    // 서술형 안내 줄 · 공통 규칙 줄 하나씩, 둘 다 «없으면 지어내지 않는다»는 조건부 문장이다
    expect(scoring).toHaveLength(2);
    for (const sentence of scoring)
      expect(sentence).toMatch(
        /채점 기준이 (?:있을 때만|없으면)[^.]*배점 · 부분점수 · 감점 공식을 지어내지 않습니다/,
      );
    expect(text).not.toContain("요소별 부분점수");
    expect(text).not.toMatch(/채점 기준을 (?:씁니다|쓰십시오|적습니다)/);

    // 그대로 요구하는 것 — 발문의 조건 · 모범 답안과 인정 답안 나열 · 해설(정답 근거)
    expect(text).toContain(
      "조건(쓸 낱말 · 어형 변화 · 단어 수 · 우리말/영어)을 발문에 밝힌",
    );
    expect(text).toContain(
      "answer 에 모범 답안(인정 답안이 여럿이면 « / »로 나열)",
    );
    expect(text).toContain("explanation 에 그 답이 정답인 근거");
    expect(text).toMatch(/해설\(explanation\)은 정답의 근거와 함께/);
  });

  it("답 형식 — JSON 하나를 코드펜스로, 다른 말 없이", () => {
    expect(text).toContain('"title"');
    expect(text).toContain('"passage"');
    expect(text).toContain('"questions"');
    for (const key of [
      "type",
      "prompt",
      "options",
      "answer",
      "explanation",
      "evidence",
    ])
      expect(text).toContain(`"${key}"`);
    expect(text).toContain("```json");
    expect(text).toMatch(/그 밖의 말|다른 말/);
  });

  it("원문 유지 모드는 원문을 싣고 «그대로» 규칙을 붙인다 — 새 지문 모드에는 원문 칸이 없다", () => {
    const original = buildChatgptRequest({
      exam,
      request: { ...conditions, mode: "original", topic: "", passage },
    });
    expect(original).toContain(passage);
    expect(original).toContain("원문 유지");
    expect(original).toMatch(/한 글자도 바꾸지/);
    expect(text).not.toContain("[원문]");
  });

  it("저장한 자료 글은 참고 자료로 따로 싣는다 — 원문과 같은 글이면 두 번 싣지 않는다", () => {
    const withMaterial = buildChatgptRequest({
      exam,
      request: conditions,
      materialText: "Reference notes about gratitude journals.",
    });
    expect(withMaterial).toContain("[참고 자료]");
    expect(withMaterial).toContain("Reference notes about gratitude journals.");

    const same = buildChatgptRequest({
      exam,
      request: { ...conditions, mode: "original", topic: "", passage },
      materialText: passage,
    });
    expect(same.split(passage).length - 1).toBe(1);
  });

  it("요청문과 DeepSeek 프롬프트는 같은 규칙 한 벌을 쓴다 — 버전이 프롬프트 파일에 있다", () => {
    expect(ENGLISH_EXAM_PROMPT_VERSION).toMatch(/^v\d+$/);
    // v6 — 서술형의 부분점수 강제를 뺀 판. 요청문도 같은 판의 규칙을 싣는다
    expect(Number(ENGLISH_EXAM_PROMPT_VERSION.slice(1))).toBeGreaterThanOrEqual(
      6,
    );
  });
});

describe("parseChatgptResult — 붙여 넣은 글에서 JSON 을 찾아 검증기까지", () => {
  it("코드펜스 + 앞뒤 잡설 + 후행 쉼표를 지나 초안이 된다 · source 는 chatgpt 로 서버가 아니라 여기서 붙는다", () => {
    const pasted =
      "네, 요청하신 문제입니다.\n```json\n" +
      JSON.stringify({ ...goodDraft, source: "manual" }, null, 2).replace(
        /\n\s*\]\s*\n}$/,
        ",\n  ]\n}",
      ) +
      "\n```\n더 필요하시면 말씀해 주세요.";
    const verdict = parseChatgptResult(pasted, conditions);
    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      expect(verdict.draft.source).toBe("chatgpt");
      expect(verdict.draft.questions).toHaveLength(3);
      expect(verdict.draft.title).toBe("감사 일기");
    }
  });

  it("검증기 실패는 문항별 사유로 돌아온다 — 보기 넷", () => {
    const broken = {
      ...goodDraft,
      questions: [
        {
          ...goodDraft.questions[0],
          options: goodDraft.questions[0]!.options.slice(0, 4),
        },
        goodDraft.questions[1],
        goodDraft.questions[2],
      ],
    };
    const verdict = parseChatgptResult(JSON.stringify(broken), conditions);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.issues.some((issue) => issue.question === 0)).toBe(true);
      expect(verdict.issues.map((issue) => issue.message).join(" ")).toContain(
        "5개",
      );
    }
  });

  it("요청과 견준다 — 문항 수가 다르면 막힌다 · expect 를 안 주면 통과", () => {
    const two = { ...goodDraft, questions: goodDraft.questions.slice(0, 2) };
    const strict = parseChatgptResult(JSON.stringify(two), conditions);
    expect(strict.ok).toBe(false);
    if (!strict.ok)
      expect(strict.issues.map((issue) => issue.message).join(" ")).toContain(
        "문항 수",
      );
    expect(parseChatgptResult(JSON.stringify(two)).ok).toBe(true);
  });

  it("JSON 이 없으면 한 줄 사유 — 빈 글 · 잡담만", () => {
    for (const text of ["", "   ", "죄송합니다, 다시 말씀해 주세요."]) {
      const verdict = parseChatgptResult(text);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) {
        expect(verdict.issues).toHaveLength(1);
        expect(verdict.issues[0]?.question).toBeNull();
        expect(verdict.issues[0]?.message).toMatch(/JSON/);
      }
    }
  });

  it("배열로 온 답 — 객체 하나를 감싼 배열은 안의 객체를 건지고, 객체가 없는 배열은 «객체» 사유", () => {
    const wrapped = parseChatgptResult(JSON.stringify([goodDraft]));
    expect(wrapped.ok).toBe(true);
    if (wrapped.ok) expect(wrapped.draft.title).toBe("감사 일기");

    // 문항 배열만 붙여 넣은 경우 — 초안 객체가 아니다
    const questionsOnly = parseChatgptResult(
      JSON.stringify(goodDraft.questions),
    );
    expect(questionsOnly.ok).toBe(false);
    if (!questionsOnly.ok)
      expect(questionsOnly.issues[0]?.message).toMatch(/객체/);
  });

  it("ChatGPT 가 흔히 덧붙이는 모양을 받아 준다 — 원문자 정답 · 서술형의 빠진 options · 모르는 열쇠 · 숫자 정답", () => {
    const loose = {
      ...goodDraft,
      difficulty: "표준",
      questions: [
        { ...goodDraft.questions[0], answer: "①", number: 1 },
        {
          ...goodDraft.questions[1],
          options: undefined,
          explanation: undefined,
        },
        { ...goodDraft.questions[2], answer: 1 },
      ],
    };
    const verdict = parseChatgptResult(JSON.stringify(loose), conditions);
    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      expect(verdict.draft.questions[0]?.answer).toBe("1");
      expect(verdict.draft.questions[1]?.options).toEqual([]);
      expect(verdict.draft.questions[1]?.explanation).toBe("");
      expect(verdict.draft.questions[2]?.answer).toBe("1");
      expect(verdict.draft).not.toHaveProperty("difficulty");
    }
  });

  it("🔴 글자 그대로의 `\\n` 은 줄바꿈으로 받아 준다 — 그대로 두면 학생 지면에 `\\n` 이 찍힌다 (25 §12.8)", () => {
    // 벤치 214세트 · 1,280문항에서 12건(4세트, 셋이 luna) — 12건 모두 진짜. 모델이 줄바꿈을 두 번 이스케이프한 것이다.
    const literal = String.raw`다음 글의 빈칸에 들어갈 말은?\n\nA pianist who practices\r\nevery day\timproves.`;
    const coerced = coerceEnglishDraftShape(
      {
        ...goodDraft,
        passage: String.raw`First line.\nSecond line.`,
        questions: [
          {
            ...goodDraft.questions[0],
            prompt: literal,
            options: [String.raw`a\nb`, "c", "d", "e", "f"],
            explanation: String.raw`정답은 ①.\n②는 반대.`,
            evidence: String.raw`First line.\nSecond line.`,
          },
        ],
      },
      "chatgpt",
    ) as {
      passage: string;
      questions: {
        prompt: string;
        options: string[];
        explanation: string;
        evidence: string;
      }[];
    };
    expect(coerced.passage).toBe("First line.\nSecond line.");
    expect(coerced.questions[0]!.prompt).toBe(
      "다음 글의 빈칸에 들어갈 말은?\n\nA pianist who practices\nevery day improves.",
    );
    expect(coerced.questions[0]!.options[0]).toBe("a\nb");
    expect(coerced.questions[0]!.explanation).toBe("정답은 ①.\n②는 반대.");
    expect(coerced.questions[0]!.evidence).toBe("First line.\nSecond line.");
    // 진짜 줄바꿈과 다른 역슬래시는 그대로
    expect(
      (
        coerceEnglishDraftShape(
          { ...goodDraft, passage: "a\nb \\x c" },
          "chatgpt",
        ) as { passage: string }
      ).passage,
    ).toBe("a\nb \\x c");
  });

  it("받아 주는 것은 모양뿐 — 뜻은 그대로 검증기가 본다 (원문자 6 · 서술형 정답 없음)", () => {
    expect(
      coerceEnglishDraftShape(
        {
          ...goodDraft,
          questions: [{ ...goodDraft.questions[0], answer: "⑥" }],
        },
        "chatgpt",
      ),
    ).toMatchObject({ questions: [{ answer: "⑥" }] });
    const verdict = parseChatgptResult(
      JSON.stringify({
        ...goodDraft,
        questions: [{ ...goodDraft.questions[1], answer: "" }],
      }),
    );
    expect(verdict.ok).toBe(false);
  });
});

describe("buildChatgptFixRequest — 거절됐을 때만 «고쳐 달라 요청문» (25 §12.8 「3」)", () => {
  const fourOptions = {
    ...goodDraft,
    questions: [
      {
        ...goodDraft.questions[0],
        options: goodDraft.questions[0]!.options.slice(0, 4),
      },
      goodDraft.questions[1],
      goodDraft.questions[2],
    ],
  };

  it("고른 어법 옆의 어휘는 고르지 않은 유형으로 적지 않고, 다른 유형은 적는다", () => {
    const grammar = { ...goodDraft.questions[0], type: "어법" };
    const vocabShort = {
      ...goodDraft.questions[0],
      type: "어휘",
      prompt: "밑줄 친 부분 중 어휘상 틀린 것은?",
      options: goodDraft.questions[0]!.options.slice(0, 4),
    };
    const request = { ...conditions, count: 2, types: ["어법" as const] };
    const text = buildChatgptFixRequest({
      request,
      pasted: JSON.stringify({
        title: goodDraft.title,
        passage,
        questions: [grammar, vocabShort],
      }),
    });
    expect(text).toMatch(/보기는 5개/);
    expect(text).not.toContain("고르지 않은 유형입니다: 어휘");

    const other = buildChatgptFixRequest({
      request,
      pasted: JSON.stringify({
        title: goodDraft.title,
        passage,
        questions: [grammar, goodDraft.questions[1]],
      }),
    });
    expect(other).toContain("고르지 않은 유형입니다: 서술형");
  });

  it("통과한 결과에는 요청문이 없다 — 통과 세트에 고쳐 쓰기를 권하지 않는다", () => {
    expect(
      buildChatgptFixRequest({
        request: conditions,
        pasted: JSON.stringify(goodDraft),
      }),
    ).toBeNull();
  });

  it("거절 사유(문항 번호) · 고치는 범위 · 조건 · 앞서 낸 결과 · 답 형식을 싣는다", () => {
    const fence = "`".repeat(3);
    const pasted = `${fence}json\n${JSON.stringify(fourOptions)}\n${fence}`;
    const text = buildChatgptFixRequest({ request: conditions, pasted })!;
    expect(text).toContain("[고칠 곳]");
    expect(text).toMatch(/- q1: 보기는 5개여야 합니다/);
    // 형식 문제는 그 칸만 · 내용 문제는 그 문항의 정답 · 해설 · 근거까지 · 나머지는 그대로
    expect(text).toContain("[고치는 범위]");
    expect(text).toMatch(/그 칸만 고칩니다/);
    expect(text).toMatch(
      /지적되지 않은 문항과 지문\(passage\)은 한 글자도 바꾸지 않습니다/,
    );
    expect(text).toContain("3문항");
    expect(text).toContain("감사 일기의 효과");
    // 같은 대화가 지금 편집본과 다를 수 있다 — 붙여 넣었던 결과를 그대로 다시 싣는다
    expect(text).toContain("[앞서 낸 결과]");
    expect(text).toContain(JSON.stringify(fourOptions));
    expect(text).toContain('"evidence"');
    expect(text).toMatch(/JSON 하나만/);
  });

  it("원문을 준 방식이면 원문도 다시 싣는다", () => {
    const original = {
      ...conditions,
      mode: "original" as const,
      topic: "",
      passage,
    };
    const text = buildChatgptFixRequest({
      request: original,
      pasted: JSON.stringify(fourOptions),
    })!;
    expect(text).toContain("[원문]");
    expect(text).toContain(passage);
  });

  it("근거가 지문에 없으면 자리를 짚은 줄이 들어간다", () => {
    const wrongEvidence = {
      ...goodDraft,
      questions: [
        {
          ...goodDraft.questions[0],
          evidence: "the habit teaches the mind to look for good moments",
        },
        goodDraft.questions[1],
        goodDraft.questions[2],
      ],
    };
    const text = buildChatgptFixRequest({
      request: conditions,
      pasted: JSON.stringify(wrongEvidence),
    })!;
    expect(text).toMatch(/- q1 근거 진단: /);
  });

  it("🔴 막지 않는 품질 검사의 지적은 싣지 않는다 — 정밀도 낮은 의심을 고치라 하면 맞는 답을 틀리게 바꾼다", () => {
    // 1번은 검증 거절(보기 4개), 3번은 «정답 없음» 보기(품질 검사만 걸림 — 검증기는 지난다).
    // 2번 서술형은 채점 기준 없이 해설만 있다 — v6 부터는 품질 검사도 이것을 탓하지 않는다.
    const mixed = {
      ...fourOptions,
      questions: [
        fourOptions.questions[0],
        { ...goodDraft.questions[1], explanation: "맞으면 정답" },
        {
          ...goodDraft.questions[2],
          options: [
            ...goodDraft.questions[2]!.options.slice(0, 4),
            "정답 없음",
          ],
        },
      ],
    };
    // 품질 검사는 3번을 실제로 짚는다(아래 «안 싣는다»가 헛단정이 아니다) · 2번에는 지적이 없다
    const feedback = englishDraftFeedback(mixed, conditions);
    expect(feedback).toContain(
      "q3 (주제): «모두 옳다 / 정답 없음» 같은 보기를 쓰지 않습니다.",
    );
    expect(feedback.filter((line) => line.startsWith("q2"))).toEqual([]);
    expect(feedback.join("\n")).not.toMatch(/채점 기준|부분점수|감점|배점/);

    const text = buildChatgptFixRequest({
      request: conditions,
      pasted: JSON.stringify(mixed),
    })!;
    const where = text.slice(
      text.indexOf("[고칠 곳]"),
      text.indexOf("[고치는 범위]"),
    );
    expect(where).toContain("q1");
    expect(where).not.toContain("q2");
    expect(where).not.toContain("q3");
    expect(where).not.toContain("정답 없음");
    expect(where).not.toMatch(/채점 기준|부분점수|감점|배점/);
  });

  it("🔴 JSON 을 못 읽은 붙여넣기에는 요청문을 짓지 않는다 — 일부만 복사한 글이면 고칠 대상이 없다(3자 합의 25 §12.13)", () => {
    expect(
      buildChatgptFixRequest({
        request: conditions,
        pasted: "미안합니다. 다시 만들겠습니다.",
      }),
    ).toBeNull();
    expect(
      buildChatgptFixRequest({ request: conditions, pasted: "[1, 2, 3]" }),
    ).toBeNull();
  });
});

describe("parseAiJsonObject — 객체 하나를 같은 복구 단계로", () => {
  it("코드펜스 · 앞뒤 잡설 · 후행 쉼표 · 문자열 안 줄바꿈", () => {
    expect(parseAiJsonObject('```json\n{"a": 1,}\n```')).toEqual({ a: 1 });
    expect(parseAiJsonObject('결과: {"a": "x"} 끝')).toEqual({ a: "x" });
    expect(parseAiJsonObject('{"a": "첫 줄\n둘째 줄"}')).toEqual({
      a: "첫 줄\n둘째 줄",
    });
  });

  it("🔴 영어 글의 줄바꿈 이스케이프를 LaTeX 로 읽지 않는다 — `\\nMany` 가 글자 그대로의 `\\n` 으로 남던 결함", () => {
    // 모델은 올바른 JSON(줄바꿈 둘 뒤에 영어 단어)을 냈는데, 수학용 복구가 `\n` + 영문자를 `\neq` 류 LaTeX 로 보고
    // 역슬래시를 살려 지면에 `\n` 이 찍혔다(2026-09-30 모델 벤치 — 21개 모델 전부에서 같은 모양).
    const raw = String.raw`{"prompt":"다음 글의 밑줄 친 부분 중?\n\nMany people ①believe it.\tThe end\r\nBye","b":"\frame \bold"}`;
    expect(parseAiJsonObject(raw)).toEqual({
      prompt:
        "다음 글의 밑줄 친 부분 중?\n\nMany people ①believe it.\tThe end\r\nBye",
      b: "\frame \bold",
    });
    // 문자열 안의 날 줄바꿈이 섞여 JSON.parse 가 못 읽는 글도 복구하되, 뒤따르는 영어 줄바꿈은 그대로
    const broken = '{"prompt":"첫 줄\n둘째\\nMany"}';
    expect(parseAiJsonObject(broken)).toEqual({ prompt: "첫 줄\n둘째\nMany" });
  });

  it("앞 잡설에 대괄호가 있어도 객체를 찾는다 — 배열 함수는 `[` 를 먼저 본다", () => {
    expect(parseAiJsonObject('[참고] 아래가 결과입니다. {"a": 1}')).toEqual({
      a: 1,
    });
    // 대괄호 토큰이 JSON 배열로 풀려도(«[1]») 뒤의 객체를 건진다 (리드 검토 D5)
    expect(parseAiJsonObject('[1] 결과: {"a":1}')).toEqual({ a: 1 });
  });

  it("배열 · 문자열 · 깨진 글은 AiParseError", () => {
    expect(() => parseAiJsonObject("[1,2]")).toThrow(AiParseError);
    expect(() => parseAiJsonObject('"문자열"')).toThrow(AiParseError);
    expect(() => parseAiJsonObject("아무 JSON 도 없음")).toThrow(AiParseError);
    expect(() => parseAiJsonObject("")).toThrow(AiParseError);
  });

  it("스키마를 주면 그 스키마로 잠근다 — 위반은 AiParseError", () => {
    const schema = z.strictObject({ a: z.number() });
    expect(parseAiJsonObject('{"a": 1}', schema)).toEqual({ a: 1 });
    expect(() => parseAiJsonObject('{"a": "x"}', schema)).toThrow(AiParseError);
  });
});
