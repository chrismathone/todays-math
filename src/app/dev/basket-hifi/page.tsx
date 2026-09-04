import { notFound } from "next/navigation";
import { connection } from "next/server";

import { BasketHifiClient } from "./BasketHifiClient";

/**
 * 담기 바구니 **하단 고정 바** Hi-fi 시안 — 실제 토큰·실제 컴포넌트·**실제 문항**으로
 * 그린 화면 (D-07 시안 제시용).
 *
 * ## 🔴 왜 픽스처를 안 쓰나
 *
 * 2026-08-19 에 범위 UI 를 ASCII 로 골라 확정했는데, 실물 HTML 로 그려 보시자마자
 * 원장님이 **다른 안으로 바꾸셨다.** 그리고 그 시안이 중2 17개짜리 픽스처로 서 있어서
 * 「학년 열이 16행이라 폼이 화면 밖으로 밀린다」를 **구조적으로 못 봤다** — 실제
 * 데이터에서만 드러나는 결함이었다.
 *
 * 그래서 이 페이지는 문항을 **서버에서 실제로 받아** 그린다. 문항 코드 길이·본문
 * 길이·보기 유무·난이도 배지가 전부 진짜여야 바가 그것을 덮는지 가린다.
 *
 * 이웃 dev 페이지(`dev/range-hifi`·`dev/render-a-preview`)와 **같은 가드**다 —
 * 이게 없으면 프로덕션에 프리렌더된다.
 */
export default async function BasketHifiPage() {
  await connection();

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }

  return <BasketHifiClient />;
}
