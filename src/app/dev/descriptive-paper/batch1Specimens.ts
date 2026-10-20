/** Offline, unregistered specimens. Rebuild with build-descriptive-batch1.ts. */
import type { NativeAuthorDefinition } from "@/contracts/descriptiveAuthor.contract";
import {
  parseNativeDescriptiveProblem,
  type NativeDescriptiveProblemR2,
} from "@/contracts/nativeDescriptive.contract";
import fixtures from "./batch1Fixtures.json";

export type Batch1Specimen = {
  problem: NativeDescriptiveProblemR2;
  figureSvg: string | null;
};
export type Batch1SpecimenEntry = {
  candidateId: string;
  definition: NativeAuthorDefinition;
  specimens: Batch1Specimen[];
};

type StoredFixtures = {
  definitions: {
    candidateId: string;
    definition: NativeAuthorDefinition;
    specimens: { problem: unknown; figureKey: string | null }[];
  }[];
  figures: Record<string, string>;
};
const stored = fixtures as unknown as StoredFixtures;
export const batch1Specimens: Batch1SpecimenEntry[] = stored.definitions.map(
  (entry) => ({
    ...entry,
    specimens: entry.specimens.map(({ problem, figureKey }) => {
      const parsed = parseNativeDescriptiveProblem(problem);
      if (parsed.revision !== 2)
        throw new Error("서술형 r2 견본이 필요합니다.");
      const figureSvg = figureKey === null ? null : stored.figures[figureKey];
      if (figureKey !== null && !figureSvg)
        throw new Error("서술형 견본의 그림이 없습니다.");
      return { problem: parsed, figureSvg: figureSvg ?? null };
    }),
  }),
);

export function pickBatch1Specimen(candidate?: string, sample?: string) {
  const entry =
    batch1Specimens.find((item) => item.candidateId === candidate) ??
    batch1Specimens.find((item) => item.candidateId === "C05")!;
  const requested = Number(sample);
  const sampleIndex =
    Number.isInteger(requested) &&
    requested >= 0 &&
    requested < entry.specimens.length
      ? requested
      : 0;
  return { entry, sampleIndex, specimen: entry.specimens[sampleIndex]! };
}
