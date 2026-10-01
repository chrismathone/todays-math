/**
 * 오늘의 영어 — 결정적 품질 검사(D-148 · 25 §12). 검증기(막는 규칙)와 달리 **막지 않고 재기만** 한다.
 * 표본 지문은 우리가 지은 짧은 글이다(교재·출판사 지문 아님).
 */
import { describe, expect, it } from "vitest";

import {
  ENGLISH_GENERATED_TYPES,
  ENGLISH_QUESTION_TYPES,
  englishGenerateRequestSchema,
  englishQuestionSchema,
  englishSetMetaSchema,
  type EnglishDraft,
  type EnglishQuestion,
} from "@/contracts/english.contract";
import { ENGLISH_TYPE_GUIDE } from "@/lib/ai/prompts/englishExam";
import { reviewEnglishDraft } from "@/lib/english/quality";

const passage =
  "Many students think that talent decides success. However, research shows that steady practice matters more. A pianist who practices every day improves faster than one who waits for inspiration. Small efforts, repeated over time, build real skill. Therefore, habits are more important than gifts.";

function draftOf(...questions: EnglishQuestion[]): EnglishDraft {
  return { title: "연습", source: "chatgpt", passage, questions };
}

function checks(draft: EnglishDraft, index = 0) {
  const report = reviewEnglishDraft(draft);
  return Object.fromEntries(
    report.questions[index]!.checks.map((c) => [c.code, c.ok]),
  );
}

const topic: EnglishQuestion = {
  type: "주제",
  prompt: "윗글의 주제로 가장 적절한 것은?",
  options: [
    "the value of steady practice",
    "the role of natural talent",
    "how pianists find inspiration",
    "why gifts cannot be learned",
    "the history of music lessons",
  ],
  answer: "1",
  explanation:
    "꾸준한 연습이 재능보다 중요하다는 글이다. ②는 반대 주장, ③은 세부 사례.",
  evidence: "research shows that steady practice matters more",
};

describe("reviewEnglishDraft — 빈칸 추론", () => {
  const blank: EnglishQuestion = {
    type: "빈칸 추론",
    prompt:
      "다음 빈칸에 들어갈 말로 가장 적절한 것은?\nMany students think that talent decides success. However, research shows that ________ matters more. A pianist who practices every day improves faster than one who waits for inspiration. Small efforts, repeated over time, build real skill. Therefore, habits are more important than gifts.",
    options: [
      "steady practice",
      "natural talent",
      "good luck",
      "expensive lessons",
      "a quiet room",
    ],
    answer: "1",
    explanation: "정답은 ①. 뒤의 피아니스트 예시가 매일의 연습을 말한다.",
    evidence: "A pianist who practices every day improves faster",
  };

  it("빈칸 하나 · 지문에서 한 곳만 빠짐 · 근거 인용 → 모두 통과", () => {
    const c = checks(draftOf(blank));
    expect(c["blank.marker"]).toBe(true);
    expect(c["variant.has-passage"]).toBe(true);
    expect(c["variant.single-edit"]).toBe(true);
    expect(c["evidence.quote"]).toBe(true);
    expect(c["answer.explanation-consistent"]).toBe(true);
  });

  it("빈칸 표지가 없거나 문항 속 지문이 없으면 잡는다", () => {
    const c = checks(
      draftOf({ ...blank, prompt: "빈칸에 들어갈 말로 가장 적절한 것은?" }),
    );
    expect(c["blank.marker"]).toBe(false);
    expect(c["variant.has-passage"]).toBe(false);
  });

  it("빈칸 말고 다른 곳까지 바뀌면 «한 군데»가 깨진다", () => {
    const c = checks(
      draftOf({
        ...blank,
        prompt: blank.prompt.replace("build real skill", "build strong skill"),
      }),
    );
    expect(c["blank.marker"]).toBe(true);
    expect(c["variant.single-edit"]).toBe(false);
  });

  it("해설이 다른 번호를 정답이라 하면 잡는다", () => {
    const c = checks(
      draftOf({ ...blank, explanation: "정답은 ③ 이다. 행운이 중요하다." }),
    );
    expect(c["answer.explanation-consistent"]).toBe(false);
  });
});

