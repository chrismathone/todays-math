import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cachedBankRead, publicBankQueryKey } from "./bankReadCache";
import { withBankReadClient, withBankReadFingerprint } from "./bankReadFingerprint";
import { problemVisibleWhere } from "@/lib/problemPool";
import { familyIdOf } from "@/lib/generator/familyKey";
import { SOURCE_MATERIAL_KINDS } from "@/contracts/sourceMaterial.contract";
import {
  QUESTION_FORMATS,
  type QuestionFormat,
} from "@/contracts/questionFormats.contract";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import {
  BANK_AVAILABILITY_AXES,
  BANK_SOURCE_GROUPS,
  bankBookIdsParamSchema,
  bankMaterialIdsParamSchema,
  bankMaterialKindsParamSchema,
  type BankSourceAvailability,
  type BankSourceCounts,
  type BankSourceMaterials,
} from "@/contracts/bankSource.contract";
import type { BankQueryContext } from "@/lib/bankQueryContext";
import { questionReadMetadata } from "@/lib/problem/questionProjection";
import {
  resolveUnifiedBankQuery,
  loadFilteredQuestionScopeCounts,
  UnifiedBankQueryError,
} from "./unifiedPreview";

import { loadQuestionCounts } from "./problem/questionCountProjection";
import { questionBucketTally } from "./problem/questionCountBuckets";
import type { CountBucket, CountDimension } from "./problem/questionCountSql";
import {
  heldQuestionSourceGroupsSql,
  heldQuestionTextbookKindsSql,
} from "./problem/questionHeldSourceSql";

const tally = questionBucketTally;
const axis = (buckets: readonly CountBucket[], name: string) =>
  buckets.filter((b) => b.axis === name);

function unitFamilyCounts(buckets: readonly CountBucket[]) {
  const units = axis(buckets, "unit")
    .filter((b) => b.available > 0)
    .sort(
      (a, b) => (a.firstAvailable ?? Infinity) - (b.firstAvailable ?? Infinity),
    );
  const keyed = new Map<string, Set<string>>();
  const solo = new Map<string, number>();
  for (const bucket of axis(buckets, "family")) {
    if (!bucket.available) continue;
    if (!bucket.extra?.trim())
      solo.set(bucket.key, (solo.get(bucket.key) ?? 0) + bucket.rowCount);
    else {
      const keys = keyed.get(bucket.key) ?? new Set<string>();
      keys.add(
        familyIdOf({ id: "", unitId: bucket.key, familyKey: bucket.extra }),
      );
      keyed.set(bucket.key, keys);
    }
  }
  return Object.fromEntries(
    units.map((bucket) => [
      bucket.key,
      Math.min(
        (keyed.get(bucket.key)?.size ?? 0) + (solo.get(bucket.key) ?? 0),
        bucket.available,
      ),
    ]),
  );
}
function clean(params: URLSearchParams, omit: readonly string[] = []) {
  const copy = new URLSearchParams(params);
  for (const key of [
    "view",
    "version",
    "page",
    "pageSize",
    "families",
    ...omit,
  ])
    copy.delete(key);
  return copy;
}
function check(params: URLSearchParams) {
  if (
    params.get("identity") !== "question" ||
    (params.has("version") && params.get("version") !== "2")
  )
    throw new UnifiedBankQueryError("문항 보기의 판을 확인해 주세요.");
}

/** S2 reads only the visible/selected lessons. Unlike facet availability, this
 * keeps unitIds and every selection condition, and never scans other grades to
 * construct source/difficulty/book facets. Account-specific requests bypass the
 * public cache through the existing key gate.
 */
