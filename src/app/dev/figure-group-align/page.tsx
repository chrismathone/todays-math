import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Bench } from "./Bench";

/**
 * 도형 편집기 묶기·번호표·정렬 확인대 — 개발에서만 연다.
 *
 * 편집기는 작업실(`/dev/unified`) 안쪽에 있어 문제은행(DB)을 타야 열린다. 묶음·번호표·정렬은 DB 와
 * 무관하므로 사각형 관계도 한 장을 바로 편집기에 실어 **브라우저에서 눈으로** 본다
 * (jsdom 은 CSS·글꼴을 안 돈다 — 클래스가 붙었는지와 그렇게 그려지는지는 다르다). 2026-09-21 t36.
 */
export const metadata = {
  title: "도형 묶기·정렬 확인대 · 오늘 수학",
  robots: { index: false, follow: false },
};

export default async function FigureGroupAlignBenchPage() {
  await connection();
  if (process.env.NODE_ENV !== "development") notFound();
  return <Bench />;
}
