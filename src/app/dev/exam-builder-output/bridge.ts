import type { StudioProblem } from "@/components/unified/types";
import type { ContentBlock } from "@/lib/mathgen/contracts";

export const PARENT_ORIGIN = "http://127.0.0.1:3178";

export interface ConceptQuestion {
  id: string;
  prompt: string;
  choices?: string[];
  passage?: string;
  answer: string;
  solution?: string;
  grade?: string;
  unit?: string;
  level?: string;
}

export interface ConceptPayload {
  flow?: "blueprint";
  subject: "math" | "english";
  title: string;
  questions: ConceptQuestion[];
}

const MAX_QUESTIONS = 120;
const MAX_TOTAL_TEXT = 500_000;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum;
}

/** Validate before rendering; copy only contract fields, without rewriting text. */
export function parseConceptPayload(value: unknown): ConceptPayload | null {
  if (
    !record(value) ||
    (value.flow !== undefined && value.flow !== "blueprint") ||
    (value.subject !== "math" && value.subject !== "english") ||
    !boundedText(value.title, 80) ||
    !Array.isArray(value.questions) ||
    value.questions.length > MAX_QUESTIONS
  ) {
    return null;
  }

  const questions: ConceptQuestion[] = [];
  const ids = new Set<string>();
  let totalText = value.title.length;
  for (const question of value.questions) {
    if (
      !record(question) ||
      !boundedText(question.id, 200) ||
      !question.id.trim() ||
      ids.has(question.id) ||
      !boundedText(question.prompt, 20_000) ||
      !question.prompt.trim() ||
      !boundedText(question.answer, 10_000)
    ) {
      return null;
    }
    const next: ConceptQuestion = {
      id: question.id,
      prompt: question.prompt,
      answer: question.answer,
    };
    const optionalLimits = {
      passage: 40_000,
      solution: 20_000,
      grade: 200,
      unit: 500,
      level: 200,
    } as const;
    for (const key of Object.keys(
      optionalLimits,
    ) as (keyof typeof optionalLimits)[]) {
      const text = question[key];
      if (text === undefined) continue;
      if (!boundedText(text, optionalLimits[key])) return null;
      next[key] = text;
      totalText += text.length;
    }
    if (question.choices !== undefined) {
      if (
        !Array.isArray(question.choices) ||
        question.choices.length > 10 ||
        !Array.from(question.choices).every((choice) =>
          boundedText(choice, 10_000),
        )
      ) {
        return null;
      }
      next.choices = question.choices.slice();
      totalText += next.choices.reduce((sum, choice) => sum + choice.length, 0);
    }
    totalText += next.id.length + next.prompt.length + next.answer.length;
    if (totalText > MAX_TOTAL_TEXT) return null;
    ids.add(next.id);
    questions.push(next);
  }
  return {
    ...(value.flow === "blueprint" ? { flow: value.flow } : {}),
    subject: value.subject,
    title: value.title,
    questions,
  };
}

export function isParentMessage(event: MessageEvent, parent: Window): boolean {
  return event.source === parent && event.origin === PARENT_ORIGIN;
}

export function messageType(value: unknown): unknown {
  return record(value) ? value.type : undefined;
}

export function openPayload(value: unknown): ConceptPayload | null {
  return record(value) && value.type === "exam-concept:open"
    ? parseConceptPayload(value.payload)
    : null;
}

const textBlock = (value: string): ContentBlock => ({
  type: "text",
  value,
  rows: [],
});

/** Native blocks preserve separate choices/passages in the actual shared renderer.
 * `ocr` is its existing typed-content carrier; this adapter performs no OCR.
 */
export function toStudioProblems(
  questions: ConceptQuestion[],
): StudioProblem[] {
  return questions.map((question) => {
    const body = [question.prompt];
    if (question.passage !== undefined) body.push(question.passage);
    const choices = question.choices ?? [];
    return {
      id: question.id,
      content: [
        ...body,
        ...choices.map(
          (choice, choiceIndex) =>
            `${String.fromCharCode(0x2460 + choiceIndex)} ${choice}`,
        ),
      ].join("\n\n"),
      answer: question.answer,
      solution: question.solution ?? "",
      grade: question.grade ?? "",
      chapter: question.unit ?? "",
      section: "",
      difficulty: question.level ?? "",
      problemCode: "",
      sourceLabel: question.prompt,
      figureUrls: [],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
      ocr: {
        // No source problem number was supplied; do not strip a numeric prompt.
        number: 0,
        // Separate whitespace-only blocks are discarded by the shared normalizer.
        blocks: [textBlock(body.join("\n\n"))],
        choiceGroups: choices.map((choice, choiceIndex) => ({
          number: choiceIndex + 1,
          contents: [textBlock(choice)],
        })),
        subQuestions: [],
        confidence: "high",
        choicesLayout: "auto",
        bodyMissing: false,
        choicesMissing: false,
      },
    };
  });
}
