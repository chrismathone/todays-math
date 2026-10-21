import type {
  BankSourceBook,
  BankSourceCounts,
  BankSourceGroup,
} from "@/contracts/bankSource.contract";
import { BANK_SOURCE_GROUP_LABEL } from "@/components/problem/labels";

/**
 * 문제은행 «출처 고르기»(D-161 · 05 S-08 H1 [확정 — 2026-10-08]) 창 안의 셈과 칸 · 칩의 글.
 *
 * v1 수는 서버가 책마다 실어 준 자료 종류별 수(`BankSourceBook.kinds`)로 **요청 없이** 센다 — 창 안에서 체크를
 * 바꿔도 «걸리는 문항 n개»만 바뀌고 목록 요청은 [적용]을 눌러야 나간다(⑷). 규칙은 시안(`/dev/bank-source-hifi`)과 같다:
 * 책을 안 고르면 교과서 전부, 자료 종류를 안 고르면 종류 전부.
 * 문항 보기(question)에서도 더한다 — 문항 하나는 자료 하나에만 든다(묶음 키는 같은 자료의 행끼리만 붙고
 * (`proveQuestionPair`), 자료가 바뀌면 트리거가 키를 지운다). 그래서 책 × 자료 종류의 수는 서로 겹치지 않는다
 * (2026-10-21 공유 DB 실측: 교과서 12,301행 · 묶음 키 0 · 중1 자료 종류 10가지 모두 «책별 합 = 문항 단위 합집합»).
 */

/** 고른 것 — 출처 갈래(`""` = 전체) · 책(`source_book.id`) · 자료 종류. */
export interface SourcePick {
  group: BankSourceGroup | "";
  books: string[];
  kinds: string[];
}

function bookMap(counts: BankSourceCounts | null) {
  return new Map((counts?.textbook.books ?? []).map((book) => [book.id, book]));
}

/** 셈의 모집단 — 고른 책, 안 골랐으면 모든 책. 목록에 없는 열쇠(사라진 책)는 0 으로 친다. */
function poolOf(counts: BankSourceCounts, books: string[]): BankSourceBook[] {
  if (!books.length) return counts.textbook.books;
  const map = bookMap(counts);
  return books
    .map((id) => map.get(id))
    .filter((book): book is BankSourceBook => Boolean(book));
}

/** 자료 종류 하나의 수 — **고른 책에 맞춰** 바뀐다(H1 셋째 단). */
export function kindCount(
  counts: BankSourceCounts,
  books: string[],
  kind: string,
): number {
  return poolOf(counts, books).reduce(
    (sum, book) => sum + (book.kinds[kind] ?? 0),
    0,
  );
}

/**
 * 걸리는 문항 — 고른 책 × 고른 자료 종류. 아무것도 안 골랐으면 교과서 **전부**(자료가 붙지 않은 문항까지 —
 * 서버의 `textbook.total`)다. 하나라도 고르면 자료가 없는 문항은 빠진다(서버의 거르기와 같은 규칙).
 */
export function matchedCount(
  counts: BankSourceCounts,
  books: string[],
  kinds: string[],
): number {
  if (!books.length && !kinds.length) return counts.textbook.total;
  return poolOf(counts, books).reduce(
    (sum, book) =>
      sum +
      (kinds.length
        ? kinds.reduce((acc, kind) => acc + (book.kinds[kind] ?? 0), 0)
        : book.count),
    0,
  );
}

/** 책 이름 — «중1 천재교육(김화경)». 저자가 없는 책은 괄호를 안 단다. */
export function bookLabel(book: BankSourceBook): string {
  const head = `${book.grade} ${book.publisher}`;
  return book.author ? `${head}(${book.author})` : head;
}

/** 칸 · 칩의 책 글 — 첫 책 + «외 n권». 수를 아직 못 받았으면 권수만 적는다(지어내지 않는다). */
export function booksText(
  counts: BankSourceCounts | null,
  books: string[],
): string {
  const first = bookMap(counts).get(books[0] ?? "");
  if (!first) return `${books.length}권`;
  const head = bookLabel(first);
  return books.length > 1 ? `${head} 외 ${books.length - 1}권` : head;
}

/** 칸 · 칩의 자료 글 — 첫 종류 + «외 n». */
export function kindsText(kinds: string[]): string {
  return kinds.length > 1 ? `${kinds[0]} 외 ${kinds.length - 1}` : kinds[0];
}

/** 필터 줄 «출처» 칸의 글(⑴) — «전체 출처» · «엔진» · «교과서 · 중1 천재교육(김화경) 외 1권 · 대단원 평가 외 1». */
export function sourceFieldText(
  counts: BankSourceCounts | null,
  pick: SourcePick,
): string {
  if (!pick.group) return "전체 출처";
  if (pick.group !== "school_textbook")
    return BANK_SOURCE_GROUP_LABEL[pick.group];
  return [
    BANK_SOURCE_GROUP_LABEL.school_textbook,
    pick.books.length ? booksText(counts, pick.books) : "책 전부",
    pick.kinds.length ? kindsText(pick.kinds) : "자료 전부",
  ].join(" · ");
}

/** 창이 처음 펼칠 과목(⑶) — 필터 줄의 학년 → 고른 첫 책의 과목 → 첫 과목. */
export function openingGrade(
  counts: BankSourceCounts,
  filterGrade: string,
  books: string[],
): string {
  const { grades } = counts.textbook;
  if (grades.includes(filterGrade)) return filterGrade;
  const picked = bookMap(counts).get(books[0] ?? "");
  return picked?.grade ?? grades[0] ?? "";
}

/**
 * 적용하면 학년 칸을 «전체 학년»으로 돌려야 하는가(⑶) — 학년 칸과 다른 과목의 책이 하나라도 있으면.
 * 그대로 두면 «중1 이면서 중2 책»이 되어 결과가 0 으로 빈다.
 */
export function leavesGrade(
  counts: BankSourceCounts,
  filterGrade: string,
  books: string[],
): boolean {
  if (!filterGrade) return false;
  const map = bookMap(counts);
  return books.some((id) => {
    const book = map.get(id);
    return book !== undefined && book.grade !== filterGrade;
  });
}
