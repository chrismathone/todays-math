/**
 * Offline review of the repeated sentence frames in the 353 bank-derived lessons,
 * never imported by the application. The counts are measured from the manuscripts,
 * not typed in: a frame is a turn with math, bold text and quotations masked.
 * A finding is a defect of the frame itself, so it reaches every turn the frame wrote.
 */
import { endsAsSentence } from "./materialize";
import type { ConceptTeachingScript, ConceptScriptTurn } from "./types";

export const maskFrame = (markdown: string) =>
  markdown
    .replace(/\$[^$]*\$/g, "$M$")
    .replace(/\*\*[^*]*\*\*/g, "**B**")
    .replace(/“[^”]*”/g, "“Q”");

export type TemplateFinding = {
  id: string;
  finding: string;
  /** Turns of this frame the finding applies to. */
  affects: (turn: ConceptScriptTurn) => boolean;
};

export type TemplateFrame = {
  id: string;
  /** The masked frame, or the fixed opening words when the rest of the turn varies. */
  frame: string;
  /** exact: the whole masked turn equals `frame`. prefix: the turn starts with `frame`. */
  match: "exact" | "prefix";
  /** template: written by the generator. content: bank or v15 text that only looks alike once masked. */
  origin: "template" | "content";
  /** One of the twelve frames that repeat 20 times or more as a whole masked turn. */
  repeatsAsWhole: boolean;
  speaker: "teacher" | "student";
  findings: readonly TemplateFinding[];
};

/** A defect of the frame itself: it reaches every turn the frame wrote. */
export const everyTurn = () => true;
const answerText = (turn: ConceptScriptTurn) =>
  /^이 기준으로 물음에 답하면 \*\*([\s\S]*)\*\*입니다\.$/.exec(
    turn.markdown,
  )?.[1];
const term = (turn: ConceptScriptTurn) =>
  /^\*\*([\s\S]*?)\*\*의 /.exec(turn.markdown)?.[1] ?? "";
/** A term that is itself a clause or a reason, which the fixed question words do not fit. */
const clauseTerm = (turn: ConceptScriptTurn) =>
  /(?:다|까닭|이유)$/.test(term(turn));

const kindQuestion = (
  id: string,
  frame: string,
  repeatsAsWhole: boolean,
): TemplateFrame => ({
  id,
  frame,
  match: "exact",
  origin: "template",
  repeatsAsWhole,
  speaker: "student",
  findings: [
    {
      id: `${id}:clause-term`,
      finding:
        "개념명이 문장이나 ‘…까닭’인 카드에서는 고정된 물음 말이 맞지 않는다(예: ‘…인 까닭의 조건과 성질을 같이 알려 주세요’).",
      affects: clauseTerm,
    },
  ],
});