export async function loadQuestionScopeCounts(
  params: URLSearchParams,
  context?: BankQueryContext,
) {
  check(params);
  if (params.get("view") !== "scope-counts" || !params.get("unitIds"))
    throw new UnifiedBankQueryError("수량을 확인할 차시를 선택해 주세요.");
  const key = publicBankQueryKey(params);
  return db.$transaction(
    (tx) => withBankReadFingerprint(tx, async () => {
      const read = async () => {
        const buckets = await loadFilteredQuestionScopeCounts(
          clean(params), context, tx,
          ["unit", ...(params.get("families") === "1" ? ["family" as const] : [])],
        );
        return {
          view: "scope-counts" as const,
          ...questionReadMetadata(params),
          unitCounts: Object.fromEntries(axis(buckets, "unit").map((bucket) => [bucket.key, bucket.available])),
          unitFamilies: params.get("families") === "1" ? unitFamilyCounts(buckets) : {},
        };
      };
      return key === null ? read() : cachedBankRead(`scope-counts:${key}`, read);
    }),
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}

/** The first source-picker row needs no hidden book/kind/material aggregates. */
export async function loadQuestionPickerGroups(params: URLSearchParams) {
  check(params);
  if (params.get("view") !== "picker-groups") throw new UnifiedBankQueryError("출처 보기를 확인해 주세요.");
  const key = publicBankQueryKey(params);
  return db.$transaction((tx) => withBankReadFingerprint(tx, async () => {
    const read = async () => {
      const [sources] = await tx.$queryRaw<BankSourceCounts["sources"][]>(heldQuestionSourceGroupsSql());
      if (!sources) throw new Error("BANK_SOURCE_GROUP_COUNTS_MISSING");
      return {
        view: "picker-groups" as const,
        ...questionReadMetadata(params),
        sources,
      };
    };
    return key === null ? read() : cachedBankRead(`picker-groups:${key}`, read);
  }), { isolationLevel: "RepeatableRead", timeout: 30000 });
}

const pickerBookFields = { id: true, grade: true, publisher: true, author: true, title: true } as const;
function pickerBookSelection(params: URLSearchParams) {
  const grade = params.get("grade")?.trim();
  if (params.has("grade") && (!grade || grade.length > 80)) throw new UnifiedBankQueryError("과목을 확인해 주세요.");
  const selected = params.has("books") ? bankBookIdsParamSchema.safeParse(params.get("books")) : undefined;
  if (selected && !selected.success) throw new UnifiedBankQueryError("선택한 책을 확인해 주세요.");
  const ids = selected?.success ? selected.data : [];
  const where: Prisma.SourceBookWhereInput | undefined = grade || ids.length
    ? { kind: "school_textbook", OR: [...(grade ? [{ grade }] : []), ...(ids.length ? [{ id: { in: ids } }] : [])] }
    : undefined;
  return { where };
}

/** Curriculum labels only until a textbook grade is opened. Metadata for books
 * outside that grade is fetched only when their IDs are already selected.
 * This uncached read needs no global bank fingerprint or format classification.
 */
export async function loadQuestionPickerBooks(params: URLSearchParams) {
  check(params);
  if (params.get("view") !== "picker-books") throw new UnifiedBankQueryError("책 보기를 확인해 주세요.");
  const { where } = pickerBookSelection(params);
  return db.$transaction(async (tx) => {
    const [gradeRows, unitGrades, books] = await Promise.all([
      tx.sourceBook.groupBy({ where: { kind: "school_textbook" }, by: ["grade"] }),
      tx.unit.groupBy({ by: ["grade"], _min: { orderIndex: true } }),
      where ? tx.sourceBook.findMany({ where, select: pickerBookFields }) : [],
    ]);
    const order = new Map(unitGrades.map((unit) => [unit.grade, unit._min.orderIndex ?? Infinity]));
    const grades = [...new Set(gradeRows.map((book) => book.grade))].sort((a, b) =>
      (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) || a.localeCompare(b, "ko"));
    return { view: "picker-books" as const, ...questionReadMetadata(params), grades, kinds: [...SOURCE_MATERIAL_KINDS],
      books: books.sort((a, b) => grades.indexOf(a.grade) - grades.indexOf(b.grade)
        || a.publisher.localeCompare(b.publisher, "ko") || (a.author ?? "").localeCompare(b.author ?? "", "ko") || a.id.localeCompare(b.id)) };
  }, { isolationLevel: "RepeatableRead", timeout: 30000 });
}

/** Counts for the visible textbook grade plus already selected books only. */
export async function loadQuestionPickerBookCounts(params: URLSearchParams) {
  check(params);
  if (params.get("view") !== "picker-book-counts") throw new UnifiedBankQueryError("책 수량 보기를 확인해 주세요.");
  const { where } = pickerBookSelection(params);
  if (!where) throw new UnifiedBankQueryError("수량을 확인할 과목이나 책을 골라 주세요.");
  const key = publicBankQueryKey(params);
  return db.$transaction((tx) => {
    const read = async () => {
      const books = await tx.sourceBook.findMany({ where, select: { id: true } });
      const buckets = books.length ? await loadQuestionCounts({ AND: [problemVisibleWhere(), { source: "school_textbook" },
        { sourceMaterial: { bookId: { in: books.map((book) => book.id) } } }] }, tx, ["book", "kind"], undefined, undefined, false) : [];
      return { view: "picker-book-counts" as const, ...questionReadMetadata(params), books: books.map((book) => {
        const count = tally(buckets, "book", book.id);
        return { id: book.id, count: count.held, open: count.available, kinds: Object.fromEntries(axis(buckets, "kind")
          .filter((kind) => kind.key === book.id).map((kind) => [kind.extra!, kind.held])) };
      }) };
    };
    // The measured small-book read is faster than a global xmin check. Only the
    // lead-enabled one-row revision makes validating/reusing this result cheaper.
    return process.env.BANK_READ_REVISION === "on" && key !== null
      ? withBankReadFingerprint(tx, () => cachedBankRead(`picker-book-counts:${key}`, read))
      : read();
  }, { isolationLevel: "RepeatableRead", timeout: 30000 });
}

/** The kind column before any book is chosen: held questions per kind over every
 * textbook book (the per-book `kinds` summed). No book/material metadata leaves the
 * database. Like the book counts, a plain read unless the one-row revision is on.
 */
export async function loadQuestionPickerKindCounts(params: URLSearchParams) {
  check(params);
  if (params.get("view") !== "picker-kind-counts") throw new UnifiedBankQueryError("자료 종류 수량 보기를 확인해 주세요.");
  const key = publicBankQueryKey(params);
  return db.$transaction((tx) => {
    const read = async () => {
      const rows = await tx.$queryRaw<{ kind: string; count: number }[]>(heldQuestionTextbookKindsSql());
      const counts = new Map(rows.map((row) => [row.kind, row.count]));
      return { view: "picker-kind-counts" as const, ...questionReadMetadata(params),
        kinds: Object.fromEntries(SOURCE_MATERIAL_KINDS.flatMap((kind) => counts.has(kind) ? [[kind, counts.get(kind)!]] : [])) };
    };
    return process.env.BANK_READ_REVISION === "on" && key !== null
      ? withBankReadFingerprint(tx, () => cachedBankRead(`picker-kind-counts:${key}`, read))
      : read();
  }, { isolationLevel: "RepeatableRead", timeout: 30000 });
}

const materialFields = {
  id: true, bookId: true, kind: true, kindRaw: true, title: true, chapterNo: true, middleNo: true, sectionNo: true,
  unitRaw: true, semester: true, round: true, levelRaw: true, sequence: true,
} as const;

/** Page metadata is determined before any problem count is read. The minimal
 * search/sort fields are needed to preserve the established JS Korean locale
 * order; remaining display metadata is selected for the current 20 rows only.
 * Selected IDs outside a search/page are checked separately and never dropped
 * merely because the user changed the page or typed in the material search.
 */
export async function loadQuestionMaterialsPage(params: URLSearchParams, context?: BankQueryContext) {
  check(params);
  if (params.get("view") !== "materials-page") throw new UnifiedBankQueryError("자료 보기를 확인해 주세요.");
  const books = bankBookIdsParamSchema.safeParse(params.get("books") ?? "");
  const kinds = params.has("materialKinds") ? bankMaterialKindsParamSchema.safeParse(params.get("materialKinds")) : undefined;
  const selected = params.has("materials") ? bankMaterialIdsParamSchema.safeParse(params.get("materials")) : undefined;
  const requestedPage = Number(params.get("page") ?? "1"), pageSize = Number(params.get("pageSize") ?? "20");
  if (!books.success || (kinds && !kinds.success) || (selected && !selected.success)
    || !Number.isSafeInteger(requestedPage) || requestedPage < 1 || pageSize !== 20 || (params.get("q")?.length ?? 0) > 200)
    throw new UnifiedBankQueryError("자료 검색 조건을 확인해 주세요.");
  const selectedIds = selected?.success ? selected.data : [];
  const search = params.get("q")?.trim() ?? "";
  return db.$transaction((tx) => withBankReadClient(tx, async () => {
    const filters = clean(params, [...BANK_AVAILABILITY_AXES.sources, "q"]);
    const query = await resolveUnifiedBankQuery(filters, context);
    const [candidates, bookNames] = await Promise.all([
      tx.sourceMaterial.findMany({ where: { bookId: { in: books.data }, ...(kinds?.success ? { kind: { in: kinds.data } } : {}) },
        select: { id: true, bookId: true, kind: true, title: true, kindRaw: true, unitRaw: true, chapterNo: true, middleNo: true, sectionNo: true, sequence: true } }),
      search ? tx.sourceBook.findMany({ where: { id: { in: books.data } }, select: pickerBookFields }) : [],
    ]);
    const names = new Map(bookNames.map((book) => [book.id, [book.grade, book.publisher, book.author].filter(Boolean).join(" · ")]));
    const order = new Map(books.data.map((id, index) => [id, index]));
    const sorted = candidates.filter((material) => !search || `${names.get(material.bookId) ?? ""} ${material.title} ${material.kindRaw} ${material.unitRaw ?? ""}`.includes(search))
      .sort((a, b) => order.get(a.bookId)! - order.get(b.bookId)! || nullsLast(a.chapterNo, b.chapterNo)
        || nullsLast(a.middleNo, b.middleNo) || nullsLast(a.sectionNo, b.sectionNo) || a.kind.localeCompare(b.kind, "ko")
        || nullsLast(a.sequence, b.sequence) || a.title.localeCompare(b.title, "ko") || a.id.localeCompare(b.id));
    const page = Math.min(requestedPage, Math.max(1, Math.ceil(sorted.length / pageSize)));
    const ids = sorted.slice((page - 1) * pageSize, page * pageSize).map((material) => material.id);
    const countedIds = [...new Set([...ids, ...selectedIds])];
    const [materials, buckets] = await Promise.all([
      ids.length ? tx.sourceMaterial.findMany({ where: { id: { in: ids } }, select: materialFields }) : [],
      countedIds.length ? loadQuestionCounts({ AND: [problemVisibleWhere(), ...query.selection, { source: "school_textbook" },
        { sourceMaterial: { bookId: { in: books.data } } }, { sourceMaterialId: { in: countedIds } }] }, tx, ["material"], query.format, undefined, false) : [],
    ]);
    const positions = new Map(ids.map((id, index) => [id, index]));
    return { view: "materials-page" as const, ...questionReadMetadata(params), total: sorted.length, page, pageSize: 20 as const,
      materials: materials.sort((a, b) => positions.get(a.id)! - positions.get(b.id)!).map((material) => ({ ...material, ...tally(buckets, "material", material.id) })),
      selectedAvailable: selectedIds.filter((id) => tally(buckets, "material", id).available > 0) };
  }), { isolationLevel: "RepeatableRead", timeout: 30000 });
}

/** One repeatable read and one content-classification cache for all facet scopes. */
export async function loadQuestionSourceAvailability(
  params: URLSearchParams,
  context?: BankQueryContext,
): Promise<BankSourceAvailability> {
  check(params);
  const key = publicBankQueryKey(params);
  return db.$transaction(
    (tx) =>
      withBankReadFingerprint(tx, () =>
        key === null
          ? readQuestionSourceAvailability(params, context, tx)
          : cachedBankRead(`availability:${key}`, () =>
              readQuestionSourceAvailability(params, context, tx),
            ),
      ),
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
async function readQuestionSourceAvailability(
  params: URLSearchParams,
  context?: BankQueryContext,
  tx?: Prisma.TransactionClient,
): Promise<BankSourceAvailability> {
  const filters = clean(params);
  const [main, units, difficulties, sources] = await Promise.all([
    resolveUnifiedBankQuery(filters, context),
    resolveUnifiedBankQuery(
      clean(filters, BANK_AVAILABILITY_AXES.units),
      context,
    ),
    resolveUnifiedBankQuery(
      clean(filters, BANK_AVAILABILITY_AXES.difficulties),
      context,
    ),
    resolveUnifiedBankQuery(
      clean(filters, BANK_AVAILABILITY_AXES.sources),
      context,
    ),
  ]);
  const read = async (
    tx: Prisma.TransactionClient,
  ): Promise<BankSourceAvailability> => {
    const cache = new Map<
      string,
      ReturnType<typeof import("@/lib/problem/provenance").classifyFormat>
    >();
    // Equal facet scopes share one SQL aggregate with the union of dimensions.
    const scans = new Map<
      string,
      {
        where: Prisma.ProblemWhereInput;
        format?: QuestionFormat;
        dimensions: Set<CountDimension>;
        result?: CountBucket[];
      }
    >();
    const plan = (
      selection: Prisma.ProblemWhereInput[],
      format: QuestionFormat | undefined,
      dimensions: CountDimension[],
    ) => {
      const where = { AND: [problemVisibleWhere(), ...selection] };
      const key = JSON.stringify([where, format]);
      const scan = scans.get(key) ?? {
        where,
        format,
        dimensions: new Set<CountDimension>(),
        result: undefined as CountBucket[] | undefined,
      };
      for (const dimension of dimensions) scan.dimensions.add(dimension);
      scans.set(key, scan);
      return scan;
    };
    const mainScan = plan(main.selection, main.format, []);
    const unitScan = plan(units.selection, units.format, [
      "unit",
      ...(params.get("families") === "1" ? ["family" as const] : []),
    ]);
    const difficultyScan = plan(difficulties.selection, difficulties.format, [
      "difficulty",
    ]);
    const sourceScan = plan(sources.selection, sources.format, [
      "source",
      "book",
      "kind",
    ]);
    for (const scan of scans.values())
      scan.result = await loadQuestionCounts(
        scan.where,
        tx,
        [...scan.dimensions],
        scan.format,
        cache,
        scan === mainScan,
      );
    const mainBuckets = mainScan.result!,
      unitBuckets = unitScan.result!,
      difficultyBuckets = difficultyScan.result!,
      sourceBuckets = sourceScan.result!;
    return {
      view: "available",
      ...questionReadMetadata(params),
      ...tally(mainBuckets),
      formatAvailable: Object.fromEntries(
        QUESTION_FORMATS.map((f) => [
          f,
          tally(mainBuckets, "format", f).available,
        ]),
      ) as Record<(typeof QUESTION_FORMATS)[number], number>,
      facets: {
        units: Object.fromEntries(
          axis(unitBuckets, "unit").map((b) => [
            b.key,
            { held: b.held, available: b.available },
          ]),
        ),
        ...(params.get("families") === "1"
          ? { unitFamilies: unitFamilyCounts(unitBuckets) }
          : {}),
        difficulties: Object.fromEntries(
          DIFFICULTY_LADDER.map((tier) => [
            tier,
            tally(difficultyBuckets, "difficulty", tier),
          ]),
        ) as NonNullable<BankSourceAvailability["facets"]>["difficulties"],
        sources: {
          total: tally(sourceBuckets),
          ...Object.fromEntries(
            BANK_SOURCE_GROUPS.map((g) => [
              g,
              tally(sourceBuckets, "source", g),
            ]),
          ),
        } as NonNullable<BankSourceAvailability["facets"]>["sources"],
        textbook: {
          ...tally(sourceBuckets, "source", "school_textbook"),
          books: axis(sourceBuckets, "book")
            .sort((a, b) => a.key.localeCompare(b.key))
            .map((b) => ({
              id: b.key,
              held: b.held,
              available: b.available,
              kinds: Object.fromEntries(
                axis(sourceBuckets, "kind")
                  .filter((k) => k.key === b.key)
                  .map((k) => [
                    k.extra!,
                    { held: k.held, available: k.available },
                  ]),
              ),
            })),
        },
      },
    };
  };
  return tx
    ? read(tx)
    : db.$transaction(read, {
        isolationLevel: "RepeatableRead",
        timeout: 30000,
      });
}

/** Global source picker scope stays global; every union is counted by question. */
export async function loadQuestionSourceCounts(
  params: URLSearchParams,
): Promise<BankSourceCounts> {
  check(params);
  const key = publicBankQueryKey(params);
  return db.$transaction(
    (tx) =>
      withBankReadFingerprint(tx, () =>
        key === null
          ? readQuestionSourceCounts(params, tx)
          : cachedBankRead(`counts:${key}`, () =>
              readQuestionSourceCounts(params, tx),
            ),
      ),
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
async function readQuestionSourceCounts(
  params: URLSearchParams,
  tx: Prisma.TransactionClient,
): Promise<BankSourceCounts> {
  const [buckets, books, units] = await Promise.all([
    loadQuestionCounts(
      problemVisibleWhere(),
      tx,
      ["source", "book", "kind", "material"],
      undefined,
      undefined,
      false,
    ),
    tx.sourceBook.findMany({
      where: { kind: "school_textbook" },
      select: {
        id: true,
        grade: true,
        publisher: true,
        author: true,
        title: true,
      },
    }),
    tx.unit.findMany({
      select: { grade: true, orderIndex: true },
      orderBy: { orderIndex: "asc" },
    }),
  ]);
  const materials = books.length
    ? await tx.sourceMaterial.findMany({
        where: { bookId: { in: books.map((b) => b.id) } },
        select: { id: true, bookId: true, kind: true },
      })
    : [];
  const first = new Map<string, number>();
  for (const u of units)
    if (!first.has(u.grade)) first.set(u.grade, u.orderIndex);
  const listed = books.flatMap((book) => {
    const count = tally(buckets, "book", book.id);
    if (!count.held) return [];
    return [
      {
        ...book,
        count: count.held,
        open: count.available,
        materials: materials.filter(
          (m) =>
            m.bookId === book.id && tally(buckets, "material", m.id).held > 0,
        ).length,
        kinds: Object.fromEntries(
          axis(buckets, "kind")
            .filter((k) => k.key === book.id)
            .map((k) => [k.extra!, k.held]),
        ),
      },
    ];
  });
  const grades = [...new Set(listed.map((b) => b.grade))].sort(
    (a, b) =>
      (first.get(a) ?? Infinity) - (first.get(b) ?? Infinity) ||
      a.localeCompare(b, "ko"),
  );
  return {
    ...questionReadMetadata(params),
    sources: {
      total: tally(buckets).held,
      ...Object.fromEntries(
        BANK_SOURCE_GROUPS.map((g) => [g, tally(buckets, "source", g).held]),
      ),
    } as BankSourceCounts["sources"],
    textbook: {
      total: tally(buckets, "source", "school_textbook").held,
      grades,
      kinds: [...SOURCE_MATERIAL_KINDS],
      books: listed.sort(
        (a, b) =>
          grades.indexOf(a.grade) - grades.indexOf(b.grade) ||
          b.count - a.count ||
          a.publisher.localeCompare(b.publisher, "ko") ||
          (a.author ?? "").localeCompare(b.author ?? "", "ko"),
      ),
    },
  };
}
const nullsLast = (a: number | null, b: number | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a - b;
export async function loadQuestionSourceMaterials(
  params: URLSearchParams,
  context?: BankQueryContext,
): Promise<BankSourceMaterials> {
  check(params);
  const books = bankBookIdsParamSchema.safeParse(params.get("books") ?? "");
  if (!books.success)
    throw new UnifiedBankQueryError("자료를 볼 책을 골라 주세요.");
  const query = await resolveUnifiedBankQuery(
    clean(params, BANK_AVAILABILITY_AXES.sources),
    context,
  );
  return db.$transaction(
    async (tx) => {
      const [materials, buckets] = await Promise.all([
        tx.sourceMaterial.findMany({
          where: { bookId: { in: books.data } },
          select: {
            id: true,
            bookId: true,
            kind: true,
            kindRaw: true,
            title: true,
            chapterNo: true,
            middleNo: true,
            sectionNo: true,
            unitRaw: true,
            semester: true,
            round: true,
            levelRaw: true,
            sequence: true,
          },
        }),
        loadQuestionCounts(
          {
            AND: [
              problemVisibleWhere(),
              ...query.selection,
              { source: "school_textbook" },
              { sourceMaterial: { bookId: { in: books.data } } },
            ],
          },
          tx,
          ["material"],
          query.format,
          undefined,
          false,
        ),
      ]);
      const order = new Map(books.data.map((id, i) => [id, i]));
      return {
        view: "materials",
        ...questionReadMetadata(params),
        materials: materials
          .map((m) => ({ ...m, ...tally(buckets, "material", m.id) }))
          .sort(
            (a, b) =>
              order.get(a.bookId)! - order.get(b.bookId)! ||
              nullsLast(a.chapterNo, b.chapterNo) ||
              nullsLast(a.middleNo, b.middleNo) ||
              nullsLast(a.sectionNo, b.sectionNo) ||
              a.kind.localeCompare(b.kind, "ko") ||
              nullsLast(a.sequence, b.sequence) ||
              a.title.localeCompare(b.title, "ko") ||
              a.id.localeCompare(b.id),
          ),
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
