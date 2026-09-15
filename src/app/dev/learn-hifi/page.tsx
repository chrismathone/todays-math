import { notFound } from "next/navigation";
import { connection } from "next/server";

import { LearnHifiClient, type LearnHifiOptions } from "./LearnHifiClient";

/**
 * «오늘의 개념» 학생 화면 네 장 + 원장님 발급 칸 — **실제 컴포넌트 · 실제 교육과정 735차시**로 그린 시안 확인
 * 페이지(05 §8.9 시안 1안과 나란히 캡처 · 폭별 계측 — `scripts/qa/learn-screens-layout.mjs`).
 *
 * 데이터는 `fixture.ts`(제품과 같은 셈·같은 조립)이고, `/api/learn/**` · `/api/students/{id}/account/**`
 * 요청만 이 페이지 안에서 가로채 그 픽스처로 답한다 — **DB 를 읽지도 쓰지도 않는다**(브리프 §2: 공유 DB 에
 * 시험용 학생 계정·강의·시청 기록을 넣지 않는다). 재생기는 유튜브 대신 가짜(판서 판 위에서 시간만 흐른다).
 *
 *   ?screen=login|password|list|watch|issue   (기본 list)
 *   ?set=mockup|stress|empty                  목록 데이터(기본 시안 그대로)
 *   ?today=2026-09-16                         학원 날짜를 고정(«오늘» 표시 확인 — 기본 2026-09-15)
 *   ?lecture=l4 | <uuid> · ?at=52             재생할 강의 · 가짜 재생기의 처음 자리(초)
 *   ?state=before|issued|disabled|withdrawn|locked   발급 칸의 서버 상태(locked = 연속 5회 틀려 잠김 — D-127 Q5)
 *
 * 이웃 dev 페이지(`dev/concept-hifi` 등)와 **같은 가드**다 — 없으면 프로덕션에 프리렌더된다.
 */
export default async function LearnHifiPage({
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
  const flag = (key: string) =>
    Array.isArray(params[key]) ? params[key][0] : params[key];
  const pick = <T extends string>(
    value: string | undefined,
    allowed: readonly T[],
    fallback: T,
  ): T => (allowed.includes(value as T) ? (value as T) : fallback);
  const at = Number(flag("at"));
  const options: LearnHifiOptions = {
    screen: pick(
      flag("screen"),
      ["login", "password", "list", "watch", "issue"] as const,
      "list",
    ),
    set: pick(flag("set"), ["mockup", "stress", "empty"] as const, "mockup"),
    today: /^\d{4}-\d\d-\d\d$/.test(flag("today") ?? "")
      ? flag("today")!
      : "2026-09-15",
    lecture: flag("lecture") ?? "l4",
    at: Number.isFinite(at) && flag("at") !== undefined ? at : null,
    state: pick(
      flag("state"),
      ["before", "issued", "disabled", "withdrawn", "locked"] as const,
      "before",
    ),
  };
  return <LearnHifiClient options={options} />;
}
