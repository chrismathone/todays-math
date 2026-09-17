import { notFound } from "next/navigation";
import { connection } from "next/server";

import { GradingHifiClient, type GradingHifiSet } from "./GradingHifiClient";

/**
 * `/dev/grading-hifi` — **채점 입력 화면을 실물 브라우저로 재는 자리** (D-134 트랙 1, 브리프 §3).
 *
 * 제품 컴포넌트(`GradeSheet`)를 **제품 크롬(`AppChrome`) 안에** 그대로 띄우고,
 * `/api/tests/{id}/grade` 요청만 이 페이지 안에서 가로채 픽스처로 답한다 —
 * **DB 를 읽지도 쓰지도 않는다**(브리프 §2 «공유 DB 에 아무것도 쓰지 마라»).
 *
 * ## 🔴 왜 `/tests/{id}/grade` 를 직접 안 찍나
 *
 * 이 워크트리에는 `.env` 가 없고 이 기계에는 로컬 DB 가 없다. 그래서 진짜 경로는
 * 서버 렌더 단계에서 DB 에 닿지 못한다. 대신 **같은 컴포넌트·같은 크롬**을 세우고,
 * 데이터는 공유 DB 의 **실제 최대 시험지 모양**(학생 7 × 문항 8 = 56칸, 19 §5′ 에서 실측)
 * 그대로 넣는다. 지어낸 작은 픽스처로 그리면 「56칸이 한 화면에 드나」라는 물음이
 * 사라진다(2026-08-19 교훈 — 시안이 작은 픽스처로 서면 원장님이 실제 화면에서 찾아 준다).
 *
 *   ?set=fresh   (기본) 아무도 채점 안 됨 — 56칸이 전부 «아직 안 봄»
 *   ?set=partial 셋은 채점 끝 · 하나는 결시 · 셋은 아직 안 봄(저장 잠김 + 이름 나열)
 *   ?set=marked  전원 결정됨(오답 표시 · 결시 하나) — 저장이 열린 상태
 *
 * ⚠️ 이웃 dev 페이지와 **같은 가드** — 없으면 프로덕션에 프리렌더된다.
 */
export const dynamic = "force-dynamic";

export default async function GradingHifiPage({
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
  const raw = Array.isArray(params.set) ? params.set[0] : params.set;
  const allowed: readonly GradingHifiSet[] = ["fresh", "partial", "marked"];
  const set = allowed.includes(raw as GradingHifiSet)
    ? (raw as GradingHifiSet)
    : "fresh";

  return <GradingHifiClient set={set} />;
}