describe("reviewEnglishDraft — 어법", () => {
  const grammar: EnglishQuestion = {
    type: "어법",
    prompt:
      "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?\nMany students ①think that talent decides success. However, research ②shows that steady practice matters more. A pianist who ③practice every day improves faster than one who ④waits for inspiration. Small efforts, ⑤repeated over time, build real skill. Therefore, habits are more important than gifts.",
    options: ["think", "shows", "practice", "waits", "repeated"],
    answer: "3",
    explanation: "주어 A pianist 가 단수라 practices 가 맞다. 정답 ③.",
    evidence: "A pianist who practices every day improves faster",
  };

  it("표지 다섯 · 오답 밑줄은 원문 그대로 · 고친 곳 하나 · 정답이 고친 곳", () => {
    const c = checks(draftOf(grammar));
    expect(c["grammar.markers"]).toBe(true);
    expect(c["grammar.distractors-in-passage"]).toBe(true);
    expect(c["variant.single-edit"]).toBe(true);
    expect(c["grammar.answer-is-edit"]).toBe(true);
  });

  it("<u>…</u> 밑줄 표기 · 발췌 지문(앞 문장 생략)도 같은 판정", () => {
    const tagged = {
      ...grammar,
      prompt:
        "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?\nHowever, research ① <u>shows</u> that steady practice matters more. A pianist who ② <u>practice</u> every day improves faster than one who ③ <u>waits</u> for inspiration. Small efforts, ④ <u>repeated</u> over time, build real skill. Therefore, habits ⑤ <u>are</u> more important than gifts.",
      options: ["shows", "practice", "waits", "repeated", "are"],
      answer: "2",
    };
    const c = checks(draftOf(tagged));
    expect(c["variant.has-passage"]).toBe(true);
    expect(c["variant.single-edit"]).toBe(true);
    expect(c["grammar.answer-is-edit"]).toBe(true);
    expect(c["format.escape-residue"]).toBe(true);
  });

  it("발췌 첫 낱말이 원문 앞쪽의 같은 낱말과 우연히 짝지어져도 «고친 곳»으로 세지 않는다", () => {
    // 발췌가 «that steady…» 로 시작 — 원문 앞쪽의 «think that» 과 LCS 가 한 낱말 짝을 먼저 만든다(2026-09-30 sonnet 표본은 «A scientist» 의 a)
    const excerpt = {
      ...grammar,
      prompt:
        "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?\nthat steady practice matters more. A pianist who ① <u>practice</u> every day improves faster than one who ② <u>waits</u> for inspiration. Small efforts, ③ <u>repeated</u> over time, build real skill. Therefore, habits ④ <u>are</u> more important ⑤ <u>than</u> gifts.",
      options: ["practice", "waits", "repeated", "are", "than"],
      answer: "1",
    };
    const c = checks(draftOf(excerpt));
    expect(c["variant.single-edit"]).toBe(true);
    expect(c["grammar.answer-is-edit"]).toBe(true);
  });

  it("중간 문장을 건너뛴 발췌(생략)는 «고친 곳»이 아니다 — 표지 자리의 바꿈만 센다", () => {
    const stitched = {
      ...grammar,
      prompt: grammar.prompt
        .replace("Small efforts, ⑤repeated over time, build real skill. ", "")
        .replace("habits are more", "habits ⑤are more"),
      options: ["think", "shows", "practice", "waits", "are"],
    };
    const c = checks(draftOf(stitched));
    expect(c["variant.single-edit"]).toBe(true);
    expect(c["grammar.answer-is-edit"]).toBe(true);
  });

  it("글자 그대로의 \\n 같은 이스케이프 찌꺼기를 잡는다", () => {
    const c = checks(
      draftOf({ ...grammar, prompt: grammar.prompt.replace("\n", "\n\\n") }),
    );
    expect(c["format.escape-residue"]).toBe(false);
    // 찌꺼기가 있어도 대조 자체는 흔들리지 않는다
    expect(c["variant.single-edit"]).toBe(true);
  });

  it("틀린 곳을 둘 만들면 «고친 곳 하나»가 깨진다", () => {
    const c = checks(
      draftOf({
        ...grammar,
        prompt: grammar.prompt.replace("④waits", "④wait"),
      }),
    );
    expect(c["variant.single-edit"]).toBe(false);
  });

  it("아무것도 안 고치면(오류 없음) 잡는다", () => {
    const c = checks(
      draftOf({
        ...grammar,
        prompt: grammar.prompt.replace("③practice every", "③practices every"),
      }),
    );
    expect(c["variant.single-edit"]).toBe(false);
  });

  it("정답이 고친 곳이 아니면 잡는다", () => {
    const c = checks(draftOf({ ...grammar, answer: "2" }));
    expect(c["grammar.answer-is-edit"]).toBe(false);
  });
});

