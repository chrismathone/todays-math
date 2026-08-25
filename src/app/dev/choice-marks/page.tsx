import { notFound } from "next/navigation";
import { connection } from "next/server";

import { MarksClient } from "./MarksClient";

/**
 * 「㉠ 목록을 ①~⑤ 로 바꿀까」 — 원장님이 **눈으로 보고** 정하실 자리 (D-80).
 *
 * 이웃 dev 페이지(dev/render-a-preview, dev/katex)와 **같은 가드**다 — 이게 없으면
 * 프로덕션에 프리렌더돼 픽스처까지 번들에 딸려 들어간다.
 */
export default async function ChoiceMarksPage() {
  await connection();

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }

  return <MarksClient />;
}
