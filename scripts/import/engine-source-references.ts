import { z } from "zod";

/** An explicit link to an original; engine/unit/family similarity is never evidence. */
export type EngineSourceReference = {
  externalId: string;
  originProblemId: string;
};

const referencesSchema = z.array(
  z
    .object({
      externalId: z.string().min(1).max(120),
      originProblemId: z.uuid().transform((id) => id.toLowerCase()),
    })
    .strict(),
);

export function parseEngineSourceReferences(
  input: unknown,
  generated: readonly { externalId: string }[],
): ReadonlyMap<string, string> {
  const references = input === undefined ? [] : referencesSchema.parse(input);
  const result = new Map<string, string>();
  // Preserve the historical loader path when no source links were requested.
  if (references.length === 0) return result;
  const generatedIds = new Set<string>();
  for (const row of generated) {
    if (generatedIds.has(row.externalId))
      throw new Error(`Duplicate generated externalId: ${row.externalId}`);
    generatedIds.add(row.externalId);
  }
  for (const reference of references) {
    if (!generatedIds.has(reference.externalId))
      throw new Error(
        `Unknown generated externalId in sourceReferences: ${reference.externalId}`,
      );
    if (result.has(reference.externalId))
      throw new Error(
        `${result.get(reference.externalId) === reference.originProblemId ? "Duplicate" : "Conflicting"} sourceReferences for ${reference.externalId}`,
      );
    result.set(reference.externalId, reference.originProblemId);
  }
  return result;
}

/** Do not silently lose an explicitly requested link to either content deduper. */
export function assertSourceReferencesRetained(
  references: ReadonlyMap<string, string>,
  retainedExternalIds: Iterable<string>,
): void {
  const retained = new Set(retainedExternalIds);
  for (const externalId of references.keys())
    if (!retained.has(externalId))
      throw new Error(
        `Deduplication would discard sourceReferences target ${externalId}; revise the plan explicitly`,
      );
}

type GeneratedIdentity = {
  externalId: string;
  unitId: string;
  familyKey: string;
};

export type OriginalSourceProblem = {
  id: string;
  unitId: string;
  source: string;
  originProblemId: string | null;
  pool: string;
};

export type EngineProvenance = {
  externalId: string | null;
  unitId: string;
  familyKey: string | null;
  source: string;
  originProblemId: string | null;
  examId: string | null;
  school: string | null;
  questionNumber: number | null;
  sourceMaterialId: string | null;
};

export const engineProvenanceSelect = {
  externalId: true,
  unitId: true,
  familyKey: true,
  source: true,
  originProblemId: true,
  examId: true,
  school: true,
  questionNumber: true,
  sourceMaterialId: true,
} as const;

function matchesEngineProvenance(
  stored: EngineProvenance,
  generated: GeneratedIdentity,
  originProblemId: string | null,
): boolean {
  return (
    stored.externalId === generated.externalId &&
    stored.unitId === generated.unitId &&
    stored.familyKey === generated.familyKey &&
    stored.source === "manual" &&
    stored.originProblemId === originProblemId &&
    stored.examId === null &&
    stored.school === null &&
    stored.questionNumber === null &&
    stored.sourceMaterialId === null
  );
}

/** Read all distinct originals in one query, before any insert or ledger write. */
export async function resolveEngineSourceReferences(
  references: ReadonlyMap<string, string>,
  generated: readonly GeneratedIdentity[],
  existing: readonly EngineProvenance[],
  readOriginals: (ids: string[]) => Promise<OriginalSourceProblem[]>,
): Promise<void> {
  if (references.size === 0) return;
  const originals = await readOriginals([...new Set(references.values())]);
  const byId = new Map(originals.map((row) => [row.id, row]));
  const byExternalId = new Map(generated.map((row) => [row.externalId, row]));
  const existingById = new Map(existing.map((row) => [row.externalId, row]));
  for (const [externalId, originProblemId] of references) {
    const row = byExternalId.get(externalId);
    if (!row) throw new Error(`Unknown generated externalId: ${externalId}`);
    const original = byId.get(originProblemId);
    if (!original)
      throw new Error(
        `Original source problem does not exist: ${originProblemId}`,
      );
    if (original.pool !== "shared")
      throw new Error(
        `Original source problem is not shared: ${originProblemId}`,
      );
    if (original.originProblemId !== null)
      throw new Error(
        `Source must be an original, not a transformed chain: ${originProblemId}`,
      );
    // Legacy RPM originals are transformed + null parent (provenance.ts);
    // transformed with a parent was rejected above. Book metadata stays original-only.
    if (
      original.source !== "past_exam" &&
      original.source !== "school_textbook" &&
      original.source !== "transformed"
    )
      throw new Error(
        `Unrelated source ${original.source}: ${originProblemId}`,
      );
    if (original.unitId !== row.unitId)
      throw new Error(
        `Source unit differs for ${externalId}: ${originProblemId}`,
      );
    const stored = existingById.get(externalId);
    if (stored && !matchesEngineProvenance(stored, row, originProblemId))
      throw new Error(
        `Existing externalId has conflicting provenance: ${externalId}; historical rows are never updated`,
      );
  }
}

export function engineSourceReviewState(
  originProblemId: string | null,
  figureless: boolean,
): { reviewStatus: "pending" | "approved"; directUseAllowed: boolean } {
  return {
    reviewStatus: originProblemId === null ? "approved" : "pending",
    directUseAllowed: originProblemId === null && !figureless,
  };
}

export type ExpectedEngineImport = GeneratedIdentity & {
  originProblemId: string | null;
  reviewStatus: "pending" | "approved";
  directUseAllowed: boolean;
};

/** Includes native identity and absent exam/book metadata, not only the gate. */
export function matchesEngineImportReadback(
  stored: EngineProvenance & {
    pool: string;
    reviewStatus: string;
    directUseAllowed: boolean;
  },
  expected: ExpectedEngineImport,
): boolean {
  return (
    matchesEngineProvenance(stored, expected, expected.originProblemId) &&
    stored.pool === "shared" &&
    stored.reviewStatus === expected.reviewStatus &&
    stored.directUseAllowed === expected.directUseAllowed
  );
}
