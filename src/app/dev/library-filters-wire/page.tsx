import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { LibraryFiltersWire } from "./LibraryFiltersWire";

/**
 * **내 자료(보관함) 거르기 줄 — Wire 5안** (D-07 · 절대 규칙 1, 2026-10-21).
 *
 * 원장님 «상단 정렬하자. 드랍다운으로 스타일 맞춰서 깔끔하게» · «행을 너무 많이 써서 공간낭비함».
 * 지금 다섯 줄(종류 칩 · 태그 칩 · 체크 · 찾기 줄 · 결과 수)을 넓으면 한 줄 · 좁으면 두 줄로.
 * 안끼리 다른 것은 드롭다운 순서 · 체크 둘의 자리 · 검색칸 폭 · 좁은 화면 줄바꿈이다.
 * DB 를 읽지 않는다 — 지어낸 16행이다. ⚠️ 아무것도 저장 · 호출하지 않는다.
 */
export default async function LibraryFiltersWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <LibraryFiltersWire />;
}
