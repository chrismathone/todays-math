import {
  ARITHMETIC_SKILL_OPERATOR,
  type ArithmeticAllocation,
  type ArithmeticGenerateRequest,
  type ArithmeticSpec,
  arithmeticIdentityKey,
} from "@/contracts/arithmetic.contract";
import { arithmeticDomainPairs } from "@/lib/arithmetic/domain";
import {
  ArithmeticEngineError,
  type ArithmeticCapacityViolation,
} from "@/lib/arithmetic/errors";
import { hashArithmeticLabel, mulberry32, shuffleArithmetic } from "@/lib/arithmetic/prng";
import { validateArithmeticRequest } from "@/lib/arithmetic/request";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function streamLabel(
  request: ArithmeticGenerateRequest,
  roundIndex: number,
  allocationIndex: number,
  allocation: ArithmeticAllocation,
): string {
  return [
    request.engineVersion,
    request.catalogVersion,
    request.seed,
    String(roundIndex),
    String(allocationIndex),
    allocation.skillId,
    canonical(allocation.constraints),
  ].join("\n");
}

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
  const violations: ArithmeticCapacityViolation[] = [];
  const specs: ArithmeticSpec[] = [];

  request.rounds.forEach((round, roundIndex) => {
    const used = new Set<string>();
    let order = 1;
    round.skills.forEach((allocation, allocationIndex) => {
      const pairs = arithmeticDomainPairs(allocation);
      const available = pairs.filter(
        (pair) => !used.has(arithmeticIdentityKey(allocation.skillId, pair)),
      ).length;
      if (allocation.count > pairs.length || allocation.count > available) {
        violations.push({
          round: roundIndex + 1,
          allocation: allocationIndex + 1,
          skillId: allocation.skillId,
          requested: allocation.count,
          available: allocation.count > pairs.length ? pairs.length : available,
          reason: allocation.count > pairs.length ? "domain" : "overlap",
        });
        return;
      }
      const shuffled = shuffleArithmetic(
        pairs,
        mulberry32(hashArithmeticLabel(streamLabel(request, roundIndex, allocationIndex, allocation))),
      );
      let taken = 0;
      for (const pair of shuffled) {
        const key = arithmeticIdentityKey(allocation.skillId, pair);
        if (used.has(key)) continue;
        used.add(key);
        specs.push(makeSpec(request, allocation, pair, roundIndex + 1, order));
        order += 1;
        taken += 1;
        if (taken === allocation.count) break;
      }
      if (taken !== allocation.count) {
        violations.push({
          round: roundIndex + 1,
          allocation: allocationIndex + 1,
          skillId: allocation.skillId,
          requested: allocation.count,
          available: taken,
          reason: "overlap",
        });
      }
    });
  });

  if (violations.length > 0) {
    throw new ArithmeticEngineError("capacity", { violations });
  }
  return specs;
}
