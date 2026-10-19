import {
  BANK_SOURCE_GROUPS,
  BANK_SOURCE_GROUP_SOURCES,
} from "@/contracts/bankSource.contract";
import type { QuestionFormat } from "@/contracts/questionFormats.contract";
import type { CountBucket, CountDimension } from "./questionCountSql";

type CountRow = {
  questionId: string;
  actualFormat: QuestionFormat | null;
  available: boolean;
  unitId: string;
  familyKey: string | null;
  source: string;
  sourceMaterialId: string | null;
  difficulty: string;
  weight: number;
  rowCount: number;
};
export type CountRelations = {
  units?: readonly { id: string; grade: string }[];
  materials?: readonly { id: string; bookId: string; kind: string }[];
};

/** Distinct-question unions for the restored metadata reader. The candidate
 * page SQL remains separate; PGlite tests compare its output to frozen readers.
 */
export function questionBucketsFromRows(
  rows: readonly CountRow[],
  dimensions: readonly CountDimension[],
  format?: QuestionFormat,
  relations: CountRelations = {},
): CountBucket[] {
  const units = new Map(relations.units?.map((u) => [u.id, u.grade]));
  const materials = new Map(relations.materials?.map((m) => [m.id, m]));
  const buckets = new Map<
    string,
    CountBucket & {
      heldIds: Map<string, number>;
      availableIds: Map<string, number>;
    }
  >();
  for (const [position, row] of rows.entries()) {
    const keys: [string, string | null | undefined, string | null][] = [
      ["all", "", null],
      ["format", row.actualFormat, null],
    ];
    for (const dimension of dimensions) {
      const material =
        row.source === "school_textbook"
          ? materials.get(row.sourceMaterialId ?? "")
          : undefined;
      switch (dimension) {
        case "unit":
          keys.push([dimension, row.unitId, null]);
          break;
        case "difficulty":
          keys.push([dimension, row.difficulty, null]);
          break;
        case "source":
          for (const group of BANK_SOURCE_GROUPS)
            if (
              (BANK_SOURCE_GROUP_SOURCES[group] as readonly string[]).includes(
                row.source,
              )
            )
              keys.push([dimension, group, null]);
          break;
        case "material":
          if (row.source === "school_textbook")
            keys.push([dimension, row.sourceMaterialId, null]);
          break;
        case "book":
          keys.push([dimension, material?.bookId, null]);
          break;
        case "kind":
          keys.push([dimension, material?.bookId, material?.kind ?? null]);
          break;
        case "family":
          keys.push([dimension, row.unitId, row.familyKey]);
          break;
        case "grade":
          keys.push([dimension, units.get(row.unitId), null]);
          break;
      }
    }
    for (const [axis, key, extra] of keys) {
      if (
        key == null ||
        (format && axis !== "format" && row.actualFormat !== format)
      )
        continue;
      const id = JSON.stringify([axis, key, extra]);
      const bucket = buckets.get(id) ?? {
        axis,
        key,
        extra,
        held: 0,
        available: 0,
        rowCount: 0,
        firstAvailable: undefined as number | undefined,
        heldIds: new Map(),
        availableIds: new Map(),
      };
      bucket.heldIds.set(row.questionId, row.weight);
      if (row.available) {
        bucket.firstAvailable ??= position + 1;
        bucket.availableIds.set(row.questionId, row.weight);
        bucket.rowCount += row.rowCount;
      }
      buckets.set(id, bucket);
    }
  }
  return [...buckets.values()].map(
    ({ heldIds, availableIds, firstAvailable, ...bucket }) =>
      Object.defineProperty(
        {
          ...bucket,
          held: [...heldIds.values()].reduce((sum, n) => sum + n, 0),
          available: [...availableIds.values()].reduce((sum, n) => sum + n, 0),
        },
        "firstAvailable",
        { value: firstAvailable ?? Infinity },
      ),
  );
}

export const questionBucketTally = (
  buckets: readonly CountBucket[],
  axis = "all",
  key = "",
  extra: string | null = null,
) => {
  const found = buckets.find(
    (bucket) =>
      bucket.axis === axis && bucket.key === key && bucket.extra === extra,
  );
  return { held: found?.held ?? 0, available: found?.available ?? 0 };
};
