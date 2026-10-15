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
import {
  arithmeticShuffledIndexes,
  ArithmeticRoundSelectionError,
  selectArithmeticRounds,
} from "@/lib/arithmetic/roundSelection";
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
  const typeIds = [
    ...new Set(
      request.rounds.flatMap((round) => round.allocations.map((a) => a.typeId)),
    ),
  ];
  try {
    const selected = selectArithmeticRounds(
      request.rounds.map((round) =>
        round.allocations.map((a) => ({ domain: a.typeId, count: a.count })),
      ),
      typeIds.map((typeId) => ({
        id: typeId,
        *candidates() {
          const definition = getArithmeticV2Definition(typeId);
          for (const domainIndex of arithmeticShuffledIndexes(
            definition.domainSize,
            [
              request.engineVersion,
              request.catalogVersion,
              request.seed,
              0,
              typeId,
            ].join("\n"),
          )) {
            const parsed = arithmeticV2CandidateSchema.safeParse(
              definition.problemAt(domainIndex),
            );
            if (!parsed.success) throw arithmeticV2SchemaError(parsed.error);
            if (!definition.verify(parsed.data))
              throw new ArithmeticV2EngineError("verification");
            yield {
              key: arithmeticV2PromptIdentity(parsed.data.prompt),
              value: { typeId, domainIndex, ...parsed.data },
            };
          }
        },
      })),
      request.seed,
    );
    return selected.map((round) =>
      round.flat().map((item, i) => ({ ...item, order: i + 1 })),
    );
  } catch (error) {
    if (error instanceof ArithmeticRoundSelectionError) {
      const detail = error.allocation;
      throw new ArithmeticV2EngineError(
        error.reason === "within-round" ? "capacity" : "round-overlap",
        detail
          ? [
              {
                round: detail.round + 1,
                allocation:
                  request.rounds[detail.round].allocations.findIndex(
                    (a) => a.typeId === detail.domain,
                  ) + 1,
                typeId: detail.domain,
                requested: detail.requested,
                available: detail.available,
                reason: "overlap",
              },
            ]
          : undefined,
      );
    }
    throw error;
  }
}