export const TEMPLATE_FRAMES: readonly TemplateFrame[] = [
  kindQuestion(
    "question-property",
    "**B**의 조건과 성질을 같이 알려 주세요.",
    true,
  ),
  kindQuestion("question-definition", "**B**의 뜻은 무엇인가요?", true),
  kindQuestion(
    "question-method",
    "**B**의 계산이나 판단은 어떤 순서로 하나요?",
    true,
  ),
  kindQuestion("question-formula", "**B**의 각 부분은 무엇을 뜻하나요?", true),
  kindQuestion(
    "question-law",
    "**B**의 계산 규칙과 그 까닭을 알고 싶어요.",
    false,
  ),
  kindQuestion(
    "question-theorem",
    "**B**의 조건과 결론을 함께 알고 싶어요.",
    false,
  ),
  kindQuestion("question-unit", "**B**의 기준이 되는 양은 무엇인가요?", false),
  {
    id: "misconception",
    frame: "혹시 이렇게 생각해도 될까요? “Q”",
    match: "exact",
    origin: "template",
    repeatsAsWhole: true,
    speaker: "student",
    findings: [],
  },
  {
    id: "correction",
    frame: "그 문장은 옳지 않아. ",
    match: "prefix",
    origin: "template",
    repeatsAsWhole: false,
    speaker: "teacher",
    findings: [
      {
        id: "correction:register",
        finding:
          "선생님의 반말 ‘옳지 않아.’ 뒤에 은행의 ‘…한다.’ 글말 문장이 그대로 이어져 한 대사 안에서 말투가 바뀐다.",
        affects: everyTurn,
      },
    ],
  },
  {
    id: "example-apply",
    frame: "먼저 배운 기준을 적용해 볼게요. ",
    match: "prefix",
    origin: "template",
    repeatsAsWhole: false,
    speaker: "student",
    findings: [
      {
        id: "example-apply:recitation",
        finding:
          "학생이 두 대사 앞의 정의를 글자 그대로 다시 읽는다. 물음의 수에 기준을 적용하는 풀이 과정이 없고, ‘볼게요’ 뒤에 ‘…한다.’ 글말이 이어진다.",
        affects: everyTurn,
      },
    ],
  },
  {
    id: "example-answer",
    frame: "이 기준으로 물음에 답하면 **B**입니다.",
    match: "exact",
    origin: "template",
    repeatsAsWhole: true,
    speaker: "teacher",
    findings: [
      {
        // Corrected on 2026-10-05: a sentence answer now takes no "입니다". This stays
        // as a guard and must reach no turn. It looks past math and a closing bracket,
        // which the first count (27 of the 32) did not.
        id: "example-answer:predicate",
        finding:
          "은행의 답이 서술어이거나 문장일 때 ‘…이다**입니다.’처럼 틀린 문장이 된다.",
        affects: (turn) => endsAsSentence(answerText(turn) ?? ""),
      },
      {
        id: "example-answer:register",
        finding:
          "같은 수업의 다른 선생님 대사는 반말인데 이 대사만 ‘입니다’로 끝난다.",
        affects: everyTurn,
      },
    ],
  },
  ...(
    ["example-answer-sentence", "example-answer-sentence-closed"] as const
  ).map((id): TemplateFrame => ({
    id,
    // The bank answer is a sentence: "…답하면 **유리수이다**." or, when the answer
    // carries its own full stop, "…답하면 **아니다. 조각의 크기가 같지 않다.**"
    frame:
      id === "example-answer-sentence"
        ? "이 기준으로 물음에 답하면 **B**."
        : "이 기준으로 물음에 답하면 **B**",
    match: "exact",
    origin: "template",
    repeatsAsWhole: id === "example-answer-sentence",
    speaker: "teacher",
    findings: [
      {
        id: `${id}:register`,
        finding:
          "문법은 맞지만 선생님 대사가 은행의 글말 답(‘…이다.’)으로 끝난다. 같은 수업의 반말과 말투가 다르다.",
        affects: everyTurn,
      },
    ],
  })),
  {
    id: "opening-elementary",
    frame: "어떤 뜻으로 생각해야 할까요? **B**부터 짚어 보고 싶어요.",
    match: "exact",
    origin: "template",
    repeatsAsWhole: true,
    speaker: "student",
    findings: [
      {
        id: "opening-elementary:names-term",
        finding:
          "아직 배우지 않은 첫 개념의 이름을 학생이 먼저 말한다. 개념명이 ‘…인 경우’ 같은 긴 구일 때 특히 어색하다.",
        affects: everyTurn,
      },
    ],
  },
  {
    id: "opening-middle",
    frame:
      "계산이나 판단의 기준을 먼저 확인하고 싶어요. **B**의 조건부터 살펴볼게요.",
    match: "exact",
    origin: "template",
    repeatsAsWhole: true,
    speaker: "student",
    findings: [
      {
        id: "opening-middle:names-term",
        finding:
          "아직 배우지 않은 첫 개념의 이름을 학생이 먼저 말하고, 조건이 없는 정의 카드에도 ‘조건부터’라고 한다.",
        affects: everyTurn,
      },
    ],
  },
  {
    id: "check-elementary",
    frame: "마지막 확인! **B**의 뜻이나 방법을 배운 내용으로 설명해 볼래?",
    match: "exact",
    origin: "template",
    repeatsAsWhole: true,
    speaker: "teacher",
    findings: [
      {
        id: "check-elementary:verbatim-answer",
        finding:
          "이어지는 학생의 답이 은행 정의를 ‘…한다.’ 글말 그대로 읽는 대사다. 자기 말로 설명하는 모습이 아니다.",
        affects: everyTurn,
      },
    ],
  },
  {
    id: "check-middle",
    frame: "마지막 확인! **B**의 조건과 뜻을 정확히 설명해 볼까?",
    match: "exact",
    origin: "template",
    repeatsAsWhole: true,
    speaker: "teacher",
    findings: [
      {
        id: "check-middle:verbatim-answer",
        finding:
          "이어지는 학생의 답이 은행 정의를 ‘…한다.’ 글말 그대로 읽는 대사다. 자기 말로 설명하는 모습이 아니다.",
        affects: everyTurn,
      },
    ],
  },
  {
    id: "bare-expression-prompt",
    frame: "$M$",
    match: "exact",
    origin: "content",
    repeatsAsWhole: true,
    speaker: "teacher",
    findings: [
      {
        id: "bare-expression-prompt:no-question",
        finding:
          "은행의 예 물음이 식 하나뿐이어서 선생님 대사가 ‘$x^3\\times x^4$’처럼 식만 말한다. 무엇을 하라는 말이 없다.",
        affects: everyTurn,
      },
    ],
  },
  {
    id: "v15-board-without-note",
    frame: "**B**\n\n$M$",
    match: "exact",
    origin: "content",
    repeatsAsWhole: true,
    speaker: "teacher",
    findings: [],
  },
];

