import "server-only";
import {
  BANK_SOURCE_GROUP_SOURCES,
  BANK_SOURCE_GROUPS,
  type BankSourceBook,
  type BankSourceCounts,
} from "@/contracts/bankSource.contract";
import { SOURCE_MATERIAL_KINDS } from "@/contracts/sourceMaterial.contract";
import { db } from "@/lib/db";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { problemVisibleWhere } from "@/lib/problemPool";
import { loadQuestionSourceCounts } from "./bankSourceQuestions";

/**
 * 문제은행 «출처 고르기» 창의 수 (D-161 · 05 S-08 H1 [확정 — 2026-10-08]).
 *
 * 🔴 **다른 필터와 무관하게** 공용 풀 전부로 센다(리드 결정 2026-10-08) — 창 안의 수가 학년 · 난이도를 따라
 *    0 으로 비면 «이 책에는 문항이 없다»로 읽힌다. 고른 조합의 «걸리는 문항»과 «고른 책에 맞춘 자료 종류별 수»는
 *    책마다 실은 자료 종류별 수(`kinds`)로 창이 **요청 없이** 센다(`bankSourcePick.ts`) — [적용] 전에는 요청이 없다.
 *
 * 질의는 묶음 셈 셋 + 책 · 자료 · 차시 목록이다. 문항 행을 읽어 오지 않는다(교과서 8,370 · 전체 10만여).
 */
export async function loadBankSourceCounts(
  params = new URLSearchParams(),
): Promise<BankSourceCounts> {
  if (params.get("identity") === "question")
    return loadQuestionSourceCounts(params);
  const visible = problemVisibleWhere();
  const textbook = { source: "school_textbook" as const };
  const [bySource, perMaterial, perMaterialOpen, books, units] =
    await Promise.all([
      db.problem.groupBy({
        by: ["source"],
        where: visible,
        _count: { _all: true },
      }),
      db.problem.groupBy({
        by: ["sourceMaterialId"],
        where: { AND: [visible, textbook] },
        _count: { _all: true },
      }),
      db.problem.groupBy({
        by: ["sourceMaterialId"],
        where: { AND: [problemEligibleWhere(), textbook] },
        _count: { _all: true },
      }),
      db.sourceBook.findMany({
        where: { kind: "school_textbook" },
        select: {
          id: true,
          grade: true,
          publisher: true,
          author: true,
          title: true,
        },
      }),
      db.unit.findMany({
        select: { grade: true, orderIndex: true },
        orderBy: { orderIndex: "asc" },
      }),
    ]);
  const materials = books.length
    ? await db.sourceMaterial.findMany({
        where: { bookId: { in: books.map((book) => book.id) } },
        select: { id: true, bookId: true, kind: true },
      })
    : [];

  const sourceCount = new Map(
    bySource.map((row) => [row.source as string, row._count._all]),
  );
  const sources = Object.fromEntries(
    BANK_SOURCE_GROUPS.map((group) => [
      group,
      BANK_SOURCE_GROUP_SOURCES[group].reduce(
        (sum, source) => sum + (sourceCount.get(source) ?? 0),
        0,
      ),
    ]),
  ) as Record<(typeof BANK_SOURCE_GROUPS)[number], number>;

  const loaded = new Map(
    perMaterial.map((row) => [row.sourceMaterialId, row._count._all]),
  );
  const open = new Map(
    perMaterialOpen.map((row) => [row.sourceMaterialId, row._count._all]),
  );
  const tally = new Map<string, BankSourceBook>(
    books.map((book) => [
      book.id,
      { ...book, count: 0, open: 0, materials: 0, kinds: {} },
    ]),
  );
  for (const material of materials) {
    const count = loaded.get(material.id) ?? 0;
    const book = tally.get(material.bookId);
    if (!book || count === 0) continue;
    book.count += count;
    book.open += open.get(material.id) ?? 0;
    book.materials += 1;
    book.kinds[material.kind] = (book.kinds[material.kind] ?? 0) + count;
  }

  // 과목 차례 — 교육과정 트리의 차례(그 과목 첫 차시의 `orderIndex`). 트리에 없는 과목은 뒤에 이름 차례로.
  const firstIndex = new Map<string, number>();
  for (const unit of units)
    if (!firstIndex.has(unit.grade))
      firstIndex.set(unit.grade, unit.orderIndex);
  const listed = [...tally.values()].filter((book) => book.count > 0);
  const grades = [...new Set(listed.map((book) => book.grade))].sort(
    (a, b) =>
      (firstIndex.get(a) ?? Infinity) - (firstIndex.get(b) ?? Infinity) ||
      a.localeCompare(b, "ko"),
  );
  return {
    sources: {
      total: [...sourceCount.values()].reduce((sum, n) => sum + n, 0),
      ...sources,
    },
    textbook: {
      total: perMaterial.reduce((sum, row) => sum + row._count._all, 0),
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
