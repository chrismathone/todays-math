import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Bench } from "./Bench";

/**
 * 도형 편집기 요소 순서 확인대 — 개발에서만 연다.
 *
 * 편집기는 작업실(`/dev/unified`) 안쪽에 있어 문제은행(DB)을 타야 열린다. 순서·오른쪽 칸 폭은 DB 와 무관하므로
 * 원장님 화면과 같은 짜임(채운 삼각형이 y축을 덮은 포물선 그림) 한 장을 바로 편집기에 실어 **브라우저에서** 잰다
 * (jsdom 은 CSS·그리기를 안 돈다 — 차례가 바뀌었는지와 y축이 보이는지는 다르다). 2026-09-21 t43.
 */
export const metadata = {
  title: "도형 순서 확인대 · 오늘 수학",
  robots: { index: false, follow: false },
};

export default async function FigureZorderBenchPage() {
  await connection();
  if (process.env.NODE_ENV !== "development") notFound();
  return <Bench />;
}
