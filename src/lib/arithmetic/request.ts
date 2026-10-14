import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ITEMS_TOTAL,
  ARITHMETIC_MAX_ROUNDS,
  type ArithmeticAllocation,
  type ArithmeticGenerateRequest,
  arithmeticGenerateRequestSchema,
  arithmeticSeedSchema,
  isArithmeticSkillId,
} from "@/contracts/arithmetic.contract";
import { parseArithmeticSelection } from "@/lib/arithmetic/constraints";
import {
  ArithmeticEngineError,
  arithmeticCodeFromZod,
} from "@/lib/arithmetic/errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
    return null;
  }
  return value;
}

export function validateArithmeticRequest(input: unknown): ArithmeticGenerateRequest {
  const request = exactKeys(input, [
    "engineVersion",
    "catalogVersion",
    "seed",
    "rounds",
  ]);
  if (!request) throw new ArithmeticEngineError("schema");
  if (
    request.engineVersion !== ARITHMETIC_ENGINE_VERSION ||
    request.catalogVersion !== ARITHMETIC_CATALOG_VERSION
  ) {
    throw new ArithmeticEngineError("version");
  }
  if (!arithmeticSeedSchema.safeParse(request.seed).success) {
    throw new ArithmeticEngineError("invalid-seed");
  }
  if (!Array.isArray(request.rounds) || request.rounds.length < 1) {
    throw new ArithmeticEngineError("schema");
  }
  if (request.rounds.length > ARITHMETIC_MAX_ROUNDS) {
    throw new ArithmeticEngineError("limit", {
      limit: {
        scope: "rounds",
        count: request.rounds.length,
        max: ARITHMETIC_MAX_ROUNDS,
      },
    });
  }

  let total = 0;
  const rounds = request.rounds.map((round, roundIndex) => {
    const record = exactKeys(round, ["skills"]);
    if (!record || !Array.isArray(record.skills) || record.skills.length < 1) {
      throw new ArithmeticEngineError("schema");
    }
    if (record.skills.length > ARITHMETIC_MAX_ITEMS_PER_ROUND) {
      throw new ArithmeticEngineError("limit", {
        limit: {
          scope: "round",
          round: roundIndex + 1,
          count: record.skills.length,
          max: ARITHMETIC_MAX_ITEMS_PER_ROUND,
        },
      });
    }
    let roundCount = 0;
    const skills: ArithmeticAllocation[] = record.skills.map((allocation) => {
      const fields = exactKeys(allocation, ["skillId", "count", "constraints"]);
      if (!fields) throw new ArithmeticEngineError("schema");
      if (!isArithmeticSkillId(fields.skillId)) {
        throw new ArithmeticEngineError("unsupported-skill");
      }
      if (
        typeof fields.count !== "number" ||
        !Number.isInteger(fields.count) ||
        fields.count < 1 ||
        fields.count > ARITHMETIC_MAX_ITEMS_PER_ROUND
      ) {
        throw new ArithmeticEngineError("invalid-count");
      }
      const selection = parseArithmeticSelection(fields.skillId, fields.constraints);
      roundCount += fields.count;
      return { ...selection, count: fields.count };
    });
    if (roundCount > ARITHMETIC_MAX_ITEMS_PER_ROUND) {
      throw new ArithmeticEngineError("limit", {
        limit: {
          scope: "round",
          round: roundIndex + 1,
          count: roundCount,
          max: ARITHMETIC_MAX_ITEMS_PER_ROUND,
        },
      });
    }
    total += roundCount;
    return { skills };
  });

  if (total > ARITHMETIC_MAX_ITEMS_TOTAL) {
    throw new ArithmeticEngineError("limit", {
      limit: { scope: "total", count: total, max: ARITHMETIC_MAX_ITEMS_TOTAL },
    });
  }

  const normalized: ArithmeticGenerateRequest = {
    engineVersion: ARITHMETIC_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_CATALOG_VERSION,
    seed: request.seed as string,
    rounds,
  };
  const checked = arithmeticGenerateRequestSchema.safeParse(normalized);
  if (!checked.success) {
    throw new ArithmeticEngineError(arithmeticCodeFromZod(checked.error));
  }
  return checked.data;
}
