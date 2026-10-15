import type {
  ArithmeticV2Definition,
  ArithmeticV2Candidate,
} from "@/lib/arithmetic-v2/types";
import { ArithmeticV2EngineError } from "@/lib/arithmetic-v2/errors";

/** Test-local indexed domains; no production family implementations or stubs. */
function definition(
  id: string,
  rankGroup: string,
  domainSize: number,
): ArithmeticV2Definition {
  return {
    id,
    rankGroup,
    domainSize,
    grade: "초3",
    curriculum: { semester: 1, unit: "덧셈과 뺄셈" },
    strand: "자연수",
    title: id,
    description: "Test arithmetic domain",
    labels: ["test"],
    problemAt(index) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= domainSize)
        throw new RangeError("index");
      return {
        parameters: [index, 1],
        prompt: {
          layout: "math",
          text: `${index} + 1`,
          latex: `${index}+1`,
          ...(id === "test-other" ? { instruction: "다른 조건의 연습" } : {}),
        },
        answer: {
          kind: "integer",
          exact: [String(index + 1)],
          text: String(index + 1),
          latex: String(index + 1),
        },
      };
    },
    verify(candidate: ArithmeticV2Candidate) {
      const [a, b] = candidate.parameters;
      return (
        candidate.parameters.length === 2 &&
        Number.isSafeInteger(a) &&
        a >= 0 &&
        a < domainSize &&
        b === 1 &&
        candidate.answer.kind === "integer" &&
        candidate.answer.exact.length === 1 &&
        BigInt(candidate.answer.exact[0]) === BigInt(a) + BigInt(b)
      );
    },
  };
}
export const fixtureDefinitions = [
  definition("test-add", "test-addition", 7),
  definition("test-peer", "test-addition", 11),
  definition("test-other", "test-other", 13),
  definition("test-large", "test-large", 2 ** 40),
];
export function getFixtureDefinition(typeId: string): ArithmeticV2Definition {
  const value = fixtureDefinitions.find((item) => item.id === typeId);
  if (!value) throw new ArithmeticV2EngineError("unsupported-type");
  return value;
}
export const fixtureRequest = (count = 3, typeId = "test-add") => ({
  engineVersion: "arithmetic-engine-v2",
  catalogVersion: "arithmetic-catalog-v2",
  seed: "core-test",
  rounds: [{ allocations: [{ typeId, count }] }],
});
