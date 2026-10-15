import { assertArithmeticSheetByteBudget } from "@/lib/arithmetic/byteBudget";
import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_SHEET_KIND,
  ARITHMETIC_SHEET_PAYLOAD_VERSION,
  type ArithmeticPrompt,
} from "@/contracts/arithmetic.contract";
import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import { ArithmeticEngineError } from "@/lib/arithmetic/errors";
import { generateArithmeticSpecs } from "@/lib/arithmetic/generate";
import { reopenArithmeticSheet } from "@/lib/arithmetic/reopen";
import { renderArithmeticPrompt } from "@/lib/arithmetic/render";
import { validateArithmeticRequest } from "@/lib/arithmetic/request";
import { verifyArithmeticSpec } from "@/lib/arithmetic/verify";

export type ArithmeticPrintItem = {
  round: number;
  /** 학습지 전체에서 1부터 매기는 번호. 문제지와 정답지가 이 번호를 같이 쓴다. */
  number: number;
  order: number;
  prompt: ArithmeticPrompt;
  answer: string;
};

export type ArithmeticProblemView = {
  round: number;
  number: number;
  order: number;
  prompt: ArithmeticPrompt;
};

export type ArithmeticAnswerView = {
  round: number;
  number: number;
  order: number;
  answer: string;
};

export function buildArithmeticSheet(input: unknown): ArithmeticSheetPayload {
  const request = validateArithmeticRequest(input);
  const specs = generateArithmeticSpecs(request);
  const payload = {
    payloadVersion: ARITHMETIC_SHEET_PAYLOAD_VERSION,
    kind: ARITHMETIC_SHEET_KIND,
    engineVersion: ARITHMETIC_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_CATALOG_VERSION,
    seed: request.seed,
    rounds: request.rounds.map((round, roundIndex) => ({
      round: roundIndex + 1,
      items: specs
        .filter((spec) => spec.round === roundIndex + 1)
        .map((spec) => {
          const verified = verifyArithmeticSpec(spec);
          if (!verified.ok) throw new ArithmeticEngineError(verified.code);
          return {
            order: spec.order,
            spec,
            prompt: renderArithmeticPrompt(spec),
            answer: verified.answer,
          };
        }),
    })),
  };
  assertArithmeticSheetByteBudget(payload);
  return reopenArithmeticSheet(payload);
}

export function listArithmeticPrintItems(
  payload: unknown,
): ArithmeticPrintItem[] {
  const sheet = reopenArithmeticSheet(payload);
  let number = 1;
  const items: ArithmeticPrintItem[] = [];
  for (const round of sheet.rounds) {
    for (const item of round.items) {
      items.push({
        round: round.round,
        number,
        order: item.order,
        prompt: item.prompt,
        answer: item.answer,
      });
      number += 1;
    }
  }
  return items;
}

export function listArithmeticProblemViews(
  payload: unknown,
): ArithmeticProblemView[] {
  return listArithmeticPrintItems(payload).map((item) => ({
    round: item.round,
    number: item.number,
    order: item.order,
    prompt: item.prompt,
  }));
}

export function listArithmeticAnswerViews(
  payload: unknown,
): ArithmeticAnswerView[] {
  return listArithmeticPrintItems(payload).map((item) => ({
    round: item.round,
    number: item.number,
    order: item.order,
    answer: item.answer,
  }));
}

export function arithmeticSheetProblemCount(payload: unknown): number {
  return reopenArithmeticSheet(payload).rounds.reduce(
    (sum, round) => sum + round.items.length,
    0,
  );
}