describe("reviewEnglishDraft — 문장 삽입", () => {
  const insertion: EnglishQuestion = {
    type: "문장 삽입",
    prompt:
      "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?\nA pianist who practices every day improves faster than one who waits for inspiration.\n\nMany students think that talent decides success. ( ① ) However, research shows that steady practice matters more. ( ② ) Small efforts, repeated over time, build real skill. ( ③ ) Therefore, habits are more important than gifts. ( ④ ) ( ⑤ )",
    options: ["①", "②", "③", "④", "⑤"],
    answer: "2",
    explanation: "연습이 중요하다는 주장 뒤에 피아니스트 예시가 온다. 정답 ②.",
    evidence: "However, research shows that steady practice matters more.",
  };

  it("주어진 문장이 본문에서 빠지고 정답 자리가 그 문장의 원래 자리", () => {
    const c = checks(draftOf(insertion));
    expect(c["insert.markers"]).toBe(true);
    expect(c["insert.options"]).toBe(true);
    expect(c["variant.single-edit"]).toBe(true);
    expect(c["insert.answer-slot"]).toBe(true);
  });

  it("주어진 문장을 지문에 없는 새 문장으로 지어내면 잡는다 — 본문 문장을 주어진 문장으로 오인하지 않는다", () => {
    const invented = {
      ...insertion,
      prompt: insertion.prompt
        .replace(
          "A pianist who practices every day improves faster than one who waits for inspiration.\n",
          "This idea surprises many young learners today.\n",
        )
        .replace(
          "( ② ) Small",
          "( ② ) A pianist who practices every day improves faster than one who waits for inspiration. Small",
        ),
    };
    const c = checks(draftOf(invented));
    expect(c["insert.given-in-passage"]).toBe(false);
    expect(c["insert.answer-slot"]).toBe(false);
  });

  it("발췌가 ( ⑤ ) 로 끝나 지문 뒷부분이 빠져도 정답 자리를 바로 잰다", () => {
    const excerpt = {
      ...insertion,
      prompt:
        "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?\n[주어진 문장]\nA pianist who practices every day improves faster than one who waits for inspiration.\n\nMany students think that talent decides success. ( ① ) However, research shows that steady practice matters more. ( ② ) Small efforts, repeated over time, build real skill. ( ③ ) ( ④ ) ( ⑤ )",
    };
    const c = checks(draftOf(excerpt));
    expect(c["variant.single-edit"]).toBe(true);
    expect(c["insert.answer-slot"]).toBe(true);
  });

  it("정답 번호가 원래 자리가 아니면 잡는다", () => {
    const c = checks(draftOf({ ...insertion, answer: "3" }));
    expect(c["insert.answer-slot"]).toBe(false);
  });

  it("주어진 문장이 본문에도 남아 있으면 잡는다", () => {
    const c = checks(
      draftOf({
        ...insertion,
        prompt: insertion.prompt.replace(
          "( ② ) Small",
          "( ② ) A pianist who practices every day improves faster than one who waits for inspiration. Small",
        ),
      }),
    );
    expect(c["variant.single-edit"]).toBe(false);
  });
});

