import {
  ARITHMETIC_V2_PAYLOAD_VERSION,
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
  type ArithmeticV2SheetPayload,
  type ArithmeticV2SheetItem,
} from "@/contracts/arithmeticV2.contract";
import {
  generateArithmeticV2Items,
  validateArithmeticV2Request,
} from "./generate";
import { reopenArithmeticV2Sheet } from "./reopen";
import { arithmeticGeometrySnapshotForPrompts } from "./geometry";

export function buildArithmeticV2Sheet(
  input: unknown,
): ArithmeticV2SheetPayload {
  const request = validateArithmeticV2Request(input);
  const items = generateArithmeticV2Items(request);
  const figures = arithmeticGeometrySnapshotForPrompts(
    items.flatMap((round) => round.map((item) => item.prompt)),
  );
  return reopenArithmeticV2Sheet({
    payloadVersion: ARITHMETIC_V2_PAYLOAD_VERSION,
    kind: "arithmeticSheet",
    engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
    seed: request.seed,
    ...(figures ? { figures } : {}),
    rounds: items.map((items, index) => ({ round: index + 1, items })),
  });
}
export type ArithmeticV2PrintItem = ArithmeticV2SheetItem & {
  round: number;
  number: number;
};
export function listArithmeticV2PrintItems(
  payload: unknown,
): ArithmeticV2PrintItem[] {
  let number = 0;
  return reopenArithmeticV2Sheet(payload).rounds.flatMap((round) =>
    round.items.map((item) => ({
      ...item,
      round: round.round,
      number: ++number,
    })),
  );
}
export function arithmeticV2SheetProblemCount(payload: unknown): number {
  return reopenArithmeticV2Sheet(payload).rounds.reduce(
    (sum, round) => sum + round.items.length,
    0,
  );
}
