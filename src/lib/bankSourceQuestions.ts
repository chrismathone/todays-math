import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
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
  BANK_SOURCE_GROUP_SOURCES,
  bankBookIdsParamSchema,
  type BankAvailabilityTally,
  type BankSourceAvailability,
  type BankSourceCounts,
  type BankSourceMaterials,
} from "@/contracts/bankSource.contract";
import type { BankQueryContext } from "@/lib/bankQueryContext";
import {
  loadQuestionCandidates,
  countProjectedQuestions,
  questionReadMetadata,
  type QuestionCandidate,
} from "@/lib/problem/questionProjection";
import {
  resolveUnifiedBankQuery,
  UnifiedBankQueryError,
} from "@/lib/unifiedPreview";

type QSets = { held: Set<string>; available: Set<string> };
const sets = (): QSets => ({ held: new Set(), available: new Set() });
function add(to: QSets, row: QuestionCandidate) {
  to.held.add(row.questionId);
  if (row.available) to.available.add(row.questionId);
}
function tally(to: QSets): BankAvailabilityTally {
  return { held: to.held.size, available: to.available.size };
}
function collect(
  rows: readonly QuestionCandidate[],
  key: (r: QuestionCandidate) => string,
) {
  const map = new Map<string, QSets>();
  for (const row of rows) {
    const k = key(row);
    const group = map.get(k) ?? sets();
    add(group, row);
    map.set(k, group);
  }
  return map;
}
function all(rows: readonly QuestionCandidate[]) {
  const to = sets();
  for (const row of rows) add(to, row);
  return tally(to);
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
/** One repeatable read and one content-classification cache for all facet scopes. */
export async function loadQuestionSourceAvailability(
  params: URLSearchParams,
  context?: BankQueryContext,
): Promise<BankSourceAvailability> {
  check(params);
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
  return db.$transaction(
    async (tx) => {
      const cache = new Map<
        string,
        ReturnType<typeof import("@/lib/problem/provenance").classifyFormat>
      >();
      const scans = new Map<string, Promise<QuestionCandidate[]>>();
      const intern = new Map<string, QuestionCandidate>();
      const load = async (
        selection: Prisma.ProblemWhereInput[],
        format: QuestionFormat | null | undefined = main.format,
      ) => {
        const key = JSON.stringify(selection);
        let pending = scans.get(key);
        if (!pending) {
          pending = loadQuestionCandidates(
            { AND: [problemVisibleWhere(), ...selection] },
            undefined,
            tx,
            cache,
            intern,
          );
          scans.set(key, pending);
        }
        const rows = await pending;
        return format ? rows.filter((r) => r.actualFormat === format) : rows;
      };
      // Sequential scans share classifications; the transaction protects their correspondence.
      const mainAll = await load(main.selection, null);
      const mainRows = main.format
        ? mainAll.filter((row) => row.actualFormat === main.format)
        : mainAll;
      const unitRows = await load(units.selection, units.format);
      const difficultyRows = await load(
        difficulties.selection,
        difficulties.format,
      );
      const sourceRows = await load(sources.selection, sources.format);
      const unitSets = collect(unitRows, (r) => r.unitId);
      const diffSets = collect(difficultyRows, (r) => r.difficulty);
      const sourceTally = (source: string) =>
        all(
          sourceRows.filter((r) =>
            BANK_SOURCE_GROUP_SOURCES[
              source as (typeof BANK_SOURCE_GROUPS)[number]
            ]?.includes(r.source),
          ),
        );
      const textbookRows = sourceRows.filter(
        (r) => r.source === "school_textbook",
      );
      const materialIds = [
        ...new Set(
          textbookRows.flatMap((r) =>
            r.sourceMaterialId ? [r.sourceMaterialId] : [],
          ),
        ),
      ];
      const materials = materialIds.length
        ? await tx.sourceMaterial.findMany({
            where: { id: { in: materialIds } },
            select: { id: true, bookId: true, kind: true },
          })
        : [];
      const materialById = new Map(materials.map((m) => [m.id, m]));
      const bookSets = new Map<string, QSets>();
      const kindSets = new Map<string, Map<string, QSets>>();
      for (const row of textbookRows) {
        const m = materialById.get(row.sourceMaterialId ?? "");
        if (!m) continue;
        const book = bookSets.get(m.bookId) ?? sets();
        add(book, row);
        bookSets.set(m.bookId, book);
        const kinds = kindSets.get(m.bookId) ?? new Map<string, QSets>();
        const kind = kinds.get(m.kind) ?? sets();
        add(kind, row);
        kinds.set(m.kind, kind);
        kindSets.set(m.bookId, kinds);
      }
      const families = collect(
        unitRows.filter((r) => r.available),
        (r) => r.unitId,
      );
      const familySets = new Map<string, Set<string>>();
      for (const row of unitRows)
        if (row.available) {
          const set = familySets.get(row.unitId) ?? new Set<string>();
          set.add(familyIdOf(row));
          familySets.set(row.unitId, set);
        }
      return {
        view: "available",
        ...questionReadMetadata(params),
        ...all(mainRows),
        formatAvailable: Object.fromEntries(
          QUESTION_FORMATS.map((f) => [
            f,
            countProjectedQuestions(mainAll, true, f),
          ]),
        ) as Record<(typeof QUESTION_FORMATS)[number], number>,
        facets: {
          units: Object.fromEntries(
            [...unitSets].map(([id, s]) => [id, tally(s)]),
          ),
          ...(params.get("families") === "1"
            ? {
                unitFamilies: Object.fromEntries(
                  [...families.keys()].map((id) => [
                    id,
                    Math.min(
                      familySets.get(id)?.size ?? 0,
                      families.get(id)?.available.size ?? 0,
                    ),
                  ]),
                ),
              }
            : {}),
          difficulties: Object.fromEntries(
            DIFFICULTY_LADDER.map((tier) => [
              tier,
              tally(diffSets.get(tier) ?? sets()),
            ]),
          ) as NonNullable<BankSourceAvailability["facets"]>["difficulties"],
          sources: {
            total: all(sourceRows),
            ...Object.fromEntries(
              BANK_SOURCE_GROUPS.map((g) => [g, sourceTally(g)]),
            ),
          } as NonNullable<BankSourceAvailability["facets"]>["sources"],
          textbook: {
            ...all(textbookRows),
            books: [...bookSets]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([id, s]) => ({
                id,
                ...tally(s),
                kinds: Object.fromEntries(
                  [...(kindSets.get(id) ?? [])].map(([kind, s]) => [
                    kind,
                    tally(s),
                  ]),
                ),
              })),
          },
        },
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}

/** Global source picker scope stays global; every union is counted by question. */
export async function loadQuestionSourceCounts(
  params: URLSearchParams,
): Promise<BankSourceCounts> {
  check(params);
  return db.$transaction(
    async (tx) => {
      const [rows, books, units] = await Promise.all([
        loadQuestionCandidates(problemVisibleWhere(), undefined, tx),
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
      const materialById = new Map(materials.map((m) => [m.id, m]));
      const textbook = rows.filter((r) => r.source === "school_textbook");
      const first = new Map<string, number>();
      for (const u of units)
        if (!first.has(u.grade)) first.set(u.grade, u.orderIndex);
      const listed = books.flatMap((book) => {
        const matches = textbook.filter(
          (r) => materialById.get(r.sourceMaterialId ?? "")?.bookId === book.id,
        );
        if (!matches.length) return [];
        const count = all(matches);
        const kindSets = collect(
          matches,
          (r) => materialById.get(r.sourceMaterialId ?? "")!.kind,
        );
        return [
          {
            ...book,
            count: count.held,
            open: count.available,
            materials: new Set(matches.map((r) => r.sourceMaterialId)).size,
            kinds: Object.fromEntries(
              [...kindSets].map(([kind, s]) => [kind, s.held.size]),
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
          total: all(rows).held,
          ...Object.fromEntries(
            BANK_SOURCE_GROUPS.map((g) => [
              g,
              all(
                rows.filter((r) =>
                  BANK_SOURCE_GROUP_SOURCES[g].includes(r.source),
                ),
              ).held,
            ]),
          ),
        } as BankSourceCounts["sources"],
        textbook: {
          total: all(textbook).held,
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
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
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
      const [materials, rows] = await Promise.all([
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
        loadQuestionCandidates(
          {
            AND: [
              problemVisibleWhere(),
              ...query.selection,
              { source: "school_textbook" },
              { sourceMaterial: { bookId: { in: books.data } } },
            ],
          },
          undefined,
          tx,
        ),
      ]);
      const counts = collect(
        query.format
          ? rows.filter((r) => r.actualFormat === query.format)
          : rows,
        (r) => r.sourceMaterialId ?? "",
      );
      const order = new Map(books.data.map((id, i) => [id, i]));
      return {
        view: "materials",
        ...questionReadMetadata(params),
        materials: materials
          .map((m) => ({ ...m, ...tally(counts.get(m.id) ?? sets()) }))
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
