import {
  ARITHMETIC_SKILL_OPERATOR,
  type ArithmeticAllocation,
  type ArithmeticGenerateRequest,
  ARITHMETIC_SKILL_NOTATION,
  type ArithmeticSpec,
} from "@/contracts/arithmetic.contract";
import { arithmeticDomainPairs } from "@/lib/arithmetic/domain";
import {
  ArithmeticEngineError,
  type ArithmeticCapacityViolation,
} from "@/lib/arithmetic/errors";
import {
  arithmeticShuffledIndexes,
  ArithmeticRoundSelectionError,
  selectArithmeticRounds,
  canonicalArithmeticDomain,
} from "./roundSelection";
import { validateArithmeticRequest } from "@/lib/arithmetic/request";

function makeSpec(
  request: ArithmeticGenerateRequest,
  allocation: ArithmeticAllocation,
  operands: readonly [number, number],
  round: number,
  order: number,
): ArithmeticSpec {
  return {
    engineVersion: request.engineVersion,
    catalogVersion: request.catalogVersion,
    skillId: allocation.skillId,
    constraints: allocation.constraints,
    operator: ARITHMETIC_SKILL_OPERATOR[allocation.skillId],
    operands: [operands[0], operands[1]],
    seed: request.seed,
    round,
    order,
  };
}

export function generateArithmeticSpecs(input: unknown): ArithmeticSpec[] {
  const request = validateArithmeticRequest(input);
  const id = (allocation: ArithmeticAllocation) =>
    `${allocation.skillId}:${canonicalArithmeticDomain(allocation.constraints)}`;
  const allocations = new Map(
    request.rounds.flatMap((round) =>
      round.skills.map((allocation) => [id(allocation), allocation] as const),
    ),
  );
  const pairsByDomain = new Map(
    [...allocations].map(([domain, allocation]) => [
      domain,
      arithmeticDomainPairs(allocation),
    ]),
  );
  const violations: ArithmeticCapacityViolation[] = [];
  request.rounds.forEach((round, r) => {
    const used = new Map<string, number>();
    round.skills.forEach((allocation, a) => {
      const domain = id(allocation);
      const size = pairsByDomain.get(domain)!.length;
      const available = Math.max(0, size - (used.get(domain) ?? 0));
      if (allocation.count > available)
        violations.push({
          round: r + 1,
          allocation: a + 1,
          skillId: allocation.skillId,
          requested: allocation.count,
          available,
          reason: allocation.count > size ? "domain" : "overlap",
        });
      used.set(domain, (used.get(domain) ?? 0) + allocation.count);
    });
  });
  if (violations.length)
    throw new ArithmeticEngineError("capacity", { violations });
  try {
    const selected = selectArithmeticRounds(
      request.rounds.map((round) =>
        round.skills.map((allocation) => ({
          domain: id(allocation),
          count: allocation.count,
        })),
      ),
      [...allocations].map(([domainId, allocation]) => ({
        id: domainId,
        *candidates() {
          const pairs = pairsByDomain.get(domainId)!;
          for (const index of arithmeticShuffledIndexes(
            pairs.length,
            `${request.seed}\n${domainId}`,
          )) {
            const operands = pairs[index];
            yield {
              key: JSON.stringify([
                ARITHMETIC_SKILL_NOTATION[allocation.skillId],
                ARITHMETIC_SKILL_OPERATOR[allocation.skillId],
                ...operands,
              ]),
              value: { allocation, operands },
            };
          }
        },
      })),
      request.seed,
    );
    return selected.flatMap((round, r) =>
      round
        .flat()
        .map(({ allocation, operands }, i) =>
          makeSpec(request, allocation, operands, r + 1, i + 1),
        ),
    );
  } catch (error) {
    if (error instanceof ArithmeticRoundSelectionError)
      throw new ArithmeticEngineError(
        error.reason === "within-round" ? "capacity" : "round-overlap",
      );
    throw error;
  }
}
