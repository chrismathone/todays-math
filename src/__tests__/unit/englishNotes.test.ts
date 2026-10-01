/**
 * 검사 표시 «확인해 볼 곳» (3자 합의 25 §12.13). 관측 사실과 자리만 — 결함 판정이 아니다.
 * 문항 줄: ⓐ 해설의 정답 표기 ≠ 정답 칸 · ⓑ «모두 옳다 / 정답 없음» 보기 · ⓒ 글자 \n 찌꺼기.
 * 머리 줄: ⓔ 절대어가 오답에만 · ⓕ 정답 번호 쏠림. ⓓ(정답 보기만 김)는 보류 — 내지 않는다.
 * 표본은 우리가 지은 짧은 글이다.
 */
import { describe, expect, it } from "vitest";

import type { EnglishQuestion } from "@/contracts/english.contract";
import { englishQualityNotes } from "@/lib/english/notes";

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
  explanation: "꾸준한 연습이 재능보다 중요하다는 글이다.",
  evidence: "research shows that steady practice matters more",
};

const open: EnglishQuestion = {
  type: "서술형",
  prompt: "요약하시오.",
  options: [],
  answer: "Practice matters more than talent.",
  explanation: "핵심어 두 개 · 각 2점",
  evidence: "research shows that steady practice matters more",
};

const codes = (questions: EnglishQuestion[]) =>
  englishQualityNotes(questions).map((note) => note.code);

describe("englishQualityNotes", () => {
  it("흠 없는 세트는 아무것도 없다", () => {
    expect(englishQualityNotes([topic, open])).toEqual([]);
  });

  it("ⓐ 해설의 정답 표기가 정답 칸과 다르면 — «정답» 줄 자리에", () => {
    const [note] = englishQualityNotes([
      topic,
      { ...topic, answer: "3", explanation: "정답은 ④. 둘째 문장이 근거다." },
    ]);
    expect(note).toMatchObject({
      code: "answer-explanation",
      question: 1,
      place: "answer",
      text: "정답 칸은 ③, 해설의 정답 표기는 ④입니다.",
    });
  });

  it("ⓑ «모두 옳다 / 정답 없음» 꼴 보기 — 찾은 표현을 그대로", () => {
    const [note] = englishQualityNotes([
      {
        ...topic,
        options: [...topic.options.slice(0, 4), "All of the above"],
      },
    ]);
    expect(note).toMatchObject({
      code: "aota",
      question: 0,
      place: "options",
      text: "보기 ⑤ 에 «All of the above»라는 표현이 있습니다.",
    });
  });

  it("ⓒ 글자 \\n 찌꺼기 — 칸마다 그 자리에", () => {
    const notes = englishQualityNotes([
      { ...topic, prompt: "윗글의 주제는?\\n\\nRead it." },
      { ...open, explanation: "핵심어\\t두 개 · 각 2점" },
    ]);
    expect(notes.map((n) => [n.question, n.place, n.text])).toEqual([
      [
        0,
        "prompt",
        "발문에 글자 \\n 이 있습니다. 줄바꿈이 아니어서 인쇄하면 그대로 찍힙니다.",
      ],
      [
        1,
        "explanation",
        "해설에 글자 \\t 가 있습니다. 칸 띄움이 아니어서 인쇄하면 그대로 찍힙니다.",
      ],
    ]);
  });

  it("ⓔ 절대어가 오답 둘 이상에만 — 머리 줄 · 문항 번호와 낱말", () => {
    const blank: EnglishQuestion = {
      type: "빈칸 추론",
      prompt: "다음 빈칸에 들어갈 말로 가장 적절한 것은? Practice ________.",
      options: [
        "a gift that appears without preparation",
        "a result that is never learned",
        "a talent developed only by collecting facts",
        "a learnable ability strengthened by effort",
        "a habit that matters only to every artist",
      ],
      answer: "4",
      explanation: "정답은 ④.",
      evidence: "research shows that steady practice matters more",
    };
    const [note] = englishQualityNotes([topic, open, topic, blank]);
    expect(note).toMatchObject({
      code: "absolute-only",
      question: 3,
      place: "head",
      text: "4번 빈칸 추론 — 오답 보기 ② · ③ · ⑤ 에만 never · only · every 가 있습니다.",
    });
  });

  it("ⓕ 정답 번호 쏠림 — 객관식이 넷 이상이고 한 번호가 절반을 넘을 때 · 세트 단위(문항 번호 없음)", () => {
    const set = [
      topic,
      { ...topic, answer: "1" },
      { ...topic, answer: "1" },
      { ...topic, answer: "2" },
      open,
    ];
    const [note] = englishQualityNotes(set);
    expect(note).toMatchObject({
      code: "answer-spread",
      question: null,
      place: "head",
      text: "정답 번호 — 객관식 4문항 가운데 3문항의 정답 칸이 ①입니다.",
    });
    // 셋 이하이면 세지 않는다
    expect(codes(set.slice(0, 3))).toEqual([]);
  });

  it("🔴 ⓓ(정답 보기만 김)는 내지 않는다 — 채점관 판정과 연관이 없어 보류(3자 합의)", () => {
    expect(
      codes([
        {
          ...topic,
          options: [
            "the long-term value of steady, repeated daily practice over natural gifts",
            "talent",
            "inspiration",
            "luck",
            "music",
          ],
        },
      ]),
    ).toEqual([]);
  });

  it("기각 열쇠 — 관련 글이 같으면 같고, 관련 글이 바뀌면 달라지고, 무관한 칸을 고치면 그대로", () => {
    const base = { ...topic, answer: "3", explanation: "정답은 ④." };
    const [a] = englishQualityNotes([base]);
    const [same] = englishQualityNotes([{ ...base, evidence: "different" }]);
    const [changed] = englishQualityNotes([
      { ...base, explanation: "정답은 ⑤." },
    ]);
    expect(same!.key).toBe(a!.key);
    expect(changed!.key).not.toBe(a!.key);
  });

  it("ⓕ 의 열쇠 — 객관식 문항의 구성 · 정답이 바뀌면 달라진다(codex 3차 조건)", () => {
    const set = [
      topic,
      { ...topic, answer: "1" },
      { ...topic, answer: "1" },
      { ...topic, answer: "2" },
    ];
    const [a] = englishQualityNotes(set);
    const [b] = englishQualityNotes([
      ...set.slice(0, 3),
      { ...topic, answer: "5" },
    ]);
    const [c] = englishQualityNotes([...set, { ...topic, answer: "4" }]);
    expect(b!.key).not.toBe(a!.key);
    expect(c!.key).not.toBe(a!.key);
  });
});
