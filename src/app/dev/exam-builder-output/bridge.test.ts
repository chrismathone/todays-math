import { describe, expect, it } from "vitest";
import { blocksToMarkdown } from "@/lib/mathgen/blocksToMarkdown";
import {
  isParentMessage,
  parseConceptPayload,
  PARENT_ORIGIN,
  toStudioProblems,
} from "./bridge";

const question = {
  id: "original-id",
  prompt: "1. Which sentence is correct?",
  passage: "First paragraph.\n\nSecond paragraph.",
  choices: ["A choice", "Another choice"],
  answer: "②",
  solution: "The supplied explanation.",
  grade: "중2",
  unit: "문법",
  level: "중",
};
const payload = {
  subject: "english",
  title: "Original title",
  questions: [question],
};

describe("bounded parent bridge", () => {
  it("accepts only the optional blueprint flow and leaves legacy payloads unchanged", () => {
    expect(parseConceptPayload(payload)).toEqual(payload);
    expect(parseConceptPayload({ ...payload, flow: "blueprint" })).toEqual({
      ...payload,
      flow: "blueprint",
    });
    for (const flow of ["", "review", null, 1, {}, ["blueprint"]]) {
      expect(parseConceptPayload({ ...payload, flow })).toBeNull();
    }
  });

  it("preserves all supplied text, choice order, metadata and IDs in shared content", () => {
    const parsed = parseConceptPayload(payload);
    expect(parsed).toEqual(payload);
    const [problem] = toStudioProblems(parsed!.questions);
    expect(problem).toMatchObject({
      id: question.id,
      answer: question.answer,
      solution: question.solution,
      grade: question.grade,
      chapter: question.unit,
      difficulty: question.level,
    });
    expect(problem.ocr!.blocks[0].value).toBe(
      `${question.prompt}\n\n${question.passage}`,
    );
    expect(blocksToMarkdown(problem.ocr!.blocks)).toBe(
      `${question.prompt}\n\n${question.passage}`,
    );
    expect(
      problem.ocr!.choiceGroups.map((choice) => choice.contents[0].value),
    ).toEqual(question.choices);
    expect(problem.ocr!.number).toBe(0);
    expect(
      toStudioProblems([
        { id: "unknown", prompt: "Supplied prompt", answer: "" },
      ])[0],
    ).toMatchObject({
      answer: "",
      solution: "",
      grade: "",
      chapter: "",
      difficulty: "",
    });
  });

  it("rejects malformed, duplicate, sparse and oversized input without clipping", () => {
    for (const invalid of [
      null,
      {},
      { ...payload, subject: "science" },
      { ...payload, title: "x".repeat(81) },
      { ...payload, questions: [question, question] },
      { ...payload, questions: [{ ...question, answer: 1 }] },
      { ...payload, questions: [{ ...question, choices: new Array(2) }] },
      {
        ...payload,
        questions: [{ ...question, choices: Array(11).fill("x") }],
      },
      { ...payload, questions: [{ ...question, passage: "x".repeat(40_001) }] },
      {
        ...payload,
        questions: Array.from({ length: 121 }, (_, i) => ({
          ...question,
          id: String(i),
        })),
      },
      {
        ...payload,
        questions: Array.from({ length: 20 }, (_, i) => ({
          ...question,
          id: String(i),
          passage: "x".repeat(40_000),
        })),
      },
    ])
      expect(parseConceptPayload(invalid)).toBeNull();
    expect(
      parseConceptPayload({ ...payload, questions: [] })?.questions,
    ).toEqual([]);
  });

  it("requires the exact parent window and origin", () => {
    expect(
      isParentMessage(
        new MessageEvent("message", {
          origin: PARENT_ORIGIN,
          source: window.parent,
        }),
        window.parent,
      ),
    ).toBe(true);
    expect(
      isParentMessage(
        new MessageEvent("message", {
          origin: "http://localhost:3178",
          source: window.parent,
        }),
        window.parent,
      ),
    ).toBe(false);
    expect(
      isParentMessage(
        new MessageEvent("message", { origin: PARENT_ORIGIN, source: null }),
        window.parent,
      ),
    ).toBe(false);
  });
});
