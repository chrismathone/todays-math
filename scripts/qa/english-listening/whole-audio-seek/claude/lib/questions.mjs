/**
 * What each original question is expected to sound like at its beginning.
 *
 * Derived only from the frozen inventory's official fields. Three spoken forms
 * exist in these recordings:
 *
 *   single              "5번. <own instruction>"            then the dialogue
 *   shared instruction  "19번과 20번. <one instruction>"    then "19번" + dialogue,
 *                       later "20번" + dialogue
 *   shared passage      "19번과 20번. 다음을 듣고, 물음에 답하시오." then ONE passage
 *                       that both questions depend on
 *
 * A shared instruction is not a shared passage: its second question has its own
 * dialogue and its own spoken number.
 */
import { hasHangul, koreanSentence } from "./text.mjs";

export class QuestionPlanError extends Error {}

const fail = (message) => {
  throw new QuestionPlanError(message);
};

const SHARED_PASSAGE = /물음에\s*답하/;
/** An image-preserved question keeps only this pointer as its prompt text. */
const PLACEHOLDER = /원본 문제지\s*\d+번 문항/g;

/** The question's own printed Korean sentence, or "" when only its image exists. */
export function ownSentence(question) {
  let text = String(question.prompt ?? "").replace(PLACEHOLDER, " ");
  if (question.instruction && text.trim().startsWith(question.instruction))
    text = text.trim().slice(question.instruction.length);
  const sentence = koreanSentence(text.trim());
  return hasHangul(sentence) ? sentence : "";
}

/**
 * Pairs of consecutive questions under one separate instruction. A pair whose
 * first member is an image-only question carries the instruction on its second
 * member alone; that pair is still read from the inventory, not assumed.
 */
function instructionPairs(record) {
  const questions = record.questions;
  const pairs = [];
  for (let i = 0; i < questions.length; i++) {
    const instruction = questions[i].instruction;
    if (!instruction) continue;
    const next = questions[i + 1];
    const previous = questions[i - 1];
    if (
      next?.instruction === instruction &&
      next.sourceNumber === questions[i].sourceNumber + 1
    ) {
      if (questions[i + 2]?.instruction === instruction)
        fail(`Shared block longer than two in ${record.sourceRecordId}`);
      pairs.push({ from: i, instruction, inferredHead: false });
      i++;
    } else if (
      previous &&
      !previous.instruction &&
      previous.sourceNumber === questions[i].sourceNumber - 1 &&
      !ownSentence(previous) &&
      !pairs.some((pair) => pair.from + 1 === i - 1)
    )
      pairs.push({ from: i - 1, instruction, inferredHead: true });
    else
      fail(
        `Unpaired separate instruction: ${record.sourceRecordId} ${questions[i].sourceNumber}`,
      );
  }
  return pairs;
}

/**
 * One plan per question, in inventory order:
 *   kind                 single | shared_instruction_head | shared_instruction_member | shared_passage
 *   spokenNumbers        ordinals the cue at the seek start must carry, in order
 *   scopeQuestionNumbers questions whose listening begins at this same start
 *   officialInstruction  Korean sentence spoken right after the cue; null when the
 *                        dialogue follows the number directly or no text exists
 *   instructionSource    inventory_prompt | inventory_instruction | none
 *   blockHead            source number whose start this question shares, or null
 */
export function questionPlans(record) {
  const questions = record.questions;
  const plans = questions.map((question) => {
    const sentence = ownSentence(question);
    const pointer = String(question.prompt ?? "").match(
      /원본 문제지\s*(\d+)번 문항/,
    );
    return {
      // "original paper question N" printed in place of an image-only question.
      placeholderNumber: pointer ? Number(pointer[1]) : null,
      questionId: question.id,
      sourceNumber: question.sourceNumber,
      kind: "single",
      spokenNumbers: [question.sourceNumber],
      scopeQuestionNumbers: [question.sourceNumber],
      officialInstruction: sentence || null,
      instructionSource: sentence ? "inventory_prompt" : "none",
      ownSentence: sentence || null,
      blockHead: null,
      inferredPair: false,
    };
  });
  for (const pair of instructionPairs(record)) {
    const numbers = [
      questions[pair.from].sourceNumber,
      questions[pair.from + 1].sourceNumber,
    ];
    const passage = SHARED_PASSAGE.test(pair.instruction);
    [0, 1].forEach((index) => {
      const plan = plans[pair.from + index];
      plan.inferredPair = pair.inferredHead;
      if (passage) {
        plan.kind = "shared_passage";
        plan.spokenNumbers = numbers;
        plan.scopeQuestionNumbers = numbers;
        plan.officialInstruction = pair.instruction;
        plan.instructionSource = "inventory_instruction";
        plan.blockHead = numbers[0];
      } else if (index === 0) {
        plan.kind = "shared_instruction_head";
        plan.spokenNumbers = numbers;
        plan.officialInstruction = pair.instruction;
        plan.instructionSource = "inventory_instruction";
      } else {
        plan.kind = "shared_instruction_member";
        plan.officialInstruction = null;
        plan.instructionSource = "none";
      }
    });
  }
  return plans;
}
