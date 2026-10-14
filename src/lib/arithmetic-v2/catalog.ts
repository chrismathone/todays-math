import { arithmeticV2CandidateSchema } from "@/contracts/arithmeticV2.contract";
import { ArithmeticV2EngineError } from "./errors";
import { arithmeticV2Definitions } from "./registry";
import type { ArithmeticV2CatalogEntry } from "./types";

export function listArithmeticV2Types(): ArithmeticV2CatalogEntry[] {
  return arithmeticV2Definitions().map(({ problemAt, verify, ...entry }) => {
    const example = arithmeticV2CandidateSchema.parse(problemAt(0));
    if (!verify(example)) throw new ArithmeticV2EngineError("verification");
    return {
      ...entry,
      labels: [...entry.labels],
      example: example.prompt,
      defaultCount: Math.min(10, entry.domainSize),
    };
  });
}
