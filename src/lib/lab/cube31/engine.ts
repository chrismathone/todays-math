import "server-only";

import { CURRICULUM_UNITS } from "../../../../prisma/seed-data/units";
import { generateElementaryProblem } from "../../elementary/generate";
import type { ElemProblem } from "../../elementary/types";
import type { CubePractice } from "./types";

const DEFAULT_SEED = 20260922;
const PER_CONCEPT = 6;
const MAX_ROUNDS = 512;
const CONCEPTS: CubePractice["concept"][] = [
  "add-none",
  "add-once",
  "add-many",
  "subtract-none",
  "subtract-once",
  "subtract-twice",
];
const SECTIONS = ["1-1-1", "1-1-2", "1-1-3", "1-1-4"];

/**
 * 두 수와 연산 — 세로셈 그림이 있으면 그림에서, 없으면 해설의 식 «$a+b=c$» 에서 읽는다.
 * 발문의 식을 다시 그린 세로셈은 지면 전수 검사(2026-10-20)에서 걷혀 연산 문항 대부분에 그림이 없다.
 */
function operands(problem: ElemProblem): { top: string; bottom: string; op: string } | null {
  const figure = problem.figureSpec;
  if (figure?.kind === "columnOp") {
    if (typeof figure.top !== "string" || typeof figure.bottom !== "string") return null;
    return { top: figure.top, bottom: figure.bottom, op: String(figure.op) };
  }
  const m = /^\$(\d+)([+\-−])(\d+)=\d+\$$/.exec(problem.solution.trim());
  return m ? { top: m[1]!, bottom: m[3]!, op: m[2]! } : null;
}

function extract(problem: ElemProblem, id: string): CubePractice | null {
  const found = operands(problem);
  if (!found) return null;
  if (!/^[1-9]\d{2}$/.test(found.top) || !/^[1-9]\d{2}$/.test(found.bottom)) return null;
  const operation =
    found.op === "+"
      ? "add"
      : found.op === "−" || found.op === "-"
        ? "subtract"
        : null;
  if (!operation) return null;
  const a = Number(found.top);
  const b = Number(found.bottom);
  if (operation === "subtract" && a < b) return null;
  const answer = operation === "add" ? a + b : a - b;
  // A figure can outlive a generator change: never silently trust its answer.
  if (problem.answer.trim() !== `$${answer}$`) {
    throw new Error(
      `Cube practice answer disagrees with elementary generator: ${id}`,
    );
  }
  let exchanges = 0;
  let incoming = 0;
  for (let place = 1; place <= 100; place *= 10) {
    const top = Math.floor(a / place) % 10;
    const bottom = Math.floor(b / place) % 10;
    incoming = Number(
      operation === "add"
        ? top + bottom + incoming >= 10
        : top - incoming < bottom,
    );
    exchanges += incoming;
  }
  const concept: CubePractice["concept"] =
    operation === "add"
      ? exchanges === 0
        ? "add-none"
        : exchanges === 1
          ? "add-once"
          : "add-many"
      : exchanges === 0
        ? "subtract-none"
        : exchanges === 1
          ? "subtract-once"
          : "subtract-twice";
  return { id, a, b, operation, answer, concept };
}

function isZeroChain(problem: CubePractice) {
  return (
    problem.operation === "subtract" &&
    Math.floor(problem.a / 10) % 10 === 0 &&
    problem.a % 10 < problem.b % 10
  );
}

/** Build on the server; only the small, serializable pool crosses to the client. */
export function generateCubePractice(seed = DEFAULT_SEED): CubePractice[] {
  if (!Number.isSafeInteger(seed))
    throw new RangeError("Cube practice seed must be a safe integer");
  const units = SECTIONS.map((section) => {
    const unit = CURRICULUM_UNITS.find(
      (item) =>
        item.grade === "초3" &&
        item.chapter.startsWith("1-1 ") &&
        item.section.startsWith(`${section} `),
    );
    if (!unit) throw new Error(`Missing Cube curriculum unit: ${section}`);
    return unit;
  });
  const buckets = new Map(
    CONCEPTS.map((concept) => [concept, [] as CubePractice[]]),
  );
  const seen = new Set<string>();
  let thousandCarry: CubePractice | undefined;
  let zeroChain: CubePractice | undefined;

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const candidateSeed = ((seed >>> 0) + round * 104729) >>> 0;
    for (const [index, unit] of units.entries()) {
      const problem = extract(
        generateElementaryProblem(unit, candidateSeed, "연산"),
        `cube31-${SECTIONS[index]}-${candidateSeed}`,
      );
      if (!problem) continue;
      const key =
        problem.operation === "add"
          ? `add:${Math.min(problem.a, problem.b)}:${Math.max(problem.a, problem.b)}`
          : `subtract:${problem.a}:${problem.b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (problem.operation === "add" && problem.answer >= 1000)
        thousandCarry ??= problem;
      if (isZeroChain(problem)) zeroChain ??= problem;
      const bucket = buckets.get(problem.concept)!;
      if (bucket.length < PER_CONCEPT) bucket.push(problem);
    }
    if (
      CONCEPTS.every(
        (concept) => buckets.get(concept)!.length === PER_CONCEPT,
      ) &&
      thousandCarry &&
      zeroChain
    )
      break;
  }

  const missing = CONCEPTS.filter(
    (concept) => buckets.get(concept)!.length < PER_CONCEPT,
  );
  if (missing.length) {
    throw new Error(
      `Could not build Cube practice after ${MAX_ROUNDS * units.length} attempts: ${missing.join(", ")}`,
    );
  }
  // Preserve useful boundary examples when they occurred in this bounded search.
  for (const special of [thousandCarry, zeroChain]) {
    if (!special) continue;
    const bucket = buckets.get(special.concept)!;
    if (!bucket.some((problem) => problem.id === special.id))
      bucket[PER_CONCEPT - 1] = special;
  }
  return CONCEPTS.flatMap((concept) => buckets.get(concept)!);
}
