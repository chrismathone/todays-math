import { arithmeticV2CandidateSchema } from "@/contracts/arithmeticV2.contract";
import { ArithmeticV2EngineError } from "./errors";
import { arithmeticV2Definitions } from "./registry";
import type { ArithmeticV2CatalogEntry } from "./types";
import { arithmeticCurriculum } from "./curriculum";

/** The catalog example is a typical item, not the domain's first one: index 0
 * is often a degenerate corner such as (−9)+(−9)+(−9) (owner, 2026-10-16).
 * A stable hash of the id keeps the example fixed across runs and machines.
 */
export function arithmeticExampleIndex(id: string, domainSize: number): number {
  let hash = 0x811c9dc5;
  for (const char of id) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return domainSize > 0 ? hash % domainSize : 0;
}

export function listArithmeticV2Types(): ArithmeticV2CatalogEntry[] {
  return arithmeticV2Definitions().map(({ problemAt, verify, ...entry }) => {
    const example = arithmeticV2CandidateSchema.parse(
      problemAt(arithmeticExampleIndex(entry.id, entry.domainSize)),
    );
    if (!verify(example)) throw new ArithmeticV2EngineError("verification");
    return {
      ...entry,
      curriculum: arithmeticCurriculum(entry),
      labels: [...entry.labels],
      example: example.prompt,
      defaultCount: Math.min(10, entry.domainSize),
    };
  });
}