export type TemplateFrameMeasure = {
  id: string;
  turns: number;
  grades: Record<string, number>;
  findings: { id: string; turns: number }[];
};

/** Whether `turn` was written by `frame`. */
export const frameHasTurn = (frame: TemplateFrame, turn: ConceptScriptTurn) => {
  const masked = maskFrame(turn.markdown);
  if (frame.match === "prefix") return turn.markdown.startsWith(frame.frame);
  if (masked !== frame.frame) return false;
  // Masking alone cannot tell an original board from a bank card with a one-formula body.
  if (frame.id === "v15-board-without-note") return turn.source.kind === "v15";
  return true;
};

export function measureTemplateFrames(
  scripts: readonly ConceptTeachingScript[],
): TemplateFrameMeasure[] {
  return TEMPLATE_FRAMES.map((frame) => {
    const grades: Record<string, number> = {};
    const turns = scripts.flatMap((script) =>
      script.dialogue.filter((turn) => {
        if (!frameHasTurn(frame, turn)) return false;
        grades[script.grade] = (grades[script.grade] ?? 0) + 1;
        return true;
      }),
    );
    return {
      id: frame.id,
      turns: turns.length,
      grades,
      findings: frame.findings.map((finding) => ({
        id: finding.id,
        turns: turns.filter(finding.affects).length,
      })),
    };
  });
}

/** Whole masked turns that repeat `minimum` times or more, measured without the list above. */
export function repeatedFrames(
  scripts: readonly ConceptTeachingScript[],
  minimum = 20,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const script of scripts)
    for (const turn of script.dialogue) {
      const frame = maskFrame(turn.markdown);
      counts.set(frame, (counts.get(frame) ?? 0) + 1);
    }
  return new Map([...counts].filter(([, count]) => count >= minimum));
}

/** The opening question of a lesson is asked again, word for word, later in the same lesson. */
export function repeatedOpeningQuestions(
  scripts: readonly ConceptTeachingScript[],
): number {
  return scripts.filter((script) =>
    script.dialogue
      .slice(1)
      .some((turn) => turn.markdown === script.dialogue[0]!.markdown),
  ).length;
}
