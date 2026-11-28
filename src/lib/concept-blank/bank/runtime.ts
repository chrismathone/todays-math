import "server-only";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ConceptBlankBank } from "@/contracts/conceptBlank.contract";
import { joinBanks } from "./plus";

const PART_BY_GRADE = {
  초3: "e3",
  초4: "e4",
  초5: "e5",
  초6: "e6",
  중1: "m1",
  중2: "m2",
  중3: "m3",
} as const;
type Grade = keyof typeof PART_BY_GRADE;
type CorePart = (typeof PART_BY_GRADE)[Grade];
type BankPart = CorePart | `${CorePart}plus`;
const coreParts = Object.values(PART_BY_GRADE);
const parts = [
  ...coreParts,
  ...coreParts.map((part) => `${part}plus` as const),
];
const digest = (bytes: string) =>
  createHash("sha256").update(bytes).digest("hex");

export function createConceptBlankBankReader(root: string) {
  let manifest: Record<BankPart, string> | undefined;
  const cache = new Map<BankPart, ConceptBlankBank>();
  const gradeCache = new Map<CorePart, ConceptBlankBank>();
  let fullBank: ConceptBlankBank | undefined;
  function getPart(part: BankPart): ConceptBlankBank {
    const cached = cache.get(part);
    if (cached) return cached;
    if (!manifest) {
      const release = JSON.parse(
        readFileSync(
          join(/* turbopackIgnore: true */ root, "manifest.json"),
          "utf8",
        ),
      ) as { version: string; parts: Record<BankPart, string> };
      if (release.version !== digest(JSON.stringify(release.parts)))
        throw new Error("Invalid concept blank bank manifest");
      manifest = release.parts;
    }
    const bytes = readFileSync(
      join(/* turbopackIgnore: true */ root, `${part}.json`),
      "utf8",
    );
    if (digest(bytes) !== manifest[part])
      throw new Error(`Invalid concept blank bank part: ${part}`);
    const bank = JSON.parse(bytes) as ConceptBlankBank;
    cache.set(part, bank);
    return bank;
  }
  const corePartOf = (grade: string) =>
    Object.hasOwn(PART_BY_GRADE, grade)
      ? PART_BY_GRADE[grade as Grade]
      : undefined;
  return {
    getBank: () => (fullBank ??= joinBanks(parts.map(getPart))),
    getGrade: (grade: string) => {
      const part = corePartOf(grade);
      if (!part) return joinBanks([]);
      const cached = gradeCache.get(part);
      if (cached) return cached;
      const bank = joinBanks([getPart(part), getPart(`${part}plus`)]);
      gradeCache.set(part, bank);
      return bank;
    },
    getCoreGrade: (grade: string) => {
      const part = corePartOf(grade);
      return part ? getPart(part) : joinBanks([]);
    },
    forSections: (sections: readonly string[]) => {
      const needed = new Set<BankPart>();
      for (const section of sections) {
        const part = corePartOf(section.split("::", 1)[0]);
        if (!part) continue;
        needed.add(part).add(`${part}plus`);
      }
      return joinBanks(parts.filter((part) => needed.has(part)).map(getPart));
    },
  };
}

// next.config.ts traces the exact route assets. Without the Turbopack
// annotations, a dynamic path can trace unrelated JSON throughout the repo.
const runtimeBank = createConceptBlankBankReader(
  join(/* turbopackIgnore: true */ process.cwd(), "data/concept-blank"),
);
export const getConceptBlankBank = runtimeBank.getBank;
export const getConceptBlankGradeBank = runtimeBank.getGrade;
export const getConceptBlankCoreGradeBank = runtimeBank.getCoreGrade;
export const getConceptBlankBankForSections = runtimeBank.forSections;
