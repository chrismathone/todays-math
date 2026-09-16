import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ClassOwnerHifiClient } from "./ClassOwnerHifiClient";

/**
 * 관리자 화면의 «누구의 반» — **실제 컴포넌트**로 그린 확인 페이지(D-132 Hi-fi 3 탭과 나란히 캡처하려고).
 *
 * 데이터는 `fixture.ts`(시안의 반 8개 — 공유 DB 에서 읽은 반 · 학년 · 계정 이름)이고, 반 목록 · 개념 판 ·
 * 작업실 개요 · 시험지 단건 요청만 이 페이지 안에서 가로채 그 픽스처로 답한다 — **DB 를 읽지도 쓰지도 않는다.**
 *
 *   ?admin=0   관리자가 아닌 계정이 받는 모양(담당 키가 없다) — 지금 화면 그대로여야 한다
 *
 * 이웃 dev 페이지(`dev/concept-hifi` 등)와 **같은 가드**다 — 없으면 프로덕션에 프리렌더된다.
 */
export default async function ClassOwnerHifiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }
  const params = await searchParams;
  const admin = Array.isArray(params.admin) ? params.admin[0] : params.admin;
  return <ClassOwnerHifiClient admin={admin !== "0"} />;
}
