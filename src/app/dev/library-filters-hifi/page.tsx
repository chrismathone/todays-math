import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { LibraryFiltersHifi } from "./LibraryFiltersHifi";

/**
 * **내 자료(보관함) 거르기 줄 — Hi-fi 5안** (D-07 · 절대 규칙 1, 2026-10-21).
 *
 * 원장님이 Wire C(드롭다운 넷 — 종류 · 태그 · 보기 · 정렬 + 찾기)를 고르셨다 · 결과 수는 줄 끝 · 드롭다운 이름은 칸 안에 작게 ·
 * 태그 없는 종류에 갔다 돌아오면 태그를 다시 건다. 짜임은 그대로 두고 칸의 꼴 · 이름의 자리 · 걸린 칸 표시 · 미적용 칸 ·
 * 화살표 · 결과 수 · 글자 크기를 다섯 갈래로 가른다. Wire 와 같은 틀 · 자 · 픽스처(`../library-filters-wire/parts`).
 * DB 를 읽지 않는다 — 지어낸 16행이다. ⚠️ 아무것도 저장 · 호출하지 않는다.
 */
export default async function LibraryFiltersHifiPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <LibraryFiltersHifi />;
}