describe("reviewEnglishDraft — 주제 · 내용 일치 · 서술형 · IWF", () => {
  it("주제 — 영어 보기 · 표면 단서 없음", () => {
    const c = checks(draftOf(topic));
    expect(c["topic.english-options"]).toBe(true);
    expect(c["iwf.longest-correct"]).toBe(true);
    expect(c["iwf.aota"]).toBe(true);
  });

  it("정답만 유독 긴 보기 · all of the above 를 잡는다", () => {
    const c = checks(
      draftOf({
        ...topic,
        options: [
          "the long-term value of steady, repeated daily practice over natural gifts",
          "talent",
          "inspiration",
          "all of the above",
          "music",
        ],
      }),
    );
    expect(c["iwf.longest-correct"]).toBe(false);
    expect(c["iwf.aota"]).toBe(false);
  });

  it("내용 일치 — 한국어 보기 · 발문의 일치/불일치", () => {
    const match: EnglishQuestion = {
      type: "내용 일치",
      prompt: "윗글의 내용과 일치하지 않는 것은?",
      options: [
        "많은 학생이 재능이 성공을 결정한다고 생각한다.",
        "연구는 꾸준한 연습이 더 중요하다고 보여 준다.",
        "매일 연습하는 피아니스트가 더 빨리 는다.",
        "작은 노력이 쌓이면 실력이 된다.",
        "영감을 기다리는 사람이 가장 빨리 는다.",
      ],
      answer: "5",
      explanation: "영감을 기다리는 사람보다 매일 연습하는 사람이 빨리 는다.",
      evidence: "improves faster than one who waits for inspiration",
    };
    const c = checks(draftOf(match));
    expect(c["match.korean-options"]).toBe(true);
    expect(c["match.stem-polarity"]).toBe(true);
    expect(
      checks(draftOf({ ...match, prompt: "윗글에 대한 설명으로 옳은 것은?" }))[
        "match.stem-polarity"
      ],
    ).toBe(false);
  });

  it("서술형 — 채점 요소 둘 이상", () => {
    const open: EnglishQuestion = {
      type: "서술형",
      prompt: "글의 요지를 우리말로 쓰시오.",
      options: [],
      answer: "꾸준한 습관이 타고난 재능보다 중요하다.",
      explanation: "습관·연습 언급(2점) · 재능보다 중요하다는 비교(2점)",
      evidence: "Therefore, habits are more important than gifts.",
    };
    expect(checks(draftOf(open))["open.criteria"]).toBe(true);
    expect(
      checks(draftOf({ ...open, explanation: "요지를 쓰면 정답." }))[
        "open.criteria"
      ],
    ).toBe(false);
  });
});

describe("reviewEnglishDraft — 세트", () => {
  it("정답 번호 쏠림 · 요청 단어 수 · 변형 거리", () => {
    const same = draftOf(topic, topic, topic, topic);
    const set = Object.fromEntries(
      reviewEnglishDraft(same).set.map((c) => [c.code, c.ok]),
    );
    expect(set["set.answer-spread"]).toBe(false);

    const lengthy = reviewEnglishDraft(draftOf(topic), {
      mode: "new",
      passage: "",
      count: 1,
      types: ["주제"],
      words: 200,
    });
    // 지문 44단어 — 요청 200단어의 ±25% 밖
    expect(lengthy.set.find((c) => c.code === "passage.length")?.ok).toBe(
      false,
    );

    const copied = reviewEnglishDraft(draftOf(topic), {
      mode: "variation",
      passage,
      count: 1,
      types: ["주제"],
      words: 44,
    });
    expect(
      copied.set.find((c) => c.code === "passage.variation-distance")?.ok,
    ).toBe(false);
  });
});

