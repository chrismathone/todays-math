import {
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ITEMS_TOTAL,
  ARITHMETIC_MAX_ROUNDS,
  arithmeticV2GenerateRequestSchema,
  arithmeticV2CandidateSchema,
  arithmeticV2PromptIdentity,
  type ArithmeticV2GenerateRequest,
  type ArithmeticV2SheetItem,
} from "@/contracts/arithmeticV2.contract";
import { hashArithmeticLabel, mulberry32 } from "@/lib/arithmetic/prng";
import {
  ArithmeticV2EngineError,
  arithmeticV2SchemaError,
  type ArithmeticV2CapacityViolation,
} from "./errors";
import { getArithmeticV2Definition } from "./registry";

export function validateArithmeticV2Request(
  input: unknown,
): ArithmeticV2GenerateRequest {
  const parsed = arithmeticV2GenerateRequestSchema.safeParse(input);
  if (!parsed.success) {
    const error = arithmeticV2SchemaError(parsed.error);
    if (
      parsed.error.issues.some(
        (issue) =>
          issue.path.length === 1 &&
          issue.path[0] === "rounds" &&
          issue.code === "too_big",
      )
    ) {
      throw new ArithmeticV2EngineError("limit", undefined, {
        scope: "rounds",
        count: (input as { rounds: unknown[] }).rounds.length,
        max: ARITHMETIC_MAX_ROUNDS,
      });
    }
    if (
      error.code === "limit" &&
      input &&
      typeof input === "object" &&
      "rounds" in input &&
      Array.isArray(input.rounds)
    ) {
      let total = 0;
      for (const [index, round] of input.rounds.entries()) {
        // Diagnostics must not trust a body that just failed schema validation.
        if (
          !round ||
          typeof round !== "object" ||
          !Array.isArray(round.allocations) ||
          !round.allocations.every(
            (item: unknown) =>
              item !== null &&
              typeof item === "object" &&
              "count" in item &&
              Number.isSafeInteger(item.count) &&
              Number(item.count) > 0,
          )
        )
          throw error;
        const count = round.allocations.reduce(
          (sum: number, item: { count: number }) => sum + item.count,
          0,
        );
        if (count > ARITHMETIC_MAX_ITEMS_PER_ROUND)
          throw new ArithmeticV2EngineError("limit", undefined, {
            scope: "round",
            round: index + 1,
            count,
            max: ARITHMETIC_MAX_ITEMS_PER_ROUND,
          });
        total += count;
      }
      throw new ArithmeticV2EngineError("limit", undefined, {
        scope: "total",
        count: total,
        max: ARITHMETIC_MAX_ITEMS_TOTAL,
      });
    }
    throw error;
  }
  for (const round of parsed.data.rounds)
    for (const item of round.allocations)
      getArithmeticV2Definition(item.typeId);
  return parsed.data;
}

/** Sparse Fisher-Yates: O(requested items), independent of domain size. */
function sampler(size: number, random: () => number) {
  const swaps = new Map<number, number>();
  let remaining = size;
  return () => {
    if (remaining === 0) return null;
    // Two PRNG draws retain integer precision for domains beyond 2^32.
    const unit =
      (Math.floor(random() * 0x200000) * 0x100000000 +
        Math.floor(random() * 0x100000000)) /
      0x20000000000000;
    const position = Math.floor(unit * remaining);
    const value = swaps.get(position) ?? position;
    remaining -= 1;
    swaps.set(position, swaps.get(remaining) ?? remaining);
    swaps.delete(remaining);
    return value;
  };
}

export function generateArithmeticV2Items(
  input: unknown,
): ArithmeticV2SheetItem[][] {
  const request = validateArithmeticV2Request(input);
  const violations: ArithmeticV2CapacityViolation[] = [];
  request.rounds.forEach((round, roundIndex) => {
    const used = new Map<string, number>();
    round.allocations.forEach((allocation, index) => {
      const size = getArithmeticV2Definition(allocation.typeId).domainSize;
      const available = Math.max(0, size - (used.get(allocation.typeId) ?? 0));
      if (allocation.count > available)
        violations.push({
          round: roundIndex + 1,
          allocation: index + 1,
          typeId: allocation.typeId,
          requested: allocation.count,
          available,
          reason: allocation.count > size ? "domain" : "overlap",
        });
      used.set(
        allocation.typeId,
        (used.get(allocation.typeId) ?? 0) + allocation.count,
      );
    });
  });
  if (violations.length)
    throw new ArithmeticV2EngineError("capacity", violations);
  return request.rounds.map((round, roundIndex) => {
    const streams = new Map<string, () => number | null>();
    const items: ArithmeticV2SheetItem[] = [];
    const prompts = new Set<string>();
    for (const [allocationIndex, allocation] of round.allocations.entries()) {
      const definition = getArithmeticV2Definition(allocation.typeId);
      let next = streams.get(definition.id);
      if (!next) {
        next = sampler(
          definition.domainSize,
          mulberry32(
            hashArithmeticLabel(
              [
                request.engineVersion,
                request.catalogVersion,
                request.seed,
                roundIndex,
                definition.id,
              ].join("\n"),
            ),
          ),
        );
        streams.set(definition.id, next);
      }
      let taken = 0;
      while (taken < allocation.count) {
        const domainIndex = next();
        if (domainIndex === null)
          throw new ArithmeticV2EngineError("capacity", [
            {
              round: roundIndex + 1,
              allocation: allocationIndex + 1,
              typeId: allocation.typeId,
              requested: allocation.count,
              available: taken,
              reason: "overlap",
            },
          ]);
        const parsed = arithmeticV2CandidateSchema.safeParse(
          definition.problemAt(domainIndex),
        );
        if (!parsed.success) throw arithmeticV2SchemaError(parsed.error);
        if (!definition.verify(parsed.data))
          throw new ArithmeticV2EngineError("verification");
        const promptKey = arithmeticV2PromptIdentity(parsed.data.prompt);
        if (prompts.has(promptKey)) continue;
        prompts.add(promptKey);
        items.push({
          order: items.length + 1,
          typeId: definition.id,
          domainIndex,
          ...parsed.data,
        });
        taken += 1;
      }
    }
    return items;
  });
}
