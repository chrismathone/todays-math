import { notFound } from "next/navigation";
import { connection } from "next/server";

import { onlySupportedGrades } from "@/contracts/supportedGrades";

import { CURRICULUM_UNITS } from "../../../../prisma/seed-data/units";
import { unitIdOf } from "./fixture";
import {
  PlanScreenHifiClient,
  type PlanScreenHifiOptions,
} from "./PlanScreenHifiClient";

/**
 * 진도 계획 화면(22번 ④ · D-131 Hi-fi 2 «계기판 관») — **실제 컴포넌트 · 실제 교육과정**으로 그린 시안 확인 페이지
 * (시안과 나란히 캡처 · 폭별 계측 — `scripts/qa/plan-screen-layout.mjs`).
 *
 * 데이터는 `fixture.ts`(예정은 서버와 같은 함수로 편다)이고, 반·학생·진도·계획·확인테스트 요청만 이 페이지 안에서
 * 가로채 답한다 — **DB 를 읽지도 쓰지도 않는다**(브리프 §2 공유 DB 쓰기 금지).
 *
 *   ?screen=classes|main          (기본 classes)
 *   ?set=hifi|stress|none         반 관리의 계획(기본 hifi — 시안 그림)
 *   ?main=hifi|stress|empty       메인 «오늘의 확인테스트»(기본 hifi)
 *
 * 「오늘」은 기계 시계(KST)다 — 픽스처는 2026-09-16(수) 기준으로 짰다.
 * 이웃 dev 페이지(`dev/learn-hifi` 등)와 **같은 가드**다 — 없으면 프로덕션에 프리렌더된다.
 */
export default async function PlanScreenHifiPage({
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
  const options: PlanScreenHifiOptions = {
    screen: pick(flag("screen"), ["classes", "main"] as const, "classes"),
    set: pick(flag("set"), ["hifi", "stress", "none"] as const, "hifi"),
    mainSet: pick(flag("main"), ["hifi", "stress", "empty"] as const, "hifi"),
  };
  const units = onlySupportedGrades(
    CURRICULUM_UNITS.map((u) => ({
      id: unitIdOf(u.orderIndex),
      grade: u.grade,
      chapter: u.chapter,
      section: u.section,
      orderIndex: u.orderIndex,
    })),
  );
  return <PlanScreenHifiClient options={options} units={units} />;
}
