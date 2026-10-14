import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Bench } from "./Bench";

/**
 * 도형 편집기 «다 보이게» 확인대 — 개발에서만 연다.
 *
 * 편집기는 작업실(`/dev/unified`) 안쪽에 있어 문제은행(DB)을 타야 열린다. 틀이 잘리는지는
 * DB 와 무관하므로, 실물 엔진 그림 한 장을 바로 편집기에 실어 **브라우저에서 눈으로** 본다
 * (jsdom 은 CSS·글꼴을 안 돈다 — 공통 규칙). 2026-09-20 t29.
 */
export const metadata = {
  title: "도형 틀 확인대 · 오늘 수학",
  robots: { index: false, follow: false },
};

export default async function FigureFitBenchPage() {
  await connection();
  if (process.env.NODE_ENV !== "development") notFound();
  return <Bench />;
}