describe("reviewEnglishDraft — 어휘", () => {
  const prompt = [
    "다음 글의 밑줄 친 부분 중, 어휘상 틀린 것은?",
    "Many students ①<u>think</u> that talent decides success. However, research ②<u>shows</u> that ③<u>constant</u> practice matters more. A pianist who ④<u>practices</u> every day improves faster than one who waits for inspiration. Small efforts, ⑤<u>repeated</u> over time, build real skill. Therefore, habits are more important than gifts.",
  ].join("\n");
  const vocab: EnglishQuestion = {
    type: "어휘",
    prompt,
    options: ["think", "shows", "constant", "practices", "repeated"],
    answer: "3",
    explanation: "steady 가 문맥에 맞다. 정답 ③.",
    evidence: "research shows that steady practice matters more",
  };

  it("생성 목록 · 출제 설정 · 만든 조건 · 안내 줄에 어휘가 있고, 원문 복원은 그대로 빠진다", () => {
    expect(ENGLISH_QUESTION_TYPES).toContain("어휘");
    expect(ENGLISH_GENERATED_TYPES).toContain("어휘");
    expect(ENGLISH_TYPE_GUIDE.어휘).toContain("①<u>표현</u>");
    expect(
      englishQuestionSchema.safeParse({
        type: "어휘",
        prompt: "발문",
        options: [],
        answer: "1",
        explanation: "",
        evidence: "",
      }).success,
    ).toBe(true);
    expect(
      englishGenerateRequestSchema.safeParse({
        examId: "00000000-0000-4000-8000-000000000001",
        mode: "new",
        topic: "학교",
        passage: "",
        difficulty: "표준",
        count: 1,
        words: 200,
        types: ["어휘"],
      }).success,
    ).toBe(true);
    expect(
      englishSetMetaSchema.safeParse({ path: "api", types: ["어휘"] }).success,
    ).toBe(true);
    expect(
      englishGenerateRequestSchema.safeParse({
        examId: "00000000-0000-4000-8000-000000000001",
        mode: "new",
        topic: "학교",
        passage: "",
        difficulty: "표준",
        count: 1,
        words: 200,
        types: ["원문 복원"],
      }).success,
    ).toBe(false);
  });

  it("밑줄 다섯이 보기와 같고, 정답이 아닌 네 곳은 원문이며, 고친 곳은 정답 하나", () => {
    const report = reviewEnglishDraft(draftOf(vocab));
    const c = Object.fromEntries(
      report.questions[0]!.checks.map((item) => [item.code, item.ok]),
    );
    expect(c["vocab.markers"]).toBe(true);
    expect(c["vocab.options-match"]).toBe(true);
    expect(c["grammar.distractors-in-passage"]).toBe(true);
    expect(c["variant.single-edit"]).toBe(true);
    expect(c["grammar.answer-is-edit"]).toBe(true);
    const messages = report.questions[0]!.checks.filter((item) =>
      item.code.startsWith("vocab."),
    )
      .map((item) => item.message)
      .join(" ");
    expect(messages).toContain("어휘");
    expect(
      report.questions[0]!.checks.find(
        (item) => item.code === "grammar.answer-is-edit",
      )?.message,
    ).toBe("정답 밑줄이 원문에서 고친 곳이어야 합니다.");
  });

  it("번호가 빠지거나 겹치면 어휘 밑줄 대응이 깨진다", () => {
    const missing = checks(
      draftOf({
        ...vocab,
        prompt: prompt.replace("⑤<u>repeated</u>", "repeated"),
      }),
    );
    expect(missing["vocab.markers"]).toBe(false);
    const duplicate = checks(
      draftOf({
        ...vocab,
        prompt: prompt.replace("④<u>practices</u>", "③<u>practices</u>"),
      }),
    );
    expect(duplicate["vocab.markers"]).toBe(false);
  });

  it("보기와 밑줄이 다르면 잡는다", () => {
    const c = checks(
      draftOf({
        ...vocab,
        options: ["think", "reveal", "constant", "practices", "repeated"],
      }),
    );
    expect(c["vocab.options-match"]).toBe(false);
  });

  it("두 곳을 바꾸면 한 군데가 깨지고, 정답 번호가 그 곳이 아니면 잡는다", () => {
    const two = checks(
      draftOf({
        ...vocab,
        prompt: prompt.replace("①<u>think</u>", "①<u>believe</u>"),
        options: ["believe", "shows", "constant", "practices", "repeated"],
      }),
    );
    expect(two["variant.single-edit"]).toBe(false);
    const wrong = checks(draftOf({ ...vocab, answer: "1" }));
    expect(wrong["grammar.answer-is-edit"]).toBe(false);
  });
});
