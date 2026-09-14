import { notFound } from "next/navigation";
import { connection } from "next/server";

import { BankDetailHifiClient } from "./BankDetailHifiClient";

/**
 * 문제은행 상세 모달 Hi-fi 시안 — 실제 토큰·컴포넌트로 그린 화면 (D-07, 05 §0-3 ②).
 *
 * 이웃 dev 페이지(dev/range-hifi, dev/bank-detail-wire)와 **같은 가드**다 — 이게 없으면
 * 프로덕션에 프리렌더돼 픽스처까지 번들에 딸려 들어간다.
 */
export default async function BankDetailHifiPage() {
  await connection();

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }

  return <BankDetailHifiClient />;
}
