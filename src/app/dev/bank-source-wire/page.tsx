import { notFound } from "next/navigation";
import { connection } from "next/server";

import { BankSourceWireClient } from "./BankSourceWireClient";

/**
 * 문제은행 «교과서 문항을 출판사 · 자료 종류 · 학기로 거르기» Wire 시안 — 실제 CSS · 렌더러로 그린 화면 (D-07 시안 제시용).
 *
 * 이웃 dev 페이지(dev/bank-detail-wire)와 **같은 가드**다 — 이게 없으면 프로덕션에
 * 프리렌더돼 픽스처까지 번들에 딸려 들어간다.
 */
export default async function BankSourceWirePage() {
  await connection();

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }

  return <BankSourceWireClient />;
}
