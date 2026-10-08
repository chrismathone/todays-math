import { notFound } from "next/navigation";
import { connection } from "next/server";

import { BankSourceHifiClient } from "./BankSourceHifiClient";

/**
 * 문제은행 «교과서 거르기» Hi-fi 시안 — Wire Ⓑ(고르기 창)를 실제 CSS · 공용 고르기 창 · 실제 수로 다섯 꼴 (D-07 시안 제시용).
 *
 * 이웃 dev 페이지(dev/bank-source-wire)와 **같은 가드**다 — 이게 없으면 프로덕션에
 * 프리렌더돼 픽스처까지 번들에 딸려 들어간다.
 */
export default async function BankSourceHifiPage() {
  await connection();

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }

  return <BankSourceHifiClient />;
}
