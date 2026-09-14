import { notFound } from "next/navigation";
import { connection } from "next/server";

import { BankDetailWireClient } from "./BankDetailWireClient";

/**
 * 문제은행 상세 처리 Wire 시안 — 실제 CSS·렌더러로 그린 화면 (D-07 시안 제시용).
 *
 * 이웃 dev 페이지(dev/range-hifi)와 **같은 가드**다 — 이게 없으면 프로덕션에
 * 프리렌더돼 픽스처까지 번들에 딸려 들어간다.
 */
export default async function BankDetailWirePage() {
  await connection();

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }

  return <BankDetailWireClient />;
}
